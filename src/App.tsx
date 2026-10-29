/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  BookOpen,
  Building2,
  ClipboardList,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MonthlyReportTab } from './components/MonthlyReportTab';
import { MutationBookTab } from './components/MutationBookTab';
import { OverviewTab } from './components/OverviewTab';
import { SchoolProfileTab } from './components/SchoolProfileTab';
import { StudentsTab } from './components/StudentsTab';
import { TransactionNotesTab } from './components/TransactionNotesTab';
import { TransactionsTab } from './components/TransactionsTab';
import { auth } from './firebase';
import {
  seedSampleSchoolData,
  subscribeJournalNotes,
  subscribeSchoolProfile,
  subscribeStudents,
  subscribeTransactions,
} from './services/savingsService';
import {
  NavSection,
  type JournalNote,
  type SchoolProfile,
  type Student,
  type ToastMessage,
  type Transaction,
} from './types';

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: NavSection.OVERVIEW, label: 'Ringkasan Kas', icon: LayoutDashboard },
  { id: NavSection.STUDENTS, label: 'Data Siswa', icon: Users },
  { id: NavSection.TRANSACTIONS, label: 'Transaksi', icon: Wallet },
  { id: NavSection.MUTATION_BOOK, label: 'Buku Mutasi', icon: BookOpen },
  { id: NavSection.TRANSACTION_NOTES, label: 'Catatan Transaksi', icon: ClipboardList },
  { id: NavSection.MONTHLY_REPORT, label: 'Laporan Bulanan', icon: FileBarChart2 },
  { id: NavSection.SCHOOL_PROFILE, label: 'Profil Sekolah', icon: Building2 },
];

const SECTION_TITLES: Record<NavSection, string> = {
  [NavSection.OVERVIEW]: 'Ringkasan Kas',
  [NavSection.STUDENTS]: 'Data Rekening Siswa',
  [NavSection.TRANSACTIONS]: 'Loket Transaksi Setor & Tarik',
  [NavSection.MUTATION_BOOK]: 'Buku Mutasi Siswa',
  [NavSection.TRANSACTION_NOTES]: 'Catatan Transaksi & Jurnal Kas',
  [NavSection.MONTHLY_REPORT]: 'Laporan Bulanan Otomatis',
  [NavSection.SCHOOL_PROFILE]: 'Profil Sekolah',
};

function SakuSiswaWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [activeSection, setActiveSection] = useState<NavSection>(NavSection.OVERVIEW);
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [journalNotes, setJournalNotes] = useState<JournalNote[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [fatalDataError, setFatalDataError] = useState<Error | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (type: 'success' | 'error' | 'info', title: string, description?: string) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) {
        setSchool(null);
        setStudents([]);
        setTransactions([]);
        setJournalNotes([]);
        setDataLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    setDataLoading(true);
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= 3) {
        setDataLoading(false);
      }
    };

    const unsubSchool = subscribeSchoolProfile(
      user.uid,
      (profile) => setSchool(profile),
      (err) => setFatalDataError(err)
    );

    const unsubStudents = subscribeStudents(
      user.uid,
      (list) => {
        setStudents(list);
        markLoaded();
      },
      (err) => setFatalDataError(err)
    );

    const unsubTransactions = subscribeTransactions(
      user.uid,
      (list) => {
        setTransactions(list);
        markLoaded();
      },
      (err) => setFatalDataError(err)
    );

    const unsubNotes = subscribeJournalNotes(
      user.uid,
      (list) => {
        setJournalNotes(list);
        markLoaded();
      },
      (err) => setFatalDataError(err)
    );

    return () => {
      unsubSchool();
      unsubStudents();
      unsubTransactions();
      unsubNotes();
    };
  }, [authReady, user]);

  if (fatalDataError) {
    throw fatalDataError;
  }

  const handleNavigate = useCallback((section: NavSection, studentId?: string) => {
    if (studentId) {
      setFocusedStudentId(studentId);
    }
    setActiveSection(section);
    setMobileMenuOpen(false);
  }, []);

  const handleSeedData = async () => {
    if (!user || seeding) return;
    setSeeding(true);
    try {
      await seedSampleSchoolData(user.uid, user.displayName || 'Bendahara Sekolah');
      pushToast(
        'success',
        'Data contoh sekolah berhasil dimuat',
        '5 rekening siswa dan 12 transaksi lintas 3 bulan siap dieksplorasi.'
      );
    } catch (err) {
      pushToast(
        'error',
        'Gagal memuat data contoh',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSeeding(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600">Memuat SakuSiswa...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  const treasurerDisplayName =
    school?.treasurerName || user.displayName || user.email?.split('@')[0] || 'Bendahara';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar Navigation (256px Workspace Canvas) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="px-6 py-5 border-b border-slate-200">
          <button
            type="button"
            onClick={() => handleNavigate(NavSection.OVERVIEW)}
            className="text-left cursor-pointer"
          >
            <span className="block text-lg font-bold tracking-tight text-slate-900">
              SakuSiswa
            </span>
            <span className="block text-xs text-slate-500 truncate max-w-52">
              {school?.schoolName || 'Administrasi Tabungan Siswa'}
            </span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-700' : 'text-slate-400'}`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{treasurerDisplayName}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[82vw] bg-white h-full flex flex-col justify-between z-10 border-r border-slate-200">
            <div>
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <span className="text-base font-bold text-slate-900">SakuSiswa</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-emerald-50 text-emerald-900 font-semibold'
                          : 'text-slate-600 font-medium hover:bg-slate-100'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-200 space-y-2.5">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {treasurerDisplayName}
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* SaaS Top Bar Contract: Breadcrumb on Left + 1 Primary Action on Right */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka Menu Navigasi"
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-500 hidden sm:inline truncate">
                {school?.schoolName || 'SakuSiswa'}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">
                {SECTION_TITLES[activeSection]}
              </h1>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            {activeSection !== NavSection.TRANSACTIONS ? (
              <button
                type="button"
                onClick={() => handleNavigate(NavSection.TRANSACTIONS)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Transaksi</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNavigate(NavSection.MONTHLY_REPORT)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileBarChart2 className="w-3.5 h-3.5" />
                <span>Laporan Bulanan</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeSection === NavSection.OVERVIEW && (
            <OverviewTab
              students={students}
              transactions={transactions}
              journalNotes={journalNotes}
              loading={dataLoading}
              seeding={seeding}
              onSeedSampleData={handleSeedData}
              onNavigate={handleNavigate}
            />
          )}

          {activeSection === NavSection.STUDENTS && (
            <StudentsTab
              ownerId={user.uid}
              treasurerName={treasurerDisplayName}
              students={students}
              school={school}
              onNavigate={handleNavigate}
              onNotify={pushToast}
            />
          )}

          {activeSection === NavSection.TRANSACTIONS && (
            <TransactionsTab
              ownerId={user.uid}
              treasurerName={treasurerDisplayName}
              students={students}
              transactions={transactions}
              school={school}
              preselectedStudentId={focusedStudentId}
              onNavigate={handleNavigate}
              onNotify={pushToast}
            />
          )}

          {activeSection === NavSection.MUTATION_BOOK && (
            <MutationBookTab
              students={students}
              transactions={transactions}
              school={school}
              preselectedStudentId={focusedStudentId}
              onNavigate={handleNavigate}
            />
          )}

          {activeSection === NavSection.TRANSACTION_NOTES && (
            <TransactionNotesTab
              ownerId={user.uid}
              treasurerName={treasurerDisplayName}
              transactions={transactions}
              journalNotes={journalNotes}
              school={school}
              onNotify={pushToast}
            />
          )}

          {activeSection === NavSection.MONTHLY_REPORT && (
            <MonthlyReportTab
              students={students}
              transactions={transactions}
              school={school}
              onNotify={pushToast}
            />
          )}

          {activeSection === NavSection.SCHOOL_PROFILE && (
            <SchoolProfileTab
              ownerId={user.uid}
              defaultTreasurerName={treasurerDisplayName}
              school={school}
              onNotify={pushToast}
            />
          )}
        </main>
      </div>

      {/* Non-blocking Toast Notifications */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-slate-900 text-white border border-slate-800 rounded-xl px-4 py-3 shadow-md flex items-start justify-between gap-3"
            >
              <div className="space-y-0.5 text-xs">
                <p
                  className={`font-semibold ${
                    t.type === 'error'
                      ? 'text-red-300'
                      : t.type === 'success'
                        ? 'text-emerald-300'
                        : 'text-slate-100'
                  }`}
                >
                  {t.title}
                </p>
                {t.description && <p className="text-slate-300 leading-relaxed">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-slate-400 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SakuSiswaWorkspace />
    </ErrorBoundary>
  );
}
