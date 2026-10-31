import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/response';

const incomeStreams = ['HO Contributions', 'NU Foods', 'Compound', 'Court', 'Other'];
const expenseCategories = ['Security', 'Maintenance', 'Utilities', 'Other'];

export const financeController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [entries, setting, auditLogs] = await Promise.all([
        prisma.financeEntry.findMany({
          include: { recordedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { entryDate: 'desc' },
        }),
        prisma.financeSetting.upsert({ where: { id: 'global' }, create: { id: 'global' }, update: {} }),
        req.user?.role === 'admin'
          ? prisma.auditLog.findMany({
              where: { entity: { in: ['payment', 'finance_entry', 'finance_setting'] } },
              include: { actor: { select: { firstName: true, lastName: true, username: true } } },
              orderBy: { createdAt: 'desc' }, take: 100,
            })
          : Promise.resolve([]),
      ]);
      const serialized = entries.map((entry) => ({ ...entry, amount: Number(entry.amount) }));
      const income = serialized.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
      const expenses = serialized.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + entry.amount, 0);
      sendSuccess(res, { entries: serialized, auditLogs, summary: { income, expenses, balance: income - expenses }, duesSuspended: setting.duesSuspended, incomeStreams, expenseCategories });
    } catch (error) { next(error); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, category, source, description, amount, entryDate } = req.body as Record<string, unknown>;
      if (type !== 'income' && type !== 'expense') throw ApiError.badRequest('Choose income or expense');
      const allowed = type === 'income' ? incomeStreams : expenseCategories;
      if (typeof category !== 'string' || !allowed.includes(category)) throw ApiError.badRequest('Choose a valid category');
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw ApiError.badRequest('Amount must be greater than zero');
      if (typeof description !== 'string' || !description.trim()) throw ApiError.badRequest('Description is required');
      const parsedDate = new Date(String(entryDate));
      if (Number.isNaN(parsedDate.getTime())) throw ApiError.badRequest('Enter a valid date');
      const entry = await prisma.financeEntry.create({
        data: { type, category, source: typeof source === 'string' ? source.trim() || null : null, description: description.trim(), amount: numericAmount, entryDate: parsedDate, recordedById: req.user!.userId },
      });
      await prisma.auditLog.create({ data: { actorId: req.user!.userId, entity: 'finance_entry', entityId: entry.id, action: `${type}_recorded`, details: JSON.stringify({ category, amount: numericAmount }) } });
      sendSuccess(res, { entry: { ...entry, amount: Number(entry.amount) } }, 'Finance entry recorded', 201);
    } catch (error) { next(error); }
  },
  setDuesSuspended: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (typeof req.body?.duesSuspended !== 'boolean') throw ApiError.badRequest('duesSuspended must be true or false');
      const setting = await prisma.financeSetting.upsert({ where: { id: 'global' }, create: { id: 'global', duesSuspended: req.body.duesSuspended }, update: { duesSuspended: req.body.duesSuspended } });
      await prisma.auditLog.create({ data: { actorId: req.user!.userId, entity: 'finance_setting', action: 'dues_suspension_changed', details: String(setting.duesSuspended) } });
      sendSuccess(res, { duesSuspended: setting.duesSuspended }, 'Dues setting updated');
    } catch (error) { next(error); }
  },
};
