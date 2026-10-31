// ============================================================
// Incident Controller
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { Prisma, IncidentStatus } from '@prisma/client';

import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/response';
import type {   createIncidentSchema,
  updateIncidentStatusSchema,
 } from "./incident.schema";
import type { z } from "zod";

type CreateInput = z.input<typeof createIncidentSchema>['body'];
type UpdateStatusInput = z.input<typeof updateIncidentStatusSchema>['body'];

const incidentInclude = {
  reportedBy: {
    select: { id: true, firstName: true, lastName: true, username: true },
  },
  handledBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  resident: {
    select: {
      id: true,
      houseNumber: true,
      street: true,
      barangay: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.IncidentInclude;

export const incidentController = {
  // GET /api/incidents?search=&status=&page=&limit=
  // Residents: only their own reports. Officers/admin: all.
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, status, sort, page = '1', limit = '20' } = req.query;
      const role = req.user!.role;
      const dateOrder = sort === 'oldest' ? 'asc' : 'desc';

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));

      const where: Prisma.IncidentWhereInput = {};

      if (role === 'resident') {
        where.reportedById = req.user!.userId;
      }

      if (
        status &&
        ['pending', 'investigating', 'resolved', 'rejected'].includes(String(status))
      ) {
        where.status = status as IncidentStatus;
      }

      if (search) {
        const term = String(search).trim();
        where.OR = [
          { title: { contains: term } },
          { incidentType: { contains: term } },
          { location: { contains: term } },
        ];
      }

      const [total, incidents] = await Promise.all([
        prisma.incident.count({ where }),
        prisma.incident.findMany({
          where,
          include: incidentInclude,
          orderBy: { dateIncident: dateOrder },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      sendSuccess(res, {
        incidents,
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

  // GET /api/incidents/:id
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: req.params.id },
        include: incidentInclude,
      });
      if (!incident) throw ApiError.notFound('Incident not found');

      if (
        req.user!.role === 'resident' &&
        incident.reportedById !== req.user!.userId
      ) {
        throw ApiError.forbidden('You can only view incidents you reported');
      }

      sendSuccess(res, { incident });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/incidents - report an incident
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        incidentType,
        title,
        description,
        location,
        dateIncident,
        complainantName,
        complainantContact,
        respondentName,
        involvedPerson,
      } = req.body as CreateInput;

      const resident = await prisma.resident.findUnique({
        where: { userId: req.user!.userId },
        select: { id: true },
      });

      const incident = await prisma.incident.create({
        data: {
          incidentType,
          title,
          description,
          location,
          dateIncident: new Date(dateIncident),
          complainantName: complainantName || '',
          complainantContact: complainantContact || '',
          respondentName: respondentName || '',
          involvedPerson: involvedPerson || '',
          reportedById: req.user!.userId,
          residentId: resident?.id,
          status: 'pending',
        },
        include: incidentInclude,
      });

      sendSuccess(res, { incident }, 'Incident reported', 201);
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/incidents/:id - update status/remarks (officer/admin)
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.incident.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw ApiError.notFound('Incident not found');

      const body = (req.body || {}) as UpdateStatusInput;
      const data: Prisma.IncidentUpdateInput = {};

      if (body.status !== undefined) {
        data.status = body.status as IncidentStatus;
        data.handledBy = { connect: { id: req.user!.userId } };
        data.resolvedAt =
          body.status === 'resolved' || body.status === 'rejected'
            ? new Date()
            : null;
      }
      if (body.remarks !== undefined) data.remarks = body.remarks;
      if (body.actionTaken !== undefined) data.actionTaken = body.actionTaken;

      const incident = await prisma.incident.update({
        where: { id: existing.id },
        data,
        include: incidentInclude,
      });

      sendSuccess(res, { incident }, 'Incident updated');
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/incidents/:id - admin
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.incident.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw ApiError.notFound('Incident not found');

      await prisma.incident.delete({ where: { id: existing.id } });
      sendSuccess(res, null, 'Incident deleted');
    } catch (error) {
      next(error);
    }
  },
};
