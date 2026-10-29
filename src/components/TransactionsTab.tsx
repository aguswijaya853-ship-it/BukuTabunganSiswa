import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  FileText,
  Search,
} from 'lucide-react';
import { exportTransactionReceiptPdf } from '../lib/exportPdfExcel';
import {
  BLUEPRINT_LIMITS,
  formatDateShortIndo,
  formatRupiah,
  getTodayIso,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_CATEGORY_LABELS,
} from '../lib/validation';
import { recordSavingsTransaction } from '../services/savingsService';
import {
  NavSection,
  type PaymentMethod,
  type SchoolProfile,
  type Student,
  type Transaction,
  type TransactionCategory,
  type TransactionType,
} from '../types';

interface TransactionsTabProps {
  ownerId: string;
  treasurerName: string;
  students: Student[];
  transactions: Transaction[];
  school: SchoolProfile | null;
  preselectedStudentId: string | null;
  onNavigate: (section: NavSection, studentId?: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

const QUICK_NOMINALS = [10000, 20000, 50000, 100000, 250000];

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  ownerId,
  treasurerName,
  students,
  transactions,
  school,
  preselectedStudentId,
  onNavigate,
  onNotify,
}) => {
  const activeStudents = useMemo(
    () => students.filter((s) => s.status === 'active'),
    [students]
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentQuery, setStudentQuery] = useState('');
  const [txType, setTxType] = useState<TransactionType>('deposit');
  const [category, setCategory] = useState<TransactionCategory>('regular');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountInput, setAmountInput] = useState<string>('');
  const [txDate, setTxDate] = useState<string>(getTodayIso());
  const [description, setDescription] = useState<string>('Setoran tabungan rutin');
  const [note, setNote] = useState<string>('');
  const [isPinnedNote, setIsPinnedNote] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | TransactionType>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  useEffect(() => {
    if (preselectedStudentId && activeStudents.some((s) => s.id === preselectedStudentId)) {
      setSelectedStudentId(preselectedStudentId);
    } else if (!selectedStudentId && activeStudents.length > 0) {
      setSelectedStudentId(activeStudents[0].id);
    }
  }, [preselectedStudentId, activeStudents, selectedStudentId]);

  const filteredStudentOptions = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return activeStudents;
    return activeStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        s.accountNumber.toLowerCase().includes(q)
    );
  }, [activeStudents, studentQuery]);

  const selectedStudent = useMemo(
    () => activeStudents.find((s) => s.id === selectedStudentId) || null,
    [activeStudents, selectedStudentId]
  );

  const parsedAmount = useMemo(() => {
    const clean = Number(amountInput.replace(/[^0-9]/g, ''));
    return Number.isFinite(clean) ? Math.round(clean) : 0;
  }, [amountInput]);

  const insufficientBalance =
    Boolean(selectedStudent) &&
    txType === 'withdrawal' &&
    parsedAmount > (selectedStudent?.balance ?? 0);

  const projectedBalance = useMemo(() => {
    if (!selectedStudent) return 0;
    return txType === 'deposit'
      ? selectedStudent.balance + parsedAmount
      : selectedStudent.balance - parsedAmount;
  }, [selectedStudent, txType, parsedAmount]);

  const handleSwitchType = (nextType: TransactionType) => {
    setTxType(nextType);
    if (nextType === 'deposit' && description.startsWith('Penarikan')) {
      setDescription('Setoran tabungan rutin');
      setCategory('regular');
    } else if (nextType === 'withdrawal' && description.startsWith('Setoran')) {
      setDescription('Penarikan tabungan siswa');
      setCategory('other');
    }
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      onNotify('error', 'Pilih siswa terlebih dahulu');
      return;
    }
    if (parsedAmount <= 0) {
      onNotify('error', 'Nominal transaksi wajib lebih dari Rp 0');
      return;
    }
    if (insufficientBalance) {
      onNotify('error', 'Saldo tidak mencukupi', 'Jumlah penarikan melebihi saldo aktif siswa.');
      return;
    }

    setSubmitting(true);
    try {
      const createdTx = await recordSavingsTransaction(ownerId, selectedStudent, {
        type: txType,
        category,
        paymentMethod,
        amount: parsedAmount,
        transactionDate: txDate,
        description,
        note,
        isPinnedNote,
        recordedBy: school?.treasurerName || treasurerName,
      });

      onNotify(
        'success',
        `${txType === 'deposit' ? 'Setoran' : 'Penarikan'} berhasil dicatat`,
        `${createdTx.studentName} · ${formatRupiah(createdTx.amount)} · Saldo: ${formatRupiah(createdTx.balanceAfter)}`
      );

      setAmountInput('');
      setNote('');
      setIsPinnedNote(false);
    } catch (err) {
      onNotify(
        'error',
        'Gagal mencatat transaksi',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (historyTypeFilter !== 'all' && tx.type !== historyTypeFilter) return false;
      if (historyDateFilter && tx.transactionDate !== historyDateFilter) return false;
      if (!q) return true;
      return (
        tx.studentName.toLowerCase().includes(q) ||
        tx.studentNis.toLowerCase().includes(q) ||
        tx.studentClass.toLowerCase().includes(q) ||
        tx.transactionCode.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q)
      );
    });
  }, [transactions, historySearch, historyTypeFilter, historyDateFilter]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Cashier Form Column */}
      <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Loket Kasir Setor &amp; Tarik</h2>
          <p className="text-xs text-slate-500">
            Transaksi langsung memperbarui saldo siswa secara atomik
          </p>
        </div>

        {activeStudents.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm text-slate-600">
              Belum ada rekening siswa berstatus aktif. Tambahkan siswa terlebih dahulu sebelum
              mencatat transaksi.
            </p>
            <button
              type="button"
              onClick={() => onNavigate(NavSection.STUDENTS)}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              Ke Menu Data Siswa
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitTransaction} className="p-6 space-y-4">
            {/* Segmented Transaction Direction */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleSwitchType('deposit')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  txType === 'deposit'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Setoran Masuk</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchType('withdrawal')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  txType === 'withdrawal'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Penarikan Keluar</span>
              </button>
            </div>

            {/* Searchable Student Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Pilih Rekening Siswa <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Filter cepat nama / NIS / kelas..."
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                {filteredStudentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} — {s.className} (Saldo: {formatRupiah(s.balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Account Balance Preview Strip */}
            {selectedStudent && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>
                    {selectedStudent.accountNumber} · NIS {selectedStudent.nis}
                  </span>
                  <span className="font-medium text-slate-700">{selectedStudent.className}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600">Saldo Saat Ini:</span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {formatRupiah(selectedStudent.balance)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Saldo Sesudah Transaksi:</span>
                  <span
                    className={`font-mono-num font-bold ${
                      insufficientBalance ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatRupiah(projectedBalance)}
                  </span>
                </div>
              </div>
            )}

            {/* Nominal Input + Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700">
                  Nominal Rupiah <span className="text-red-600">*</span>
                </label>
                {txType === 'withdrawal' && selectedStudent && selectedStudent.balance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmountInput(String(selectedStudent.balance))}
                    className="text-xs font-medium text-red-600 hover:underline cursor-pointer"
                  >
                    Tarik Seluruh Saldo
                  </button>
                )}
              </div>
              <input
                type="number"
                required
                min={1}
                max={BLUEPRINT_LIMITS.TX_AMOUNT_MAX}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Masukkan nominal (contoh: 50000)"
                className="w-full px-3 py-2.5 text-base font-mono-num font-semibold border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOMINALS.map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => setAmountInput(String(nom))}
                    className="px-2.5 py-1 text-xs font-mono-num font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {formatRupiah(nom)}
                  </button>
                ))}
              </div>
              {insufficientBalance && (
                <p className="text-xs text-red-600 font-medium">
                  Nominal melebihi saldo aktif rekening siswa.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
                >
                  {Object.entries(TRANSACTION_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Metode &amp; Tanggal</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="cash">Tunai</option>
                    <option value="transfer">Transfer</option>
                  </select>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="px-2 py-2 text-xs font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Uraian Mutasi Buku Tabungan <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.TX_DESCRIPTION_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Setoran tabungan pekan ke-4"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Catatan Pemeriksaan / Memo Transaksi (Opsional)
              </label>
              <textarea
                rows={2}
                maxLength={BLUEPRINT_LIMITS.TX_NOTE_MAX}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan bukti transfer, penitip uang, atau keterangan kuitansi..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 resize-none"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinnedNote}
                onChange={(e) => setIsPinnedNote(e.target.checked)}
                className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span>Tandai transaksi ini pada menu Catatan Transaksi untuk tindak lanjut</span>
            </label>

            <button
              type="submit"
              disabled={submitting || insufficientBalance || !selectedStudent}
              className={`w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 ${
                txType === 'deposit'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submitting
                ? 'Memproses Transaksi...'
                : txType === 'deposit'
                  ? `Simpan Setoran ${parsedAmount > 0 ? formatRupiah(parsedAmount) : ''}`
                  : `Simpan Penarikan ${parsedAmount > 0 ? formatRupiah(parsedAmount) : ''}`}
            </button>
          </form>
        )}
      </section>

      {/* Real-Time Transaction History Column */}
      <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Daftar Transaksi Real-Time
              </h2>
              <p className="text-xs text-slate-500">
                Unduh bukti slip tanda terima PDF langsung pada setiap baris transaksi
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono-num">
              {filteredHistory.length} transaksi
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Cari siswa, kode referensi, atau uraian..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <input
              type="date"
              value={historyDateFilter}
              onChange={(e) => setHistoryDateFilter(e.target.value)}
              aria-label="Filter Tanggal"
              className="px-2.5 py-1.5 text-xs font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
            {historyDateFilter && (
              <button
                type="button"
                onClick={() => setHistoryDateFilter('')}
                className="text-xs text-slate-500 hover:text-slate-900 underline cursor-pointer"
              >
                Reset Tanggal
              </button>
            )}

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'deposit', label: 'Setoran' },
                  { id: 'withdrawal', label: 'Penarikan' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setHistoryTypeFilter(t.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    historyTypeFilter === t.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-800">Tidak ada transaksi ditemukan.</p>
            <p className="text-xs text-slate-500">
              Gunakan formulir kasir di sebelah kiri untuk mencatat setoran atau penarikan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                <tr>
                  <th className="py-2.5 px-4">Tanggal &amp; Kode</th>
                  <th className="py-2.5 px-4">Siswa</th>
                  <th className="py-2.5 px-4">Uraian &amp; Kategori</th>
                  <th className="py-2.5 px-4 text-right">Nominal</th>
                  <th className="py-2.5 px-4 text-right">Saldo Akhir</th>
                  <th className="py-2.5 px-4 text-right">Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredHistory.map((tx) => (
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
                      <button
                        type="button"
                        onClick={() => onNavigate(NavSection.MUTATION_BOOK, tx.studentId)}
                        className="font-medium text-slate-900 hover:text-emerald-700 hover:underline text-left cursor-pointer"
                      >
                        {tx.studentName}
                      </button>
                      <p className="text-xs text-slate-500">{tx.studentClass}</p>
                    </td>
                    <td className="py-2.5 px-4 max-w-xs">
                      <p className="text-slate-900 text-xs font-medium truncate">
                        {tx.description}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {TRANSACTION_CATEGORY_LABELS[tx.category]} ·{' '}
                        {PAYMENT_METHOD_LABELS[tx.paymentMethod]}
                        {tx.isPinnedNote ? ' · Ditandai' : ''}
                      </p>
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono-num text-xs font-semibold whitespace-nowrap ${
                        tx.type === 'deposit' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'deposit' ? '+' : '-'}
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs text-slate-800 whitespace-nowrap">
                      {formatRupiah(tx.balanceAfter)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => exportTransactionReceiptPdf(tx, school)}
                          title="Cetak Bukti Slip Transaksi (PDF)"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Slip PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate(NavSection.MUTATION_BOOK, tx.studentId)}
                          title="Lihat Buku Mutasi Siswa"
                          className="p-1 text-slate-500 hover:text-emerald-700 rounded cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
