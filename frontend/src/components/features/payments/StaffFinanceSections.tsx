'use client';

import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDate, formatPeso } from '@/lib/format';
import type { FinanceData, ResidentOption } from './payment-types';
import { activityDayLabel, activityTime, getActivityCopy } from './payment-utils';

export function FinanceSummarySection({
  data,
  onToggleDues,
  onRecordEntry,
}: {
  data: FinanceData;
  onToggleDues: () => void;
  onRecordEntry: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {([
          ['Income', data.summary.income],
          ['Expenses', data.summary.expenses],
          ['Balance', data.summary.balance],
        ] as const).map(([label, value]) => (
          <div key={label} className={`rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-900/5 sm:p-4 ${label === 'Balance' ? 'col-span-2 sm:col-span-1' : ''}`}>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">{label} · placeholders</p>
            <p className="mt-1 break-words text-lg font-bold text-slate-900 sm:text-xl">{formatPeso(value)}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2.5 rounded-xl bg-white p-3 shadow-card ring-1 ring-slate-900/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <p className="text-sm font-semibold text-slate-900">Dues collection</p>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${data.duesSuspended ? 'text-slate-500' : 'text-brand-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${data.duesSuspended ? 'bg-slate-400' : 'bg-brand-500'}`} />{data.duesSuspended ? 'Suspended' : 'Active'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Button size="sm" className="w-full" variant="secondary" onClick={onToggleDues}>{data.duesSuspended ? 'Resume dues' : 'Suspend dues'}</Button>
          <Button size="sm" className="w-full" variant="secondary" onClick={onRecordEntry}><Wallet size={14} /> Record entry</Button>
        </div>
      </div>
      {data.entries.length > 0 && <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">Income and expense ledger</div>
        <div className="divide-y divide-slate-100">{data.entries.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"><div><p className="font-medium text-slate-900">{entry.category}{entry.source ? ` · ${entry.source}` : ''}</p><p className="text-xs text-slate-500">{entry.description} · {formatDate(entry.entryDate)}</p></div><strong className={entry.type === 'income' ? 'text-brand-700' : 'text-red-600'}>{entry.type === 'income' ? '+' : '−'}{formatPeso(entry.amount)}</strong></div>)}</div>
      </div>}
    </section>
  );
}

export function ActivityHistorySection({ data, residents }: { data: FinanceData; residents: ResidentOption[] }) {
  const groups = data.auditLogs.reduce<{ label: string; logs: FinanceData['auditLogs'] }[]>((items, log) => {
    const label = activityDayLabel(log.createdAt);
    const group = items.find((item) => item.label === label);
    if (group) group.logs.push(log);
    else items.push({ label, logs: [log] });
    return items;
  }, []);

  return <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
    <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5"><h2 className="text-base font-semibold text-slate-900">Recent activity</h2><p className="mt-0.5 text-sm text-slate-500">Payment and finance updates</p></div>
    {groups.length ? <div className="divide-y divide-slate-100">
      {groups.map((group) => <div key={group.label}>
        <h3 className="bg-slate-50/70 px-4 py-2 text-xs font-semibold text-slate-500 sm:px-5">{group.label}</h3>
        <div className="divide-y divide-slate-50">{group.logs.map((log) => {
          const copy = getActivityCopy(log, residents);
          return <article key={log.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
            <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5 text-slate-900">{copy.title}</p>
              {copy.detail && <p className="mt-0.5 break-words text-sm leading-5 text-slate-600">{copy.detail}</p>}
              <p className="mt-1.5 text-xs text-slate-500">{log.actor.firstName} {log.actor.lastName}{log.actor.username ? ` · @${log.actor.username}` : ''}</p>
            </div>
            <time dateTime={log.createdAt} className="shrink-0 pt-0.5 text-xs tabular-nums text-slate-500">{activityTime(log.createdAt)}</time>
          </article>;
        })}</div>
      </div>)}
    </div> : <p className="p-5 text-sm text-slate-500">No payment or finance activity yet.</p>}
  </section>;
}

export function getHouseholdStatus(status: string) {
  if (status === 'paid') return { label: 'Paid', variant: 'confirmed' };
  if (status === 'partial') return { label: 'Partially paid', variant: 'pending' };
  if (status === 'overdue') return { label: 'Overdue', variant: 'overdue' };
  return { label: 'Not paid', variant: 'pending' };
}
