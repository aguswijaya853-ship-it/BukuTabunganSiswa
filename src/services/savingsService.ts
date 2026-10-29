import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BLUEPRINT_LIMITS,
  BLUEPRINT_PATTERNS,
  generateAccountNumber,
  generateSafeId,
  generateTransactionCode,
  getTodayIso,
  sanitizeNis,
  sanitizeText,
} from '../lib/validation';
import type {
  JournalNote,
  JournalNoteCategory,
  JournalNotePriority,
  PaymentMethod,
  SchoolProfile,
  Student,
  StudentGender,
  Transaction,
  TransactionCategory,
  TransactionType,
} from '../types';

function toMillis(ts: unknown): number {
  if (
    ts &&
    typeof ts === 'object' &&
    'toMillis' in ts &&
    typeof (ts as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export function subscribeSchoolProfile(
  ownerId: string,
  onData: (profile: SchoolProfile | null) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `schools/${ownerId}`;
  const ref = doc(db, 'schools', ownerId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(snap.data() as SchoolProfile);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (formatted) {
        onError?.(formatted as Error);
      }
    }
  );
}

export function subscribeStudents(
  ownerId: string,
  onData: (students: Student[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'students';
  const q = query(collection(db, path), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      const list: Student[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Student, 'id'>),
      }));
      list.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        const clsCmp = a.className.localeCompare(b.className, 'id');
        if (clsCmp !== 0) return clsCmp;
        return a.fullName.localeCompare(b.fullName, 'id');
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formatted) {
        onError?.(formatted as Error);
      }
    }
  );
}

export function subscribeTransactions(
  ownerId: string,
  onData: (transactions: Transaction[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'transactions';
  const q = query(collection(db, path), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      const list: Transaction[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Transaction, 'id'>),
      }));
      list.sort((a, b) => {
        if (a.transactionDate !== b.transactionDate) {
          return b.transactionDate.localeCompare(a.transactionDate);
        }
        return toMillis(b.createdAt) - toMillis(a.createdAt);
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formatted) {
        onError?.(formatted as Error);
      }
    }
  );
}

export function subscribeJournalNotes(
  ownerId: string,
  onData: (notes: JournalNote[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'journal_notes';
  const q = query(collection(db, path), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      const list: JournalNote[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<JournalNote, 'id'>),
      }));
      list.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        if (a.noteDate !== b.noteDate) return b.noteDate.localeCompare(a.noteDate);
        return toMillis(b.createdAt) - toMillis(a.createdAt);
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formatted) {
        onError?.(formatted as Error);
      }
    }
  );
}

export async function saveSchoolProfile(
  ownerId: string,
  input: {
    schoolName: string;
    schoolAddress: string;
    treasurerName: string;
    principalName: string;
    academicYear: string;
  }
): Promise<void> {
  const path = `schools/${ownerId}`;
  const ref = doc(db, 'schools', ownerId);

  const schoolName = sanitizeText(input.schoolName, BLUEPRINT_LIMITS.SCHOOL_NAME_MAX);
  const schoolAddress = sanitizeText(input.schoolAddress, BLUEPRINT_LIMITS.SCHOOL_ADDRESS_MAX);
  const treasurerName = sanitizeText(input.treasurerName, BLUEPRINT_LIMITS.TREASURER_NAME_MAX);
  const principalName = sanitizeText(input.principalName, BLUEPRINT_LIMITS.PRINCIPAL_NAME_MAX);
  const academicYear = sanitizeText(input.academicYear, BLUEPRINT_LIMITS.ACADEMIC_YEAR_MAX);

  if (schoolName.length < BLUEPRINT_LIMITS.SCHOOL_NAME_MIN) {
    throw new Error('Nama sekolah minimal 2 karakter.');
  }
  if (treasurerName.length < BLUEPRINT_LIMITS.TREASURER_NAME_MIN) {
    throw new Error('Nama bendahara minimal 2 karakter.');
  }
  if (!BLUEPRINT_PATTERNS.ACADEMIC_YEAR.test(academicYear) || academicYear.length < 4) {
    throw new Error('Tahun ajaran tidak valid (contoh: 2026/2027).');
  }

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ownerId,
        schoolName,
        schoolAddress,
        treasurerName,
        principalName,
        academicYear,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        schoolName,
        schoolAddress,
        treasurerName,
        principalName,
        academicYear,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface CreateStudentInput {
  nis: string;
  fullName: string;
  className: string;
  gender: StudentGender;
  guardianName: string;
  guardianPhone: string;
  notes: string;
  initialDeposit?: number;
  recordedBy: string;
}

export async function createStudentAccount(
  ownerId: string,
  existingStudentsCount: number,
  input: CreateStudentInput
): Promise<string> {
  const nis = sanitizeNis(input.nis);
  const fullName = sanitizeText(input.fullName, BLUEPRINT_LIMITS.STUDENT_NAME_MAX);
  const className = sanitizeText(input.className, BLUEPRINT_LIMITS.CLASS_NAME_MAX);
  const guardianName = sanitizeText(input.guardianName, BLUEPRINT_LIMITS.GUARDIAN_NAME_MAX);
  const guardianPhone = sanitizeText(input.guardianPhone, BLUEPRINT_LIMITS.GUARDIAN_PHONE_MAX);
  const notes = sanitizeText(input.notes, BLUEPRINT_LIMITS.STUDENT_NOTES_MAX);

  if (nis.length < BLUEPRINT_LIMITS.NIS_MIN || !BLUEPRINT_PATTERNS.NIS.test(nis)) {
    throw new Error('NIS minimal 2 karakter (huruf/angka).');
  }
  if (fullName.length < BLUEPRINT_LIMITS.STUDENT_NAME_MIN) {
    throw new Error('Nama lengkap siswa minimal 2 karakter.');
  }
  if (className.length < BLUEPRINT_LIMITS.CLASS_NAME_MIN) {
    throw new Error('Kelas siswa wajib diisi.');
  }

  const studentId = generateSafeId('stu');
  const accountNumber = generateAccountNumber(nis, existingStudentsCount);
  const studentPath = `students/${studentId}`;

  const baseStudent: Omit<Student, 'id'> = {
    ownerId,
    nis,
    accountNumber,
    fullName,
    className,
    gender: input.gender,
    guardianName,
    guardianPhone,
    balance: 0,
    totalDeposit: 0,
    totalWithdrawal: 0,
    transactionCount: 0,
    status: 'active',
    notes,
  };

  try {
    await setDoc(doc(db, 'students', studentId), {
      ...baseStudent,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, studentPath);
  }

  const initAmount = Math.round(input.initialDeposit ?? 0);
  if (initAmount > 0) {
    const today = getTodayIso();
    await recordSavingsTransaction(
      ownerId,
      { id: studentId, ...baseStudent },
      {
        type: 'deposit',
        category: 'initial',
        paymentMethod: 'cash',
        amount: initAmount,
        transactionDate: today,
        description: 'Setoran awal pembukaan rekening tabungan',
        note: 'Pembukaan buku tabungan siswa baru',
        isPinnedNote: false,
        recordedBy: input.recordedBy,
      }
    );
  }

  return studentId;
}

export async function updateStudentBiodata(
  student: Student,
  updates: {
    nis: string;
    fullName: string;
    className: string;
    gender: StudentGender;
    guardianName: string;
    guardianPhone: string;
    notes: string;
  }
): Promise<void> {
  const nis = sanitizeNis(updates.nis);
  const fullName = sanitizeText(updates.fullName, BLUEPRINT_LIMITS.STUDENT_NAME_MAX);
  const className = sanitizeText(updates.className, BLUEPRINT_LIMITS.CLASS_NAME_MAX);
  const guardianName = sanitizeText(updates.guardianName, BLUEPRINT_LIMITS.GUARDIAN_NAME_MAX);
  const guardianPhone = sanitizeText(updates.guardianPhone, BLUEPRINT_LIMITS.GUARDIAN_PHONE_MAX);
  const notes = sanitizeText(updates.notes, BLUEPRINT_LIMITS.STUDENT_NOTES_MAX);

  if (nis.length < BLUEPRINT_LIMITS.NIS_MIN || !BLUEPRINT_PATTERNS.NIS.test(nis)) {
    throw new Error('NIS minimal 2 karakter (huruf/angka).');
  }
  if (fullName.length < BLUEPRINT_LIMITS.STUDENT_NAME_MIN) {
    throw new Error('Nama lengkap siswa minimal 2 karakter.');
  }
  if (className.length < BLUEPRINT_LIMITS.CLASS_NAME_MIN) {
    throw new Error('Kelas wajib diisi.');
  }

  const path = `students/${student.id}`;
  try {
    await updateDoc(doc(db, 'students', student.id), {
      nis,
      fullName,
      className,
      gender: updates.gender,
      guardianName,
      guardianPhone,
      notes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function archiveStudentAccount(student: Student, closingNote?: string): Promise<void> {
  if (student.balance !== 0) {
    throw new Error('Saldo siswa harus Rp 0 sebelum rekening dapat diarsipkan/tutup buku.');
  }
  const path = `students/${student.id}`;
  const mergedNotes = sanitizeText(
    closingNote ? `${student.notes ? student.notes + ' | ' : ''}${closingNote}` : student.notes,
    BLUEPRINT_LIMITS.STUDENT_NOTES_MAX
  );
  try {
    await updateDoc(doc(db, 'students', student.id), {
      status: 'archived',
      notes: mergedNotes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEmptyStudentAccount(student: Student): Promise<void> {
  if (student.balance !== 0 || student.transactionCount !== 0) {
    throw new Error('Hanya rekening siswa yang belum memiliki riwayat transaksi yang dapat dihapus.');
  }
  const path = `students/${student.id}`;
  try {
    await deleteDoc(doc(db, 'students', student.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface RecordTransactionInput {
  type: TransactionType;
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  amount: number;
  transactionDate: string;
  description: string;
  note: string;
  isPinnedNote: boolean;
  recordedBy: string;
}

export async function recordSavingsTransaction(
  ownerId: string,
  student: Student,
  input: RecordTransactionInput
): Promise<Transaction> {
  if (student.status !== 'active') {
    throw new Error('Rekening siswa berstatus arsip tidak dapat menerima transaksi baru.');
  }

  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > BLUEPRINT_LIMITS.TX_AMOUNT_MAX) {
    throw new Error('Nominal transaksi harus berupa angka bulat positif (maksimal Rp 1.000.000.000).');
  }

  if (!BLUEPRINT_PATTERNS.DATE_ISO.test(input.transactionDate)) {
    throw new Error('Format tanggal transaksi tidak valid (YYYY-MM-DD).');
  }

  const balanceBefore = student.balance;
  if (input.type === 'withdrawal' && amount > balanceBefore) {
    throw new Error('Saldo tabungan siswa tidak mencukupi untuk jumlah penarikan ini.');
  }

  const balanceAfter =
    input.type === 'deposit' ? balanceBefore + amount : balanceBefore - amount;

  if (balanceAfter < 0 || balanceAfter > BLUEPRINT_LIMITS.BALANCE_MAX) {
    throw new Error('Batas saldo rekening terlampaui.');
  }

  const newTotalDeposit =
    input.type === 'deposit' ? student.totalDeposit + amount : student.totalDeposit;
  const newTotalWithdrawal =
    input.type === 'withdrawal' ? student.totalWithdrawal + amount : student.totalWithdrawal;
  const newTxCount = student.transactionCount + 1;

  const description = sanitizeText(input.description, BLUEPRINT_LIMITS.TX_DESCRIPTION_MAX);
  if (description.length < BLUEPRINT_LIMITS.TX_DESCRIPTION_MIN) {
    throw new Error('Uraian transaksi minimal 2 karakter.');
  }

  const note = sanitizeText(input.note, BLUEPRINT_LIMITS.TX_NOTE_MAX);
  const recordedBy =
    sanitizeText(input.recordedBy, BLUEPRINT_LIMITS.TREASURER_NAME_MAX) || 'Bendahara';
  const monthKey = input.transactionDate.slice(0, 7);
  const transactionId = generateSafeId('trx');
  const transactionCode = generateTransactionCode(input.transactionDate);

  const txPayload = {
    ownerId,
    studentId: student.id,
    studentName: sanitizeText(student.fullName, BLUEPRINT_LIMITS.STUDENT_NAME_MAX),
    studentNis: sanitizeNis(student.nis),
    studentClass: sanitizeText(student.className, BLUEPRINT_LIMITS.CLASS_NAME_MAX),
    accountNumber: student.accountNumber,
    transactionCode,
    type: input.type,
    category: input.category,
    paymentMethod: input.paymentMethod,
    amount,
    balanceBefore,
    balanceAfter,
    transactionDate: input.transactionDate,
    monthKey,
    description,
    note,
    isPinnedNote: Boolean(input.isPinnedNote),
    recordedBy,
  };

  const batch = writeBatch(db);
  const studentRef = doc(db, 'students', student.id);
  const txRef = doc(db, 'transactions', transactionId);

  batch.update(studentRef, {
    balance: balanceAfter,
    totalDeposit: newTotalDeposit,
    totalWithdrawal: newTotalWithdrawal,
    transactionCount: newTxCount,
    updatedAt: serverTimestamp(),
  });

  batch.set(txRef, {
    ...txPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transactions/${transactionId}`);
  }

  return {
    id: transactionId,
    ...txPayload,
  };
}

export async function updateTransactionAuditNote(
  txId: string,
  updates: {
    description: string;
    note: string;
    isPinnedNote: boolean;
  }
): Promise<void> {
  const description = sanitizeText(updates.description, BLUEPRINT_LIMITS.TX_DESCRIPTION_MAX);
  if (description.length < BLUEPRINT_LIMITS.TX_DESCRIPTION_MIN) {
    throw new Error('Uraian transaksi minimal 2 karakter.');
  }
  const note = sanitizeText(updates.note, BLUEPRINT_LIMITS.TX_NOTE_MAX);
  const path = `transactions/${txId}`;

  try {
    await updateDoc(doc(db, 'transactions', txId), {
      description,
      note,
      isPinnedNote: Boolean(updates.isPinnedNote),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createJournalNoteEntry(
  ownerId: string,
  input: {
    noteDate: string;
    title: string;
    content: string;
    category: JournalNoteCategory;
    priority: JournalNotePriority;
    relatedClass: string;
    authorName: string;
  }
): Promise<string> {
  if (!BLUEPRINT_PATTERNS.DATE_ISO.test(input.noteDate)) {
    throw new Error('Tanggal catatan tidak valid.');
  }
  const title = sanitizeText(input.title, BLUEPRINT_LIMITS.JOURNAL_TITLE_MAX);
  const content = sanitizeText(input.content, BLUEPRINT_LIMITS.JOURNAL_CONTENT_MAX);
  const relatedClass = sanitizeText(input.relatedClass, BLUEPRINT_LIMITS.CLASS_NAME_MAX);
  const authorName =
    sanitizeText(input.authorName, BLUEPRINT_LIMITS.TREASURER_NAME_MAX) || 'Bendahara';

  if (title.length < BLUEPRINT_LIMITS.JOURNAL_TITLE_MIN) {
    throw new Error('Judul catatan minimal 3 karakter.');
  }
  if (content.length < BLUEPRINT_LIMITS.JOURNAL_CONTENT_MIN) {
    throw new Error('Isi catatan minimal 3 karakter.');
  }

  const noteId = generateSafeId('jrn');
  const path = `journal_notes/${noteId}`;

  try {
    await setDoc(doc(db, 'journal_notes', noteId), {
      ownerId,
      noteDate: input.noteDate,
      monthKey: input.noteDate.slice(0, 7),
      title,
      content,
      category: input.category,
      priority: input.priority,
      status: 'open',
      relatedClass,
      authorName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
  return noteId;
}

export async function updateOpenJournalNote(
  noteId: string,
  input: {
    noteDate: string;
    title: string;
    content: string;
    category: JournalNoteCategory;
    priority: JournalNotePriority;
    relatedClass: string;
  }
): Promise<void> {
  const title = sanitizeText(input.title, BLUEPRINT_LIMITS.JOURNAL_TITLE_MAX);
  const content = sanitizeText(input.content, BLUEPRINT_LIMITS.JOURNAL_CONTENT_MAX);
  const relatedClass = sanitizeText(input.relatedClass, BLUEPRINT_LIMITS.CLASS_NAME_MAX);
  if (title.length < 3 || content.length < 3) {
    throw new Error('Judul dan isi catatan minimal 3 karakter.');
  }
  const path = `journal_notes/${noteId}`;
  try {
    await updateDoc(doc(db, 'journal_notes', noteId), {
      noteDate: input.noteDate,
      monthKey: input.noteDate.slice(0, 7),
      title,
      content,
      category: input.category,
      priority: input.priority,
      relatedClass,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resolveJournalNoteEntry(
  note: JournalNote,
  resolutionNote?: string
): Promise<void> {
  const path = `journal_notes/${note.id}`;
  const updatedContent = sanitizeText(
    resolutionNote ? `${note.content}\n[Selesai: ${resolutionNote}]` : note.content,
    BLUEPRINT_LIMITS.JOURNAL_CONTENT_MAX
  );
  try {
    await updateDoc(doc(db, 'journal_notes', note.id), {
      status: 'resolved',
      content: updatedContent,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteJournalNoteEntry(noteId: string): Promise<void> {
  const path = `journal_notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'journal_notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Populates realistic multi-month school savings records so automatic monthly
 * reports, passbook ledgers, and PDF/Excel exports can be explored immediately.
 */
export async function seedSampleSchoolData(
  ownerId: string,
  treasurerDisplayName: string
): Promise<void> {
  const recordedBy =
    sanitizeText(treasurerDisplayName, BLUEPRINT_LIMITS.TREASURER_NAME_MAX) || 'Bendahara Sekolah';

  await saveSchoolProfile(ownerId, {
    schoolName: 'SD Negeri 01 Nusantara',
    schoolAddress: 'Jl. Pendidikan Raya No. 18, Kec. Sukajadi, Kota Bandung',
    treasurerName: recordedBy,
    principalName: 'Drs. H. Rahmat Hidayat, M.Pd.',
    academicYear: '2026/2027',
  });

  const now = new Date();
  const makeDate = (monthOffset: number, day: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(Math.min(day, 27)).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const sampleStudents = [
    {
      nis: '20260401',
      fullName: 'Alya Putri Maharani',
      className: 'Kelas 4A',
      gender: 'P' as StudentGender,
      guardianName: 'Hendra Saputra',
      guardianPhone: '081223344551',
      notes: 'Penabung rutin mingguan',
    },
    {
      nis: '20260402',
      fullName: 'Bagas Pratama Wijaya',
      className: 'Kelas 4A',
      gender: 'L' as StudentGender,
      guardianName: 'Siti Aminah',
      guardianPhone: '081223344552',
      notes: 'Target tabungan buku semester genap',
    },
    {
      nis: '20260501',
      fullName: 'Citra Kirana Dewi',
      className: 'Kelas 5A',
      gender: 'P' as StudentGender,
      guardianName: 'Agus Setiawan',
      guardianPhone: '081223344553',
      notes: 'Ikut program karya wisata',
    },
    {
      nis: '20260502',
      fullName: 'Dimas Aditya Nugroho',
      className: 'Kelas 5B',
      gender: 'L' as StudentGender,
      guardianName: 'Rina Kusuma',
      guardianPhone: '081223344554',
      notes: '',
    },
    {
      nis: '20260601',
      fullName: 'Fajar Ramadhan Putra',
      className: 'Kelas 6A',
      gender: 'L' as StudentGender,
      guardianName: 'Dedi Kurniawan',
      guardianPhone: '081223344555',
      notes: 'Persiapan kelulusan kelas 6',
    },
  ];

  const createdStudents: Student[] = [];

  for (let i = 0; i < sampleStudents.length; i++) {
    const s = sampleStudents[i];
    const id = generateSafeId(`stu${i}`);
    const accountNumber = generateAccountNumber(s.nis, i);
    const studentDoc: Student = {
      id,
      ownerId,
      nis: s.nis,
      accountNumber,
      fullName: s.fullName,
      className: s.className,
      gender: s.gender,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      balance: 0,
      totalDeposit: 0,
      totalWithdrawal: 0,
      transactionCount: 0,
      status: 'active',
      notes: s.notes,
    };

    try {
      await setDoc(doc(db, 'students', id), {
        ownerId: studentDoc.ownerId,
        nis: studentDoc.nis,
        accountNumber: studentDoc.accountNumber,
        fullName: studentDoc.fullName,
        className: studentDoc.className,
        gender: studentDoc.gender,
        guardianName: studentDoc.guardianName,
        guardianPhone: studentDoc.guardianPhone,
        balance: 0,
        totalDeposit: 0,
        totalWithdrawal: 0,
        transactionCount: 0,
        status: 'active',
        notes: studentDoc.notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `students/${id}`);
    }
    createdStudents.push(studentDoc);
  }

  const plannedMutations: Array<{
    studentIdx: number;
    type: TransactionType;
    category: TransactionCategory;
    paymentMethod: PaymentMethod;
    amount: number;
    date: string;
    description: string;
    note: string;
    isPinnedNote: boolean;
  }> = [
    {
      studentIdx: 0,
      type: 'deposit',
      category: 'initial',
      paymentMethod: 'cash',
      amount: 150000,
      date: makeDate(-2, 5),
      description: 'Setoran awal tahun ajaran baru',
      note: 'Disetor langsung oleh wali murid saat daftar ulang',
      isPinnedNote: false,
    },
    {
      studentIdx: 1,
      type: 'deposit',
      category: 'initial',
      paymentMethod: 'cash',
      amount: 100000,
      date: makeDate(-2, 6),
      description: 'Setoran awal buku tabungan',
      note: '',
      isPinnedNote: false,
    },
    {
      studentIdx: 2,
      type: 'deposit',
      category: 'study_tour',
      paymentMethod: 'transfer',
      amount: 250000,
      date: makeDate(-2, 12),
      description: 'Cicilan tabungan karya wisata tahap 1',
      note: 'Bukti transfer bank terlampir di map kelas 5A',
      isPinnedNote: true,
    },
    {
      studentIdx: 4,
      type: 'deposit',
      category: 'graduation',
      paymentMethod: 'transfer',
      amount: 300000,
      date: makeDate(-2, 18),
      description: 'Tabungan persiapan kelulusan kelas 6',
      note: '',
      isPinnedNote: false,
    },
    {
      studentIdx: 0,
      type: 'deposit',
      category: 'regular',
      paymentMethod: 'cash',
      amount: 75000,
      date: makeDate(-1, 4),
      description: 'Setoran rutin pekan pertama',
      note: 'Kolektif wali kelas 4A',
      isPinnedNote: false,
    },
    {
      studentIdx: 3,
      type: 'deposit',
      category: 'initial',
      paymentMethod: 'cash',
      amount: 120000,
      date: makeDate(-1, 8),
      description: 'Setoran awal rekening tabungan',
      note: '',
      isPinnedNote: false,
    },
    {
      studentIdx: 2,
      type: 'deposit',
      category: 'study_tour',
      paymentMethod: 'cash',
      amount: 200000,
      date: makeDate(-1, 15),
      description: 'Tabungan karya wisata tahap 2',
      note: '',
      isPinnedNote: false,
    },
    {
      studentIdx: 1,
      type: 'withdrawal',
      category: 'book',
      paymentMethod: 'cash',
      amount: 40000,
      date: makeDate(-1, 20),
      description: 'Penarikan pembelian buku latihan tematik',
      note: 'Disetujui orang tua melalui kartu kendali',
      isPinnedNote: true,
    },
    {
      studentIdx: 0,
      type: 'deposit',
      category: 'regular',
      paymentMethod: 'cash',
      amount: 100000,
      date: makeDate(0, 3),
      description: 'Setoran rutin awal bulan',
      note: '',
      isPinnedNote: false,
    },
    {
      studentIdx: 3,
      type: 'deposit',
      category: 'regular',
      paymentMethod: 'cash',
      amount: 80000,
      date: makeDate(0, 7),
      description: 'Setoran tabungan mingguan kelas 5B',
      note: '',
      isPinnedNote: false,
    },
    {
      studentIdx: 4,
      type: 'deposit',
      category: 'graduation',
      paymentMethod: 'transfer',
      amount: 250000,
      date: makeDate(0, 11),
      description: 'Setoran tabungan wisuda & album kenangan',
      note: 'Transfer kolektif orang tua siswa kelas 6A',
      isPinnedNote: false,
    },
    {
      studentIdx: 2,
      type: 'withdrawal',
      category: 'uniform',
      paymentMethod: 'cash',
      amount: 75000,
      date: makeDate(0, 15),
      description: 'Penarikan untuk atribut pramuka lengkap',
      note: 'Tanda terima ditandatangani wali kelas 5A',
      isPinnedNote: false,
    },
  ];

  for (const m of plannedMutations) {
    const target = createdStudents[m.studentIdx];
    const tx = await recordSavingsTransaction(ownerId, target, {
      type: m.type,
      category: m.category,
      paymentMethod: m.paymentMethod,
      amount: m.amount,
      transactionDate: m.date,
      description: m.description,
      note: m.note,
      isPinnedNote: m.isPinnedNote,
      recordedBy,
    });
    target.balance = tx.balanceAfter;
    if (m.type === 'deposit') target.totalDeposit += m.amount;
    else target.totalWithdrawal += m.amount;
    target.transactionCount += 1;
  }

  await createJournalNoteEntry(ownerId, {
    noteDate: makeDate(0, 11),
    title: 'Rekonsiliasi Kas Tunai & Rekening Bank Sekolah',
    content:
      'Seluruh uang tunai setoran pekan kedua telah disetorkan ke rekening penampung tabungan siswa di Bank Pembangunan Daerah. Saldo buku mutasi cocok 100% dengan fisik kas.',
    category: 'bank_deposit',
    priority: 'normal',
    relatedClass: 'Semua Kelas',
    authorName: recordedBy,
  });

  await createJournalNoteEntry(ownerId, {
    noteDate: makeDate(0, 15),
    title: 'Verifikasi Bukti Penarikan Atribut Pramuka Kelas 5A',
    content:
      'Mohon lampirkan salinan kuitansi koperasi sekolah pada bundel arsip bulan ini sebelum penutupan laporan akhir bulan.',
    category: 'reconciliation',
    priority: 'high',
    relatedClass: 'Kelas 5A',
    authorName: recordedBy,
  });
}
