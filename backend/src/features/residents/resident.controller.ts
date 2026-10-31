// ============================================================
// Resident Controller - Profile management
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';

import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/response';
import type { updateResidentSchema } from './resident.schema';

type UpdateResidentInput = z.input<typeof updateResidentSchema>['body'];

// Helpers -------------------------------------------------

async function getResidentByUserId(userId: string) {
  return prisma.resident.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
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
        },
      },
    },
  });
}

function buildResidentData(body: UpdateResidentInput): Prisma.ResidentUpdateInput {
  const data: Prisma.ResidentUpdateInput = {};

  const stringFields = [
    'birthPlace', 'gender', 'civilStatus', 'religion', 'nationality', 'alias',
    'email', 'phone', 'houseNumber', 'street', 'purok', 'barangay',
    'municipality', 'zipCode', 'address', 'householdRole',
    'fatherName', 'motherName', 'guardian', 'guardianPhone',
    'occupation', 'employerName', 'bloodType', 'pwdInfo',
    'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
  ] as const;

  for (const field of stringFields) {
    if (body[field] !== undefined) {
      (data as Record<string, unknown>)[field] = body[field];
    }
  }

  if (body.birthDate !== undefined) {
    data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
  }
  if (body.age !== undefined) data.age = Number(body.age);
  if (body.householdSize !== undefined) data.householdSize = Number(body.householdSize);

  const booleanFields = [
    'isSenior', 'isPWD', 'isSingleParent', 'isVoter', 'is4Ps', 'isWRA',
  ] as const;
  for (const field of booleanFields) {
    if (body[field] !== undefined) {
      (data as Record<string, unknown>)[field] = Boolean(body[field]);
    }
  }

  return data;
}

function buildUserFromResident(body: UpdateResidentInput): Prisma.UserUpdateInput {
  const user: Prisma.UserUpdateInput = {};
  if (body.email !== undefined) user.email = body.email || null;
  if (body.phone !== undefined) user.phone = body.phone || null;
  return user;
}

// Controller ----------------------------------------------

export const residentController = {
  // GET /api/residents/me - current user's profile
  me: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resident = await getResidentByUserId(req.user!.userId);
      if (!resident) throw ApiError.notFound('Resident profile not found');
      sendSuccess(res, { resident });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/residents/me - update own profile
  updateMe: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.resident.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!existing) throw ApiError.notFound('Resident profile not found');

      const body = (req.body || {}) as UpdateResidentInput;
      const residentData = buildResidentData(body);
      const userData = buildUserFromResident(body);

      const [resident] = await prisma.$transaction([
        prisma.resident.update({ where: { id: existing.id }, data: residentData }),
        prisma.user.update({ where: { id: req.user!.userId }, data: userData }),
      ]);

      sendSuccess(res, { resident }, 'Profile updated');
    } catch (error) {
      next(error);
    }
  },

  // GET /api/residents - officers/admin only
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));

      const where: Prisma.ResidentWhereInput = {};
      if (search) {
        const term = String(search).trim();
        where.OR = [
          { user: { firstName: { contains: term } } },
          { user: { lastName: { contains: term } } },
          { user: { username: { contains: term } } },
          { street: { contains: term } },
          { barangay: { contains: term } },
        ];
      }

      const [total, residents] = await Promise.all([
        prisma.resident.count({ where }),
        prisma.resident.findMany({
          where,
          include: {
            user: {
              select: {
                id: true, firstName: true, lastName: true,
                username: true, status: true, role: true, avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      sendSuccess(res, {
        residents,
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

  // GET /api/residents/:id (resident id)
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resident = await prisma.resident.findUnique({
        where: { id: req.params.id },
        include: {
          user: {
            select: {
              id: true, firstName: true, middleName: true, lastName: true,
              email: true, username: true, role: true, status: true,
              phone: true, avatar: true,
            },
          },
        },
      });
      if (!resident) throw ApiError.notFound('Resident not found');

      // Residents may only view their own record
      if (req.user!.role === 'resident' && resident.userId !== req.user!.userId) {
        throw ApiError.forbidden('You can only view your own profile');
      }

      sendSuccess(res, { resident });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/residents/:id - officers/admin
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.resident.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw ApiError.notFound('Resident not found');

      const body = (req.body || {}) as UpdateResidentInput;
      const residentData = buildResidentData(body);
      const userData = buildUserFromResident(body);

      const [resident] = await prisma.$transaction([
        prisma.resident.update({ where: { id: existing.id }, data: residentData }),
        prisma.user.update({ where: { id: existing.userId }, data: userData }),
      ]);

      sendSuccess(res, { resident }, 'Resident updated');
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/residents/:id - admin only (removes resident + user cascade)
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.resident.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw ApiError.notFound('Resident not found');
      if (existing.userId === req.user!.userId) {
        throw ApiError.badRequest('You cannot delete your own profile');
      }

      await prisma.user.delete({ where: { id: existing.userId } });
      sendSuccess(res, null, 'Resident deleted');
    } catch (error) {
      next(error);
    }
  },
};
