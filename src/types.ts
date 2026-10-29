import type { Timestamp } from 'firebase/firestore';

export enum NavSection {
  OVERVIEW = 'overview',
  STUDENTS = 'students',
  TRANSACTIONS = 'transactions',
  MUTATION_BOOK = 'mutation_book',
  TRANSACTION_NOTES = 'transaction_notes',
  MONTHLY_REPORT = 'monthly_report',
  SCHOOL_PROFILE = 'school_profile',
}

export type StudentGender = 'L' | 'P';
export type StudentStatus = 'active' | 'archived';

export type TransactionType = 'deposit' | 'withdrawal';

export type TransactionCategory =
  | 'regular'
  | 'initial'
  | 'study_tour'
  | 'uniform'
  | 'book'
  | 'graduation'
  | 'emergency'
  | 'other';

export type PaymentMethod = 'cash' | 'transfer';

export type JournalNoteCategory =
  | 'reconciliation'
  | 'bank_deposit'
  | 'reminder'
  | 'correction';

export type JournalNotePriority = 'normal' | 'high';
export type JournalNoteStatus = 'open' | 'resolved';

export interface SchoolProfile {
  ownerId: string;
  schoolName: string;
  schoolAddress: string;
  treasurerName: string;
  principalName: string;
  academicYear: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Student {
  id: string;
  ownerId: string;
  nis: string;
  accountNumber: string;
  fullName: string;
  className: string;
  gender: StudentGender;
  guardianName: string;
  guardianPhone: string;
  balance: number;
  totalDeposit: number;
  totalWithdrawal: number;
  transactionCount: number;
  status: StudentStatus;
  notes: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Transaction {
  id: string;
  ownerId: string;
  studentId: string;
  studentName: string;
  studentNis: string;
  studentClass: string;
  accountNumber: string;
  transactionCode: string;
  type: TransactionType;
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  transactionDate: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  description: string;
  note: string;
  isPinnedNote: boolean;
  recordedBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface JournalNote {
  id: string;
  ownerId: string;
  noteDate: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  title: string;
  content: string;
  category: JournalNoteCategory;
  priority: JournalNotePriority;
  status: JournalNoteStatus;
  relatedClass: string;
  authorName: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ClassMonthlySummary {
  className: string;
  studentCount: number;
  activeSaversCount: number;
  depositCount: number;
  withdrawalCount: number;
  totalDeposit: number;
  totalWithdrawal: number;
  netCashflow: number;
  closingBalance: number;
}

export interface StudentMonthlyMutation {
  studentId: string;
  nis: string;
  accountNumber: string;
  fullName: string;
  className: string;
  openingBalance: number;
  totalDeposit: number;
  totalWithdrawal: number;
  closingBalance: number;
  txCount: number;
}

export interface DailyCashflowPoint {
  date: string;
  dayLabel: string;
  deposit: number;
  withdrawal: number;
  net: number;
  txCount: number;
}

export interface CategorySummaryItem {
  category: TransactionCategory;
  label: string;
  depositAmount: number;
  withdrawalAmount: number;
  totalAmount: number;
  txCount: number;
  sharePercent: number;
}

export interface MonthlyReportSummary {
  monthKey: string;
  monthLabel: string;
  openingBalance: number;
  totalDeposit: number;
  totalWithdrawal: number;
  netCashflow: number;
  closingBalance: number;
  depositCount: number;
  withdrawalCount: number;
  totalTransactions: number;
  activeStudentsInMonth: number;
  classSummaries: ClassMonthlySummary[];
  studentMutations: StudentMonthlyMutation[];
  dailyCashflow: DailyCashflowPoint[];
  categorySummaries: CategorySummaryItem[];
  transactions: Transaction[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}
