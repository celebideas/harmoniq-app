import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let friendly = 'Beklenmeyen bir bağlantı hatası oluştu. Lütfen tekrar deneyin.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.operationType) {
        if (String(parsed.error || '').toLowerCase().includes('permission')) {
          friendly =
            'Bu işlem için oturum yetkiniz doğrulanamadı. Google hesabınızla yeniden giriş yaparak devam edebilirsiniz.';
        } else {
          friendly = `Bulut veritabanı senkronizasyonunda bir sorun oluştu (${parsed.operationType}).`;
        }
      }
    } catch {
      if (error?.message) {
        friendly = error.message;
      }
    }
    return { hasError: true, errorMessage: friendly };
  }

  componentDidCatch(error: Error) {
    console.error('[Harmoniq ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A090F] text-[#F4F3F8] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#14121E] border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Bağlantı Kesintisi</h2>
                <p className="text-xs text-zinc-400">Harmoniq Bulut Senkronizasyonu</p>
              </div>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{this.state.errorMessage}</p>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer"
              >
                Tekrar Dene
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sayfayı Yenile</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
