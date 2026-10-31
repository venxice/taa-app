// ============================================================
// SHARED: User Roles & Permissions (Frontend + Backend)
// ============================================================

export type UserRole = 'resident' | 'hoa_officer' | 'admin';

export type UserStatus = 'pending' | 'verified' | 'rejected' | 'suspended' | 'disabled';

export type IncidentStatus = 'pending' | 'investigating' | 'resolved' | 'rejected';

export type PaymentStatus = 'pending' | 'confirmed' | 'rejected' | 'overdue';

// Route access by role
export const ROLE_ROUTES: Record<UserRole, string> = {
  resident: '/resident',
  hoa_officer: '/hoa',
  admin: '/admin',
};

// Dashboard redirect after login
export function getDashboardRoute(role: UserRole): string {
  return ROLE_ROUTES[role];
}

// Permission checks
export const PERMISSIONS = {
  // Verification
  verifyUsers: ['hoa_officer', 'admin'] as UserRole[],

  // Announcements
  viewAnnouncements: ['resident', 'hoa_officer', 'admin'] as UserRole[],
  createAnnouncements: ['hoa_officer', 'admin'] as UserRole[],
  deleteAnnouncements: ['admin'] as UserRole[],

  // Incidents
  viewIncidents: ['resident', 'hoa_officer', 'admin'] as UserRole[],
  reportIncidents: ['resident', 'hoa_officer', 'admin'] as UserRole[],
  confirmIncidents: ['hoa_officer', 'admin'] as UserRole[],
  editIncidents: ['hoa_officer', 'admin'] as UserRole[],

  // Payments
  viewOwnPayments: ['resident'] as UserRole[],
  viewAllPayments: ['hoa_officer', 'admin'] as UserRole[],
  confirmPayments: ['hoa_officer', 'admin'] as UserRole[],
  editPayments: ['admin'] as UserRole[],

  // Officials
  viewOfficials: ['resident', 'hoa_officer', 'admin'] as UserRole[],
  manageOfficials: ['hoa_officer', 'admin'] as UserRole[],
  viewOfficialInfo: ['hoa_officer', 'admin'] as UserRole[],

  // Users
  viewUsers: ['hoa_officer', 'admin'] as UserRole[],
  viewUserProfile: ['hoa_officer', 'admin'] as UserRole[],
} as const;

export function hasPermission(role: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[permission].includes(role);
}
