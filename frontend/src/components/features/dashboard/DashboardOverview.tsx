'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle2,
  CircleDollarSign, CreditCard, Megaphone, Search, UsersRound, Wallet,
  type LucideIcon,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatPeso, fullName, timeAgo } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { UserRole } from '@shared/roles';

interface DashboardStats {
  announcements?: number;
  myIncidents?: number;
  pendingPayments?: number;
  pendingVerifications?: number;
  openIncidents?: number;
  registeredUsers?: number;
  activeOfficials?: number;
  totalResidents?: number;
  totalCollected?: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned?: boolean;
  createdAt: string;
  author?: { firstName: string; lastName: string };
}

interface Payment {
  id: string;
  title: string;
  amount: number;
  status: string;
  dueDate: string;
  paymentDate?: string | null;
  createdAt: string;
  resident?: { houseNumber?: string | null; user?: { firstName: string; lastName: string } };
}

interface Incident {
  id: string;
  title: string;
  incidentType: string;
  location: string;
  dateIncident: string;
  dateReported: string;
  status: string;
  reportedBy?: { firstName: string; lastName: string } | null;
}

interface ApiList<T> {
  announcements?: T[];
  payments?: T[];
  incidents?: T[];
  users?: T[];
}

type ActivityItem = {
  id: string;
  kind: 'payment' | 'incident';
  title: string;
  detail: string;
  status: string;
  date: string;
  href: string;
  amount?: number;
};

const roleConfig: Record<UserRole, { intro: string }> = {
  resident: { intro: 'Your community, updates, and household activity in one place.' },
  hoa_officer: { intro: 'A clear view of resident requests and community operations.' },
  admin: { intro: 'Monitor resident services, payment activity, and community operations.' },
};

const routes: Record<UserRole, { announcements: string; payments: string; incidents: string; users: string; officials: string }> = {
  resident: { announcements: '/resident/announcements', payments: '/resident/payments', incidents: '/resident/incidents', users: '/resident/profile', officials: '/resident/officials' },
  hoa_officer: { announcements: '/hoa/announcements', payments: '/hoa/payments', incidents: '/hoa/incidents', users: '/hoa/users', officials: '/hoa/officials' },
  admin: { announcements: '/admin/announcements', payments: '/admin/payments', incidents: '/admin/incidents', users: '/admin/users', officials: '/admin/officials' },
};

function statusLabel(status: string) {
  const labels: Record<string, string> = { confirmed: 'Paid', pending: 'Pending', overdue: 'Overdue', rejected: 'Needs update', investigating: 'In progress', resolved: 'Resolved', verified: 'Verified' };
  return labels[status] || status.replace(/_/g, ' ');
}

function statusTone(status: string) {
  if (['confirmed', 'resolved', 'verified'].includes(status)) return 'text-brand-700';
  if (status === 'rejected') return 'text-red-700';
  if (['overdue', 'pending', 'investigating'].includes(status)) return 'text-amber-700';
  return 'text-slate-600';
}

function statusDotTone(status: string) {
  if (['confirmed', 'resolved', 'verified'].includes(status)) return 'bg-brand-500';
  if (status === 'rejected' || status === 'overdue') return 'bg-red-500';
  if (status === 'pending') return 'bg-amber-500';
  if (status === 'investigating') return 'bg-blue-500';
  return 'bg-slate-400';
}

function MetricCard({ label, value, hint, icon: Icon, href, emphasis = false }: { label: string; value: string | number; hint: string; icon: LucideIcon; href: string; emphasis?: boolean }) {
  return (
    <Link href={href} className={`group relative min-w-0 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card sm:p-5 ${emphasis ? 'border-brand-200' : 'border-slate-200/80'}`}>
      <span className={`absolute inset-y-0 left-0 w-1 transition ${emphasis ? 'bg-brand-500' : 'bg-brand-100 group-hover:bg-brand-400'}`} />
      <div className="flex items-start justify-between gap-2 pl-1.5">
        <div className="min-w-0"><p className="text-xs font-medium leading-snug text-slate-500 sm:text-sm">{label}</p><p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{value}</p></div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 sm:h-10 sm:w-10"><Icon size={18} strokeWidth={1.9} /></span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 pl-1.5 text-[11px] text-slate-400 sm:text-xs"><span className="truncate">{hint}</span><ArrowUpRight size={14} className="shrink-0 text-brand-700 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
    </Link>
  );
}

function SectionHeading({ title, detail, href, linkLabel }: { title: string; detail: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
      <div className="min-w-0"><h2 className="font-semibold tracking-tight text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50">{linkLabel}<ArrowRight size={14} /></Link>
    </div>
  );
}

export function DashboardOverview({ role }: { role: UserRole }) {
  const { user } = useAuth();
  const isStaff = role !== 'resident';
  const config = roleConfig[role];
  const hrefs = routes[role];
  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'open' | 'done'>('all');

  const { data: stats, loading: statsLoading, error: statsError } = useApi<DashboardStats>('/dashboard');
  const { data: announcementData } = useApi<ApiList<Announcement>>(`/announcements?${role === 'resident' ? 'published=true&' : ''}limit=12`);
  const { data: paymentData, loading: paymentsLoading } = useApi<ApiList<Payment>>('/payments?limit=8');
  const { data: incidentData, loading: incidentsLoading } = useApi<ApiList<Incident>>('/incidents?limit=8');
  const { data: pendingUserData } = useApi<ApiList<{ id: string; firstName: string; lastName: string; username: string; createdAt: string }>>(isStaff ? '/users?status=pending&limit=4' : null);

  const announcements = announcementData?.announcements ?? [];
  const payments = paymentData?.payments ?? [];
  const incidents = incidentData?.incidents ?? [];
  const pendingUsers = pendingUserData?.users ?? [];
  const isLoading = statsLoading || paymentsLoading || incidentsLoading;
  const firstName = user?.firstName || (role === 'resident' ? 'Resident' : role === 'admin' ? 'Administrator' : 'Officer');
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  const openDues = payments.filter((payment) => ['pending', 'overdue', 'rejected'].includes(payment.status));
  const paidDues = payments.filter((payment) => payment.status === 'confirmed');
  const outstanding = openDues.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const paidTotal = paidDues.reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const activityItems = useMemo<ActivityItem[]>(() => {
    const paymentItems = (paymentData?.payments ?? []).map((payment) => ({
      id: `payment-${payment.id}`, kind: 'payment' as const, title: payment.title,
      detail: role === 'resident' ? `Due ${formatDate(payment.dueDate)}` : `${payment.resident?.user ? fullName(payment.resident.user) : 'Resident'}${payment.resident?.houseNumber ? ` · ${payment.resident.houseNumber}` : ''} · ${formatDate(payment.dueDate)}`,
      status: payment.status, date: payment.createdAt, href: hrefs.payments, amount: Number(payment.amount || 0),
    }));
    const incidentItems = (incidentData?.incidents ?? []).map((incident) => ({
      id: `incident-${incident.id}`, kind: 'incident' as const, title: incident.title,
      detail: `${role === 'resident' ? incident.incidentType : `${incident.reportedBy ? fullName(incident.reportedBy) : 'Resident'} · ${incident.location}`} · ${formatDate(incident.dateIncident)}`,
      status: incident.status, date: incident.dateReported || incident.dateIncident, href: hrefs.incidents,
    }));
    return [...paymentItems, ...incidentItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [paymentData, incidentData, role, hrefs.payments, hrefs.incidents]);

  const visibleActivity = activityItems.filter((item) => {
    const done = ['confirmed', 'resolved'].includes(item.status);
    const matchesFilter = activityFilter === 'all' || (activityFilter === 'done' ? done : !done);
    const query = activitySearch.trim().toLowerCase();
    const matchesSearch = !query || `${item.title} ${item.detail} ${statusLabel(item.status)}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  }).slice(0, 6);

  const metrics = role === 'resident'
    ? [
        { label: 'Outstanding dues', value: formatPeso(outstanding), hint: `${openDues.length} item${openDues.length === 1 ? '' : 's'} need attention`, icon: Wallet, href: hrefs.payments, emphasis: openDues.length > 0 },
        { label: 'Paid contributions', value: formatPeso(paidTotal), hint: `${paidDues.length} confirmed payment${paidDues.length === 1 ? '' : 's'}`, icon: CheckCircle2, href: hrefs.payments },
        { label: 'My reports', value: stats?.myIncidents ?? 0, hint: 'View updates and follow-ups', icon: AlertTriangle, href: hrefs.incidents },
        { label: 'Community notices', value: stats?.announcements ?? announcements.length, hint: 'Updates from your HOA', icon: Megaphone, href: hrefs.announcements },
      ]
    : [
        { label: 'Resident applications', value: stats?.pendingVerifications ?? 0, hint: 'Review new registrations', icon: UsersRound, href: hrefs.users, emphasis: Boolean(stats?.pendingVerifications) },
        { label: 'Open incidents', value: stats?.openIncidents ?? 0, hint: 'Pending or under investigation', icon: AlertTriangle, href: hrefs.incidents, emphasis: Boolean(stats?.openIncidents) },
        { label: 'Payments to review', value: stats?.pendingPayments ?? 0, hint: 'Check submissions and dues', icon: CircleDollarSign, href: hrefs.payments, emphasis: Boolean(stats?.pendingPayments) },
        { label: 'Registered residents', value: stats?.totalResidents ?? 0, hint: `${stats?.activeOfficials ?? 0} active HOA officials`, icon: UsersRound, href: hrefs.users },
      ];

  const totalPayments = paidDues.length + openDues.length;
  const paidPercent = totalPayments ? Math.round((paidDues.length / totalPayments) * 100) : 0;

  return (
    <div className="space-y-5 pb-6 sm:space-y-6">
      <header className="flex flex-col gap-1 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">{greeting}, {firstName}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
            {role === 'admin' ? 'Administrator dashboard' : role === 'hoa_officer' ? 'Officer dashboard' : 'Resident dashboard'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{role === 'resident' ? 'See your dues and the latest from your community.' : config.intro}</p>
        </div>
        <p className="text-xs font-medium text-slate-500">{today}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Dashboard summary">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} value={statsLoading || (isLoading && role === 'resident') ? '…' : metric.value} hint={statsError && role !== 'resident' ? 'Summary unavailable right now' : metric.hint} />)}
      </section>
      {statsError && <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Some dashboard totals are temporarily unavailable. You can still open each section below.</p>}

      <div className="grid items-start gap-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Activity size={16} /></span><h2 className="font-semibold tracking-tight text-slate-900">{role === 'resident' ? 'My recent activity' : 'Community work queue'}</h2></div><p className="mt-1 pl-10 text-xs text-slate-500">{role === 'resident' ? 'Payments and reports that may need your attention' : 'Recent payment and incident updates in one list'}</p></div><Link href={role === 'resident' ? hrefs.payments : hrefs.incidents} className="hidden shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 sm:inline-flex">Open modules<ArrowRight size={14} /></Link></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={activitySearch} onChange={(event) => setActivitySearch(event.target.value)} placeholder="Search payments or reports" aria-label="Search dashboard activity" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100" /></label>
              <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1" aria-label="Filter activity">{([['all', 'All'], ['open', 'Open'], ['done', 'Complete']] as const).map(([filter, label]) => <button key={filter} type="button" onClick={() => setActivityFilter(filter)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${activityFilter === filter ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>)}</div>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {isLoading && activityItems.length === 0 ? <div className="space-y-3 p-5"><div className="h-12 animate-pulse rounded-xl bg-slate-100" /><div className="h-12 animate-pulse rounded-xl bg-slate-100" /><div className="h-12 animate-pulse rounded-xl bg-slate-100" /></div> : visibleActivity.length === 0 ? <div className="px-5 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700"><CheckCircle2 size={20} /></span><p className="mt-3 text-sm font-semibold text-slate-800">Nothing to show</p><p className="mt-1 text-xs text-slate-500">Try another filter or visit a dashboard section.</p></div> : visibleActivity.map((item) => {
              const Icon = item.kind === 'payment' ? CreditCard : AlertTriangle;
              return <Link key={item.id} href={item.href} className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-brand-50/30 sm:px-5"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.kind === 'payment' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-brand-800">{item.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.detail}</span></span><span className="hidden shrink-0 text-right sm:block">{item.amount !== undefined && <span className="block text-xs font-semibold text-slate-700">{formatPeso(item.amount)}</span>}<span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(item.date)}</span></span><span className={`inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold sm:text-[11px] ${statusTone(item.status)}`}><span className={`h-1.5 w-1.5 rounded-full ${statusDotTone(item.status)}`} />{statusLabel(item.status)}</span><ArrowRight size={15} className="hidden shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-700 sm:block" /></Link>;
            })}
          </div>
          <div className="border-t border-slate-100 px-4 py-3 sm:hidden"><Link href={role === 'resident' ? hrefs.payments : hrefs.incidents} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">Open full activity<ArrowRight size={14} /></Link></div>
        </section>

      </div>

      <div className="grid gap-4">
        {role === 'resident' && <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold tracking-tight text-slate-900">Your payment snapshot</h2><p className="mt-0.5 text-xs text-slate-500">A quick look at your payment activity</p></div><Link href={hrefs.payments} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">Details<ArrowRight size={14} /></Link></div>
          <div className="mt-5"><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-slate-500">Payments confirmed</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{paidDues.length} <span className="text-sm font-medium text-slate-400">of {totalPayments}</span></p></div><span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800">{paidPercent}% complete</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${paidPercent}%` }} /></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-medium text-slate-500">Open balance</p><p className="mt-1 text-base font-semibold text-slate-900">{formatPeso(outstanding)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-medium text-slate-500">Next due date</p><p className="mt-1 text-base font-semibold text-slate-900">{formatDate(openDues.find((item) => item.status === 'pending')?.dueDate || openDues[0]?.dueDate)}</p></div></div></div>
        </section>}

        {role !== 'resident' && <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <SectionHeading title="Needs your attention" detail="Priority items waiting for staff" href={hrefs.users} linkLabel="Review" />
          <div className="divide-y divide-slate-100">{[
            { label: 'Applications to verify', count: stats?.pendingVerifications ?? 0, detail: pendingUsers.slice(0, 2).map((person) => `${person.firstName} ${person.lastName}`).join(' · ') || 'No new applications', icon: UsersRound, href: hrefs.users },
            { label: 'Open reports', count: stats?.openIncidents ?? 0, detail: incidents.filter((item) => ['pending', 'investigating'].includes(item.status)).slice(0, 2).map((item) => item.title).join(' · ') || 'No open incident reports', icon: AlertTriangle, href: hrefs.incidents },
            { label: 'Payments awaiting review', count: stats?.pendingPayments ?? 0, detail: payments.filter((item) => ['pending', 'overdue'].includes(item.status)).slice(0, 2).map((item) => item.title).join(' · ') || 'No payments to review', icon: CircleDollarSign, href: hrefs.payments },
          ].map(({ label, count, detail, icon: Icon, href }) => <Link href={href} key={label} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-brand-50/30 sm:px-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{label}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{detail}</span></span><span className={`min-w-8 rounded-full px-2 py-1 text-center text-xs font-semibold ${count ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-500'}`}>{count}</span></Link>)}</div>
        </section>}
      </div>

    </div>
  );
}
