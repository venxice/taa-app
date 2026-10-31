import { ApiError } from '../../utils/ApiError';

export interface PaymentRuleRecord {
  status: string;
  dueDate: Date | string;
  amount: number | { toString(): string };
  proofOfPayment?: string | null;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getEffectivePaymentStatus(payment: PaymentRuleRecord, now = new Date()) {
  const hasReference = Boolean(payment.proofOfPayment?.trim());
  const isPastDue = new Date(payment.dueDate) < startOfDay(now);
  return payment.status === 'pending' && !hasReference && isPastDue ? 'overdue' : payment.status;
}

export function getHouseholdPaymentSummary(payments: PaymentRuleRecord[], now = new Date()) {
  const totalDue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalPaid = payments
    .filter((payment) => payment.status === 'confirmed')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const outstanding = Math.max(0, totalDue - totalPaid);
  const hasOverdue = payments.some((payment) => getEffectivePaymentStatus(payment, now) === 'overdue');
  const status = payments.length === 0
    ? 'unpaid'
    : outstanding <= 0
      ? 'paid'
      : hasOverdue
        ? 'overdue'
        : totalPaid > 0
          ? 'partial'
          : 'unpaid';

  return { totalDue, totalPaid, outstanding, status };
}

export function assertPaymentCanAcceptReference(payment: Pick<PaymentRuleRecord, 'status' | 'proofOfPayment'>) {
  if (payment.status === 'confirmed') throw ApiError.conflict('This due is already paid');
  if (payment.status === 'pending' && payment.proofOfPayment?.trim()) {
    throw ApiError.conflict('Your payment is already waiting for review');
  }
}

export function assertPaymentCanBeReviewed(payment: Pick<PaymentRuleRecord, 'status' | 'proofOfPayment'>) {
  if (payment.status !== 'pending' || !payment.proofOfPayment?.trim()) {
    throw ApiError.conflict('Only payments with a submitted reference can be reviewed');
  }
}

export function assertPaymentCanBeChanged(payment: Pick<PaymentRuleRecord, 'status'>) {
  if (payment.status === 'confirmed') throw ApiError.conflict('Paid dues cannot be edited');
}
