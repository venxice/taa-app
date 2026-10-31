import type { LucideIcon } from 'lucide-react';

const TONES: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  red: 'bg-rose-50 text-rose-700 ring-rose-100',
  purple: 'bg-violet-50 text-violet-700 ring-violet-100',
  teal: 'bg-teal-50 text-teal-700 ring-teal-100',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {Icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${TONES[tone] ?? TONES.brand}`}>
            <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}
