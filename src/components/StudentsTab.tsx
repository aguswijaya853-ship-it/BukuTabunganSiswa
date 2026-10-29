import React, { useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  Download,
  Edit2,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { exportStudentsToExcel, exportStudentsToPdf } from '../lib/exportPdfExcel';
import { BLUEPRINT_LIMITS, formatRupiah } from '../lib/validation';
import {
  archiveStudentAccount,
  createStudentAccount,
  deleteEmptyStudentAccount,
  updateStudentBiodata,
} from '../services/savingsService';
import {
  NavSection,
  type SchoolProfile,
  type Student,
  type StudentGender,
  type StudentStatus,
} from '../types';

interface StudentsTabProps {
  ownerId: string;
  treasurerName: string;
  students: Student[];
  school: SchoolProfile | null;
  onNavigate: (section: NavSection, studentId?: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  ownerId,
  treasurerName,
  students,
  school,
  onNavigate,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('active');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [confirmArchiveStudent, setConfirmArchiveStudent] = useState<Student | null>(null);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [nis, setNis] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [gender, setGender] = useState<StudentGender>('L');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.className) set.add(s.className);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (classFilter !== 'ALL' && s.className !== classFilter) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.accountNumber.toLowerCase().includes(q) ||
        s.guardianName.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, classFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingStudent(null);
    setNis('');
    setFullName('');
    setClassName(availableClasses[0] || 'Kelas 4A');
    setGender('L');
    setGuardianName('');
    setGuardianPhone('');
    setNotes('');
    setInitialDeposit('');
    setIsFormOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setNis(student.nis);
    setFullName(student.fullName);
    setClassName(student.className);
    setGender(student.gender);
    setGuardianName(student.guardianName);
    setGuardianPhone(student.guardianPhone);
    setNotes(student.notes);
    setInitialDeposit('');
    setIsFormOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingStudent) {
        await updateStudentBiodata(editingStudent, {
          nis,
          fullName,
          className,
          gender,
          guardianName,
          guardianPhone,
          notes,
        });
        onNotify('success', 'Biodata siswa diperbarui', `${fullName} berhasil disimpan.`);
      } else {
        const parsedInit = initialDeposit ? Number(initialDeposit.replace(/[^0-9]/g, '')) : 0;
        await createStudentAccount(ownerId, students.length, {
          nis,
          fullName,
          className,
          gender,
          guardianName,
          guardianPhone,
          notes,
          initialDeposit: parsedInit,
          recordedBy: treasurerName,
        });
        onNotify(
          'success',
          'Rekening siswa dibuat',
          parsedInit > 0
            ? `${fullName} terdaftar dengan setoran awal ${formatRupiah(parsedInit)}.`
            : `${fullName} berhasil didaftarkan.`
        );
      }
      setIsFormOpen(false);
    } catch (err) {
      onNotify(
        'error',
        'Gagal menyimpan data siswa',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!confirmArchiveStudent) return;
    setSubmitting(true);
    try {
      await archiveStudentAccount(confirmArchiveStudent, 'Tutup buku rekening tabungan');
      onNotify(
        'success',
        'Rekening diarsipkan',
        `${confirmArchiveStudent.fullName} telah ditutup buku.`
      );
      setConfirmArchiveStudent(null);
    } catch (err) {
      onNotify('error', 'Gagal mengarsipkan', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteStudent) return;
    setSubmitting(true);
    try {
      await deleteEmptyStudentAccount(confirmDeleteStudent);
      onNotify('success', 'Data siswa dihapus', `${confirmDeleteStudent.fullName} telah dihapus.`);
      setConfirmDeleteStudent(null);
    } catch (err) {
      onNotify('error', 'Gagal menghapus siswa', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const totalFilteredBalance = useMemo(
    () => filteredStudents.reduce((acc, s) => acc + s.balance, 0),
    [filteredStudents]
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, NIS, no. rekening, atau wali..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Filter Kelas"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">Semua Kelas</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          {/* Interactive Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'active', label: 'Aktif' },
                { id: 'archived', label: 'Arsip' },
                { id: 'all', label: 'Semua' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportStudentsToPdf(filteredStudents, school)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={() => exportStudentsToExcel(filteredStudents, school)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Data Grid */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Menampilkan <strong className="font-mono-num text-slate-900">{filteredStudents.length}</strong>{' '}
            rekening siswa
          </span>
          <span>
            Total Saldo Terfilter:{' '}
            <strong className="font-mono-num text-slate-900">
              {formatRupiah(totalFilteredBalance)}
            </strong>
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-800">
              Tidak ada rekening siswa yang sesuai dengan pencarian.
            </p>
            <p className="text-xs text-slate-500">
              Ubah kata kunci filter atau tambahkan rekening siswa baru.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Siswa Baru</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">No. Rekening &amp; NIS</th>
                  <th className="py-2.5 px-4">Nama Siswa &amp; Kelas</th>
                  <th className="py-2.5 px-4">Wali Murid</th>
                  <th className="py-2.5 px-4 text-right">Total Setor</th>
                  <th className="py-2.5 px-4 text-right">Total Tarik</th>
                  <th className="py-2.5 px-4 text-right">Saldo Aktif</th>
                  <th className="py-2.5 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <p className="font-mono-num text-xs font-semibold text-slate-900">
                        {s.accountNumber}
                      </p>
                      <p className="font-mono-num text-xs text-slate-500">NIS {s.nis}</p>
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-slate-900">{s.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {s.className} · {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'} ·{' '}
                        {s.status === 'active' ? 'Aktif' : 'Arsip Tutup Buku'}
                      </p>
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="text-slate-800 text-xs">{s.guardianName || '-'}</p>
                      {s.guardianPhone && (
                        <p className="font-mono-num text-xs text-slate-500">{s.guardianPhone}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs text-emerald-700 whitespace-nowrap">
                      {formatRupiah(s.totalDeposit)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-xs text-slate-600 whitespace-nowrap">
                      {formatRupiah(s.totalWithdrawal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap">
                      {formatRupiah(s.balance)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {s.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => onNavigate(NavSection.TRANSACTIONS, s.id)}
                            title="Setor / Tarik Tabungan"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>Transaksi</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onNavigate(NavSection.MUTATION_BOOK, s.id)}
                          title="Buka Buku Mutasi"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Mutasi</span>
                        </button>
                        {s.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            title="Ubah Biodata Siswa"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {s.status === 'active' && s.balance === 0 && s.transactionCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setConfirmArchiveStudent(s)}
                            title="Arsipkan / Tutup Buku (Saldo Rp 0)"
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-md cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {s.balance === 0 && s.transactionCount === 0 && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStudent(s)}
                            title="Hapus Rekening Kosong"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / Edit Student Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingStudent ? 'Perbarui Biodata Siswa' : 'Buka Rekening Tabungan Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    NIS / NISN <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={BLUEPRINT_LIMITS.NIS_MAX}
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    placeholder="Contoh: 20260412"
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Kelas / Rombel <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={BLUEPRINT_LIMITS.CLASS_NAME_MAX}
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Contoh: Kelas 5A"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Nama Lengkap Siswa <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={BLUEPRINT_LIMITS.STUDENT_NAME_MAX}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap sesuai buku induk"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Jenis Kelamin</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as StudentGender)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Nama Orang Tua / Wali
                  </label>
                  <input
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.GUARDIAN_NAME_MAX}
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Opsional"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    No. Telepon / WhatsApp Wali
                  </label>
                  <input
                    type="text"
                    maxLength={BLUEPRINT_LIMITS.GUARDIAN_PHONE_MAX}
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {!editingStudent && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Setoran Awal Pembukaan Rekening (Rp — Opsional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={BLUEPRINT_LIMITS.TX_AMOUNT_MAX}
                    step={1000}
                    value={initialDeposit}
                    onChange={(e) => setInitialDeposit(e.target.value)}
                    placeholder="0 (kosongkan jika tanpa setoran awal)"
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Catatan Rekening Siswa
                </label>
                <input
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.STUDENT_NOTES_MAX}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Program tabungan karya wisata"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {submitting
                    ? 'Menyimpan...'
                    : editingStudent
                      ? 'Simpan Perubahan'
                      : 'Buka Rekening Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Archive Modal */}
      {confirmArchiveStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Arsipkan / Tutup Buku Rekening?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Rekening milik <strong>{confirmArchiveStudent.fullName}</strong> (Saldo Rp 0) akan
              ditandai sebagai <strong>Arsip Tutup Buku</strong>. Riwayat buku mutasi tetap
              tersimpan permanen untuk keperluan laporan, namun rekening tidak lagi menerima
              transaksi baru.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmArchiveStudent(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmArchive}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {submitting ? 'Memproses...' : 'Ya, Tutup Buku'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Empty Student Modal */}
      {confirmDeleteStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Hapus Rekening Kosong?</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Rekening <strong>{confirmDeleteStudent.fullName}</strong> belum memiliki riwayat
              transaksi sama sekali. Tindakan penghapusan ini bersifat permanen.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteStudent(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {submitting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
