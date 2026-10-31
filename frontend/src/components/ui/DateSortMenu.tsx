'use client';

import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';

export function DateSortMenu({
  value,
  onChange,
  compact = false,
}: {
  value: 'newest' | 'oldest';
  onChange: (value: 'newest' | 'oldest') => void;
  compact?: boolean;
}) {
  const label = value === 'newest' ? 'Newest' : 'Oldest';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Sort by date: ${label} first`}
          title={`Sort by date: ${label} first`}
          className={`inline-flex h-11 shrink-0 items-center gap-1.5 text-sm text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${compact ? 'w-11 justify-center rounded-lg hover:bg-slate-100' : 'rounded-xl bg-white px-3 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
        >
          <CalendarDays
            size={18}
            className={compact ? 'text-slate-500' : 'text-slate-400'}
            aria-hidden="true"
          />
          {!compact && (
            <>
              <span>Date</span>
              <span className="font-semibold text-slate-800">{label}</span>
            </>
          )}
          <ChevronDown size={15} className="text-slate-400" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuLabel>Sort by date</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onChange('newest')}>
          Newest first
          {value === 'newest' && <Check size={15} className="ml-auto text-brand-700" />}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChange('oldest')}>
          Oldest first
          {value === 'oldest' && <Check size={15} className="ml-auto text-brand-700" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
