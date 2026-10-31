import type { LucideIcon } from 'lucide-react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Placeholder for modules that are not yet included in the current
 * progress build. Original feature code stays in place (commented out
 * in the page files) and can be re-enabled later.
 */
export function ComingSoon({
  title,
  description,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-card ring-1 ring-slate-900/5',
        className
      )}
    >
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
        <Clock size={12} />
        Coming soon
      </span>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {description || 'This module is not yet included in the current build.'}
      </p>
    </div>
  );
}
