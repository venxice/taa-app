export interface Payment {
  id: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentDate?: string | null;
  status: string;
  proofOfPayment?: string;
  rejectionReason?: string | null;
  resident?: {
    id: string;
    user?: { firstName: string; lastName: string; username: string };
  };
}

export interface ResidentOption {
  id: string;
  houseNumber?: string | null;
  street?: string | null;
  user?: { firstName: string; lastName: string; username?: string };
}

export interface FinanceData {
  entries: { id: string; type: 'income' | 'expense'; category: string; source?: string | null; description: string; amount: number; entryDate: string }[];
  auditLogs: { id: string; entity: string; action: string; details?: string | null; createdAt: string; actor: { firstName: string; lastName: string; username?: string } }[];
  summary: { income: number; expenses: number; balance: number };
  duesSuspended: boolean;
  incomeStreams: string[];
  expenseCategories: string[];
}

export interface StatementPayment extends Omit<Payment, 'resident' | 'description' | 'proofOfPayment'> {
  description?: string;
  proofOfPayment?: string | null;
}

export interface HouseholdStatement {
  residentId: string;
  residentName: string;
  username: string;
  houseNumber?: string | null;
  street?: string | null;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  payments: StatementPayment[];
}

export interface PaymentReport {
  households: HouseholdStatement[];
  totals: { households: number; paid: number; partial: number; unpaid: number; overdue: number; outstanding: number };
}

export interface CreateDueForm {
  title: string;
  description: string;
  amount: string;
  dueDate: string;
}

export interface FinanceEntryForm {
  type: 'income' | 'expense';
  category: string;
  source: string;
  description: string;
  amount: string;
  entryDate: string;
}
