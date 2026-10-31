'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { ROLE_HOME } from '@/components/layout/nav';
import { Logo } from '@/components/ui/Logo';
import type { UserRole } from '@shared/roles';

function roleFromPath(pathname: string): UserRole | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/hoa')) return 'hoa_officer';
  if (pathname.startsWith('/resident')) return 'resident';
  return null;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pathRole = roleFromPath(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.status !== 'verified') {
      router.replace('/login');
      return;
    }
    if (pathRole && user.role !== pathRole) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [user, loading, pathRole, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Logo size={22} />
          </div>
        </div>
        <p className="text-sm text-slate-500">Loading your dashboard…</p>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200/80 shadow-[14px_0_40px_-34px_rgba(15,23,42,0.55)] lg:block">
        <Sidebar role={user.role} name={fullName} onLogout={logout} />
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <Topbar role={user.role} name={fullName} onLogout={logout} />
        <main className="mx-auto w-full max-w-7xl px-4 pt-5 pb-28 sm:px-6 sm:pt-7 lg:pb-10 xl:px-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav role={user.role} />
    </div>
  );
}
