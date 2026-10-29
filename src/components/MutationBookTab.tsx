import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Wallet,
} from 'lucide-react';
import {
  exportPassbookToExcel,
  exportPassbookToPdf,
  exportTransactionReceiptPdf,
} from '../lib/exportPdfExcel';
import { buildStudentPassbookLedger, getAvailableReportMonths } from '../lib/monthlyReport';
import {
  formatDateShortIndo,
  formatMonthKeyIndo,
  formatRupiah,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_CATEGORY_LABELS,
} from '../lib/validation';
import { NavSection, type SchoolProfile, type Student, type Transaction } from '../types';

interface MutationBookTabProps {
  students: Student[];
  transactions: Transaction[];
  school: SchoolProfile | null;
  preselectedStudentId: string | null;
  onNavigate: (section: NavSection, studentId?: string) => void;
}

export const MutationBookTab: React.FC<MutationBookTabProps> = ({
  students,
  transactions,
  school,
  preselectedStudentId,
  onNavigate,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');

  useEffect(() => {
    if (preselectedStudentId && students.some((s) => s.id === preselectedStudentId)) {
      setSelectedStudentId(preselectedStudentId);
    } else if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [preselectedStudentId, students, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        s.accountNumber.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const fullLedgerRows = useMemo(() => {
    if (!selectedStudent) return [];
    return buildStudentPassbookLedger(selectedStudent.id, transactions);
  }, [selectedStudent, transactions]);

  const visibleLedgerRows = useMemo(() => {
    if (monthFilter === 'ALL') return fullLedgerRows;
    return fullLedgerRows.filter((row) => row.transaction.monthKey === monthFilter);
  }, [fullLedgerRows, monthFilter]);

  const availableMonths = useMemo(
    () => getAvailableReportMonths(transactions),
    [transactions]
  );

  const periodTotals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const r of visibleLedgerRows) {
      debit += r.debit;
      credit += r.credit;
    }
    return { debit, credit };
  }, [visibleLedgerRows]);

  if (students.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        <p className="text-base font-semibold text-slate-900">
          Buku Mutasi Belum Memiliki Rekening Siswa
        </p>
        <p className="text-xs text-slate-500">
          Tambahkan data siswa terlebih dahulu untuk membuka dan mencetak buku mutasi per rekening.
        </p>
        <button
          type="button"
          onClick={() => onNavigate(NavSection.STUDENTS)}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
        >
          Tambah Data Siswa
        </button>
      </div>
    );
  }

  const periodLabel =
    monthFilter === 'ALL' ? 'Seluruh Riwayat Rekening' : formatMonthKeyIndo(monthFilter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Directory Column */}
      <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Daftar Buku Rekening</h2>
            <p className="text-xs text-slate-500">Pilih siswa untuk membuka lembar mutasi</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Cari nama, NIS, atau kelas..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-200 max-h-[560px] overflow-y-auto">
          {filteredStudents.map((s) => {
            const isSelected = s.id === selectedStudent?.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStudentId(s.id)}
                className={`w-full text-left px-4 py-3 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-sm truncate ${
                      isSelected ? 'font-semibold text-emerald-950' : 'font-medium text-slate-900'
                    }`}
                  >
                    {s.fullName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {s.className} · NIS <span className="font-mono-num">{s.nis}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono-num text-xs font-semibold text-slate-900">
                    {formatRupiah(s.balance)}
                  </p>
                  <p className="font-mono-num text-[11px] text-slate-500">
                    {s.transactionCount} mutasi
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Passbook Detail Column */}
      <section className="lg:col-span-8 space-y-5">
        {selectedStudent && (
          <>
            {/* Institutional Passbook Header */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-mono-num text-xs text-emerald-800 font-medium">
                    NO. REKENING {selectedStudent.accountNumber} · NIS {selectedStudent.nis}
                  </p>
                  <h2 className="text-xl font-bold text-slate-900">{selectedStudent.fullName}</h2>
                  <p className="text-xs text-slate-600">
                    {selectedStudent.className} · Wali: {selectedStudent.guardianName || '-'}
                    {selectedStudent.guardianPhone ? ` (${selectedStudent.guardianPhone})` : ''} ·{' '}
                    {selectedStudent.status === 'active' ? 'Status Aktif' : 'Arsip Tutup Buku'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {selectedStudent.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => onNavigate(NavSection.TRANSACTIONS, selectedStudent.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Setor / Tarik</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      exportPassbookToPdf(
                        selectedStudent,
                        visibleLedgerRows,
                        school,
                        periodLabel
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cetak PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportPassbookToExcel(
                        selectedStudent,
                        visibleLedgerRows,
                        school,
                        periodLabel
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Passbook Account Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/60">
                <div className="px-6 py-4 space-y-0.5">
                  <p className="text-xs text-slate-500">Total Kredit (Setoran Periode)</p>
                  <p className="text-lg font-bold font-mono-num text-emerald-700">
                    +{formatRupiah(periodTotals.credit)}
                  </p>
                </div>
                <div className="px-6 py-4 space-y-0.5">
                  <p className="text-xs text-slate-500">Total Debit (Penarikan Periode)</p>
                  <p className="text-lg font-bold font-mono-num text-red-600">
                    -{formatRupiah(periodTotals.debit)}
                  </p>
                </div>
                <div className="px-6 py-4 space-y-0.5">
                  <p className="text-xs text-slate-500">Saldo Akhir Buku Tabungan</p>
                  <p className="text-lg font-bold font-mono-num text-slate-900">
                    {formatRupiah(selectedStudent.balance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Passbook Chronological Mutation Sheet */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Lembar Buku Mutasi Kronologis
                  </h3>
                  <p className="text-xs text-slate-500">
                    Urutan transaksi dari awal hingga mutasi terakhir disertai saldo berjalan
                  </p>
                </div>

                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  aria-label="Filter Periode Bulan"
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-emerald-600"
                >
                  <option value="ALL">Seluruh Periode ({fullLedgerRows.length} baris)</option>
                  {availableMonths.map((mk) => (
                    <option key={mk} value={mk}>
                      {formatMonthKeyIndo(mk)}
                    </option>
                  ))}
                </select>
              </div>

              {visibleLedgerRows.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <p className="text-sm font-medium text-slate-800">
                    Belum ada baris mutasi pada periode ini.
                  </p>
                  <p className="text-xs text-slate-500">
                    Setiap transaksi setoran dan penarikan siswa akan otomatis tercatat di lembar
                    buku mutasi ini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                        <th className="py-2.5 px-3 text-center w-10">No</th>
                        <th className="py-2.5 px-3">Tanggal &amp; Kode</th>
                        <th className="py-2.5 px-3">Uraian Mutasi</th>
                        <th className="py-2.5 px-3 text-right">Debit (Tarik)</th>
                        <th className="py-2.5 px-3 text-right">Kredit (Setor)</th>
                        <th className="py-2.5 px-3 text-right">Saldo</th>
                        <th className="py-2.5 px-3 text-right">Slip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {visibleLedgerRows.map((row) => (
                        <tr key={row.transaction.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 text-center font-mono-num text-slate-500">
                            {row.index}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <p className="font-mono-num font-medium text-slate-900">
                              {formatDateShortIndo(row.transaction.transactionDate)}
                            </p>
                            <p className="font-mono-num text-[11px] text-slate-500">
                              {row.transaction.transactionCode}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <p className="font-medium text-slate-900">
                              {row.transaction.description}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {TRANSACTION_CATEGORY_LABELS[row.transaction.category]} ·{' '}
                              {PAYMENT_METHOD_LABELS[row.transaction.paymentMethod]} ·{' '}
                              {row.transaction.recordedBy}
                            </p>
                            {row.transaction.note && (
                              <p className="text-[11px] text-slate-600 mt-0.5 italic">
                                Catatan: {row.transaction.note}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num text-red-600 whitespace-nowrap">
                            {row.debit > 0 ? formatRupiah(row.debit) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num text-emerald-700 whitespace-nowrap">
                            {row.credit > 0 ? formatRupiah(row.credit) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap">
                            {formatRupiah(row.runningBalance)}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => exportTransactionReceiptPdf(row.transaction, school)}
                              title="Cetak Bukti Slip PDF"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
