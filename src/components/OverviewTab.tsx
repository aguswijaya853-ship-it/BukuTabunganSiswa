import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Database,
  FileSpreadsheet,
  Plus,
  Users,
} from 'lucide-react';
import { computeMonthlyReport, computeSixMonthTrend } from '../lib/monthlyReport';
import {
  formatDateShortIndo,
  formatMonthKeyIndo,
  formatRupiah,
  getCurrentMonthKey,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_CATEGORY_LABELS,
} from '../lib/validation';
import { NavSection, type JournalNote, type Student, type Transaction } from '../types';

interface OverviewTabProps {
  students: Student[];
  transactions: Transaction[];
  journalNotes: JournalNote[];
  loading: boolean;
  seeding: boolean;
  onSeedSampleData: () => void;
  onNavigate: (section: NavSection, studentId?: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  students,
  transactions,
  journalNotes,
  loading,
  seeding,
  onSeedSampleData,
  onNavigate,
}) => {
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);

  const currentMonthKey = getCurrentMonthKey();

  const stats = useMemo(() => {
    const activeStudents = students.filter((s) => s.status === 'active');
    const totalBalance = students.reduce((acc, s) => acc + s.balance, 0);
    const monthReport = computeMonthlyReport(students, transactions, currentMonthKey);
    const openNotes = journalNotes.filter((n) => n.status === 'open').length;
    const pinnedTxCount = transactions.filter((t) => t.isPinnedNote).length;

    return {
      activeStudentsCount: activeStudents.length,
      totalStudentsCount: students.length,
      totalBalance,
      monthDeposit: monthReport.totalDeposit,
      monthWithdrawal: monthReport.totalWithdrawal,
      monthDepositCount: monthReport.depositCount,
      monthWithdrawalCount: monthReport.withdrawalCount,
      monthNet: monthReport.netCashflow,
      classSummaries: monthReport.classSummaries,
      openNotesCount: openNotes + pinnedTxCount,
    };
  }, [students, transactions, journalNotes, currentMonthKey]);

  const sixMonthTrend = useMemo(() => computeSixMonthTrend(transactions), [transactions]);

  const maxTrendValue = useMemo(() => {
    let maxVal = 100000;
    for (const item of sixMonthTrend) {
      if (item.deposit > maxVal) maxVal = item.deposit;
      if (item.withdrawal > maxVal) maxVal = item.withdrawal;
    }
    return maxVal;
  }, [sixMonthTrend]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="p-5 space-y-3 animate-pulse">
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="h-7 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Empty Workspace Onboarding State
  if (students.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 lg:p-12 max-w-3xl mx-auto text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            Mulai Pembukuan Tabungan Siswa Sekolah Anda
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Database Firestore Anda telah aktif dan siap menyinkronkan data secara real-time.
            Tambahkan data siswa pertama secara manual, atau muat data contoh sekolah (5 siswa &amp;
            riwayat transaksi 3 bulan) untuk langsung menguji Buku Mutasi serta Laporan Bulanan
            PDF/Excel.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate(NavSection.STUDENTS)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa Pertama</span>
          </button>

          <button
            type="button"
            onClick={onSeedSampleData}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Database className="w-4 h-4 text-slate-500" />
            <span>{seeding ? 'Memuat Data Contoh...' : 'Muat Data Contoh Sekolah'}</span>
          </button>
        </div>
      </div>
    );
  }

  const recentTransactions = transactions.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Primary 4-Column KPI Strip */}
      <section className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Total Saldo Tabungan Aktif</p>
          <p className="text-2xl font-bold text-slate-900 font-mono-num tracking-tight">
            {formatRupiah(stats.totalBalance)}
          </p>
          <p className="text-xs text-slate-500">
            <span className="font-mono-num text-slate-700 font-medium">
              {stats.activeStudentsCount}
            </span>{' '}
            rekening aktif ·{' '}
            <span className="font-mono-num">{transactions.length}</span> total mutasi
          </p>
        </div>

        <div className="p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">
            Setoran {formatMonthKeyIndo(currentMonthKey)}
          </p>
          <p className="text-2xl font-bold text-emerald-700 font-mono-num tracking-tight">
            +{formatRupiah(stats.monthDeposit)}
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              <span className="font-mono-num font-medium text-slate-700">
                {stats.monthDepositCount}
              </span>{' '}
              transaksi setoran masuk
            </span>
          </p>
        </div>

        <div className="p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">
            Penarikan {formatMonthKeyIndo(currentMonthKey)}
          </p>
          <p className="text-2xl font-bold text-red-600 font-mono-num tracking-tight">
            -{formatRupiah(stats.monthWithdrawal)}
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>
              <span className="font-mono-num font-medium text-slate-700">
                {stats.monthWithdrawalCount}
              </span>{' '}
              transaksi penarikan keluar
            </span>
          </p>
        </div>

        <div className="p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Surplus / Defisit Bulan Ini</p>
          <p
            className={`text-2xl font-bold font-mono-num tracking-tight ${
              stats.monthNet >= 0 ? 'text-slate-900' : 'text-red-600'
            }`}
          >
            {stats.monthNet >= 0 ? '+' : ''}
            {formatRupiah(stats.monthNet)}
          </p>
          <p className="text-xs text-slate-500">
            <button
              type="button"
              onClick={() => onNavigate(NavSection.TRANSACTION_NOTES)}
              className="hover:text-slate-900 underline underline-offset-2 cursor-pointer"
            >
              <span className="font-mono-num font-medium text-slate-700">
                {stats.openNotesCount}
              </span>{' '}
              catatan aktif perlu perhatian
            </button>
          </p>
        </div>
      </section>

      {/* Middle Row: 6-Month Cashflow Chart + Class Balance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 6-Month Cashflow SVG Chart */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Tren Setoran &amp; Penarikan 6 Bulan Terakhir
              </h2>
              <p className="text-xs text-slate-500">
                Perbandingan arus kas masuk dan keluar berdasarkan tanggal transaksi
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs inline-block" />
                Setoran
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-300 rounded-xs inline-block" />
                Penarikan
              </span>
            </div>
          </div>

          <div className="relative pt-2">
            <div className="grid grid-cols-6 gap-3 items-end h-48 pt-6 border-b border-slate-200">
              {sixMonthTrend.map((m, idx) => {
                const depPct = Math.max(
                  m.deposit > 0 ? 6 : 1,
                  Math.round((m.deposit / maxTrendValue) * 100)
                );
                const wdPct = Math.max(
                  m.withdrawal > 0 ? 6 : 1,
                  Math.round((m.withdrawal / maxTrendValue) * 100)
                );
                const isHovered = hoveredBarIdx === idx;

                return (
                  <div
                    key={m.monthKey}
                    onMouseEnter={() => setHoveredBarIdx(idx)}
                    onMouseLeave={() => setHoveredBarIdx(null)}
                    className="h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  >
                    {isHovered && (
                      <div className="absolute -top-2 z-10 bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-sm whitespace-nowrap pointer-events-none">
                        <p className="font-semibold">{formatMonthKeyIndo(m.monthKey)}</p>
                        <p className="font-mono-num text-emerald-300">
                          Setor: {formatRupiah(m.deposit)}
                        </p>
                        <p className="font-mono-num text-slate-300">
                          Tarik: {formatRupiah(m.withdrawal)}
                        </p>
                      </div>
                    )}
                    <div className="w-full max-w-14 flex items-end justify-center gap-1.5 h-36">
                      <div
                        style={{ height: `${depPct}%` }}
                        className="w-1/2 bg-emerald-600 group-hover:bg-emerald-700 rounded-t transition-opacity"
                        title={`Setoran ${m.label}: ${formatRupiah(m.deposit)}`}
                      />
                      <div
                        style={{ height: `${wdPct}%` }}
                        className="w-1/2 bg-slate-300 group-hover:bg-slate-400 rounded-t transition-opacity"
                        title={`Penarikan ${m.label}: ${formatRupiah(m.withdrawal)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-6 gap-3 pt-2.5 text-center">
              {sixMonthTrend.map((m) => (
                <span key={m.monthKey} className="text-xs font-mono-num text-slate-600">
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Klik menu Laporan Bulanan untuk rincian dan ekspor resmi.</span>
            <button
              type="button"
              onClick={() => onNavigate(NavSection.MONTHLY_REPORT)}
              className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Buka Laporan Bulanan</span>
            </button>
          </div>
        </section>

        {/* Class Balance Distribution */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
          <div className="p-6 pb-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Sebaran Saldo Per Kelas</h2>
              <p className="text-xs text-slate-500">Posisi dana tabungan berdasarkan rombel</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(NavSection.STUDENTS)}
              className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Kelola Siswa
            </button>
          </div>

          <div className="divide-y divide-slate-200 flex-1 overflow-auto max-h-64">
            {stats.classSummaries.map((cls) => {
              const share =
                stats.totalBalance > 0
                  ? Math.round((cls.closingBalance / stats.totalBalance) * 100)
                  : 0;
              return (
                <div key={cls.className} className="px-6 py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{cls.className}</span>
                      <span className="text-xs text-slate-500">
                        · {cls.studentCount} siswa
                      </span>
                    </div>
                    <span className="font-mono-num font-semibold text-slate-900">
                      {formatRupiah(cls.closingBalance)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(share, 3))}%` }}
                      className="h-full bg-emerald-600 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent Real-Time Mutations Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Mutasi Transaksi Terbaru</h2>
            <p className="text-xs text-slate-500">
              Pembaruan otomatis secara real-time dari buku kas tabungan siswa
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate(NavSection.TRANSACTIONS)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Semua Transaksi
            </button>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-slate-600">
              Belum ada transaksi setoran atau penarikan yang tercatat.
            </p>
            <button
              type="button"
              onClick={() => onNavigate(NavSection.TRANSACTIONS)}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              Catat Transaksi Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Tanggal &amp; Kode</th>
                  <th className="py-2.5 px-4">Siswa</th>
                  <th className="py-2.5 px-4">Jenis &amp; Uraian</th>
                  <th className="py-2.5 px-4 text-right">Nominal</th>
                  <th className="py-2.5 px-4 text-right">Saldo Akhir</th>
                  <th className="py-2.5 px-4 text-right">Buku Mutasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <p className="font-mono-num text-xs font-medium text-slate-900">
                        {formatDateShortIndo(tx.transactionDate)}
                      </p>
                      <p className="font-mono-num text-[11px] text-slate-500">
                        {tx.transactionCode}
                      </p>
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-slate-900">{tx.studentName}</p>
                      <p className="text-xs text-slate-500">
                        {tx.studentClass} · NIS <span className="font-mono-num">{tx.studentNis}</span>
                      </p>
                    </td>
                    <td className="py-2.5 px-4 max-w-xs">
                      <p className="text-slate-900 truncate">{tx.description}</p>
                      <p className="text-xs text-slate-500">
                        {tx.type === 'deposit' ? 'Setoran' : 'Penarikan'} ·{' '}
                        {TRANSACTION_CATEGORY_LABELS[tx.category]} ·{' '}
                        {PAYMENT_METHOD_LABELS[tx.paymentMethod]}
                      </p>
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono-num font-semibold whitespace-nowrap ${
                        tx.type === 'deposit' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'deposit' ? '+' : '-'}
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-slate-800 whitespace-nowrap">
                      {formatRupiah(tx.balanceAfter)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onNavigate(NavSection.MUTATION_BOOK, tx.studentId)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Lihat Buku</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
