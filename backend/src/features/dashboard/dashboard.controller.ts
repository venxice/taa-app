// ============================================================
// Dashboard Controller - stats per role
// ============================================================
import { Request, Response, NextFunction } from 'express';

import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/response';

export const dashboardController = {
  // GET /api/dashboard
  stats: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = req.user!.role;

      if (role === 'resident') {
        const resident = await prisma.resident.findUnique({
          where: { userId: req.user!.userId },
          select: { id: true },
        });

        const [announcements, myIncidents, myPayments] = await Promise.all([
          prisma.announcement.count({ where: { isPublished: true } }),
          prisma.incident.count({ where: { reportedById: req.user!.userId } }),
          resident
            ? prisma.payment.count({
                where: {
                  residentId: resident.id,
                  status: { in: ['pending', 'overdue', 'rejected'] },
                },
              })
            : 0,
        ]);

        return sendSuccess(res, {
          role,
          announcements,
          myIncidents,
          pendingPayments: myPayments,
        });
      }

      // Officer / Admin stats
      const [
        pendingVerifications,
        announcements,
        openIncidents,
        pendingPayments,
        registeredUsers,
        activeOfficials,
        totalResidents,
        confirmedPayments,
      ] = await Promise.all([
        prisma.user.count({ where: { status: 'pending' } }),
        prisma.announcement.count(),
        prisma.incident.count({
          where: { status: { in: ['pending', 'investigating'] } },
        }),
        prisma.payment.count({ where: { status: 'pending' } }),
        prisma.user.count(),
        prisma.official.count({ where: { isActive: true } }),
        prisma.resident.count(),
        prisma.payment.findMany({
          where: { status: 'confirmed' },
          select: { amount: true },
        }),
      ]);

      const totalCollected = confirmedPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      sendSuccess(res, {
        role,
        pendingVerifications,
        announcements,
        openIncidents,
        pendingPayments,
        registeredUsers,
        activeOfficials,
        totalResidents,
        totalCollected,
      });
    } catch (error) {
      next(error);
    }
  },

  // Legacy list route (kept for route compatibility)
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      throw ApiError.notFound('Use GET /api/dashboard/stats');
    } catch (error) {
      next(error);
    }
  },
  get: async (_req: Request, res: Response, next: NextFunction) => {
    next(ApiError.notFound('Not found'));
  },
  create: async (_req: Request, res: Response, next: NextFunction) => {
    next(ApiError.notFound('Not found'));
  },
  update: async (_req: Request, res: Response, next: NextFunction) => {
    next(ApiError.notFound('Not found'));
  },
  remove: async (_req: Request, res: Response, next: NextFunction) => {
    next(ApiError.notFound('Not found'));
  },
};
