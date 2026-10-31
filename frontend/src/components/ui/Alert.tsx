'use client';

import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Form-level inline alert banner (shown above a form). */
export function Alert({
  children,
  variant = 'error',
  className,
}: {
  children: React.ReactNode;
  variant?: 'error' | 'success';
  className?: string;
}) {
  if (!children) return null;

  const styles =
    variant === 'error'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-200';

  const Icon = variant === 'error' ? AlertCircle : Check;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium ring-1 ring-inset',
        styles,
        className
      )}
    >
      <Icon size={18} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}
