// ============================================================
// Payment Controller
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { Prisma, PaymentStatus } from '@prisma/client';

import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/response';
import {
  createDues,
  deletePayment,
  getEffectivePaymentStatus,
  getHouseholdPaymentSummary,
  paymentInclude,
  reviewPayment,
  updatePayment,
} from './payment.service';

export const paymentController = {
  // GET /api/payments/report - per-household statement and delinquency summary
  report: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const residents = await prisma.resident.findMany({
        include: {
          user: { select: { id: true, firstName: true, lastName: true, username: true } },
          payments: { orderBy: { dueDate: 'asc' } },
        },
        orderBy: { user: { lastName: 'asc' } },
      });
      const households = residents.map((resident) => {
        const summary = getHouseholdPaymentSummary(resident.payments);
        return {
          residentId: resident.id,
          residentName: `${resident.user.firstName} ${resident.user.lastName}`,
          username: resident.user.username,
          houseNumber: resident.houseNumber,
          street: resident.street,
          ...summary,
          payments: resident.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
        };
      });
      sendSuccess(res, { households, totals: {
        households: households.length,
        paid: households.filter((row) => row.status === 'paid').length,
        partial: households.filter((row) => row.status === 'partial').length,
        unpaid: households.filter((row) => row.status === 'unpaid').length,
        overdue: households.filter((row) => row.status === 'overdue').length,
        outstanding: households.reduce((sum, row) => sum + row.outstanding, 0),
      } });
    } catch (error) { next(error); }
  },
  // GET /api/payments?search=&status=&page=&limit=
  // Residents: own payments only. Officers/admin: all.
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, status, page = '1', limit = '20' } = req.query;
      const role = req.user!.role;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));

      const where: Prisma.PaymentWhereInput = {};

      if (role === 'resident') {
        const resident = await prisma.resident.findUnique({
          where: { userId: req.user!.userId },
          select: { id: true },
        });
        where.residentId = resident?.id || '__none__';
      }

      if (
        status &&
        ['pending', 'confirmed', 'rejected', 'overdue'].includes(String(status))
      ) {
        where.status = status as PaymentStatus;
      }

      if (search) {
        const term = String(search).trim();
        where.OR = [
          { title: { contains: term } },
          { receiptNumber: { contains: term } },
          { resident: { user: { firstName: { contains: term } } } },
          { resident: { user: { lastName: { contains: term } } } },
        ];
      }

      const [total, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          include: paymentInclude,
          orderBy: { dueDate: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      // Decimal serialization
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const serialized = payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
        status: getEffectivePaymentStatus(p),
      }));

      sendSuccess(res, {
        payments: serialized,
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

  // GET /api/payments/:id
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: req.params.id },
        include: paymentInclude,
      });
      if (!payment) throw ApiError.notFound('Payment not found');

      if (req.user!.role === 'resident' && payment.resident.user.id !== req.user!.userId) {
        throw ApiError.forbidden('You can only view your own payments');
      }

      sendSuccess(res, { payment: { ...payment, amount: Number(payment.amount), status: getEffectivePaymentStatus(payment) } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/payments - officers/admin create a dues record
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payments = await createDues(req.body, req.user!.userId);
      const serializedPayments = payments.map((payment) => ({ ...payment, amount: Number(payment.amount) }));

      sendSuccess(
        res,
        { payments: serializedPayments, payment: serializedPayments[0] },
        `Payment record created for ${serializedPayments.length} resident${serializedPayments.length === 1 ? '' : 's'}`,
        201
      );
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/payments/:id - resident submits/updates proof of payment
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isStaff = req.user!.role !== 'resident';
      const payment = await updatePayment(req.params.id, req.user!.userId, isStaff, req.body);

      sendSuccess(
        res,
        { payment: { ...payment, amount: Number(payment.amount) } },
        isStaff ? 'Due updated' : 'Payment reference submitted for review'
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return next(ApiError.conflict('This payment reference has already been used for another due'));
      }
      next(error);
    }
  },

  // POST /api/payments/:id/confirm - officer/admin confirms or rejects
  confirm: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const payment = await reviewPayment(req.params.id, req.user!.userId, req.body);

      sendSuccess(
        res,
        { payment: { ...payment, amount: Number(payment.amount) } },
        status === 'confirmed' ? 'Payment confirmed' : 'Payment rejected'
      );
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/payments/:id - admin
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deletePayment(req.params.id, req.user!.userId);
      sendSuccess(res, null, 'Payment deleted');
    } catch (error) {
      next(error);
    }
  },
};
