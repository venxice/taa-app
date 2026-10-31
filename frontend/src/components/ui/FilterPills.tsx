'use client';

import { cn } from '@/lib/utils';

export interface PillOption<T extends string> {
  label: string;
  value: T;
}

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      className={cn(
        '-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 active:scale-[0.98]',
              active
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
