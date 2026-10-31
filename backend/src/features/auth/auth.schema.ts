// ============================================================
// Auth Validation Schemas (Zod)
// ============================================================
import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').max(100),
    middleName: z.string().max(100).optional(),
    lastName: z.string().min(1, 'Last name is required').max(100),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    username: z.string().min(3, 'Username must be at least 3 characters').max(50),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
    phone: z.string().max(20).optional().or(z.literal('')),

    // Residency details collected at registration (for HOA verification)
    address: z.string().max(1000).optional().or(z.literal('')),
    householdRole: z.string().max(100).optional().or(z.literal('')),
    householdSize: z.coerce.number().int().min(1).max(50).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required').max(100),
    password: z.string().min(1, 'Password is required').max(100),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
