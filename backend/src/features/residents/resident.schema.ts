// ============================================================
// Resident Validation Schemas
// ============================================================
import { z } from 'zod';

const residentBody = z.object({
  birthDate: z.coerce.date().nullable().optional(),
  birthPlace: z.string().max(200).optional(),
  age: z.coerce.number().int().min(0).max(150).optional(),
  gender: z.string().max(20).optional(),
  civilStatus: z.string().max(30).optional(),
  religion: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  alias: z.string().max(100).optional(),

  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  houseNumber: z.string().max(50).optional(),
  street: z.string().max(200).optional(),
  purok: z.string().max(100).optional(),
  barangay: z.string().max(100).optional(),
  municipality: z.string().max(100).optional(),
  zipCode: z.string().max(10).optional(),
  address: z.string().max(1000).optional(),

  householdRole: z.string().max(100).optional(),
  householdSize: z.coerce.number().int().min(1).max(50).optional(),

  fatherName: z.string().max(200).optional(),
  motherName: z.string().max(200).optional(),
  guardian: z.string().max(200).optional(),
  guardianPhone: z.string().max(20).optional(),

  occupation: z.string().max(200).optional(),
  employerName: z.string().max(200).optional(),
  bloodType: z.string().max(10).optional(),

  isSenior: z.boolean().optional(),
  isPWD: z.boolean().optional(),
  pwdInfo: z.string().max(500).optional(),
  isSingleParent: z.boolean().optional(),
  isVoter: z.boolean().optional(),
  is4Ps: z.boolean().optional(),
  isWRA: z.boolean().optional(),

  emergencyContactName: z.string().max(200).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyContactRelation: z.string().max(100).optional(),
});

export const updateResidentSchema = z.object({
  body: residentBody.partial(),
});

export const updateOwnResidentSchema = z.object({
  body: residentBody.partial(),
});
