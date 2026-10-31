// ============================================================
// Incident Validation Schemas
// ============================================================
import { z } from 'zod';

export const createIncidentSchema = z.object({
  body: z.object({
    incidentType: z.string().min(1, 'Incident type is required'),
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().min(1, 'Description is required').max(5000),
    location: z.string().min(1, 'Location is required'),
    dateIncident: z.coerce.date(),
    complainantName: z.string().max(200).optional(),
    complainantContact: z.string().max(50).optional(),
    respondentName: z.string().max(200).optional(),
    involvedPerson: z.string().max(200).optional(),
  }),
});

export const updateIncidentStatusSchema = z
  .object({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
      status: z.enum(['pending', 'investigating', 'resolved', 'rejected']),
      remarks: z.string().trim().max(5000).optional(),
      actionTaken: z.string().max(5000).optional(),
    }),
  })
  .superRefine(({ body }, ctx) => {
    if (!body.remarks?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['body', 'remarks'],
        message: 'A reason or status update note is required',
      });
    }
  });
