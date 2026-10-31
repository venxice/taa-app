import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  children,
  mobileRow,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children?: ReactNode;
  /** Keep the action on the same row as the title on mobile (right-aligned). */
  mobileRow?: boolean;
}) {
  return (
    <div
      className={
        mobileRow
          ? 'flex flex-row items-start justify-between gap-3 sm:items-center sm:gap-4'
          : 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'
      }
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-inset ring-brand-100">
            <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-500 sm:text-sm">{description}</p>}
        </div>
      </div>
      {(action || children) && (
        <div className={mobileRow ? 'flex shrink-0 items-start gap-2' : 'flex w-full items-center justify-end gap-2 sm:w-auto sm:shrink-0 sm:justify-end'}>{action || children}</div>
      )}
    </div>
  );
}
