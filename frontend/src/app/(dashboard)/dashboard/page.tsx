'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const HOME: Record<string, string> = {
  resident: '/resident/dashboard',
  hoa_officer: '/hoa/dashboard',
  admin: '/admin/dashboard',
};

export default function DashboardHome() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    router.replace(HOME[user.role] || '/resident/dashboard');
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-gray-600">Redirecting to your dashboard…</div>
    </div>
  );
}
