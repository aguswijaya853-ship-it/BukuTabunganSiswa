import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('SakuSiswa UI ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const msg = this.state.errorMessage;
    const isQuotaExceeded = msg.includes('Quota exceeded');
    const isFreeReadQuota = msg.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    );
    const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8 space-y-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-slate-900">
                Terjadi Kendala Pada Aplikasi
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {isQuotaExceeded
                  ? 'Kuota harian penggunaan database Firestore telah tercapai dan akan disetel ulang secara otomatis keesokan hari.'
                  : 'Sistem mendeteksi gangguan saat memproses permintaan data.'}
              </p>
            </div>
          </div>

          {isFreeReadQuota && (
            <div className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-200">
              <p>
                Untuk meningkatkan batas kuota database proyek Anda, buka konsol Firebase melalui tautan berikut:
              </p>
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline break-all"
              >
                {upgradeUrl}
              </a>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-36 overflow-auto">
            <p className="font-mono-num text-xs text-slate-700 break-words">{msg}</p>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      </div>
    );
  }
}
