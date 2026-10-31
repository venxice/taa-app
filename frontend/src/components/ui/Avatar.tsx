import { cn } from '@/lib/utils';
import { UserRound } from 'lucide-react';

const SIZES = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
} as const;

const COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
];

const ICON_SIZES = { xs: 14, sm: 16, md: 20, lg: 24, xl: 32 } as const;

export function initialsOf(name?: string | null) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const hasName = Boolean(name?.trim());

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-white shrink-0',
        SIZES[size],
        colorFor(name?.trim() || 'TAA'),
        className
      )}
      aria-hidden="true"
    >
      {hasName ? initialsOf(name) : <UserRound size={ICON_SIZES[size]} strokeWidth={1.8} />}
    </span>
  );
}
