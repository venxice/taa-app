import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import {
  assertPaymentCanAcceptReference,
  assertPaymentCanBeChanged,
  assertPaymentCanBeReviewed,
} from './payment.rules';
export { getEffectivePaymentStatus, getHouseholdPaymentSummary } from './payment.rules';
import type {
  createPaymentSchema,
  updatePaymentSchema,
  confirmPaymentSchema,
} from './payment.schema';
import type { z } from 'zod';

export type CreatePaymentInput = z.input<typeof createPaymentSchema>['body'];
export type UpdatePaymentInput = z.input<typeof updatePaymentSchema>['body'];
export type ConfirmPaymentInput = z.input<typeof confirmPaymentSchema>['body'];

export const paymentInclude = {
  resident: {
    select: {
      id: true,
      houseNumber: true,
      street: true,
      barangay: true,
      user: { select: { id: true, firstName: true, lastName: true, username: true } },
    },
  },
  verifiedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.PaymentInclude;

export async function createDues(input: CreatePaymentInput, actorId: string) {
  const financeSetting = await prisma.financeSetting.findUnique({ where: { id: 'global' } });
  if (financeSetting?.duesSuspended) throw ApiError.conflict('Dues are currently suspended');

  const { residentId, residentIds, title, description, amount, dueDate } = input;
  const targetResidentIds = [...new Set(residentIds ?? (residentId ? [residentId] : []))];
  if (targetResidentIds.length === 0) throw ApiError.badRequest('Select at least one resident');

  const existingResidents = await prisma.resident.findMany({
    where: { id: { in: targetResidentIds } },
    select: { id: true },
  });
  if (existingResidents.length !== targetResidentIds.length) {
    throw ApiError.notFound('One or more residents were not found');
  }

  return prisma.$transaction(async (tx) => {
    const created = [];
    for (const targetId of targetResidentIds) {
      const payment = await tx.payment.create({
        data: { residentId: targetId, title, description, amount, dueDate: new Date(dueDate), status: 'pending' },
        include: paymentInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId,
          entity: 'payment',
          entityId: payment.id,
          action: 'dues_created',
          details: JSON.stringify({ residentId: targetId, amount, dueDate }),
        },
      });
      created.push(payment);
    }
    return created;
  });
}

export async function updatePayment(
  paymentId: string,
  actorId: string,
  isStaff: boolean,
  body: UpdatePaymentInput
) {
  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { resident: { select: { userId: true } } },
  });
  if (!existing) throw ApiError.notFound('Payment not found');

  const isOwner = existing.resident.userId === actorId;
  if (!isOwner && !isStaff) throw ApiError.forbidden('You can only update your own payments');

  if (isOwner) {
    if (Object.keys(body).some((key) => key !== 'proofOfPayment')) {
      throw ApiError.forbidden('Residents can only submit a payment reference');
    }
    const reference = body.proofOfPayment?.trim();
    if (!reference) throw ApiError.badRequest('Enter a payment reference');
    assertPaymentCanAcceptReference(existing);

    return prisma.$transaction(async (tx) => {
      const priorUse = await tx.paymentReference.findUnique({ where: { reference } });
      if (priorUse && priorUse.paymentId !== existing.id) {
        throw ApiError.conflict('This payment reference has already been used for another due');
      }
      if (!priorUse) {
        await tx.paymentReference.create({
          data: { reference, paymentId: existing.id },
        });
      }
      const result = await tx.payment.updateMany({
        where: { id: existing.id, status: existing.status, proofOfPayment: existing.proofOfPayment },
        data: {
          proofOfPayment: reference,
          receiptNumber: reference,
          paymentDate: new Date(),
          status: 'pending',
          rejectionReason: null,
          verifiedById: null,
          verifiedAt: null,
        },
      });
      if (result.count !== 1) throw ApiError.conflict('This due changed. Refresh and try again.');
      await tx.auditLog.create({ data: { actorId, entity: 'payment', entityId: existing.id, action: 'proof_submitted', details: 'Payment reference submitted' } });
      return tx.payment.findUniqueOrThrow({ where: { id: existing.id }, include: paymentInclude });
    });
  }

  if (!isStaff) throw ApiError.forbidden('You can only update your own payments');
  if (body.proofOfPayment !== undefined) throw ApiError.forbidden('Staff cannot submit a resident payment reference');
  assertPaymentCanBeChanged(existing);

  const data: Prisma.PaymentUpdateInput = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.amount !== undefined) data.amount = body.amount;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({ where: { id: existing.id }, data, include: paymentInclude });
    await tx.auditLog.create({ data: { actorId, entity: 'payment', entityId: updated.id, action: 'payment_updated', details: JSON.stringify(Object.keys(body)) } });
    return updated;
  });
}

export async function reviewPayment(paymentId: string, actorId: string, body: ConfirmPaymentInput) {
  const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!existing) throw ApiError.notFound('Payment not found');
  assertPaymentCanBeReviewed(existing);

  return prisma.$transaction(async (tx) => {
    const result = await tx.payment.updateMany({
      where: { id: paymentId, status: 'pending', proofOfPayment: existing.proofOfPayment },
      data: {
        status: body.status,
        verifiedById: actorId,
        verifiedAt: new Date(),
        rejectionReason: body.status === 'rejected' ? body.rejectionReason!.trim() : null,
      },
    });
    if (result.count !== 1) throw ApiError.conflict('This payment was already reviewed. Refresh the page.');
    await tx.auditLog.create({
      data: {
        actorId,
        entity: 'payment',
        entityId: paymentId,
        action: body.status === 'confirmed' ? 'payment_confirmed' : 'payment_rejected',
        details: body.status === 'rejected' ? body.rejectionReason!.trim() : null,
      },
    });
    return tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: paymentInclude });
  });
}

export async function deletePayment(paymentId: string, actorId: string) {
  const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!existing) throw ApiError.notFound('Payment not found');
  assertPaymentCanBeChanged(existing);

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({ data: { actorId, entity: 'payment', entityId: existing.id, action: 'payment_deleted' } });
    await tx.payment.delete({ where: { id: existing.id } });
  });
}
