'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  CreditCard,
  Plus,
  Check,
  X,
  CalendarDays,
  Upload,
  Inbox,
  Search,
  Download,
} from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { post, put } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatPeso, formatDate } from '@/lib/format';
import { FilterPills } from '@/components/ui/FilterPills';
import { useAuth } from '@/contexts/AuthContext';
import type { FinanceData, FinanceEntryForm, Payment, PaymentReport, ResidentOption } from './payment-types';
import { downloadCsv, EMPTY_CREATE, getPaymentStatus } from './payment-utils';
import { ActivityHistorySection, FinanceSummarySection, getHouseholdStatus } from './StaffFinanceSections';
import { PaymentDialogs } from './PaymentDialogs';

export function PaymentsPanel({ canManage = false }: { canManage?: boolean }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: paymentsData, loading, error, refetch } = useApi<{ payments: Payment[] }>('/payments?limit=100');
  const { data: residentsData } = useApi<{ residents: ResidentOption[] }>(canManage ? '/residents?limit=100' : null);
  const { data: financeData, refetch: refetchFinance } = useApi<FinanceData>(canManage ? '/finance' : null);
  const { data: reportData } = useApi<PaymentReport>(canManage ? '/payments/report' : null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [selectedResidentIds, setSelectedResidentIds] = useState<string[]>([]);
  const [residentSearch, setResidentSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const [proofOpen, setProofOpen] = useState(false);
  const [proofTarget, setProofTarget] = useState<Payment | null>(null);
  const [proofValue, setProofValue] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmMode, setConfirmMode] = useState<'confirmed' | 'rejected'>('confirmed');
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [staffTab, setStaffTab] = useState<'dues' | 'finance' | 'activity'>('dues');
  const [staffDuesView, setStaffDuesView] = useState<'review' | 'payments' | 'statements'>('review');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentDateOrder, setPaymentDateOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [statementSearch, setStatementSearch] = useState('');
  const [statementDateOrder, setStatementDateOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedHouseholdIds, setSelectedHouseholdIds] = useState<string[]>([]);
  const [statementTarget, setStatementTarget] = useState<PaymentReport['households'][number] | null>(null);
  const [residentFilter, setResidentFilter] = useState<'all' | 'to-pay' | 'review' | 'paid'>('all');
  const [ledgerForm, setLedgerForm] = useState<FinanceEntryForm>({ type: 'income', category: '', source: '', description: '', amount: '', entryDate: new Date().toISOString().slice(0, 10) });

  const canReview = canManage;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (selectedResidentIds.length === 0 || !createForm.title || !createForm.amount || !createForm.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await post('/payments', { ...createForm, residentIds: selectedResidentIds });
      toast.success(`Due created for ${selectedResidentIds.length} household${selectedResidentIds.length === 1 ? '' : 's'}`);
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      setSelectedResidentIds([]);
      setResidentSearch('');
      await refetch();
      await refetchFinance();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Create failed'
      );
    } finally {
      setSaving(false);
    }
  }

  function openProof(p: Payment) {
    setProofTarget(p);
    setProofValue(p.proofOfPayment || '');
    setProofOpen(true);
  }

  async function handleProofSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proofTarget) return;
    if (!proofValue.trim()) {
      toast.error('Please enter your payment reference');
      return;
    }
    setSaving(true);
    try {
      await put(`/payments/${proofTarget.id}`, { proofOfPayment: proofValue.trim() });
      toast.success('Proof submitted — pending confirmation');
      setProofOpen(false);
      await refetch();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Submission failed'
      );
    } finally {
      setSaving(false);
    }
  }

  function openConfirm(p: Payment, mode: 'confirmed' | 'rejected') {
    setConfirmTarget(p);
    setConfirmMode(mode);
    setRejectReason('');
    setConfirmOpen(true);
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmTarget) return;
    if (confirmMode === 'rejected' && !rejectReason.trim()) {
      toast.error('Add a short reason so the resident knows what to correct.');
      return;
    }
    setSaving(true);
    try {
      await post(`/payments/${confirmTarget.id}/confirm`, {
        status: confirmMode,
        rejectionReason: confirmMode === 'rejected' ? rejectReason : undefined,
      });
      toast.success(confirmMode === 'confirmed' ? 'Payment confirmed' : 'Payment rejected');
      setConfirmOpen(false);
      await refetch();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Action failed'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLedgerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await post('/finance/entries', ledgerForm);
      toast.success('Finance entry recorded');
      setLedgerOpen(false);
      setLedgerForm({ type: 'income', category: '', source: '', description: '', amount: '', entryDate: new Date().toISOString().slice(0, 10) });
      await refetchFinance();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not record entry');
    } finally { setSaving(false); }
  }

  async function toggleDuesSuspension() {
    try {
      await put('/finance/dues-setting', { duesSuspended: !financeData?.duesSuspended });
      toast.success(financeData?.duesSuspended ? 'Dues collection resumed' : 'Dues collection suspended');
      await refetchFinance();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not update dues setting');
    }
  }

  const payments = paymentsData?.payments ?? [];
  const residents = residentsData?.residents ?? [];
  const normalizedResidentSearch = residentSearch.trim().toLocaleLowerCase();
  const filteredResidents = residents.filter((resident) => {
    const name = resident.user ? `${resident.user.firstName} ${resident.user.lastName}` : '';
    const address = [resident.houseNumber, resident.street].filter(Boolean).join(' ');
    return `${name} ${resident.user?.username ?? ''} ${address}`.toLocaleLowerCase().includes(normalizedResidentSearch);
  });
  const allVisibleResidentsSelected = filteredResidents.length > 0 && filteredResidents.every((resident) => selectedResidentIds.includes(resident.id));
  const visiblePayments = canManage ? payments : payments.filter((payment) => {
    if (residentFilter === 'paid') return payment.status === 'confirmed';
    if (residentFilter === 'review') return payment.status === 'pending' && !!payment.proofOfPayment;
    if (residentFilter === 'to-pay') return payment.status !== 'confirmed' && !(payment.status === 'pending' && !!payment.proofOfPayment);
    return true;
  });
  const normalizedPaymentSearch = paymentSearch.trim().toLocaleLowerCase();
  const allStaffPayments = [...payments]
    .filter((payment) => {
      const residentName = `${payment.resident?.user?.firstName ?? ''} ${payment.resident?.user?.lastName ?? ''}`;
      return `${payment.title} ${payment.description} ${residentName} ${payment.proofOfPayment ?? ''} ${payment.status} ${getPaymentStatus(payment.status, payment.proofOfPayment).label}`.toLocaleLowerCase().includes(normalizedPaymentSearch);
    })
    .sort((a, b) => (paymentDateOrder === 'newest' ? -1 : 1) * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
  const staffPayments = staffDuesView === 'review'
    ? allStaffPayments.filter((payment) => payment.status === 'pending' && !!payment.proofOfPayment?.trim())
    : allStaffPayments;
  const displayedPayments = canManage ? staffPayments : visiblePayments;
  const allDisplayedPaymentsSelected = staffPayments.length > 0 && staffPayments.every((payment) => selectedPaymentIds.includes(payment.id));
  const normalizedStatementSearch = statementSearch.trim().toLocaleLowerCase();
  const households = reportData?.households ?? [];
  const staffHouseholds = [...households]
    .filter((household) => `${household.residentName} ${household.username} ${household.houseNumber ?? ''} ${household.street ?? ''} ${household.status}`.toLocaleLowerCase().includes(normalizedStatementSearch))
    .sort((a, b) => {
      const latestDueDate = (household: typeof a) => household.payments.reduce((latest, payment) => Math.max(latest, new Date(payment.dueDate).getTime()), 0);
      return (statementDateOrder === 'newest' ? -1 : 1) * (latestDueDate(a) - latestDueDate(b));
    });
  const allDisplayedHouseholdsSelected = staffHouseholds.length > 0 && staffHouseholds.every((household) => selectedHouseholdIds.includes(household.residentId));
  const selectedPayments = payments.filter((payment) => selectedPaymentIds.includes(payment.id));
  const selectedHouseholds = households.filter((household) => selectedHouseholdIds.includes(household.residentId));
  const residentPaymentSummary = payments.reduce(
    (summary, payment) => {
      if (payment.status === 'confirmed') {
        summary.paid += 1;
        summary.paidAmount += payment.amount;
      } else if (payment.status === 'overdue') {
        summary.overdue += 1;
        summary.balance += payment.amount;
      } else if (payment.status === 'pending' && payment.proofOfPayment) {
        summary.review += 1;
        summary.balance += payment.amount;
      } else {
        summary.unpaid += 1;
        summary.balance += payment.amount;
      }
      return summary;
    },
    { paid: 0, unpaid: 0, overdue: 0, review: 0, paidAmount: 0, balance: 0 }
  );

  function downloadSelectedPayments() {
    if (!selectedPayments.length) return;
    downloadCsv(`payment-records-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Resident', 'Due', 'Description', 'Amount (PHP)', 'Due date', 'Payment date', 'Status', 'Payment reference', 'Rejection reason'],
      ...selectedPayments.map((payment) => [
        payment.resident?.user ? `${payment.resident.user.firstName} ${payment.resident.user.lastName}` : '',
        payment.title,
        payment.description,
        payment.amount.toFixed(2),
        payment.dueDate.slice(0, 10),
        payment.paymentDate?.slice(0, 10) ?? '',
        getPaymentStatus(payment.status, payment.proofOfPayment).label,
        payment.proofOfPayment ?? '',
        payment.rejectionReason ?? '',
      ]),
    ]);
  }

  function downloadSelectedHouseholds() {
    if (!selectedHouseholds.length) return;
    const rows: (string | number)[][] = [[
      'Household', 'Address', 'Statement status', 'Total due (PHP)', 'Total paid (PHP)', 'Balance (PHP)',
      'Due', 'Due amount (PHP)', 'Due date', 'Payment date', 'Payment status', 'Payment reference', 'Rejection reason',
    ]];
    selectedHouseholds.forEach((household) => {
      const address = [household.houseNumber, household.street].filter(Boolean).join(', ');
      if (!household.payments.length) {
        rows.push([household.residentName, address, getHouseholdStatus(household.status).label, household.totalDue.toFixed(2), household.totalPaid.toFixed(2), household.outstanding.toFixed(2), '', '', '', '', '', '', '']);
        return;
      }
      household.payments.forEach((payment) => rows.push([
        household.residentName,
        address,
        getHouseholdStatus(household.status).label,
        household.totalDue.toFixed(2),
        household.totalPaid.toFixed(2),
        household.outstanding.toFixed(2),
        payment.title,
        payment.amount.toFixed(2),
        payment.dueDate.slice(0, 10),
        payment.paymentDate?.slice(0, 10) ?? '',
        getPaymentStatus(payment.status, payment.proofOfPayment ?? undefined).label,
        payment.proofOfPayment ?? '',
        payment.rejectionReason ?? '',
      ]));
    });
    downloadCsv(`household-statements-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        mobileRow
        icon={CreditCard}
        title={canManage ? 'Dues' : 'My Payments'}
        description={canManage ? 'Manage household dues and financial records.' : 'Check your dues, payment status, and balance.'}
        action={
          canManage && staffTab === 'dues' ? (
            <Button aria-label="Create a due" title="Create a due" className="h-10 w-10 p-0 sm:h-11 sm:w-auto sm:px-4" disabled={financeData?.duesSuspended} onClick={() => { setSelectedResidentIds([]); setResidentSearch(''); setCreateOpen(true); }}>
              <Plus size={17} /> <span className="hidden sm:inline">Create due</span>
            </Button>
          ) : canManage && staffTab === 'finance' ? (
            <Button aria-label="Record an income or expense" title="Record an income or expense" className="h-10 w-10 p-0 sm:h-11 sm:w-auto sm:px-4" onClick={() => { setLedgerForm({ ...ledgerForm, category: '' }); setLedgerOpen(true); }}>
              <Plus size={17} /> <span className="hidden sm:inline">Record entry</span>
            </Button>
          ) : undefined
        }
      />

      {canManage && <nav aria-label="Payment sections" className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 no-scrollbar">
        {([
          ['dues', 'Dues & statements'],
          ['finance', 'Income & expenses'],
          ...(isAdmin ? [['activity', 'Activity history'] as const] : []),
        ] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => setStaffTab(tab)} aria-current={staffTab === tab ? 'page' : undefined} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${staffTab === tab ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><span className="sm:hidden">{tab === 'dues' ? 'Dues' : tab === 'finance' ? 'Finance' : 'History'}</span><span className="hidden sm:inline">{label}</span></button>)}
      </nav>}

      {canManage && staffTab === 'dues' && <div className="flex gap-1 overflow-x-auto border-b border-slate-200 no-scrollbar sm:gap-2"><button type="button" onClick={() => setStaffDuesView('review')} className={`shrink-0 border-b-2 px-2.5 py-2 text-xs font-medium sm:px-3 sm:text-sm ${staffDuesView === 'review' ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500'}`}>Needs review <span className="ml-1 text-[11px]">{payments.filter((payment) => payment.status === 'pending' && !!payment.proofOfPayment?.trim()).length}</span></button><button type="button" onClick={() => setStaffDuesView('payments')} className={`shrink-0 border-b-2 px-2.5 py-2 text-xs font-medium sm:px-3 sm:text-sm ${staffDuesView === 'payments' ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500'}`}><span className="sm:hidden">Payments</span><span className="hidden sm:inline">Payment records</span> <span className="ml-1 text-[11px]">{payments.length}</span></button><button type="button" onClick={() => setStaffDuesView('statements')} className={`shrink-0 border-b-2 px-2.5 py-2 text-xs font-medium sm:px-3 sm:text-sm ${staffDuesView === 'statements' ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500'}`}><span className="sm:hidden">Statements</span><span className="hidden sm:inline">Household statements</span></button></div>}

      {canManage && staffTab === 'finance' && financeData && <FinanceSummarySection
        data={financeData}
        onToggleDues={toggleDuesSuspension}
        onRecordEntry={() => { setLedgerForm({ ...ledgerForm, category: '' }); setLedgerOpen(true); }}
      />}

      {canManage && isAdmin && staffTab === 'activity' && financeData && <ActivityHistorySection
        data={financeData}
        residents={residents}
      />}

      {!canManage && !loading && !error && (
        <section aria-label="Your payment summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {([
            ['Paid', residentPaymentSummary.paid, 'text-brand-700'],
            ['Not paid', residentPaymentSummary.unpaid, 'text-amber-700'],
            ['Overdue', residentPaymentSummary.overdue, 'text-red-700'],
            ['In review', residentPaymentSummary.review, 'text-blue-700'],
          ] as const).map(([label, value, tone]) => (
            <div key={label} className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-900/5 sm:p-4">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
            </div>
          ))}
          <div className="col-span-2 flex items-center justify-between rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-900/5 sm:col-span-4 sm:px-4">
            <span className="text-sm font-medium text-slate-600">Outstanding balance</span>
            <strong className="text-lg text-slate-900">{formatPeso(residentPaymentSummary.balance)}</strong>
          </div>
        </section>
      )}

      {(!canManage || staffTab === 'dues') && !loading && !error && !canManage && <section aria-label="Filter your dues" className="space-y-2"><h2 className="text-sm font-semibold text-slate-800">Your dues</h2><FilterPills options={[{ label: 'All', value: 'all' }, { label: 'To pay', value: 'to-pay' }, { label: 'In review', value: 'review' }, { label: 'Paid', value: 'paid' }]} value={residentFilter} onChange={setResidentFilter} /></section>}

      {canManage && staffTab === 'dues' && staffDuesView !== 'statements' && <section className="space-y-3">
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-2.5 shadow-card ring-1 ring-slate-900/5 sm:flex-row sm:items-center sm:p-3">
          <label className="relative block min-w-0 sm:flex-1"><Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={paymentSearch} onChange={(event) => setPaymentSearch(event.target.value)} placeholder="Search resident or reference" className="pl-9" aria-label="Search payment records" /></label>
          <div className="flex min-w-0 items-center gap-1.5 sm:shrink-0 sm:gap-2">
            <Select className="min-w-0 flex-1 sm:w-40 sm:flex-none" value={paymentDateOrder} onChange={(event) => setPaymentDateOrder(event.target.value as 'newest' | 'oldest')} aria-label="Sort payment records by due date"><option value="newest">Newest due</option><option value="oldest">Oldest due</option></Select>
            <label title="Select all visible records" className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-2 text-xs font-medium text-slate-600 hover:bg-slate-50"><input type="checkbox" checked={allDisplayedPaymentsSelected} disabled={!staffPayments.length} onChange={() => setSelectedPaymentIds((current) => allDisplayedPaymentsSelected ? current.filter((id) => !staffPayments.some((payment) => payment.id === id)) : Array.from(new Set([...current, ...staffPayments.map((payment) => payment.id)])))} className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600" /><span>All</span></label>
            <Button type="button" variant="secondary" size="sm" className="h-11 shrink-0 px-3" disabled={!selectedPayments.length} onClick={downloadSelectedPayments} title={`${selectedPayments.length} selected`}><Download size={14} /><span className="hidden sm:inline">{selectedPayments.length ? `Download (${selectedPayments.length})` : 'Download'}</span><span className="sm:hidden">CSV{selectedPayments.length ? ` (${selectedPayments.length})` : ''}</span></Button>
          </div>
        </div>
      </section>}

      {(!canManage || (staffTab === 'dues' && staffDuesView !== 'statements')) && (loading ? (
        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-900/5">
          <SkeletonList rows={3} />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-red-500 shadow-card ring-1 ring-slate-900/5">
          {error}
        </div>
      ) : displayedPayments.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
          <EmptyState
            icon={Inbox}
            title={payments.length === 0 ? 'No dues yet' : canManage && staffDuesView === 'review' && !paymentSearch ? 'No payments waiting for review' : canManage ? 'No records match your search' : 'No dues in this filter'}
            description={payments.length === 0 ? (canManage ? 'Create a due to get started.' : 'The HOA has not assigned any dues to your household yet.') : canManage && staffDuesView === 'review' && !paymentSearch ? 'Resident submissions will appear here.' : canManage ? 'Try a different name, due title, or reference.' : 'Choose another status to see your dues.'}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {displayedPayments.map((p) => (
            <article key={p.id} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-900/5 animate-slide-up sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {canManage && <input type="checkbox" aria-label={`Select ${p.title} for download`} checked={selectedPaymentIds.includes(p.id)} onChange={() => setSelectedPaymentIds((current) => current.includes(p.id) ? current.filter((id) => id !== p.id) : [...current, p.id])} className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600" />}
                    <h3 className="font-semibold text-slate-900">{p.title}</h3>
                    <Badge variant={getPaymentStatus(p.status, p.proofOfPayment).variant} dot>
                      {getPaymentStatus(p.status, p.proofOfPayment).label}
                    </Badge>
                  </div>
                  {p.description && p.description !== p.title && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={13} /> Due {formatDate(p.dueDate)}
                    </span>
                    {p.paymentDate && <span>Paid {formatDate(p.paymentDate)}</span>}
                    {p.resident?.user && (
                      <span>
                        {p.resident.user.firstName} {p.resident.user.lastName}
                      </span>
                    )}
                  </div>
                  {p.proofOfPayment && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                      <Upload size={13} /> {p.proofOfPayment}
                    </div>
                  )}
                  {p.status === 'rejected' && p.rejectionReason && (
                    <div className="mt-2 inline-flex rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700">
                      Rejected: {p.rejectionReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                  <p className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{formatPeso(p.amount)}</p>
                  <div className="flex flex-wrap justify-end gap-2">
                    {!canManage && (p.status === 'rejected' || p.status === 'overdue' || (p.status === 'pending' && !p.proofOfPayment?.trim())) && (
                      <Button size="sm" variant="primary" onClick={() => openProof(p)}>
                        {p.proofOfPayment ? 'Resubmit Proof' : 'Submit Proof'}
                      </Button>
                    )}
                    {canReview && p.status === 'pending' && !!p.proofOfPayment?.trim() && (
                      <>
                        <Button size="sm" onClick={() => openConfirm(p, 'confirmed')}>
                          <Check size={14} /> Confirm
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => openConfirm(p, 'rejected')}>
                          <X size={14} /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ))}

      {canManage && staffTab === 'dues' && staffDuesView === 'statements' && reportData && <section className="space-y-2">
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-2.5 shadow-card ring-1 ring-slate-900/5 sm:flex-row sm:items-center sm:p-3">
          <label className="relative block min-w-0 sm:flex-1"><Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={statementSearch} onChange={(event) => setStatementSearch(event.target.value)} placeholder="Search household or address" className="pl-9" aria-label="Search household statements" /></label>
          <div className="flex min-w-0 items-center gap-1.5 sm:shrink-0 sm:gap-2">
            <Select className="min-w-0 flex-1 sm:w-44 sm:flex-none" value={statementDateOrder} onChange={(event) => setStatementDateOrder(event.target.value as 'newest' | 'oldest')} aria-label="Sort statements by due date"><option value="newest">Latest due</option><option value="oldest">Earliest due</option></Select>
            <label title="Select all visible households" className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-2 text-xs font-medium text-slate-600 hover:bg-slate-50"><input type="checkbox" checked={allDisplayedHouseholdsSelected} disabled={!staffHouseholds.length} onChange={() => setSelectedHouseholdIds((current) => allDisplayedHouseholdsSelected ? current.filter((id) => !staffHouseholds.some((household) => household.residentId === id)) : Array.from(new Set([...current, ...staffHouseholds.map((household) => household.residentId)])))} className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600" /><span>All</span></label>
            <Button type="button" variant="secondary" size="sm" className="h-11 shrink-0 px-3" disabled={!selectedHouseholds.length} onClick={downloadSelectedHouseholds} title={`${selectedHouseholds.length} selected`}><Download size={14} /><span className="hidden sm:inline">{selectedHouseholds.length ? `Download (${selectedHouseholds.length})` : 'Download'}</span><span className="sm:hidden">CSV{selectedHouseholds.length ? ` (${selectedHouseholds.length})` : ''}</span></Button>
          </div>
        </div>
        {staffHouseholds.length ? <div className="space-y-2">{staffHouseholds.map((row) => {
          const householdStatus = getHouseholdStatus(row.status);
          const address = [row.houseNumber, row.street].filter(Boolean).join(', ') || `@${row.username}`;
          return <article key={row.residentId} className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-900/5 sm:p-5">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <input type="checkbox" aria-label={`Select statement for ${row.residentName}`} checked={selectedHouseholdIds.includes(row.residentId)} onChange={() => setSelectedHouseholdIds((current) => current.includes(row.residentId) ? current.filter((id) => id !== row.residentId) : [...current, row.residentId])} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-700 focus:ring-brand-600" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-slate-900">{row.residentName}</h3><Badge variant={householdStatus.variant} dot>{householdStatus.label}</Badge></div>
                <p className="truncate text-xs text-slate-500">{address} · {row.payments.length} {row.payments.length === 1 ? 'due' : 'dues'}</p>
              </div>
              <Button type="button" size="sm" variant="secondary" className="shrink-0 px-2.5 sm:px-3" onClick={() => setStatementTarget(row)}><span className="sm:hidden">View</span><span className="hidden sm:inline">View statement</span></Button>
            </div>
            <div className="ml-6 mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 sm:ml-7 sm:grid-cols-3 sm:gap-2">
              <div><p className="text-[10px] text-slate-500 sm:text-[11px]">Total due</p><p className="mt-0.5 text-[13px] font-semibold leading-tight text-slate-800 sm:text-sm">{formatPeso(row.totalDue)}</p></div>
              <div><p className="text-[10px] text-slate-500 sm:text-[11px]">Paid</p><p className="mt-0.5 text-[13px] font-semibold leading-tight text-slate-800 sm:text-sm">{formatPeso(row.totalPaid)}</p></div>
              <div className="col-span-2 flex items-center justify-between border-t border-slate-100 pt-2 sm:col-span-1 sm:block sm:border-0 sm:pt-0"><p className="text-[10px] text-slate-500 sm:text-[11px]">Balance</p><p className={`text-[13px] font-bold leading-tight sm:mt-0.5 sm:text-sm ${row.outstanding > 0 ? 'text-red-700' : 'text-slate-800'}`}>{formatPeso(row.outstanding)}</p></div>
            </div>
          </article>;
        })}</div> : <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-card ring-1 ring-slate-900/5">{households.length ? 'No households match your search.' : 'No household statements yet.'}</div>}
      </section>}

      <PaymentDialogs
        statementTarget={statementTarget}
        onCloseStatement={() => setStatementTarget(null)}
        createOpen={createOpen}
        onCloseCreate={() => { setCreateOpen(false); setSelectedResidentIds([]); setResidentSearch(''); }}
        createForm={createForm}
        setCreateForm={setCreateForm}
        selectedResidentIds={selectedResidentIds}
        onToggleResident={(id) => setSelectedResidentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
        onToggleAllResidents={() => setSelectedResidentIds((current) => allVisibleResidentsSelected
          ? current.filter((id) => !filteredResidents.some((resident) => resident.id === id))
          : Array.from(new Set([...current, ...filteredResidents.map((resident) => resident.id)])))}
        clearResidents={() => setSelectedResidentIds([])}
        allVisibleResidentsSelected={allVisibleResidentsSelected}
        residentSearch={residentSearch}
        setResidentSearch={setResidentSearch}
        residents={residents}
        filteredResidents={filteredResidents}
        saving={saving}
        onCreateSubmit={handleCreate}
        ledgerOpen={ledgerOpen}
        onCloseLedger={() => setLedgerOpen(false)}
        ledgerForm={ledgerForm}
        setLedgerForm={setLedgerForm}
        financeData={financeData}
        onLedgerSubmit={handleLedgerSubmit}
        proofOpen={proofOpen}
        onCloseProof={() => setProofOpen(false)}
        proofTarget={proofTarget}
        proofValue={proofValue}
        setProofValue={setProofValue}
        onProofSubmit={handleProofSubmit}
        confirmOpen={confirmOpen}
        onCloseConfirm={() => setConfirmOpen(false)}
        confirmTarget={confirmTarget}
        confirmMode={confirmMode}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        onConfirmSubmit={handleConfirm}
      />
    </div>
  );
}
