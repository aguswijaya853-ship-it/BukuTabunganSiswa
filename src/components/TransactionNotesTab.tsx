import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Download,
  Edit2,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  exportTransactionNotesToExcel,
  exportTransactionNotesToPdf,
} from '../lib/exportPdfExcel';
import {
  BLUEPRINT_LIMITS,
  formatDateShortIndo,
  formatRupiah,
  getTodayIso,
  JOURNAL_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
} from '../lib/validation';
import {
  createJournalNoteEntry,
  deleteJournalNoteEntry,
  resolveJournalNoteEntry,
  updateOpenJournalNote,
  updateTransactionAuditNote,
} from '../services/savingsService';
import type {
  JournalNote,
  JournalNoteCategory,
  JournalNotePriority,
  SchoolProfile,
  Transaction,
} from '../types';

interface TransactionNotesTabProps {
  ownerId: string;
  treasurerName: string;
  transactions: Transaction[];
  journalNotes: JournalNote[];
  school: SchoolProfile | null;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const TransactionNotesTab: React.FC<TransactionNotesTabProps> = ({
  ownerId,
  treasurerName,
  transactions,
  journalNotes,
  school,
  onNotify,
}) => {
  const [activeSubView, setActiveSubView] = useState<'tx_notes' | 'journal_notes'>('tx_notes');

  // Subview 1: Transaction Audit Notes state
  const [txFilterMode, setTxFilterMode] = useState<'with_notes' | 'pinned' | 'all'>('all');
  const [txSearch, setTxSearch] = useState('');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editTxDesc, setEditTxDesc] = useState('');
  const [editTxNote, setEditTxNote] = useState('');
  const [editTxPinned, setEditTxPinned] = useState(false);

  // Subview 2: Journal Notes state
  const [journalStatusFilter, setJournalStatusFilter] = useState<'all' | 'open' | 'resolved'>(
    'all'
  );
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<JournalNote | null>(null);
  const [jDate, setJDate] = useState(getTodayIso());
  const [jTitle, setJTitle] = useState('');
  const [jContent, setJContent] = useState('');
  const [jCategory, setJCategory] = useState<JournalNoteCategory>('reconciliation');
  const [jPriority, setJPriority] = useState<JournalNotePriority>('normal');
  const [jClass, setJClass] = useState('Semua Kelas');

  const [confirmResolveNote, setConfirmResolveNote] = useState<JournalNote | null>(null);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<JournalNote | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredTxNotes = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return transactions.filter((t) => {
      if (txFilterMode === 'pinned' && !t.isPinnedNote) return false;
      if (txFilterMode === 'with_notes' && !t.note && !t.isPinnedNote) return false;
      if (!q) return true;
      return (
        t.studentName.toLowerCase().includes(q) ||
        t.transactionCode.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.note.toLowerCase().includes(q)
      );
    });
  }, [transactions, txFilterMode, txSearch]);

  const transactionsWithNotesForExport = useMemo(
    () => transactions.filter((t) => Boolean(t.note) || t.isPinnedNote),
    [transactions]
  );

  const filteredJournals = useMemo(() => {
    return journalNotes.filter((n) => {
      if (journalStatusFilter !== 'all' && n.status !== journalStatusFilter) return false;
      return true;
    });
  }, [journalNotes, journalStatusFilter]);

  const openEditTxModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditTxDesc(tx.description);
    setEditTxNote(tx.note);
    setEditTxPinned(tx.isPinnedNote);
  };

  const handleSaveTxNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setSubmitting(true);
    try {
      await updateTransactionAuditNote(editingTx.id, {
        description: editTxDesc,
        note: editTxNote,
        isPinnedNote: editTxPinned,
      });
      onNotify('success', 'Catatan transaksi disimpan', `Kode ${editingTx.transactionCode} diperbarui.`);
      setEditingTx(null);
    } catch (err) {
      onNotify(
        'error',
        'Gagal memperbarui catatan transaksi',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickTogglePin = async (tx: Transaction) => {
    try {
      await updateTransactionAuditNote(tx.id, {
        description: tx.description,
        note: tx.note,
        isPinnedNote: !tx.isPinnedNote,
      });
      onNotify(
        'info',
        !tx.isPinnedNote ? 'Transaksi ditandai' : 'Tanda transaksi dilepas',
        tx.transactionCode
      );
    } catch (err) {
      onNotify('error', 'Gagal mengubah tanda', err instanceof Error ? err.message : String(err));
    }
  };

  const openNewJournalModal = () => {
    setEditingJournal(null);
    setJDate(getTodayIso());
    setJTitle('');
    setJContent('');
    setJCategory('reconciliation');
    setJPriority('normal');
    setJClass('Semua Kelas');
    setIsJournalModalOpen(true);
  };

  const openEditJournalModal = (note: JournalNote) => {
    setEditingJournal(note);
    setJDate(note.noteDate);
    setJTitle(note.title);
    setJContent(note.content);
    setJCategory(note.category);
    setJPriority(note.priority);
    setJClass(note.relatedClass);
    setIsJournalModalOpen(true);
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingJournal) {
        await updateOpenJournalNote(editingJournal.id, {
          noteDate: jDate,
          title: jTitle,
          content: jContent,
          category: jCategory,
          priority: jPriority,
          relatedClass: jClass,
        });
        onNotify('success', 'Jurnal bendahara diperbarui');
      } else {
        await createJournalNoteEntry(ownerId, {
          noteDate: jDate,
          title: jTitle,
          content: jContent,
          category: jCategory,
          priority: jPriority,
          relatedClass: jClass,
          authorName: school?.treasurerName || treasurerName,
        });
        onNotify('success', 'Catatan jurnal kas ditambahkan');
      }
      setIsJournalModalOpen(false);
    } catch (err) {
      onNotify('error', 'Gagal menyimpan jurnal', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmResolve = async () => {
    if (!confirmResolveNote) return;
    setSubmitting(true);
    try {
      await resolveJournalNoteEntry(confirmResolveNote);
      onNotify('success', 'Catatan ditandai selesai');
      setConfirmResolveNote(null);
    } catch (err) {
      onNotify('error', 'Gagal menandai selesai', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteJournal = async () => {
    if (!confirmDeleteNote) return;
    setSubmitting(true);
    try {
      await deleteJournalNoteEntry(confirmDeleteNote.id);
      onNotify('success', 'Catatan jurnal dihapus');
      setConfirmDeleteNote(null);
    } catch (err) {
      onNotify('error', 'Gagal menghapus jurnal', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Workspace Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveSubView('tx_notes')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubView === 'tx_notes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Memo Pada Transaksi ({transactionsWithNotesForExport.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('journal_notes')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubView === 'journal_notes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jurnal Kas Bendahara ({journalNotes.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              exportTransactionNotesToPdf(
                transactionsWithNotesForExport.length > 0
                  ? transactionsWithNotesForExport
                  : transactions.slice(0, 25),
                journalNotes,
                school
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor PDF</span>
          </button>
          <button
            type="button"
            onClick={() =>
              exportTransactionNotesToExcel(
                transactionsWithNotesForExport.length > 0
                  ? transactionsWithNotesForExport
                  : transactions,
                journalNotes,
                school
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </button>
          {activeSubView === 'journal_notes' && (
            <button
              type="button"
              onClick={openNewJournalModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tulis Jurnal Kas</span>
            </button>
          )}
        </div>
      </div>

      {/* Subview 1: Transaction Audit Notes */}
      {activeSubView === 'tx_notes' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Cari catatan, kode transaksi, atau nama siswa..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'Semua Transaksi' },
                  { id: 'with_notes', label: 'Memiliki Catatan' },
                  { id: 'pinned', label: 'Ditandai Tindak Lanjut' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTxFilterMode(f.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    txFilterMode === f.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTxNotes.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-medium text-slate-800">
                Tidak ada catatan transaksi pada filter ini.
              </p>
              <p className="text-xs text-slate-500">
                Klik tombol Ubah Catatan pada transaksi mana pun untuk menambahkan memo audit atau
                tanda tindak lanjut.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-2.5 px-4">Tanggal &amp; Kode</th>
                    <th className="py-2.5 px-4">Siswa</th>
                    <th className="py-2.5 px-4">Nominal</th>
                    <th className="py-2.5 px-4">Uraian &amp; Catatan Pemeriksaan</th>
                    <th className="py-2.5 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredTxNotes.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <p className="font-mono-num text-xs font-medium text-slate-900">
                          {formatDateShortIndo(tx.transactionDate)}
                        </p>
                        <p className="font-mono-num text-[11px] text-slate-500">
                          {tx.transactionCode}
                        </p>
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-slate-900 text-xs">{tx.studentName}</p>
                        <p className="text-[11px] text-slate-500">{tx.studentClass}</p>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <p
                          className={`font-mono-num text-xs font-semibold ${
                            tx.type === 'deposit' ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {TRANSACTION_TYPE_LABELS[tx.type]} {formatRupiah(tx.amount)}
                        </p>
                      </td>
                      <td className="py-2.5 px-4 max-w-md">
                        <p className="text-xs font-medium text-slate-900">{tx.description}</p>
                        {tx.note ? (
                          <p className="text-xs text-slate-600 mt-0.5">{tx.note}</p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5 italic">
                            Belum ada memo tambahan
                          </p>
                        )}
                        {tx.isPinnedNote && (
                          <p className="text-[11px] font-medium text-amber-700 mt-0.5">
                            Ditandai perlu tindak lanjut bendahara
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickTogglePin(tx)}
                            title={
                              tx.isPinnedNote
                                ? 'Lepas Tanda Tindak Lanjut'
                                : 'Tandai Perlu Tindak Lanjut'
                            }
                            className={`p-1.5 rounded-md cursor-pointer ${
                              tx.isPinnedNote
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditTxModal(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Catatan</span>
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
      )}

      {/* Subview 2: Operational Cashbook Journal Notes */}
      {activeSubView === 'journal_notes' && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Jurnal Rekonsiliasi &amp; Catatan Kas Harian
              </h2>
              <p className="text-xs text-slate-500">
                Dokumentasikan penyetoran kas ke bank, pencocokan uang tunai, dan pengingat kelas
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'open', label: 'Terbuka' },
                  { id: 'resolved', label: 'Selesai' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setJournalStatusFilter(st.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    journalStatusFilter === st.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {filteredJournals.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm font-medium text-slate-800">
                Belum ada catatan jurnal operasional bendahara.
              </p>
              <button
                type="button"
                onClick={openNewJournalModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tulis Catatan Pertama</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredJournals.map((j) => (
                <div
                  key={j.id}
                  className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono-num text-slate-700 font-medium">
                        {formatDateShortIndo(j.noteDate)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{JOURNAL_CATEGORY_LABELS[j.category]}</span>
                      {j.relatedClass && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{j.relatedClass}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          j.priority === 'high' ? 'text-amber-700 font-medium' : 'text-slate-500'
                        }
                      >
                        {j.priority === 'high' ? 'Prioritas Penting' : 'Prioritas Normal'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          j.status === 'resolved'
                            ? 'text-emerald-700 font-medium'
                            : 'text-slate-700 font-medium'
                        }
                      >
                        {j.status === 'resolved' ? 'Selesai' : 'Terbuka'}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900">{j.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {j.content}
                    </p>
                    <p className="text-[11px] text-slate-400">Dicatat oleh {j.authorName}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {j.status === 'open' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmResolveNote(j)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tandai Selesai</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditJournalModal(j)}
                          title="Ubah Catatan"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteNote(j)}
                      title="Hapus Catatan"
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal: Edit Transaction Audit Note */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Catatan Pemeriksaan Transaksi
              </h3>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTxNote} className="p-6 space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                <p className="font-mono-num font-semibold text-slate-900">
                  {editingTx.transactionCode} · {formatRupiah(editingTx.amount)}
                </p>
                <p>
                  {editingTx.studentName} ({editingTx.studentClass}) — Nominal transaksi bersifat
                  permanen demi integritas buku mutasi.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Uraian Transaksi <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={BLUEPRINT_LIMITS.TX_DESCRIPTION_MAX}
                  value={editTxDesc}
                  onChange={(e) => setEditTxDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Catatan / Memo Bendahara
                </label>
                <textarea
                  rows={3}
                  maxLength={BLUEPRINT_LIMITS.TX_NOTE_MAX}
                  value={editTxNote}
                  onChange={(e) => setEditTxNote(e.target.value)}
                  placeholder="Tulis keterangan verifikasi, nomor bukti transfer, atau nama wali..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTxPinned}
                  onChange={(e) => setEditTxPinned(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700"
                />
                <span>Tandai perlu tindak lanjut / pemeriksaan ulang</span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Operational Journal Note */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingJournal ? 'Ubah Jurnal Kas Bendahara' : 'Tulis Jurnal Kas Bendahara Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsJournalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveJournal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={jDate}
                    onChange={(e) => setJDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Kategori</label>
                  <select
                    value={jCategory}
                    onChange={(e) => setJCategory(e.target.value as JournalNoteCategory)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {Object.entries(JOURNAL_CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Prioritas</label>
                  <select
                    value={jPriority}
                    onChange={(e) => setJPriority(e.target.value as JournalNotePriority)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">Penting</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Judul Catatan <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={BLUEPRINT_LIMITS.JOURNAL_TITLE_MAX}
                    value={jTitle}
                    onChange={(e) => setJTitle(e.target.value)}
                    placeholder="Contoh: Setoran Kas Kolektif ke Bank Daerah"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Kelas Terkait</label>
                  <input
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.CLASS_NAME_MAX}
                    value={jClass}
                    onChange={(e) => setJClass(e.target.value)}
                    placeholder="Semua Kelas"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Rincian Catatan Kas <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={3}
                  maxLength={BLUEPRINT_LIMITS.JOURNAL_CONTENT_MAX}
                  value={jContent}
                  onChange={(e) => setJContent(e.target.value)}
                  placeholder="Tuliskan rincian pencocokan kas fisik, nomor bukti setoran bank, atau tindak lanjut..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Resolve Journal Note */}
      {confirmResolveNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Tandai Catatan Jurnal Selesai?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Catatan <strong>{confirmResolveNote.title}</strong> akan dikunci sebagai{' '}
              <strong>Selesai</strong> sebagai bagian dari arsip pemeriksaan kas.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResolveNote(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmResolve}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {submitting ? 'Memproses...' : 'Ya, Tandai Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Journal Note */}
      {confirmDeleteNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Hapus Catatan Jurnal?</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Catatan <strong>{confirmDeleteNote.title}</strong> akan dihapus permanen dari daftar
              jurnal bendahara.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteNote(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDeleteJournal}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {submitting ? 'Menghapus...' : 'Hapus Catatan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
