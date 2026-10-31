// ============================================================
// Payment Validation Schemas
// ============================================================
import { z } from 'zod';

export const createPaymentSchema = z.object({
  body: z.object({
    residentId: z.string().min(1).optional(),
    residentIds: z.array(z.string().min(1)).min(1).optional(),
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().min(1, 'Description is required').max(5000),
    amount: z.coerce.number().positive('Amount must be positive'),
    dueDate: z.coerce.date(),
  }).refine((body) => Boolean(body.residentId || body.residentIds?.length), {
    message: 'Select at least one resident',
    path: ['residentIds'],
  }),
});

export const updatePaymentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    amount: z.coerce.number().positive().optional(),
    dueDate: z.coerce.date().optional(),
    proofOfPayment: z.string().trim().min(1).max(255).optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, {
    message: 'Provide a payment update',
  }),
});

export const confirmPaymentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['confirmed', 'rejected']),
    rejectionReason: z.string().max(5000).optional(),
  }).superRefine((body, ctx) => {
    if (body.status === 'rejected' && !body.rejectionReason?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rejectionReason'], message: 'A reason is required when rejecting a payment' });
    }
  }),
});
