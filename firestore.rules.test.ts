import { readFileSync } from 'node:fs';
import { describe, it, before, after, beforeEach } from 'node:test';
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

describe('SakuSiswa Firestore Rules — Dirty Dozen Adversarial Suite', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-sakusiswa-security-test',
      firestore: { rules },
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  const validStudentBase = (ownerId: string) => ({
    ownerId,
    nis: '2026001',
    accountNumber: 'TAB-2026-0001',
    fullName: 'Alya Putri Maharani',
    className: 'Kelas 5A',
    gender: 'P',
    guardianName: 'Budi Santoso',
    guardianPhone: '081234567890',
    balance: 0,
    totalDeposit: 0,
    totalWithdrawal: 0,
    transactionCount: 0,
    status: 'active',
    notes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  it('1. Rejects Identity Spoofing on Student Create', async () => {
    const attacker = testEnv.authenticatedContext('uid_attacker', {
      email: 'attacker@example.com',
      email_verified: true,
    });
    const db = attacker.firestore();
    await assertFails(
      setDoc(doc(db, 'students', 'stu_1'), validStudentBase('uid_victim'))
    );
  });

  it('2. Rejects Unverified Email Spoof Attack matching admin email', async () => {
    const spoofAdmin = testEnv.authenticatedContext('uid_spoof', {
      email: 'aguswijaya853@gmail.com',
      email_verified: false,
    });
    const db = spoofAdmin.firestore();
    await assertFails(
      setDoc(doc(db, 'students', 'stu_1'), validStudentBase('uid_spoof'))
    );
  });

  it('3. Rejects Shadow Field Injection on Student Create', async () => {
    const owner = testEnv.authenticatedContext('uid_owner', {
      email: 'owner@example.com',
      email_verified: true,
    });
    const db = owner.firestore();
    await assertFails(
      setDoc(doc(db, 'students', 'stu_1'), {
        ...validStudentBase('uid_owner'),
        isVerified: true,
      })
    );
  });

  it('4. Rejects Unbacked Initial Balance Injection on Student Create', async () => {
    const owner = testEnv.authenticatedContext('uid_owner', {
      email: 'owner@example.com',
      email_verified: true,
    });
    const db = owner.firestore();
    await assertFails(
      setDoc(doc(db, 'students', 'stu_2'), {
        ...validStudentBase('uid_owner'),
        balance: 5000000,
        totalDeposit: 5000000,
      })
    );
  });

  it('5. Rejects Orphaned / Unsynchronized Transaction Create without Student Batch Update', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      await setDoc(doc(adminDb, 'students', 'stu_1'), {
        ...validStudentBase('uid_owner'),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    const owner = testEnv.authenticatedContext('uid_owner', {
      email: 'owner@example.com',
      email_verified: true,
    });
    const db = owner.firestore();
    await assertFails(
      setDoc(doc(db, 'transactions', 'trx_1'), {
        ownerId: 'uid_owner',
        studentId: 'stu_1',
        studentName: 'Alya Putri Maharani',
        studentNis: '2026001',
        studentClass: 'Kelas 5A',
        accountNumber: 'TAB-2026-0001',
        transactionCode: 'TRX-20261029-0001',
        type: 'deposit',
        category: 'regular',
        paymentMethod: 'cash',
        amount: 50000,
        balanceBefore: 0,
        balanceAfter: 50000,
        transactionDate: '2026-10-29',
        monthKey: '2026-10',
        description: 'Setoran rutin mingguan',
        note: '',
        isPinnedNote: false,
        recordedBy: 'Bendahara',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('6. Rejects Overdraft / Negative Balance Math Exploit', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'students', 'stu_1'), {
        ...validStudentBase('uid_owner'),
        balance: 100000,
        totalDeposit: 100000,
        transactionCount: 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    const owner = testEnv.authenticatedContext('uid_owner', {
      email: 'owner@example.com',
      email_verified: true,
    });
    const db = owner.firestore();
    await assertFails(
      setDoc(doc(db, 'transactions', 'trx_overdraft'), {
        ownerId: 'uid_owner',
        studentId: 'stu_1',
        studentName: 'Alya Putri Maharani',
        studentNis: '2026001',
        studentClass: 'Kelas 5A',
        accountNumber: 'TAB-2026-0001',
        transactionCode: 'TRX-20261029-0002',
        type: 'withdrawal',
        category: 'other',
        paymentMethod: 'cash',
        amount: 500000,
        balanceBefore: 100000,
        balanceAfter: 0,
        transactionDate: '2026-10-29',
        monthKey: '2026-10',
        description: 'Penarikan melebihi saldo',
        note: '',
        isPinnedNote: false,
        recordedBy: 'Bendahara',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('7. Rejects Financial History Tampering on Transaction Update', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'transactions', 'trx_1'), {
        ownerId: 'uid_owner',
        studentId: 'stu_1',
        studentName: 'Alya Putri Maharani',
        studentNis: '2026001',
        studentClass: 'Kelas 5A',
        accountNumber: 'TAB-2026-0001',
        transactionCode: 'TRX-20261029-0001',
        type: 'deposit',
        category: 'regular',
        paymentMethod: 'cash',
        amount: 50000,
        balanceBefore: 0,
        balanceAfter: 50000,
        transactionDate: '2026-10-29',
        monthKey: '2026-10',
        description: 'Setoran rutin',
        note: '',
        isPinnedNote: false,
        recordedBy: 'Bendahara',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    const owner = testEnv.authenticatedContext('uid_owner', {
      email: 'owner@example.com',
      email_verified: true,
    });
    await assertFails(
      updateDoc(doc(owner.firestore(), 'transactions', 'trx_1'), {
        amount: 900000,
        balanceAfter: 900000,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('8. Rejects Value Poisoning on Whitelisted Update Key', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'transactions', 'trx_1'), {
        ownerId: 'uid_owner',
        studentId: 'stu_1',
        studentName: 'Alya Putri Maharani',
        studentNis: '2026001',
        studentClass: 'Kelas 5A',
        accountNumber: 'TAB-2026-0001',
        transactionCode: 'TRX-20261029-0001',
        type: 'deposit',
        category: 'regular',
        paymentMethod: 'cash',
        amount: 50000,
        balanceBefore: 0,
        balanceAfter: 50000,
        transactionDate: '2026-10-29',
        monthKey: '2026-10',
        description: 'Setoran rutin',
        note: '',
        isPinnedNote: false,
        recordedBy: 'Bendahara',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    const owner = testEnv.authenticatedContext('uid_owner', {
      email: 'owner@example.com',
      email_verified: true,
    });
    await assertFails(
      updateDoc(doc(owner.firestore(), 'transactions', 'trx_1'), {
        note: 'X'.repeat(2000),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('9. Rejects Cross-Tenant PII Read and Unfiltered List Scraping', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'students', 'stu_victim'), {
        ...validStudentBase('uid_victim'),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    const attacker = testEnv.authenticatedContext('uid_attacker', {
      email: 'attacker@example.com',
      email_verified: true,
    });
    const db = attacker.firestore();
    await assertFails(getDoc(doc(db, 'students', 'stu_victim')));
    await assertFails(getDocs(collection(db, 'students')));
  });

  it('10. Rejects Terminal State Bypass on Archived Student', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'students', 'stu_archived'), {
        ...validStudentBase('uid_owner'),
        status: 'archived',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    const owner = testEnv.authenticatedContext('uid_owner', {
      email: 'owner@example.com',
      email_verified: true,
    });
    await assertFails(
      updateDoc(doc(owner.firestore(), 'students', 'stu_archived'), {
        fullName: 'Nama Diubah Paksa',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('11. Rejects Client Timestamp Forgery on JournalNote Create', async () => {
    const owner = testEnv.authenticatedContext('uid_owner', {
      email: 'owner@example.com',
      email_verified: true,
    });
    const forgedPast = Timestamp.fromMillis(Date.now() - 86400000);
    await assertFails(
      setDoc(doc(owner.firestore(), 'journal_notes', 'note_1'), {
        ownerId: 'uid_owner',
        noteDate: '2026-10-29',
        monthKey: '2026-10',
        title: 'Rekonsiliasi Kas Harian',
        content: 'Saldo fisik kas cocok dengan buku mutasi.',
        category: 'reconciliation',
        priority: 'normal',
        status: 'open',
        relatedClass: 'Semua Kelas',
        authorName: 'Bendahara',
        createdAt: forgedPast,
        updatedAt: forgedPast,
      })
    );
  });

  it('12. Rejects Self-Assigned Admin Escalation and Non-Zero Student Deletion', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'students', 'stu_funded'), {
        ...validStudentBase('uid_owner'),
        balance: 250000,
        totalDeposit: 250000,
        transactionCount: 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });

    const owner = testEnv.authenticatedContext('uid_owner', {
      email: 'owner@example.com',
      email_verified: true,
    });
    const db = owner.firestore();
    await assertFails(
      setDoc(doc(db, 'admins', 'uid_owner'), {
        email: 'owner@example.com',
        createdAt: serverTimestamp(),
      })
    );
    await assertFails(deleteDoc(doc(db, 'students', 'stu_funded')));
  });
});
