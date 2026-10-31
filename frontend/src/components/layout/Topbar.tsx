'use client';

import Link from 'next/link';
import { LogOut, UserCircle, ChevronDown } from 'lucide-react';
import type { UserRole } from '@shared/roles';
import { ROLE_ROUTES } from '@shared/roles';
import { ROLE_LABEL } from './nav';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/Dropdown';

export function Topbar({
  role,
  name,
  onLogout,
}: {
  role: UserRole;
  name: string;
  onLogout: () => void;
}) {
  const profileHref = `${ROLE_ROUTES[role]}/profile`;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:h-16 sm:px-6">
      {/* App brand — mobile/tablet (desktop shows it in the sidebar) */}
      <div className="flex min-w-0 items-center gap-2 lg:hidden">
        <Logo size={32} chip />
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-bold tracking-tight text-slate-900">TAA-App</p>
          <p className="text-[10px] text-slate-400">Teremil Subdivision</p>
        </div>
      </div>

      {/* Shared context — page titles live in each page's content header */}
      <div className="hidden items-center gap-2.5 lg:flex">
        <span className="h-2 w-2 rounded-full bg-brand-600" />
        <span className="text-sm font-medium text-slate-500">Teremil Community Portal</span>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="hidden sm:inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100">
          {ROLE_LABEL[role]}
        </span>

        {/* Account menu — mobile/tablet only (desktop uses the sidebar) */}
        <div className="lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Open menu"
                className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <Avatar name={name} size="sm" />
                <ChevronDown size={15} className="text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>
                <span className="block text-xs text-slate-400">Signed in as</span>
                <span className="block text-sm font-semibold text-slate-800 normal-case tracking-normal truncate max-w-[12rem]">
                  {name}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={profileHref}>
                  <UserCircle size={16} /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem danger onSelect={() => onLogout()}>
                <LogOut size={16} /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
