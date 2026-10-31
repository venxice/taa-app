import { formatDate, formatPeso } from '@/lib/format';
import type { FinanceData, ResidentOption } from './payment-types';

export const EMPTY_CREATE = { title: '', description: '', amount: '', dueDate: '' };

export function getPaymentStatus(status: string, proofOfPayment?: string) {
  if (status === 'confirmed') return { label: 'Paid', variant: 'confirmed' };
  if (status === 'overdue') return { label: 'Overdue', variant: 'overdue' };
  if (status === 'rejected') return { label: 'Rejected · resubmit', variant: 'rejected' };
  if (status === 'pending' && proofOfPayment?.trim()) return { label: 'In review', variant: 'pending' };
  return { label: 'Not paid', variant: 'pending' };
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getActivityCopy(log: FinanceData['auditLogs'][number], residents: ResidentOption[] = []) {
  let parsedDetails: Record<string, unknown> | string[] | null = null;
  if (log.details) {
    try {
      parsedDetails = JSON.parse(log.details) as Record<string, unknown> | string[];
    } catch {
      parsedDetails = null;
    }
  }

  switch (log.action) {
    case 'dues_created': {
      const data = parsedDetails && !Array.isArray(parsedDetails) ? parsedDetails : {};
      const amount = typeof data.amount === 'number' ? formatPeso(data.amount) : null;
      const dueDate = typeof data.dueDate === 'string' ? formatDate(data.dueDate) : null;
      const resident = typeof data.residentId === 'string' ? residents.find((item) => item.id === data.residentId) : undefined;
      const residentName = resident?.user ? `${resident.user.firstName} ${resident.user.lastName}` : null;
      const address = resident ? [resident.houseNumber, resident.street].filter(Boolean).join(' ') : '';
      return { title: 'Dues assigned', detail: [residentName, address || null, amount, dueDate ? `Due ${dueDate}` : null].filter(Boolean).join(' · ') };
    }
    case 'proof_submitted':
      return { title: 'Payment reference submitted', detail: 'Resident submitted a payment reference for review.' };
    case 'payment_updated': {
      const fields = Array.isArray(parsedDetails) ? parsedDetails : [];
      const readableFields = fields.map((field) => ({ amount: 'amount', dueDate: 'due date', title: 'title', description: 'description' }[field] ?? field));
      return { title: 'Due updated', detail: readableFields.length ? `Changed ${readableFields.join(' and ')}.` : 'Payment details were updated.' };
    }
    case 'payment_confirmed':
      return { title: 'Payment confirmed', detail: 'Resident payment was reviewed and marked as paid.' };
    case 'payment_rejected':
      return { title: 'Payment returned for correction', detail: log.details || 'The submitted payment reference was rejected.' };
    case 'payment_deleted':
      return { title: 'Payment record deleted', detail: 'A payment record was removed.' };
    case 'income_recorded':
    case 'expense_recorded': {
      const data = parsedDetails && !Array.isArray(parsedDetails) ? parsedDetails : {};
      const category = typeof data.category === 'string' ? data.category : 'Finance entry';
      const amount = typeof data.amount === 'number' ? formatPeso(data.amount) : null;
      return { title: log.action === 'income_recorded' ? 'Income recorded' : 'Expense recorded', detail: [category, amount].filter(Boolean).join(' · ') };
    }
    case 'dues_suspension_changed':
      return { title: log.details === 'true' ? 'New dues paused' : 'Dues resumed', detail: log.details === 'true' ? 'New dues cannot be assigned until dues are resumed.' : 'Staff can assign new dues again.' };
    default:
      return { title: log.action.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase()), detail: log.details ?? '' };
  }
}

export function activityDayLabel(date: string) {
  const target = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  const day = new Date(target);
  day.setHours(0, 0, 0, 0);
  if (day.getTime() === today.getTime()) return 'Today';
  if (day.getTime() === yesterday.getTime()) return 'Yesterday';
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'full' }).format(target);
}

export function activityTime(date: string) {
  return new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(date));
}
