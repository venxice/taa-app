import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

type BadgeVariant =
  | 'pending'
  | 'verified'
  | 'confirmed'
  | 'rejected'
  | 'suspended'
  | 'disabled'
  | 'investigating'
  | 'resolved'
  | 'overdue'
  | 'admin'
  | 'hoa_officer'
  | 'resident'
  | 'default';

const STYLES: Record<BadgeVariant, string> = {
  pending: 'text-amber-700',
  verified: 'text-brand-700',
  confirmed: 'text-brand-700',
  rejected: 'text-red-700',
  suspended: 'text-slate-600',
  disabled: 'text-zinc-600',
  investigating: 'text-blue-700',
  resolved: 'text-teal-700',
  overdue: 'text-red-700',
  admin: 'bg-purple-50 text-purple-700 ring-purple-200',
  hoa_officer: 'bg-blue-50 text-blue-700 ring-blue-200',
  resident: 'bg-brand-50 text-brand-700 ring-brand-200',
  default: 'bg-slate-50 text-slate-600 ring-slate-200',
};

const STATUS_VARIANTS = new Set<BadgeVariant>([
  'pending', 'verified', 'confirmed', 'rejected', 'suspended', 'disabled',
  'investigating', 'resolved', 'overdue',
]);

const DOTS: Partial<Record<BadgeVariant, string>> = {
  pending: 'bg-amber-500',
  verified: 'bg-brand-500',
  confirmed: 'bg-brand-500',
  rejected: 'bg-red-500',
  suspended: 'bg-slate-400',
  disabled: 'bg-zinc-500',
  investigating: 'bg-blue-500',
  resolved: 'bg-teal-500',
  overdue: 'bg-red-500',
};

export function Badge({
  children,
  variant = 'default',
  className,
  dot = false,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant | string;
  className?: ClassValue;
  dot?: boolean;
}) {
  const v = (variant in STYLES ? variant : 'default') as BadgeVariant;
  const isStatus = STATUS_VARIANTS.has(v);
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 text-xs font-semibold capitalize',
          isStatus ? 'min-h-0 rounded-none bg-transparent px-0 py-0 ring-0' : 'min-h-6 rounded-full px-2.5 py-1 ring-1 ring-inset',
          STYLES[v],
          className
        )
      )}
    >
      {dot && DOTS[v] && <span className={clsx('h-1.5 w-1.5 rounded-full', DOTS[v])} />}
      {children}
    </span>
  );
}
