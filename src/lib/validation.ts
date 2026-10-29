import type {
  JournalNoteCategory,
  PaymentMethod,
  TransactionCategory,
  TransactionType,
} from '../types';

/**
 * Verbatim schema constraints synchronized with /firebase-blueprint.json
 * and /firestore.rules.
 */
export const BLUEPRINT_LIMITS = {
  ID_MAX: 128,
  SCHOOL_NAME_MIN: 2,
  SCHOOL_NAME_MAX: 120,
  SCHOOL_ADDRESS_MAX: 250,
  TREASURER_NAME_MIN: 2,
  TREASURER_NAME_MAX: 100,
  PRINCIPAL_NAME_MAX: 100,
  ACADEMIC_YEAR_MIN: 4,
  ACADEMIC_YEAR_MAX: 20,
  NIS_MIN: 2,
  NIS_MAX: 30,
  ACCOUNT_NUMBER_MIN: 4,
  ACCOUNT_NUMBER_MAX: 32,
  STUDENT_NAME_MIN: 2,
  STUDENT_NAME_MAX: 100,
  CLASS_NAME_MIN: 1,
  CLASS_NAME_MAX: 30,
  GUARDIAN_NAME_MAX: 100,
  GUARDIAN_PHONE_MAX: 25,
  STUDENT_NOTES_MAX: 300,
  TX_CODE_MIN: 6,
  TX_CODE_MAX: 40,
  TX_DESCRIPTION_MIN: 2,
  TX_DESCRIPTION_MAX: 200,
  TX_NOTE_MAX: 500,
  TX_AMOUNT_MAX: 1_000_000_000,
  BALANCE_MAX: 10_000_000_000,
  JOURNAL_TITLE_MIN: 3,
  JOURNAL_TITLE_MAX: 120,
  JOURNAL_CONTENT_MIN: 3,
  JOURNAL_CONTENT_MAX: 1000,
} as const;

export const BLUEPRINT_PATTERNS = {
  ID: /^[a-zA-Z0-9_-]+$/,
  NIS: /^[a-zA-Z0-9.\-/]+$/,
  ACCOUNT_OR_CODE: /^[a-zA-Z0-9-]+$/,
  ACADEMIC_YEAR: /^[0-9/\-\sA-Za-z]+$/,
  DATE_ISO: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  MONTH_KEY: /^[0-9]{4}-[0-9]{2}$/,
} as const;

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  regular: 'Tabungan Rutin',
  initial: 'Setoran Awal',
  study_tour: 'Karya Wisata / Study Tour',
  uniform: 'Seragam & Atribut',
  book: 'Buku & LKS',
  graduation: 'Dana Kelulusan / Wisuda',
  emergency: 'Keperluan Mendesak',
  other: 'Keperluan Lainnya',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  transfer: 'Transfer Bank',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  deposit: 'Setoran',
  withdrawal: 'Penarikan',
};

export const JOURNAL_CATEGORY_LABELS: Record<JournalNoteCategory, string> = {
  reconciliation: 'Rekonsiliasi Kas',
  bank_deposit: 'Setoran Bank',
  reminder: 'Pengingat Administrasi',
  correction: 'Catatan Koreksi',
};

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const INDONESIAN_SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function sanitizeText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function sanitizeNis(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9.\-/]/g, '')
    .slice(0, BLUEPRINT_LIMITS.NIS_MAX);
}

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const prefix = safe < 0 ? '-Rp ' : 'Rp ';
  return prefix + Math.abs(safe).toLocaleString('id-ID');
}

export function formatNumberId(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return safe.toLocaleString('id-ID');
}

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthKey(): string {
  return getTodayIso().slice(0, 7);
}

export function formatDateIndo(isoDate: string): string {
  if (!BLUEPRINT_PATTERNS.DATE_ISO.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-');
  const monthIdx = Number(m) - 1;
  const monthName = INDONESIAN_MONTHS[monthIdx] || m;
  return `${Number(d)} ${monthName} ${y}`;
}

export function formatDateShortIndo(isoDate: string): string {
  if (!BLUEPRINT_PATTERNS.DATE_ISO.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-');
  const monthIdx = Number(m) - 1;
  const monthName = INDONESIAN_SHORT_MONTHS[monthIdx] || m;
  return `${d} ${monthName} ${y}`;
}

export function formatMonthKeyIndo(monthKey: string): string {
  if (!BLUEPRINT_PATTERNS.MONTH_KEY.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-');
  const monthIdx = Number(m) - 1;
  const monthName = INDONESIAN_MONTHS[monthIdx] || m;
  return `${monthName} ${y}`;
}

export function formatMonthShortIndo(monthKey: string): string {
  if (!BLUEPRINT_PATTERNS.MONTH_KEY.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-');
  const monthIdx = Number(m) - 1;
  const monthName = INDONESIAN_SHORT_MONTHS[monthIdx] || m;
  return `${monthName} '${y.slice(2)}`;
}

export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function generateAccountNumber(nis: string, existingCount: number): string {
  const year = new Date().getFullYear();
  const cleanDigits = nis.replace(/[^0-9]/g, '').slice(-4) || String(existingCount + 1).padStart(4, '0');
  const seq = String(existingCount + 1).padStart(3, '0');
  return `TAB-${year}-${cleanDigits}${seq}`.slice(0, BLUEPRINT_LIMITS.ACCOUNT_NUMBER_MAX);
}

export function generateTransactionCode(dateIso: string): string {
  const compactDate = dateIso.replace(/-/g, '').slice(0, 8);
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `TRX-${compactDate}-${rand}`;
}
