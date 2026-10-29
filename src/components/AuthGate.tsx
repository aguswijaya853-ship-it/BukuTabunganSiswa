import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  checkGoogleRedirectResult,
  isFirebaseConfigured,
  isRunningInIframe,
  parseFirebaseAuthError,
  resolvedFirebaseConfig,
  signInWithGooglePopup,
  signInWithGoogleRedirect,
  type ParsedAuthError,
} from '../firebase';
import ledgerDeskImage from '../assets/images/school_ledger_desk_1793279217090.jpg';

export const AuthGate: React.FC = () => {
  const [signingIn, setSigningIn] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [authError, setAuthError] = useState<ParsedAuthError | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const inIframe = isRunningInIframe();

  useEffect(() => {
    let active = true;
    checkGoogleRedirectResult()
      .catch((err) => {
        if (!active) return;
        const parsed = parseFirebaseAuthError(err);
        if (!parsed.isIgnoredCancel) {
          setAuthError(parsed);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) {
      setAuthError({
        code: 'auth/missing-config',
        isIgnoredCancel: false,
        isUnauthorizedDomain: false,
        isPopupBlocked: false,
        isInvalidConfig: true,
        message:
          'Variabel konfigurasi Firebase belum ditemukan pada deployment Vercel ini.',
        hostname: typeof window !== 'undefined' ? window.location.hostname : '',
      });
      return;
    }

    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGooglePopup();
    } catch (err) {
      const parsed = parseFirebaseAuthError(err);
      if (parsed.isPopupBlocked && !inIframe) {
        try {
          setRedirecting(true);
          await signInWithGoogleRedirect();
          return;
        } catch (redirErr) {
          setRedirecting(false);
          const parsedRedir = parseFirebaseAuthError(redirErr);
          if (!parsedRedir.isIgnoredCancel) {
            setAuthError(parsedRedir);
          }
        }
      } else if (!parsed.isIgnoredCancel) {
        setAuthError(parsed);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleRedirectLogin = async () => {
    if (!isFirebaseConfigured) {
      await handleGoogleLogin();
      return;
    }
    setRedirecting(true);
    setAuthError(null);
    try {
      await signInWithGoogleRedirect();
    } catch (err) {
      setRedirecting(false);
      const parsed = parseFirebaseAuthError(err);
      if (!parsed.isIgnoredCancel) {
        setAuthError(parsed);
      }
    }
  };

  const handleCopyHostname = async () => {
    if (!authError?.hostname || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(authError.hostname);
      setCopiedDomain(true);
      window.setTimeout(() => setCopiedDomain(false), 2500);
    } catch {
      // Ignore clipboard permission denial
    }
  };

  const firebaseAuthSettingsUrl = resolvedFirebaseConfig.projectId
    ? `https://console.firebase.google.com/project/${resolvedFirebaseConfig.projectId}/authentication/settings`
    : 'https://console.firebase.google.com/';

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
              disabled={signingIn || redirecting}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {signingIn || redirecting ? 'Memproses...' : 'Masuk Google'}
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
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={signingIn || redirecting}
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>
                    {signingIn
                      ? 'Menghubungkan Popup...'
                      : redirecting
                        ? 'Mengalihkan ke Google...'
                        : 'Masuk dengan Akun Google'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {!inIframe && (
                  <button
                    type="button"
                    onClick={handleGoogleRedirectLogin}
                    disabled={signingIn || redirecting}
                    className="px-4 py-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Masuk via Redirect
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Data terisolasi aman per akun bendahara dan tersinkronisasi lintas domain (AI Studio &amp; Vercel).
              </p>

              {/* Guided Resolution Card for Vercel Unauthorized Domain */}
              {authError?.isUnauthorizedDomain && (
                <div
                  role="alert"
                  className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-3 text-xs text-slate-800"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">
                        Domain Vercel Perlu Diizinkan di Firebase Authentication
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        Demi keamanan OAuth Google, Firebase menolak login dari domain baru sebelum
                        didaftarkan pada proyek{' '}
                        <span className="font-mono-num font-semibold">
                          {resolvedFirebaseConfig.projectId}
                        </span>
                        . Lakukan 1 kali langkah berikut (tanpa perlu deploy ulang Vercel):
                      </p>
                    </div>
                  </div>

                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                    <li>
                      Salin domain aplikasi Anda saat ini:{' '}
                      <span className="font-mono-num font-semibold text-slate-900">
                        {authError.hostname}
                      </span>
                    </li>
                    <li>
                      Buka menu <strong>Authentication &rarr; Settings &rarr; Authorized domains</strong>{' '}
                      di Firebase Console, klik <strong>Add domain</strong>, lalu tempel domain tersebut.
                    </li>
                    <li>
                      Setelah disimpan, langsung klik kembali tombol <strong>Masuk dengan Akun Google</strong> di atas.
                    </li>
                  </ol>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyHostname}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {copiedDomain ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Domain Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin {authError.hostname}</span>
                        </>
                      )}
                    </button>

                    <a
                      href={firebaseAuthSettingsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      <span>Buka Authorized Domains Firebase</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Guided Resolution Card for Missing Vercel Env Config */}
              {authError && !authError.isUnauthorizedDomain && (
                <div
                  role="alert"
                  className="bg-red-50/80 border border-red-200 rounded-xl p-4 space-y-2 text-xs text-red-900"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">{authError.message}</p>
                      {authError.isInvalidConfig && (
                        <p className="text-red-800 leading-relaxed">
                          Pastikan berkas <span className="font-mono-num">firebase-applet-config.json</span>{' '}
                          tersedia di repositori GitHub Anda, atau tambahkan variabel{' '}
                          <span className="font-mono-num">VITE_FIREBASE_API_KEY</span>,{' '}
                          <span className="font-mono-num">VITE_FIREBASE_AUTH_DOMAIN</span>,{' '}
                          <span className="font-mono-num">VITE_FIREBASE_PROJECT_ID</span>,{' '}
                          <span className="font-mono-num">VITE_FIREBASE_APP_ID</span>, dan{' '}
                          <span className="font-mono-num">VITE_FIREBASE_FIRESTORE_DATABASE_ID</span> pada
                          menu <strong>Vercel Project Settings &rarr; Environment Variables</strong> lalu
                          lakukan Redeploy.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
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
