import {
  LayoutDashboard,
  Megaphone,
  AlertTriangle,
  CreditCard,
  Users,
  UserCog,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@shared/roles';

export interface NavItem {
  label: string;
  short?: string;
  href: string;
  icon: LucideIcon;
}

// Full navigation is shown for all roles; unfinished modules render their
// current placeholder page until they are implemented.
export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  resident: [
    { label: 'Home', short: 'Home', href: '/resident/dashboard', icon: LayoutDashboard },
    { label: 'Announcements', short: 'News', href: '/resident/announcements', icon: Megaphone },
    { label: 'Incidents', short: 'Report', href: '/resident/incidents', icon: AlertTriangle },
    { label: 'Payments', short: 'Dues', href: '/resident/payments', icon: CreditCard },
    { label: 'Officials', short: 'Officials', href: '/resident/officials', icon: Users },
    { label: 'My Profile', short: 'Profile', href: '/resident/profile', icon: UserCircle },
  ],
  hoa_officer: [
    { label: 'Dashboard', short: 'Home', href: '/hoa/dashboard', icon: LayoutDashboard },
    { label: 'Users', short: 'Users', href: '/hoa/users', icon: UserCog },
    { label: 'Announcements', short: 'News', href: '/hoa/announcements', icon: Megaphone },
    { label: 'Incidents', short: 'Report', href: '/hoa/incidents', icon: AlertTriangle },
    { label: 'Payments', short: 'Dues', href: '/hoa/payments', icon: CreditCard },
    { label: 'Officials', short: 'Officials', href: '/hoa/officials', icon: Users },
    { label: 'My Profile', short: 'Profile', href: '/hoa/profile', icon: UserCircle },
  ],
  admin: [
    { label: 'Dashboard', short: 'Home', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', short: 'Users', href: '/admin/users', icon: UserCog },
    { label: 'Announcements', short: 'News', href: '/admin/announcements', icon: Megaphone },
    { label: 'Incidents', short: 'Report', href: '/admin/incidents', icon: AlertTriangle },
    { label: 'Payments', short: 'Dues', href: '/admin/payments', icon: CreditCard },
    { label: 'Officials', short: 'Officials', href: '/admin/officials', icon: Users },
    { label: 'My Profile', short: 'Profile', href: '/admin/profile', icon: UserCircle },
  ],
};

export const ROLE_LABEL: Record<UserRole, string> = {
  resident: 'Resident',
  hoa_officer: 'HOA Officer',
  admin: 'Administrator',
};

export const ROLE_HOME: Record<UserRole, string> = {
  resident: '/resident/dashboard',
  hoa_officer: '/hoa/dashboard',
  admin: '/admin/dashboard',
};
