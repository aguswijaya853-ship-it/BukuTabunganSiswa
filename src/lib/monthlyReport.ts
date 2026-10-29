import {
  formatMonthKeyIndo,
  formatMonthShortIndo,
  getCurrentMonthKey,
  TRANSACTION_CATEGORY_LABELS,
} from './validation';
import type {
  CategorySummaryItem,
  ClassMonthlySummary,
  DailyCashflowPoint,
  MonthlyReportSummary,
  Student,
  StudentMonthlyMutation,
  Transaction,
  TransactionCategory,
} from '../types';

export interface PassbookLedgerRow {
  index: number;
  transaction: Transaction;
  debit: number; // Penarikan
  credit: number; // Setoran
  runningBalance: number;
}

function getTxTimestampMs(tx: Transaction): number {
  if (
    tx.createdAt &&
    typeof tx.createdAt === 'object' &&
    'toMillis' in tx.createdAt &&
    typeof tx.createdAt.toMillis === 'function'
  ) {
    return tx.createdAt.toMillis();
  }
  return 0;
}

/**
 * Builds chronological passbook mutation rows for a single student.
 * Computes deterministic running balance from chronological order.
 */
export function buildStudentPassbookLedger(
  studentId: string,
  allTransactions: Transaction[]
): PassbookLedgerRow[] {
  const studentTxs = allTransactions
    .filter((tx) => tx.studentId === studentId)
    .slice()
    .sort((a, b) => {
      if (a.transactionDate !== b.transactionDate) {
        return a.transactionDate.localeCompare(b.transactionDate);
      }
      return getTxTimestampMs(a) - getTxTimestampMs(b);
    });

  let running = 0;
  return studentTxs.map((tx, idx) => {
    const credit = tx.type === 'deposit' ? tx.amount : 0;
    const debit = tx.type === 'withdrawal' ? tx.amount : 0;
    running = running + credit - debit;
    return {
      index: idx + 1,
      transaction: tx,
      debit,
      credit,
      runningBalance: running,
    };
  });
}

/**
 * Returns sorted descending list of YYYY-MM keys available for monthly reports,
 * always including the current calendar month and the previous 5 months.
 */
export function getAvailableReportMonths(transactions: Transaction[]): string[] {
  const monthSet = new Set<string>();
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(key);
  }
  monthSet.add(getCurrentMonthKey());
  for (const tx of transactions) {
    if (tx.monthKey) monthSet.add(tx.monthKey);
  }
  return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
}

export interface SixMonthTrendItem {
  monthKey: string;
  label: string;
  deposit: number;
  withdrawal: number;
  net: number;
}

export function computeSixMonthTrend(transactions: Transaction[]): SixMonthTrendItem[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return keys.map((monthKey) => {
    let deposit = 0;
    let withdrawal = 0;
    for (const tx of transactions) {
      if (tx.monthKey === monthKey) {
        if (tx.type === 'deposit') deposit += tx.amount;
        else withdrawal += tx.amount;
      }
    }
    return {
      monthKey,
      label: formatMonthShortIndo(monthKey),
      deposit,
      withdrawal,
      net: deposit - withdrawal,
    };
  });
}

/**
 * Automatically aggregates a complete institutional monthly savings report
 * for a selected YYYY-MM month key in real time.
 */
export function computeMonthlyReport(
  students: Student[],
  transactions: Transaction[],
  monthKey: string
): MonthlyReportSummary {
  const studentMap = new Map<string, StudentMonthlyMutation>();

  for (const s of students) {
    studentMap.set(s.id, {
      studentId: s.id,
      nis: s.nis,
      accountNumber: s.accountNumber,
      fullName: s.fullName,
      className: s.className,
      openingBalance: 0,
      totalDeposit: 0,
      totalWithdrawal: 0,
      closingBalance: 0,
      txCount: 0,
    });
  }

  const monthTransactions: Transaction[] = [];
  const activeStudentIds = new Set<string>();
  let openingBalance = 0;
  let totalDeposit = 0;
  let totalWithdrawal = 0;
  let depositCount = 0;
  let withdrawalCount = 0;

  for (const tx of transactions) {
    let entry = studentMap.get(tx.studentId);
    if (!entry) {
      entry = {
        studentId: tx.studentId,
        nis: tx.studentNis,
        accountNumber: tx.accountNumber,
        fullName: tx.studentName,
        className: tx.studentClass,
        openingBalance: 0,
        totalDeposit: 0,
        totalWithdrawal: 0,
        closingBalance: 0,
        txCount: 0,
      };
      studentMap.set(tx.studentId, entry);
    }

    if (tx.monthKey < monthKey) {
      const delta = tx.type === 'deposit' ? tx.amount : -tx.amount;
      entry.openingBalance += delta;
      openingBalance += delta;
    } else if (tx.monthKey === monthKey) {
      monthTransactions.push(tx);
      activeStudentIds.add(tx.studentId);
      entry.txCount += 1;
      if (tx.type === 'deposit') {
        entry.totalDeposit += tx.amount;
        totalDeposit += tx.amount;
        depositCount += 1;
      } else {
        entry.totalWithdrawal += tx.amount;
        totalWithdrawal += tx.amount;
        withdrawalCount += 1;
      }
    }
  }

  const studentMutations = Array.from(studentMap.values()).map((item) => ({
    ...item,
    closingBalance: item.openingBalance + item.totalDeposit - item.totalWithdrawal,
  }));

  studentMutations.sort((a, b) => {
    const cls = a.className.localeCompare(b.className, 'id');
    if (cls !== 0) return cls;
    return a.fullName.localeCompare(b.fullName, 'id');
  });

  // Class aggregation
  const classMap = new Map<string, ClassMonthlySummary>();
  for (const sm of studentMutations) {
    let c = classMap.get(sm.className);
    if (!c) {
      c = {
        className: sm.className,
        studentCount: 0,
        activeSaversCount: 0,
        depositCount: 0,
        withdrawalCount: 0,
        totalDeposit: 0,
        totalWithdrawal: 0,
        netCashflow: 0,
        closingBalance: 0,
      };
      classMap.set(sm.className, c);
    }
    c.studentCount += 1;
    if (sm.txCount > 0) c.activeSaversCount += 1;
    c.totalDeposit += sm.totalDeposit;
    c.totalWithdrawal += sm.totalWithdrawal;
    c.netCashflow += sm.totalDeposit - sm.totalWithdrawal;
    c.closingBalance += sm.closingBalance;
  }

  for (const tx of monthTransactions) {
    const studentEntry = studentMap.get(tx.studentId);
    const clsKey = studentEntry?.className || tx.studentClass;
    const c = classMap.get(clsKey);
    if (c) {
      if (tx.type === 'deposit') c.depositCount += 1;
      else c.withdrawalCount += 1;
    }
  }

  const classSummaries = Array.from(classMap.values()).sort((a, b) =>
    a.className.localeCompare(b.className, 'id')
  );

  // Daily cashflow points for days with transactions in selected month
  const dailyMap = new Map<string, DailyCashflowPoint>();
  for (const tx of monthTransactions) {
    let pt = dailyMap.get(tx.transactionDate);
    if (!pt) {
      pt = {
        date: tx.transactionDate,
        dayLabel: tx.transactionDate.slice(8, 10),
        deposit: 0,
        withdrawal: 0,
        net: 0,
        txCount: 0,
      };
      dailyMap.set(tx.transactionDate, pt);
    }
    pt.txCount += 1;
    if (tx.type === 'deposit') pt.deposit += tx.amount;
    else pt.withdrawal += tx.amount;
    pt.net = pt.deposit - pt.withdrawal;
  }

  const dailyCashflow = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Category breakdown
  const catMap = new Map<
    TransactionCategory,
    { depositAmount: number; withdrawalAmount: number; txCount: number }
  >();
  for (const tx of monthTransactions) {
    const prev = catMap.get(tx.category) || {
      depositAmount: 0,
      withdrawalAmount: 0,
      txCount: 0,
    };
    prev.txCount += 1;
    if (tx.type === 'deposit') prev.depositAmount += tx.amount;
    else prev.withdrawalAmount += tx.amount;
    catMap.set(tx.category, prev);
  }

  const grossVolume = totalDeposit + totalWithdrawal;
  const categorySummaries: CategorySummaryItem[] = Array.from(catMap.entries())
    .map(([category, val]) => {
      const totalAmount = val.depositAmount + val.withdrawalAmount;
      return {
        category,
        label: TRANSACTION_CATEGORY_LABELS[category] || category,
        depositAmount: val.depositAmount,
        withdrawalAmount: val.withdrawalAmount,
        totalAmount,
        txCount: val.txCount,
        sharePercent: grossVolume > 0 ? Math.round((totalAmount / grossVolume) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const sortedMonthTransactions = monthTransactions.slice().sort((a, b) => {
    if (a.transactionDate !== b.transactionDate) {
      return a.transactionDate.localeCompare(b.transactionDate);
    }
    return getTxTimestampMs(a) - getTxTimestampMs(b);
  });

  const netCashflow = totalDeposit - totalWithdrawal;
  const closingBalance = openingBalance + netCashflow;

  return {
    monthKey,
    monthLabel: formatMonthKeyIndo(monthKey),
    openingBalance,
    totalDeposit,
    totalWithdrawal,
    netCashflow,
    closingBalance,
    depositCount,
    withdrawalCount,
    totalTransactions: monthTransactions.length,
    activeStudentsInMonth: activeStudentIds.size,
    classSummaries,
    studentMutations,
    dailyCashflow,
    categorySummaries,
    transactions: sortedMonthTransactions,
  };
}
