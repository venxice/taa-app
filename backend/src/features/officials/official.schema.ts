// ============================================================
// Official Validation Schemas
// ============================================================
import { z } from 'zod';

export const createOfficialSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').max(100),
    middleName: z.string().max(100).optional(),
    lastName: z.string().min(1, 'Last name is required').max(100),
    suffix: z.string().max(20).optional(),
    position: z.string().min(1, 'Position is required').max(100),
    positionOrder: z.coerce.number().int().min(0).optional().default(0),
    // null / '' must stay empty dates — z.coerce.date() would turn null into 1970
    termFrom: z.union([z.literal(''), z.null(), z.coerce.date()]).optional(),
    termTo: z.union([z.literal(''), z.null(), z.coerce.date()]).optional(),
    isActive: z.boolean().optional().default(true),
    contactNumber: z.string().max(20).optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().max(500).optional(),
  }),
});

export const updateOfficialSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: createOfficialSchema.shape.body.partial(),
});
