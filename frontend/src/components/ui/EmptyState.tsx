import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center sm:py-14', className)}>
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
          <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
        </span>
      )}
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
