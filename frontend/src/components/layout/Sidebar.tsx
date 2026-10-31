'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import type { UserRole } from '@shared/roles';
import { NAV_BY_ROLE, ROLE_LABEL } from './nav';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';

export function Sidebar({
  role,
  name,
  onLogout,
}: {
  role: UserRole;
  name: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Brand */}
      <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-brand-500/45 to-transparent"
        />
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo size={38} chip />
          <div className="leading-tight">
            <p className="font-bold tracking-tight text-slate-900">TAA-App</p>
            <p className="text-[11px] text-slate-400">Teremil Subdivision</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menu
        </p>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 active:scale-[0.98]',
                active
                  ? 'bg-brand-50 font-semibold text-brand-800'
                  : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon
                size={19}
                strokeWidth={active ? 2.4 : 2}
                className={clsx(
                  'shrink-0 transition-colors',
                  active ? 'text-brand-700' : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-2.5 py-2.5 ring-1 ring-slate-100">
          <Avatar name={name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
            <p className="text-[11px] text-slate-400">{ROLE_LABEL[role]}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="rounded-lg p-2 text-slate-400 ring-1 ring-transparent transition hover:bg-white hover:text-red-600 hover:ring-red-100"
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
