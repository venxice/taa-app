// ============================================================
// User Controller - List, Get, Update, Verify, Remove
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/response';
import type {   verifyUserSchema,
  updateUserSchema,
  updateOwnProfileSchema,
 } from "./user.schema";
import type { z } from "zod";

type VerifyInput = z.input<typeof verifyUserSchema>["body"];
type UpdateUserInput = z.input<typeof updateUserSchema>["body"];
type UpdateOwnProfileInput = z.input<typeof updateOwnProfileSchema>["body"];

const userSelect = {
  id: true,
  firstName: true,
  middleName: true,
  lastName: true,
  email: true,
  username: true,
  role: true,
  status: true,
  phone: true,
  avatar: true,
  rejectionReason: true,
  verifiedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const userController = {
  // GET /api/users?search=&role=&status=&page=&limit=
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, role, status, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));

      const where: Prisma.UserWhereInput = {};
      if (role && ['resident', 'hoa_officer', 'admin'].includes(String(role))) {
        where.role = role as UserRole;
      }
      if (
        status &&
        ['pending', 'verified', 'rejected', 'suspended', 'disabled'].includes(String(status))
      ) {
        where.status = status as UserStatus;
      }
      if (search) {
        const term = String(search).trim();
        where.OR = [
          { firstName: { contains: term } },
          { lastName: { contains: term } },
          { username: { contains: term } },
          { email: { contains: term } },
        ];
      }

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: userSelect,
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      sendSuccess(res, {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/users/:id
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { ...userSelect, resident: true },
      });
      if (!user) throw ApiError.notFound('User not found');
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/users/me — any signed-in user edits their own account details
  updateMe: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const body = (req.body || {}) as UpdateOwnProfileInput;

      const data: Prisma.UserUpdateInput = {};
      if (body.username !== undefined) data.username = String(body.username).trim();
      if (body.email !== undefined) data.email = body.email ? String(body.email).trim() : null;
      if (body.phone !== undefined) data.phone = String(body.phone).trim();

      if (Object.keys(data).length === 0) throw ApiError.badRequest('Nothing to update');

      const user = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: userId },
          data,
          select: userSelect,
        });

        // Keep the linked resident record's contact details in sync.
        if (body.email !== undefined || body.phone !== undefined) {
          const resident = await tx.resident.findUnique({
            where: { userId },
            select: { id: true },
          });
          if (resident) {
            const rdata: Prisma.ResidentUpdateInput = {};
            if (body.email !== undefined) {
              rdata.email = body.email ? String(body.email).trim() : null;
            }
            if (body.phone !== undefined) rdata.phone = String(body.phone).trim();
            await tx.resident.update({ where: { id: resident.id }, data: rdata });
          }
        }

        return updated;
      });

      sendSuccess(res, { user }, 'Profile updated');
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return next(ApiError.conflict('Username or email already in use'));
      }
      next(error);
    }
  },

  // PUT /api/users/:id
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const body = (req.body || {}) as UpdateUserInput & Record<string, unknown>;

      // Officers may edit basic resident details, but only admins may change
      // account roles or statuses. Keep this check in the controller so the
      // restriction still applies if the route middleware changes later.
      if (
        req.user?.role !== 'admin' &&
        (body.role !== undefined || body.status !== undefined)
      ) {
        throw ApiError.forbidden('Only administrators can change user roles or statuses');
      }
      if (id === req.user?.userId && (body.role !== undefined || body.status !== undefined)) {
        throw ApiError.badRequest('You cannot change your own role or account status');
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) throw ApiError.notFound('User not found');

      const data: Prisma.UserUpdateInput = {};
      if (body.firstName !== undefined) data.firstName = String(body.firstName);
      if (body.lastName !== undefined) data.lastName = String(body.lastName);
      if (body.email !== undefined) data.email = body.email || null;
      if (body.phone !== undefined) data.phone = String(body.phone);

      // Role / status changes are guarded above; only admins can reach here with either field.
      if (body.role !== undefined) data.role = body.role as UserRole;
      if (body.status !== undefined) {
        data.status = body.status as UserStatus;
        data.verifiedAt = body.status === 'verified' ? new Date() : null;
        data.rejectionReason = body.status === 'rejected' || body.status === 'suspended'
          ? existing.rejectionReason
          : null;
        data.verifiedBy = body.status === 'verified'
          ? { connect: { id: req.user!.userId } }
          : { disconnect: true };
      }
      if (body.role !== undefined || body.status !== undefined) {
        data.tokenVersion = { increment: 1 };
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: userSelect,
      });

      sendSuccess(res, { user }, 'User updated');
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return next(ApiError.conflict('Email or username already in use'));
      }
      next(error);
    }
  },

  // POST /api/users/:id/verify  { status: verified|rejected|suspended, rejectionReason? }
  verify: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body as VerifyInput;

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) throw ApiError.notFound('User not found');
      if (existing.role === 'admin' && status !== 'verified') {
        throw ApiError.forbidden('Admin accounts cannot be rejected or suspended here');
      }
      const user = await prisma.user.update({
        where: { id },
        data: {
          status: status as UserStatus,
          tokenVersion: { increment: existing.status === status ? 0 : 1 },
          rejectionReason:
            status === 'rejected' || status === 'suspended' ? rejectionReason || 'No reason given' : null,
          verifiedAt: status === 'verified' ? new Date() : null,
          verifiedById: status === 'verified' ? req.user!.userId : null,
        },
        select: userSelect,
      });

      const messages: Record<string, string> = {
        verified: 'User verified successfully',
        rejected: 'User registration rejected',
        suspended: 'User account suspended',
      };
      sendSuccess(res, { user }, messages[status] || 'User updated');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/users/:id/disable  — soft-delete: account can no longer sign in
  disable: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (id === req.user!.userId) {
        throw ApiError.badRequest('You cannot disable your own account');
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) throw ApiError.notFound('User not found');
      if (existing.role === 'admin') {
        throw ApiError.forbidden('Admin accounts cannot be disabled');
      }

      const user = await prisma.user.update({
        where: { id },
        data: { status: 'disabled', tokenVersion: { increment: 1 } },
        select: userSelect,
      });

      sendSuccess(res, { user }, 'User account disabled');
    } catch (error) {
      next(error);
    }
  },

  // POST /api/users/:id/enable  — re-enable a disabled account (restores verified)
  enable: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) throw ApiError.notFound('User not found');
      if (existing.status !== 'disabled') throw ApiError.conflict('Only disabled accounts can be re-enabled');
      if (existing.role === 'admin') throw ApiError.forbidden('Admin accounts cannot be re-enabled here');

      const user = await prisma.user.update({
        where: { id },
        data: { status: 'verified', verifiedAt: new Date(), tokenVersion: { increment: 1 } },
        select: userSelect,
      });

      sendSuccess(res, { user }, 'User account re-enabled');
    } catch (error) {
      next(error);
    }
  },
};
