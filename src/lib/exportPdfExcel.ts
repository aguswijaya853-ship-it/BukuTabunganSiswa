import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  formatDateIndo,
  formatRupiah,
  getTodayIso,
  JOURNAL_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
} from './validation';
import type { PassbookLedgerRow } from './monthlyReport';
import type {
  JournalNote,
  MonthlyReportSummary,
  SchoolProfile,
  Student,
  Transaction,
} from '../types';

function getLastAutoTableY(doc: jsPDF, fallbackY: number): number {
  const lastTable = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  return lastTable?.finalY ?? fallbackY;
}

function resolveSchoolHeader(school: SchoolProfile | null) {
  return {
    schoolName: school?.schoolName || 'SEKOLAH / MADRASAH PENYELENGGARA TABUNGAN SISWA',
    schoolAddress: school?.schoolAddress || 'Unit Pengelola Administrasi Tabungan Siswa',
    treasurerName: school?.treasurerName || 'Bendahara Tabungan',
    principalName: school?.principalName || 'Kepala Sekolah',
    academicYear: school?.academicYear || '2026/2027',
  };
}

function drawPdfLetterhead(doc: jsPDF, school: SchoolProfile | null, reportTitle: string, subtitle: string): number {
  const info = resolveSchoolHeader(school);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(info.schoolName.toUpperCase(), pageWidth / 2, 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${info.schoolAddress}  |  Tahun Ajaran ${info.academicYear}`,
    pageWidth / 2,
    20.5,
    { align: 'center' }
  );

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(14, 24, pageWidth - 14, 24);
  doc.setLineWidth(0.2);
  doc.line(14, 25, pageWidth - 14, 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(reportTitle, 14, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 14, 37);

  return 42;
}

function drawSignatureBlock(doc: jsPDF, school: SchoolProfile | null, startY: number): void {
  const info = resolveSchoolHeader(school);
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = startY + 12;
  if (y + 36 > pageHeight - 14) {
    doc.addPage();
    y = 24;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const printDate = formatDateIndo(getTodayIso());
  doc.text('Mengetahui,', 24, y);
  doc.text('Kepala Sekolah', 24, y + 5);

  doc.text(`Dicetak tanggal ${printDate}`, pageWidth - 78, y);
  doc.text('Bendahara Tabungan Siswa', pageWidth - 78, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text(info.principalName || '( .................................... )', 24, y + 26);
  doc.text(info.treasurerName || '( .................................... )', pageWidth - 78, y + 26);
}

/**
 * 1A. Export Monthly Automatic Report to PDF
 */
export function exportMonthlyReportToPdf(
  report: MonthlyReportSummary,
  school: SchoolProfile | null
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let curY = drawPdfLetterhead(
    doc,
    school,
    `LAPORAN BULANAN TABUNGAN SISWA — ${report.monthLabel.toUpperCase()}`,
    `Periode Akuntansi: ${report.monthKey}  ·  Total Transaksi: ${report.totalTransactions} mutasi  ·  Siswa Aktif Menabung: ${report.activeStudentsInMonth} siswa`
  );

  // Executive KPI Summary Table
  autoTable(doc, {
    startY: curY,
    head: [['Indikator Kas Bulanan', 'Frekuensi', 'Nilai Rupiah']],
    body: [
      ['Saldo Awal Bulan', '-', formatRupiah(report.openingBalance)],
      ['Total Setoran Masuk (Kredit)', `${report.depositCount} transaksi`, formatRupiah(report.totalDeposit)],
      ['Total Penarikan Keluar (Debit)', `${report.withdrawalCount} transaksi`, formatRupiah(report.totalWithdrawal)],
      [
        'Selisih Arus Kas Bersih Bulanan',
        `${report.totalTransactions} transaksi`,
        formatRupiah(report.netCashflow),
      ],
      ['Saldo Akhir Bulan', '-', formatRupiah(report.closingBalance)],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [15, 23, 42] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'center', cellWidth: 40 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 50 },
    },
  });

  curY = getLastAutoTableY(doc, curY) + 8;

  // Per-Class Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('A. Rekapitulasi Tabungan Per Kelas', 14, curY);

  autoTable(doc, {
    startY: curY + 2,
    head: [
      [
        'Kelas',
        'Jml Siswa',
        'Aktif Bulan Ini',
        'Total Setoran',
        'Total Penarikan',
        'Arus Bersih',
        'Saldo Akhir Kelas',
      ],
    ],
    body:
      report.classSummaries.length > 0
        ? report.classSummaries.map((c) => [
            c.className,
            String(c.studentCount),
            String(c.activeSaversCount),
            formatRupiah(c.totalDeposit),
            formatRupiah(c.totalWithdrawal),
            formatRupiah(c.netCashflow),
            formatRupiah(c.closingBalance),
          ])
        : [['Belum ada data kelas', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
  });

  curY = getLastAutoTableY(doc, curY) + 8;

  // Per-Student Monthly Mutation Matrix
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('B. Daftar Mutasi Saldo Per Siswa', 14, curY);

  autoTable(doc, {
    startY: curY + 2,
    head: [
      [
        'NIS',
        'Nama Siswa',
        'Kelas',
        'Saldo Awal',
        'Setoran',
        'Penarikan',
        'Saldo Akhir',
      ],
    ],
    body:
      report.studentMutations.length > 0
        ? report.studentMutations.map((s) => [
            s.nis,
            s.fullName,
            s.className,
            formatRupiah(s.openingBalance),
            formatRupiah(s.totalDeposit),
            formatRupiah(s.totalWithdrawal),
            formatRupiah(s.closingBalance),
          ])
        : [['-', 'Belum ada data rekening siswa', '-', '-', '-', '-', '-']],
    theme: 'striped',
    styles: { fontSize: 7.8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
  });

  curY = getLastAutoTableY(doc, curY);
  drawSignatureBlock(doc, school, curY);

  doc.save(`Laporan_Bulanan_Tabungan_${report.monthKey}.pdf`);
}

/**
 * 1B. Export Monthly Automatic Report to Multi-Sheet Excel (.xlsx)
 */
export function exportMonthlyReportToExcel(
  report: MonthlyReportSummary,
  school: SchoolProfile | null
): void {
  const info = resolveSchoolHeader(school);
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    [info.schoolName],
    [info.schoolAddress],
    [`Laporan Bulanan Tabungan Siswa — Periode ${report.monthLabel} (${report.monthKey})`],
    [`Tahun Ajaran: ${info.academicYear} | Bendahara: ${info.treasurerName}`],
    [],
    ['Indikator Kas Bulanan', 'Frekuensi', 'Nominal (IDR)'],
    ['Saldo Awal Bulan', 0, report.openingBalance],
    ['Total Setoran (Kredit)', report.depositCount, report.totalDeposit],
    ['Total Penarikan (Debit)', report.withdrawalCount, report.totalWithdrawal],
    ['Arus Kas Bersih Bulanan', report.totalTransactions, report.netCashflow],
    ['Saldo Akhir Bulan', 0, report.closingBalance],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 16 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Bulanan');

  const classRows = [
    [
      'Kelas',
      'Jumlah Siswa',
      'Siswa Aktif Bulan Ini',
      'Frekuensi Setor',
      'Frekuensi Tarik',
      'Total Setoran (IDR)',
      'Total Penarikan (IDR)',
      'Arus Bersih (IDR)',
      'Saldo Akhir Kelas (IDR)',
    ],
    ...report.classSummaries.map((c) => [
      c.className,
      c.studentCount,
      c.activeSaversCount,
      c.depositCount,
      c.withdrawalCount,
      c.totalDeposit,
      c.totalWithdrawal,
      c.netCashflow,
      c.closingBalance,
    ]),
  ];
  const wsClass = XLSX.utils.aoa_to_sheet(classRows);
  wsClass['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsClass, 'Rekap Per Kelas');

  const studentRows = [
    [
      'No. Rekening',
      'NIS',
      'Nama Lengkap Siswa',
      'Kelas',
      'Jml Transaksi',
      'Saldo Awal Bulan (IDR)',
      'Total Setoran (IDR)',
      'Total Penarikan (IDR)',
      'Saldo Akhir Bulan (IDR)',
    ],
    ...report.studentMutations.map((s) => [
      s.accountNumber,
      s.nis,
      s.fullName,
      s.className,
      s.txCount,
      s.openingBalance,
      s.totalDeposit,
      s.totalWithdrawal,
      s.closingBalance,
    ]),
  ];
  const wsStudents = XLSX.utils.aoa_to_sheet(studentRows);
  wsStudents['!cols'] = [
    { wch: 20 },
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Mutasi Per Siswa');

  const txRows = [
    [
      'Tanggal',
      'Kode Transaksi',
      'NIS',
      'Nama Siswa',
      'Kelas',
      'Jenis',
      'Kategori',
      'Metode',
      'Nominal (IDR)',
      'Saldo Sebelum (IDR)',
      'Saldo Sesudah (IDR)',
      'Uraian',
      'Catatan',
      'Petugas',
    ],
    ...report.transactions.map((tx) => [
      tx.transactionDate,
      tx.transactionCode,
      tx.studentNis,
      tx.studentName,
      tx.studentClass,
      TRANSACTION_TYPE_LABELS[tx.type],
      TRANSACTION_CATEGORY_LABELS[tx.category],
      PAYMENT_METHOD_LABELS[tx.paymentMethod],
      tx.amount,
      tx.balanceBefore,
      tx.balanceAfter,
      tx.description,
      tx.note,
      tx.recordedBy,
    ]),
  ];
  const wsTx = XLSX.utils.aoa_to_sheet(txRows);
  wsTx['!cols'] = [
    { wch: 13 },
    { wch: 20 },
    { wch: 14 },
    { wch: 26 },
    { wch: 12 },
    { wch: 12 },
    { wch: 24 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 32 },
    { wch: 30 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTx, 'Rincian Transaksi');

  XLSX.writeFile(wb, `Laporan_Bulanan_Tabungan_${report.monthKey}.xlsx`);
}

/**
 * 2A. Export Student Passbook (Buku Mutasi) to PDF
 */
export function exportPassbookToPdf(
  student: Student,
  rows: PassbookLedgerRow[],
  school: SchoolProfile | null,
  periodLabel: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const curY = drawPdfLetterhead(
    doc,
    school,
    'BUKU MUTASI REKENING TABUNGAN SISWA',
    `Periode Mutasi: ${periodLabel}`
  );

  // Student Account Header Card Table
  autoTable(doc, {
    startY: curY,
    body: [
      ['No. Rekening', student.accountNumber, 'Kelas', student.className],
      ['Nama Siswa', student.fullName, 'Wali Murid', student.guardianName || '-'],
      ['NIS / NISN', student.nis, 'Saldo Aktif Saat Ini', formatRupiah(student.balance)],
    ],
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.8, textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, textColor: [71, 85, 105] },
      1: { cellWidth: 66 },
      2: { fontStyle: 'bold', cellWidth: 36, textColor: [71, 85, 105] },
      3: { fontStyle: 'bold', cellWidth: 52 },
    },
  });

  const tableStartY = getLastAutoTableY(doc, curY) + 4;

  autoTable(doc, {
    startY: tableStartY,
    head: [
      [
        'No',
        'Tanggal',
        'Kode Ref',
        'Uraian Mutasi',
        'Debit (Tarik)',
        'Kredit (Setor)',
        'Saldo',
        'Petugas',
      ],
    ],
    body:
      rows.length > 0
        ? rows.map((r) => [
            String(r.index),
            r.transaction.transactionDate,
            r.transaction.transactionCode,
            r.transaction.note
              ? `${r.transaction.description} (${r.transaction.note})`
              : r.transaction.description,
            r.debit > 0 ? formatRupiah(r.debit) : '-',
            r.credit > 0 ? formatRupiah(r.credit) : '-',
            formatRupiah(r.runningBalance),
            r.transaction.recordedBy,
          ])
        : [['-', '-', '-', 'Belum terdapat mutasi pada periode ini', '-', '-', '-', '-']],
    theme: 'grid',
    styles: { fontSize: 7.8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { cellWidth: 21 },
      2: { cellWidth: 28 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
      7: { cellWidth: 20 },
    },
  });

  drawSignatureBlock(doc, school, getLastAutoTableY(doc, tableStartY));
  doc.save(`Buku_Mutasi_${student.nis}_${student.fullName.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 2B. Export Student Passbook (Buku Mutasi) to Excel
 */
export function exportPassbookToExcel(
  student: Student,
  rows: PassbookLedgerRow[],
  school: SchoolProfile | null,
  periodLabel: string
): void {
  const info = resolveSchoolHeader(school);
  const wb = XLSX.utils.book_new();
  const sheetData = [
    [info.schoolName],
    [`Buku Mutasi Tabungan Siswa — Periode: ${periodLabel}`],
    [],
    ['No. Rekening', student.accountNumber, 'Kelas', student.className],
    ['Nama Siswa', student.fullName, 'Nama Wali', student.guardianName || '-'],
    ['NIS', student.nis, 'Saldo Saat Ini (IDR)', student.balance],
    [],
    [
      'No',
      'Tanggal',
      'Kode Transaksi',
      'Kategori',
      'Uraian Mutasi',
      'Catatan',
      'Debit / Penarikan (IDR)',
      'Kredit / Setoran (IDR)',
      'Saldo Berjalan (IDR)',
      'Petugas',
    ],
    ...rows.map((r) => [
      r.index,
      r.transaction.transactionDate,
      r.transaction.transactionCode,
      TRANSACTION_CATEGORY_LABELS[r.transaction.category],
      r.transaction.description,
      r.transaction.note,
      r.debit,
      r.credit,
      r.runningBalance,
      r.transaction.recordedBy,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 20 },
    { wch: 24 },
    { wch: 32 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Buku Mutasi');
  XLSX.writeFile(wb, `Buku_Mutasi_${student.nis}_${student.fullName.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * 3. Export Official Transaction Receipt Slip to PDF
 */
export function exportTransactionReceiptPdf(
  tx: Transaction,
  school: SchoolProfile | null
): void {
  const info = resolveSchoolHeader(school);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(info.schoolName.toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`BUKTI SLIP ${TRANSACTION_TYPE_LABELS[tx.type].toUpperCase()} TABUNGAN SISWA`, 14, 21);
  doc.text(`Kode Referensi: ${tx.transactionCode}`, pageWidth - 14, 15, { align: 'right' });
  doc.text(`Tanggal: ${formatDateIndo(tx.transactionDate)}`, pageWidth - 14, 21, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 25, pageWidth - 14, 25);

  autoTable(doc, {
    startY: 29,
    body: [
      ['Nama Siswa', `${tx.studentName} (${tx.studentClass})`, 'Metode', PAYMENT_METHOD_LABELS[tx.paymentMethod]],
      ['NIS / No. Rekening', `${tx.studentNis} / ${tx.accountNumber}`, 'Kategori', TRANSACTION_CATEGORY_LABELS[tx.category]],
      ['Uraian Transaksi', tx.description, 'Saldo Sebelum', formatRupiah(tx.balanceBefore)],
      [
        'Catatan Tambahan',
        tx.note || '-',
        `Nominal ${TRANSACTION_TYPE_LABELS[tx.type]}`,
        formatRupiah(tx.amount),
      ],
      ['Petugas Kasir', tx.recordedBy, 'Saldo Akhir', formatRupiah(tx.balanceAfter)],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 34, fillColor: [248, 250, 252] },
      1: { cellWidth: 74 },
      2: { fontStyle: 'bold', cellWidth: 34, fillColor: [248, 250, 252] },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 40 },
    },
  });

  const endY = getLastAutoTableY(doc, 85) + 10;
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Penyetor / Penerima,', 24, endY);
  doc.text('Bendahara Tabungan,', pageWidth - 64, endY);

  doc.setFont('helvetica', 'bold');
  doc.text(`( ${tx.studentName} )`, 24, endY + 20);
  doc.text(`( ${tx.recordedBy} )`, pageWidth - 64, endY + 20);

  doc.save(`Slip_${tx.transactionCode}.pdf`);
}

/**
 * 4A. Export Student Master Balances to PDF
 */
export function exportStudentsToPdf(students: Student[], school: SchoolProfile | null): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalBalance = students.reduce((acc, s) => acc + s.balance, 0);
  const curY = drawPdfLetterhead(
    doc,
    school,
    'DAFTAR REKENING & SALDO TABUNGAN SISWA',
    `Total Rekening Terdaftar: ${students.length} siswa  ·  Total Dana Tabungan: ${formatRupiah(totalBalance)}`
  );

  autoTable(doc, {
    startY: curY,
    head: [
      [
        'No',
        'No. Rekening',
        'NIS',
        'Nama Siswa',
        'Kelas',
        'Total Setor',
        'Total Tarik',
        'Saldo Aktif',
        'Status',
      ],
    ],
    body:
      students.length > 0
        ? students.map((s, idx) => [
            String(idx + 1),
            s.accountNumber,
            s.nis,
            s.fullName,
            s.className,
            formatRupiah(s.totalDeposit),
            formatRupiah(s.totalWithdrawal),
            formatRupiah(s.balance),
            s.status === 'active' ? 'Aktif' : 'Arsip',
          ])
        : [['-', '-', '-', 'Belum ada data siswa', '-', '-', '-', '-', '-']],
    theme: 'striped',
    styles: { fontSize: 7.8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'center' },
    },
  });

  drawSignatureBlock(doc, school, getLastAutoTableY(doc, curY));
  doc.save(`Daftar_Rekening_Siswa_${getTodayIso()}.pdf`);
}

/**
 * 4B. Export Student Master Balances to Excel
 */
export function exportStudentsToExcel(students: Student[], school: SchoolProfile | null): void {
  const info = resolveSchoolHeader(school);
  const wb = XLSX.utils.book_new();
  const rows = [
    [info.schoolName],
    [`Daftar Rekening & Saldo Tabungan Siswa — Dicetak ${getTodayIso()}`],
    [],
    [
      'No. Rekening',
      'NIS',
      'Nama Lengkap',
      'Kelas',
      'L/P',
      'Nama Wali',
      'No. Telepon Wali',
      'Frekuensi Transaksi',
      'Total Setoran (IDR)',
      'Total Penarikan (IDR)',
      'Saldo Aktif (IDR)',
      'Status',
      'Catatan',
    ],
    ...students.map((s) => [
      s.accountNumber,
      s.nis,
      s.fullName,
      s.className,
      s.gender,
      s.guardianName,
      s.guardianPhone,
      s.transactionCount,
      s.totalDeposit,
      s.totalWithdrawal,
      s.balance,
      s.status === 'active' ? 'Aktif' : 'Arsip',
      s.notes,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 20 },
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
    { wch: 6 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  XLSX.writeFile(wb, `Data_Rekening_Siswa_${getTodayIso()}.xlsx`);
}

/**
 * 5A. Export Transaction Notes & Journal Logs to PDF
 */
export function exportTransactionNotesToPdf(
  transactionsWithNotes: Transaction[],
  journalNotes: JournalNote[],
  school: SchoolProfile | null
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let curY = drawPdfLetterhead(
    doc,
    school,
    'LAPORAN CATATAN TRANSAKSI & JURNAL KAS BENDAHARA',
    `Catatan Transaksi: ${transactionsWithNotes.length} entri  ·  Jurnal Operasional: ${journalNotes.length} entri`
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('A. Jurnal Rekonsiliasi & Catatan Operasional Bendahara', 14, curY);

  autoTable(doc, {
    startY: curY + 2,
    head: [['Tanggal', 'Kategori', 'Judul & Isi Catatan', 'Kelas', 'Prioritas', 'Status']],
    body:
      journalNotes.length > 0
        ? journalNotes.map((n) => [
            n.noteDate,
            JOURNAL_CATEGORY_LABELS[n.category],
            `${n.title} — ${n.content}`,
            n.relatedClass || '-',
            n.priority === 'high' ? 'Penting' : 'Normal',
            n.status === 'resolved' ? 'Selesai' : 'Terbuka',
          ])
        : [['-', '-', 'Belum ada jurnal operasional bendahara', '-', '-', '-']],
    theme: 'striped',
    styles: { fontSize: 7.8, cellPadding: 2 },
    headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
  });

  curY = getLastAutoTableY(doc, curY) + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('B. Catatan & Memo Pada Transaksi Siswa', 14, curY);

  autoTable(doc, {
    startY: curY + 2,
    head: [['Tanggal', 'Kode Ref', 'Siswa', 'Jenis & Nominal', 'Uraian & Catatan Pemeriksaan']],
    body:
      transactionsWithNotes.length > 0
        ? transactionsWithNotes.map((t) => [
            t.transactionDate,
            t.transactionCode,
            `${t.studentName} (${t.studentClass})`,
            `${TRANSACTION_TYPE_LABELS[t.type]} ${formatRupiah(t.amount)}`,
            `${t.description}${t.note ? ' — Catatan: ' + t.note : ''}${t.isPinnedNote ? ' [Ditandai]' : ''}`,
          ])
        : [['-', '-', '-', '-', 'Belum ada catatan transaksi']],
    theme: 'striped',
    styles: { fontSize: 7.8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
  });

  drawSignatureBlock(doc, school, getLastAutoTableY(doc, curY));
  doc.save(`Catatan_Transaksi_Jurnal_${getTodayIso()}.pdf`);
}

/**
 * 5B. Export Transaction Notes & Journal Logs to Excel
 */
export function exportTransactionNotesToExcel(
  transactionsWithNotes: Transaction[],
  journalNotes: JournalNote[],
  school: SchoolProfile | null
): void {
  const info = resolveSchoolHeader(school);
  const wb = XLSX.utils.book_new();

  const journalRows = [
    [info.schoolName],
    ['Jurnal Kas & Rekonsiliasi Bendahara'],
    [],
    ['Tanggal', 'Kategori', 'Judul Catatan', 'Isi Catatan', 'Kelas Terkait', 'Prioritas', 'Status', 'Penulis'],
    ...journalNotes.map((n) => [
      n.noteDate,
      JOURNAL_CATEGORY_LABELS[n.category],
      n.title,
      n.content,
      n.relatedClass || '-',
      n.priority === 'high' ? 'Penting' : 'Normal',
      n.status === 'resolved' ? 'Selesai' : 'Terbuka',
      n.authorName,
    ]),
  ];
  const wsJournal = XLSX.utils.aoa_to_sheet(journalRows);
  wsJournal['!cols'] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 30 },
    { wch: 48 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsJournal, 'Jurnal Kas Bendahara');

  const txNoteRows = [
    [
      'Tanggal',
      'Kode Transaksi',
      'Nama Siswa',
      'Kelas',
      'Jenis',
      'Nominal (IDR)',
      'Uraian',
      'Catatan Pemeriksaan',
      'Ditandai Tindak Lanjut',
      'Petugas',
    ],
    ...transactionsWithNotes.map((t) => [
      t.transactionDate,
      t.transactionCode,
      t.studentName,
      t.studentClass,
      TRANSACTION_TYPE_LABELS[t.type],
      t.amount,
      t.description,
      t.note,
      t.isPinnedNote ? 'Ya' : 'Tidak',
      t.recordedBy,
    ]),
  ];
  const wsTxNotes = XLSX.utils.aoa_to_sheet(txNoteRows);
  wsTxNotes['!cols'] = [
    { wch: 14 },
    { wch: 20 },
    { wch: 26 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 32 },
    { wch: 40 },
    { wch: 22 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTxNotes, 'Catatan Transaksi');

  XLSX.writeFile(wb, `Catatan_Transaksi_Jurnal_${getTodayIso()}.xlsx`);
}
