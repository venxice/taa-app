// ============================================================
// Official Controller - HOA officials CRUD
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/response';
import type {   createOfficialSchema,
  updateOfficialSchema,
 } from "./official.schema";
import type { z } from "zod";

type CreateInput = z.input<typeof createOfficialSchema>['body'];
type UpdateInput = z.input<typeof updateOfficialSchema>['body'];

export const officialController = {
  // GET /api/officials?active=&search=
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { active, search } = req.query;

      const where: Prisma.OfficialWhereInput = {};
      if (active === 'true') where.isActive = true;
      else if (active === 'false') where.isActive = false;

      if (search) {
        const term = String(search).trim();
        where.OR = [
          { firstName: { contains: term } },
          { lastName: { contains: term } },
          { position: { contains: term } },
        ];
      }

      const officials = await prisma.official.findMany({
        where,
        orderBy: [{ positionOrder: 'asc' }, { createdAt: 'desc' }],
      });

      sendSuccess(res, { officials, total: officials.length });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/officials/:id
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const official = await prisma.official.findUnique({
        where: { id: req.params.id },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!official) throw ApiError.notFound('Official not found');
      sendSuccess(res, { official });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/officials - hoa_officer, admin
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as CreateInput;

      const official = await prisma.official.create({
        data: {
          firstName: body.firstName,
          middleName: body.middleName || '',
          lastName: body.lastName,
          suffix: body.suffix || '',
          position: body.position,
          positionOrder: body.positionOrder ?? 0,
          termFrom: body.termFrom ? new Date(body.termFrom) : null,
          termTo: body.termTo ? new Date(body.termTo) : null,
          isActive: body.isActive ?? true,
          contactNumber: body.contactNumber || '',
          email: body.email || '',
          address: body.address || '',
          createdById: req.user!.userId,
        },
      });

      sendSuccess(res, { official }, 'Official added', 201);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/officials/:id - hoa_officer, admin
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.official.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw ApiError.notFound('Official not found');

      const body = (req.body || {}) as UpdateInput;
      const data: Prisma.OfficialUpdateInput = {};

      const stringFields = [
        'firstName', 'middleName', 'lastName', 'suffix',
        'position', 'contactNumber', 'email', 'address',
      ] as const;
      for (const field of stringFields) {
        if (body[field] !== undefined) {
          (data as Record<string, unknown>)[field] = body[field];
        }
      }
      if (body.positionOrder !== undefined) data.positionOrder = body.positionOrder;
      if (body.isActive !== undefined) data.isActive = body.isActive;
      if (body.termFrom !== undefined) {
        data.termFrom = body.termFrom ? new Date(body.termFrom) : null;
      }
      if (body.termTo !== undefined) {
        data.termTo = body.termTo ? new Date(body.termTo) : null;
      }

      const official = await prisma.official.update({
        where: { id: existing.id },
        data,
      });

      sendSuccess(res, { official }, 'Official updated');
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/officials/:id - admin (officers can deactivate instead)
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.official.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw ApiError.notFound('Official not found');

      await prisma.official.delete({ where: { id: existing.id } });
      sendSuccess(res, null, 'Official deleted');
    } catch (error) {
      next(error);
    }
  },
};
