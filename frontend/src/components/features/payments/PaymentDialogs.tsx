'use client';

import type { Dispatch, FormEventHandler, SetStateAction } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/Field';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatPeso } from '@/lib/format';
import type { CreateDueForm, FinanceData, FinanceEntryForm, HouseholdStatement, Payment, ResidentOption } from './payment-types';
import { getPaymentStatus } from './payment-utils';

interface PaymentDialogsProps {
  statementTarget: HouseholdStatement | null;
  onCloseStatement: () => void;
  createOpen: boolean;
  onCloseCreate: () => void;
  createForm: CreateDueForm;
  setCreateForm: Dispatch<SetStateAction<CreateDueForm>>;
  selectedResidentIds: string[];
  onToggleResident: (id: string) => void;
  onToggleAllResidents: () => void;
  clearResidents: () => void;
  allVisibleResidentsSelected: boolean;
  residentSearch: string;
  setResidentSearch: (value: string) => void;
  residents: ResidentOption[];
  filteredResidents: ResidentOption[];
  saving: boolean;
  onCreateSubmit: FormEventHandler<HTMLFormElement>;
  ledgerOpen: boolean;
  onCloseLedger: () => void;
  ledgerForm: FinanceEntryForm;
  setLedgerForm: Dispatch<SetStateAction<FinanceEntryForm>>;
  financeData: FinanceData | null;
  onLedgerSubmit: FormEventHandler<HTMLFormElement>;
  proofOpen: boolean;
  onCloseProof: () => void;
  proofTarget: Payment | null;
  proofValue: string;
  setProofValue: (value: string) => void;
  onProofSubmit: FormEventHandler<HTMLFormElement>;
  confirmOpen: boolean;
  onCloseConfirm: () => void;
  confirmTarget: Payment | null;
  confirmMode: 'confirmed' | 'rejected';
  rejectReason: string;
  setRejectReason: (value: string) => void;
  onConfirmSubmit: FormEventHandler<HTMLFormElement>;
}

export function PaymentDialogs(props: PaymentDialogsProps) {
  const {
    statementTarget, onCloseStatement, createOpen, onCloseCreate, createForm, setCreateForm,
    selectedResidentIds, onToggleResident, onToggleAllResidents, clearResidents,
    allVisibleResidentsSelected, residentSearch, setResidentSearch, residents, filteredResidents,
    saving, onCreateSubmit, ledgerOpen, onCloseLedger, ledgerForm, setLedgerForm, financeData,
    onLedgerSubmit, proofOpen, onCloseProof, proofTarget, proofValue, setProofValue,
    onProofSubmit, confirmOpen, onCloseConfirm, confirmTarget, confirmMode, rejectReason,
    setRejectReason, onConfirmSubmit,
  } = props;

  return <>
    <Modal open={!!statementTarget} onClose={onCloseStatement} title={statementTarget ? `Statement · ${statementTarget.residentName}` : 'Household statement'}>
      {statementTarget && <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="truncate text-sm text-slate-600">{[statementTarget.houseNumber, statementTarget.street].filter(Boolean).join(', ') || `@${statementTarget.username}`}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div><p className="text-xs text-slate-500">Total due</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatPeso(statementTarget.totalDue)}</p></div>
            <div><p className="text-xs text-slate-500">Paid</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatPeso(statementTarget.totalPaid)}</p></div>
            <div className="col-span-2 flex items-center justify-between border-t border-slate-200 pt-2"><p className="text-xs text-slate-500">Balance</p><p className={`text-sm font-bold ${statementTarget.outstanding > 0 ? 'text-red-700' : 'text-slate-900'}`}>{formatPeso(statementTarget.outstanding)}</p></div>
          </div>
        </div>
        <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900">Due history</h3><span className="text-xs text-slate-500">{statementTarget.payments.length} records</span></div>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {statementTarget.payments.length ? statementTarget.payments.map((payment) => {
            const status = getPaymentStatus(payment.status, payment.proofOfPayment ?? undefined);
            return <article key={payment.id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h4 className="font-semibold text-slate-900">{payment.title}</h4>{payment.description && payment.description !== payment.title && <p className="mt-1 text-sm text-slate-600">{payment.description}</p>}</div><div className="flex shrink-0 items-center gap-2"><Badge variant={status.variant} dot>{status.label}</Badge><strong className="text-sm text-slate-900">{formatPeso(payment.amount)}</strong></div></div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>Due {formatDate(payment.dueDate)}</span>{payment.paymentDate && <span>Paid {formatDate(payment.paymentDate)}</span>}</div>
              {payment.proofOfPayment && <p className="mt-2 break-words rounded-lg bg-blue-50 px-2.5 py-2 text-xs text-blue-800">Payment reference: {payment.proofOfPayment}</p>}
              {payment.rejectionReason && <p className="mt-2 break-words rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-800">Reason: {payment.rejectionReason}</p>}
            </article>;
          }) : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No dues have been assigned to this household.</p>}
        </div>
        <div className="flex justify-end"><Button type="button" variant="secondary" onClick={onCloseStatement}>Close</Button></div>
      </div>}
    </Modal>

    <Modal open={createOpen} onClose={onCloseCreate} title="Create Household Dues">
      <form onSubmit={onCreateSubmit} className="space-y-4">
        <fieldset className="space-y-3">
          <div className="flex items-center justify-between gap-3"><legend className="text-sm font-semibold text-slate-800">Households <span className="text-red-500">*</span></legend><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{selectedResidentIds.length} selected</span></div>
          <label className="relative block"><Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={residentSearch} onChange={(event) => setResidentSearch(event.target.value)} placeholder="Search name or address" className="pl-9" aria-label="Search residents or address" /></label>
          <div className="flex min-h-7 items-center justify-between gap-3"><span className="text-xs text-slate-500">{residentSearch.trim() ? `${filteredResidents.length} matches` : `${residents.length} households`}</span><div className="flex items-center gap-3"><button type="button" disabled={!filteredResidents.length} onClick={onToggleAllResidents} className="text-xs font-semibold text-brand-700 hover:text-brand-900 disabled:cursor-not-allowed disabled:text-slate-400">{allVisibleResidentsSelected ? 'Deselect results' : 'Select all'}</button>{selectedResidentIds.length > 0 && <button type="button" onClick={clearResidents} className="text-xs font-medium text-slate-500 hover:text-slate-800">Clear</button>}</div></div>
          <div className="max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white" role="group" aria-label="Choose households for this due">
            {filteredResidents.length ? filteredResidents.map((resident) => {
              const name = resident.user ? `${resident.user.firstName} ${resident.user.lastName}` : 'Resident';
              const address = [resident.houseNumber, resident.street].filter(Boolean).join(', ');
              const checked = selectedResidentIds.includes(resident.id);
              return <label key={resident.id} className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 transition-colors ${checked ? 'bg-brand-50/60' : 'hover:bg-slate-50'}`}>
                <input type="checkbox" checked={checked} onChange={() => onToggleResident(resident.id)} className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-700 focus:ring-brand-600" />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{name.slice(0, 1).toLocaleUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800">{name}</span><span className="block truncate text-xs text-slate-500">{address || (resident.user?.username ? `@${resident.user.username}` : 'Household')}</span></span>
              </label>;
            }) : <p className="px-3 py-5 text-center text-sm text-slate-500">{residents.length ? 'No residents match your search.' : 'No residents found.'}</p>}
          </div>
          {selectedResidentIds.length > 1 && <p className="text-xs text-slate-500">The full amount below will be due from each household.</p>}
        </fieldset>
        <FormField label="Title" required><Input value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} placeholder="e.g. Q4 Association Dues" /></FormField>
        <FormField label="Description" required><Textarea value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} /></FormField>
        <div className="grid gap-4 sm:grid-cols-2"><FormField label="Amount (PHP)" required><Input type="number" min="1" step="0.01" value={createForm.amount} onChange={(event) => setCreateForm({ ...createForm, amount: event.target.value })} /></FormField><FormField label="Due Date" required><Input type="date" value={createForm.dueDate} onChange={(event) => setCreateForm({ ...createForm, dueDate: event.target.value })} /></FormField></div>
        <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="secondary" onClick={onCloseCreate}>Cancel</Button><Button type="submit" loading={saving} disabled={selectedResidentIds.length === 0}>Create {selectedResidentIds.length > 1 ? `${selectedResidentIds.length} dues` : 'due'}</Button></div>
      </form>
    </Modal>

    <Modal open={ledgerOpen} onClose={onCloseLedger} title="Record Income or Expense">
      <form onSubmit={onLedgerSubmit} className="space-y-4">
        <FormField label="Entry type" required><Select value={ledgerForm.type} onChange={(event) => setLedgerForm({ ...ledgerForm, type: event.target.value as FinanceEntryForm['type'], category: '' })}><option value="income">Income</option><option value="expense">Expense</option></Select></FormField>
        <FormField label="Category" required><Select value={ledgerForm.category} onChange={(event) => setLedgerForm({ ...ledgerForm, category: event.target.value })}><option value="">Select category…</option>{(ledgerForm.type === 'income' ? financeData?.incomeStreams : financeData?.expenseCategories)?.map((category) => <option key={category}>{category}</option>)}</Select></FormField>
        {ledgerForm.type === 'income' && <FormField label="Source"><Input value={ledgerForm.source} onChange={(event) => setLedgerForm({ ...ledgerForm, source: event.target.value })} placeholder="Optional source or payer" /></FormField>}
        <FormField label="Description" required><Textarea value={ledgerForm.description} onChange={(event) => setLedgerForm({ ...ledgerForm, description: event.target.value })} /></FormField>
        <div className="grid gap-4 sm:grid-cols-2"><FormField label="Amount (PHP)" required><Input type="number" min="0.01" step="0.01" value={ledgerForm.amount} onChange={(event) => setLedgerForm({ ...ledgerForm, amount: event.target.value })} /></FormField><FormField label="Date" required><Input type="date" value={ledgerForm.entryDate} onChange={(event) => setLedgerForm({ ...ledgerForm, entryDate: event.target.value })} /></FormField></div>
        <p className="text-xs text-amber-700">Use placeholder figures only until official financial data is approved.</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onCloseLedger}>Cancel</Button><Button type="submit" loading={saving}>Save entry</Button></div>
      </form>
    </Modal>

    <Modal open={proofOpen} onClose={onCloseProof} title={`Submit Proof${proofTarget ? `: ${proofTarget.title}` : ''}`}>
      <form onSubmit={onProofSubmit} className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Amount due: <strong className="text-slate-900">{proofTarget ? formatPeso(proofTarget.amount) : ''}</strong></div>
        <FormField label="Payment Reference / Proof" required hint="Enter GCash reference number, OR number, or deposit slip details."><Input value={proofValue} onChange={(event) => setProofValue(event.target.value)} placeholder="e.g. GCash Ref: 1234567890" /></FormField>
        <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="secondary" onClick={onCloseProof}>Cancel</Button><Button type="submit" loading={saving}>Submit</Button></div>
      </form>
    </Modal>

    <Modal open={confirmOpen} onClose={onCloseConfirm} title={`${confirmMode === 'confirmed' ? 'Confirm' : 'Reject'} Payment`}>
      <form onSubmit={onConfirmSubmit} className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><p><strong className="text-slate-900">{confirmTarget?.title}</strong> — {confirmTarget ? formatPeso(confirmTarget.amount) : ''}</p>{confirmTarget?.proofOfPayment && <p className="mt-1">Proof: {confirmTarget.proofOfPayment}</p>}</div>
        {confirmMode === 'rejected' && <FormField label="Rejection Reason" required><Textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Why is this rejected?" /></FormField>}
        <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="secondary" onClick={onCloseConfirm}>Cancel</Button><Button type="submit" loading={saving} variant={confirmMode === 'confirmed' ? 'primary' : 'danger'}>{confirmMode === 'confirmed' ? 'Confirm Payment' : 'Reject Payment'}</Button></div>
      </form>
    </Modal>
  </>;
}
