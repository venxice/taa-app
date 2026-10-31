// ============================================================
// User Management Validation Schemas
// ============================================================
import { z } from 'zod';

export const verifyUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['verified', 'rejected', 'suspended']),
    rejectionReason: z.string().max(5000).optional(),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(20).optional(),
    role: z.enum(['resident', 'hoa_officer', 'admin']).optional(),
    status: z.enum(['pending', 'verified', 'rejected', 'suspended', 'disabled']).optional(),
  }),
});

// Self-service: any signed-in user edits their own login details
export const updateOwnProfileSchema = z.object({
  body: z.object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9._-]+$/, 'Only letters, numbers, dot, dash and underscore')
      .optional(),
    email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
    phone: z.string().trim().max(20, 'Contact number is too long').optional(),
  }),
});
