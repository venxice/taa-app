'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import type { UserRole } from '@shared/roles';
import { NAV_BY_ROLE } from './nav';

/**
 * Mobile bottom navigation styled to match the desktop sidebar.
 */
export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  // Profile is not part of the bottom bar — it lives in the top bar menu
  const items = NAV_BY_ROLE[role].filter((i) => !i.href.endsWith('/profile'));

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 pb-safe lg:hidden">
      <div className="border-t border-slate-100 bg-white shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.32)]">
        <ul className="flex items-stretch justify-between gap-1 px-2 pb-1 pt-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors active:scale-[0.98]',
                    active ? 'bg-brand-50' : 'hover:bg-slate-50'
                  )}
                >
                  <span
                    className={clsx(
                      'flex h-6 w-full max-w-[54px] items-center justify-center transition-colors duration-200',
                      active
                        ? 'text-brand-700'
                        : 'text-slate-400'
                    )}
                  >
                    <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                  </span>
                  <span
                    className={clsx(
                      'w-full truncate px-0.5 text-center text-[10px] leading-none',
                      active ? 'font-semibold text-brand-800' : 'font-medium text-slate-500'
                    )}
                  >
                    {item.short ?? item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
