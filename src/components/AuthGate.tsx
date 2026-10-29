import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, BookOpen, FileSpreadsheet, ShieldCheck, Wallet } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import ledgerDeskImage from '../assets/images/school_ledger_desk_1793279217090.jpg';

export const AuthGate: React.FC = () => {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('auth/popup-closed-by-user')) {
        setAuthError('Gagal masuk dengan akun Google. Silakan coba kembali.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="w-full bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          <a
            href="#beranda"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            SakuSiswa
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#fitur"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Data Siswa
            </a>
            <a
              href="#fitur"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Buku Mutasi
            </a>
            <a
              href="#fitur"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Laporan Bulanan
            </a>
            <a
              href="#fitur"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Ekspor Dokumen
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={signingIn}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {signingIn ? 'Memproses...' : 'Masuk Google'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero 2-Column Split */}
      <main id="beranda" className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 lg:py-16 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            <div className="space-y-5">
              <p className="text-xs font-medium text-emerald-800">
                Sistem Administrasi Keuangan Sekolah · Sinkronisasi Real-Time Firebase
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight headline-balance">
                Pembukuan Tabungan Siswa yang Tertib, Akurat, dan Siap Audit.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                Kelola rekening tabungan seluruh kelas, catat setoran dan penarikan harian, pantau
                buku mutasi per siswa secara langsung, serta terbitkan laporan bulanan otomatis ke
                format PDF dan Microsoft Excel.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={signingIn}
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{signingIn ? 'Menghubungkan Akun...' : 'Masuk dengan Akun Google'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500">
                  Data terisolasi aman per akun bendahara dengan aturan keamanan Firestore.
                </span>
              </div>

              {authError && (
                <p className="text-sm text-red-600 font-medium" role="alert">
                  {authError}
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-full min-h-72 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              {!imgFailed ? (
                <img
                  src={ledgerDeskImage}
                  alt="Meja administrasi buku besar keuangan dan buku tabungan siswa"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover min-h-72"
                />
              ) : (
                <div className="w-full h-full min-h-72 bg-gradient-to-br from-slate-100 to-emerald-50 flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-emerald-700" />
                  <p className="text-sm font-semibold text-slate-800">
                    Buku Besar &amp; Buku Mutasi Digital
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Pencatatan saldo siswa otomatis tersinkronisasi di setiap perangkat bendahara.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Capability Strip Below Hero */}
        <section
          id="fitur"
          className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
        >
          <div className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Wallet className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Transaksi &amp; Saldo Atomik</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Setiap setoran dan penarikan memperbarui saldo rekening siswa secara instan tanpa
              selisih hitung.
            </p>
          </div>

          <div className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Buku Mutasi Per Siswa</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tampilan rekening koran kronologis lengkap dengan kolom debit, kredit, dan saldo
              berjalan siap cetak.
            </p>
          </div>

          <div className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Catatan &amp; Jurnal Kas</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dokumentasikan memo pemeriksaan transaksi, rekonsiliasi kas laci, dan bukti setoran
              bank dalam satu tempat.
            </p>
          </div>

          <div className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Laporan PDF &amp; Excel</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rekap bulanan otomatis per kelas dan per siswa, lengkap dengan kop surat sekolah dan
              kolom tanda tangan.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>SakuSiswa — Aplikasi Administrasi Tabungan Siswa</span>
          <span>Sinkronisasi Real-Time Cloud Firestore</span>
        </div>
      </footer>
    </div>
  );
};
