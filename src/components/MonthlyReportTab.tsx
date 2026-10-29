import React, { useMemo, useState } from 'react';
import { Calendar, Download, FileSpreadsheet } from 'lucide-react';
import {
  exportMonthlyReportToExcel,
  exportMonthlyReportToPdf,
} from '../lib/exportPdfExcel';
import { computeMonthlyReport, getAvailableReportMonths } from '../lib/monthlyReport';
import {
  formatDateShortIndo,
  formatMonthKeyIndo,
  formatRupiah,
  getCurrentMonthKey,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_CATEGORY_LABELS,
} from '../lib/validation';
import type { SchoolProfile, Student, Transaction } from '../types';

interface MonthlyReportTabProps {
  students: Student[];
  transactions: Transaction[];
  school: SchoolProfile | null;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const MonthlyReportTab: React.FC<MonthlyReportTabProps> = ({
  students,
  transactions,
  school,
  onNotify,
}) => {
  const availableMonths = useMemo(
    () => getAvailableReportMonths(transactions),
    [transactions]
  );

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || getCurrentMonthKey()
  );
  const [detailView, setDetailView] = useState<'by_class' | 'by_student' | 'transactions'>(
    'by_class'
  );

  const report = useMemo(
    () => computeMonthlyReport(students, transactions, selectedMonth),
    [students, transactions, selectedMonth]
  );

  const handleDownloadPdf = () => {
    exportMonthlyReportToPdf(report, school);
    onNotify(
      'success',
      'Laporan PDF berhasil diunduh',
      `Periode ${report.monthLabel} siap dicetak.`
    );
  };

  const handleDownloadExcel = () => {
    exportMonthlyReportToExcel(report, school);
    onNotify(
      'success',
      'Laporan Excel (.xlsx) berhasil diunduh',
      'Berisi 4 lembar kerja: Ringkasan, Per Kelas, Per Siswa, dan Rincian Transaksi.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Report Period & Export Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
            <Calendar className="w-3.5 h-3.5" />
            <span>Agregasi Real-Time Otomatis · {school?.schoolName || 'Laporan Kas Sekolah'}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Laporan Bulanan Tabungan Siswa — {report.monthLabel}
          </h2>
          <p className="text-xs text-slate-500">
            Menghitung saldo awal, mutasi masuk/keluar, dan saldo akhir per kelas serta per siswa
            secara otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Pilih Periode Bulan"
            className="px-3.5 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:border-emerald-600"
          >
            {availableMonths.map((mk) => (
              <option key={mk} value={mk}>
                Periode: {formatMonthKeyIndo(mk)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor PDF Resmi</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>
      </section>

      {/* 5-Column Accounting Equation Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 space-y-1">
          <p className="text-xs text-slate-500">Saldo Awal Bulan</p>
          <p className="text-lg font-bold font-mono-num text-slate-900">
            {formatRupiah(report.openingBalance)}
          </p>
          <p className="text-[11px] text-slate-500">Posisi kas awal periode</p>
        </div>

        <div className="p-4 space-y-1">
          <p className="text-xs text-slate-500">Total Setoran Masuk</p>
          <p className="text-lg font-bold font-mono-num text-emerald-700">
            +{formatRupiah(report.totalDeposit)}
          </p>
          <p className="text-[11px] text-slate-500 font-mono-num">
            {report.depositCount} transaksi kredit
          </p>
        </div>

        <div className="p-4 space-y-1">
          <p className="text-xs text-slate-500">Total Penarikan Keluar</p>
          <p className="text-lg font-bold font-mono-num text-red-600">
            -{formatRupiah(report.totalWithdrawal)}
          </p>
          <p className="text-[11px] text-slate-500 font-mono-num">
            {report.withdrawalCount} transaksi debit
          </p>
        </div>

        <div className="p-4 space-y-1">
          <p className="text-xs text-slate-500">Arus Kas Bersih</p>
          <p
            className={`text-lg font-bold font-mono-num ${
              report.netCashflow >= 0 ? 'text-slate-900' : 'text-red-600'
            }`}
          >
            {report.netCashflow >= 0 ? '+' : ''}
            {formatRupiah(report.netCashflow)}
          </p>
          <p className="text-[11px] text-slate-500 font-mono-num">
            {report.activeStudentsInMonth} siswa bertransaksi
          </p>
        </div>

        <div className="p-4 space-y-1 bg-slate-50/60">
          <p className="text-xs font-medium text-slate-700">Saldo Akhir Bulan</p>
          <p className="text-lg font-bold font-mono-num text-slate-900">
            {formatRupiah(report.closingBalance)}
          </p>
          <p className="text-[11px] text-slate-500">Saldo Awal + Setor - Tarik</p>
        </div>
      </section>

      {/* Secondary Breakdown Row: Daily Activity + Category Purpose */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Rekapitulasi Harian Bulan {report.monthLabel}
            </h3>
            <p className="text-xs text-slate-500">
              Tanggal aktif penerimaan setoran dan pencairan tabungan
            </p>
          </div>

          {report.dailyCashflow.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
              Belum ada aktivitas transaksi pada bulan {report.monthLabel}.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="py-2 px-4">Tanggal</th>
                    <th className="py-2 px-4 text-center">Jml Mutasi</th>
                    <th className="py-2 px-4 text-right">Setoran</th>
                    <th className="py-2 px-4 text-right">Penarikan</th>
                    <th className="py-2 px-4 text-right">Selisih Harian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {report.dailyCashflow.map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50/70">
                      <td className="py-2 px-4 font-mono-num text-slate-900 font-medium">
                        {formatDateShortIndo(d.date)}
                      </td>
                      <td className="py-2 px-4 text-center font-mono-num text-slate-600">
                        {d.txCount}
                      </td>
                      <td className="py-2 px-4 text-right font-mono-num text-emerald-700">
                        {d.deposit > 0 ? `+${formatRupiah(d.deposit)}` : '-'}
                      </td>
                      <td className="py-2 px-4 text-right font-mono-num text-red-600">
                        {d.withdrawal > 0 ? `-${formatRupiah(d.withdrawal)}` : '-'}
                      </td>
                      <td className="py-2 px-4 text-right font-mono-num font-semibold text-slate-900">
                        {d.net >= 0 ? '+' : ''}
                        {formatRupiah(d.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Proporsi Kategori Transaksi</h3>
            <p className="text-xs text-slate-500">Distribusi peruntukan dana pada periode ini</p>
          </div>

          {report.categorySummaries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
              Belum ada distribusi kategori transaksi pada periode ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 overflow-y-auto max-h-64">
              {report.categorySummaries.map((cat) => (
                <div key={cat.category} className="px-6 py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-900">
                      {cat.label} ·{' '}
                      <span className="font-mono-num text-slate-500">{cat.txCount}x</span>
                    </span>
                    <span className="font-mono-num font-semibold text-slate-900">
                      {formatRupiah(cat.totalAmount)} ({cat.sharePercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, Math.min(100, cat.sharePercent))}%` }}
                      className="h-full bg-slate-800 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Main Detailed Ledger Matrix with Segmented View Switcher */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Tabel Rincian Laporan Administrasi ({report.monthLabel})
            </h3>
            <p className="text-xs text-slate-500">
              Seluruh tabel di bawah ini otomatis disertakan dalam berkas ekspor PDF dan Excel
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(
              [
                { id: 'by_class', label: 'Rekap Per Kelas' },
                { id: 'by_student', label: 'Mutasi Per Siswa' },
                { id: 'transactions', label: `Rincian Transaksi (${report.transactions.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailView(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  detailView === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {detailView === 'by_class' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Kelas</th>
                  <th className="py-2.5 px-4 text-center">Jml Siswa</th>
                  <th className="py-2.5 px-4 text-center">Aktif Menabung</th>
                  <th className="py-2.5 px-4 text-right">Total Setoran</th>
                  <th className="py-2.5 px-4 text-right">Total Penarikan</th>
                  <th className="py-2.5 px-4 text-right">Arus Bersih</th>
                  <th className="py-2.5 px-4 text-right">Saldo Akhir Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {report.classSummaries.map((c) => (
                  <tr key={c.className} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{c.className}</td>
                    <td className="py-2.5 px-4 text-center font-mono-num text-xs text-slate-700">
                      {c.studentCount}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono-num text-xs text-slate-700">
                      {c.activeSaversCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs text-emerald-700">
                      {formatRupiah(c.totalDeposit)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs text-red-600">
                      {formatRupiah(c.totalWithdrawal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs text-slate-800">
                      {c.netCashflow >= 0 ? '+' : ''}
                      {formatRupiah(c.netCashflow)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs font-bold text-slate-900">
                      {formatRupiah(c.closingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {detailView === 'by_student' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">NIS &amp; Rekening</th>
                  <th className="py-2.5 px-4">Nama Siswa &amp; Kelas</th>
                  <th className="py-2.5 px-4 text-right">Saldo Awal Bulan</th>
                  <th className="py-2.5 px-4 text-right">Setoran Bulan Ini</th>
                  <th className="py-2.5 px-4 text-right">Penarikan Bulan Ini</th>
                  <th className="py-2.5 px-4 text-right">Saldo Akhir Bulan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {report.studentMutations.map((s) => (
                  <tr key={s.studentId} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <p className="font-mono-num text-xs font-medium text-slate-900">{s.nis}</p>
                      <p className="font-mono-num text-[11px] text-slate-500">{s.accountNumber}</p>
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-slate-900 text-xs">{s.fullName}</p>
                      <p className="text-[11px] text-slate-500">
                        {s.className} · {s.txCount} mutasi bulan ini
                      </p>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs text-slate-700">
                      {formatRupiah(s.openingBalance)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs text-emerald-700">
                      {s.totalDeposit > 0 ? `+${formatRupiah(s.totalDeposit)}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs text-red-600">
                      {s.totalWithdrawal > 0 ? `-${formatRupiah(s.totalWithdrawal)}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs font-bold text-slate-900">
                      {formatRupiah(s.closingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {detailView === 'transactions' && (
          <div className="overflow-x-auto">
            {report.transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Tidak ada transaksi tercatat pada periode {report.monthLabel}.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4">Tanggal &amp; Kode</th>
                    <th className="py-2.5 px-4">Siswa</th>
                    <th className="py-2.5 px-4">Uraian &amp; Kategori</th>
                    <th className="py-2.5 px-4 text-right">Nominal</th>
                    <th className="py-2.5 px-4 text-right">Saldo Sesudah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {report.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono-num">
                        <p className="font-medium text-slate-900">
                          {formatDateShortIndo(tx.transactionDate)}
                        </p>
                        <p className="text-[11px] text-slate-500">{tx.transactionCode}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-slate-900">{tx.studentName}</p>
                        <p className="text-[11px] text-slate-500">{tx.studentClass}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="text-slate-900">{tx.description}</p>
                        <p className="text-[11px] text-slate-500">
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
                      <td className="py-2.5 px-4 text-right font-mono-num text-slate-900 whitespace-nowrap">
                        {formatRupiah(tx.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
