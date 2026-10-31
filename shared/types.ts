// ============================================================
// SHARED: Core Entity Types (matches Prisma schema)
// ============================================================

import type { UserRole, UserStatus, IncidentStatus, PaymentStatus } from './roles';

export interface User {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  avatar?: string;
  avatarPath?: string;
  verifiedById?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  resident?: Resident | null;
}

export interface Resident {
  id: string;
  userId: string;
  residenceId?: string;
  birthDate?: string;
  birthPlace?: string;
  age?: number;
  gender?: string;
  civilStatus?: string;
  religion?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  houseNumber?: string;
  street?: string;
  purok?: string;
  barangay?: string;
  municipality?: string;
  zipCode?: string;
  address?: string;
  householdRole?: string;
  householdSize?: number;
  fatherName?: string;
  motherName?: string;
  guardian?: string;
  guardianPhone?: string;
  occupation?: string;
  employerName?: string;
  bloodType?: string;
  isSenior?: boolean;
  isPWD?: boolean;
  pwdInfo?: string;
  isSingleParent?: boolean;
  isVoter?: boolean;
  is4Ps?: boolean;
  isWRA?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  isPinned: boolean;
  imageUrl: string | null;
  authorId: string;
  author?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  incidentType: string;
  title: string;
  description: string;
  location: string;
  dateIncident: string;
  dateReported: string;
  reportedById?: string;
  residentId?: string;
  complainantName?: string;
  complainantContact?: string;
  respondentName?: string;
  involvedPerson?: string;
  status: IncidentStatus;
  remarks?: string;
  actionTaken?: string;
  resolvedAt?: string;
  handledById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  residentId: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: PaymentStatus;
  receiptNumber?: string;
  proofOfPayment?: string;
  verifiedById?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Official {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  position: string;
  positionOrder: number;
  termFrom?: string;
  termTo?: string;
  isActive: boolean;
  birthDate?: string;
  gender?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  avatar?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Auth
export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  username: string;
  password: string;
  phone?: string;
  // Residency details collected during registration (for HOA verification)
  address?: string;
  householdRole?: string;
  householdSize?: number;
}
