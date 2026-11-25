import React, { useState } from 'react';
import {
  Headphones,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { triggerHaptic } from '../services/themeService';

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  handle: string;
  avatarUrl?: string;
  authProvider: 'email' | 'google' | 'guest';
  isGuest: boolean;
  createdAt: string;
}

interface LocalAccountRecord {
  userId: string;
  name: string;
  email: string;
  handle: string;
  passwordHash: string;
  createdAt: string;
}

export const AUTH_SESSION_KEY = 'harmoniq_auth_session';
const LOCAL_ACCOUNTS_KEY = 'harmoniq_local_accounts_v1';

export const getStoredAuthSession = (): AuthSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed && parsed.userId && parsed.name) {
      return parsed;
    }
  } catch {
    // ignore malformed session
  }
  return null;
};

export const saveAuthSession = (session: AuthSession): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore quota errors
  }
};

export const clearAuthSession = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // ignore
  }
};

const hashPassword = async (password: string, salt: string): Promise<string> => {
  const input = `${salt.toLowerCase()}::harmoniq_v1::${password}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input);
    const buffer = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Pure JS deterministic fallback hash when crypto.subtle is unavailable
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv_${(h >>> 0).toString(16)}`;
};

const getLocalAccounts = (): LocalAccountRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalAccounts = (accounts: LocalAccountRecord[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
};

const buildHandleFromNameOrEmail = (name: string, email: string): string => {
  const source = name.trim() || email.split('@')[0] || 'dinleyici';
  const normalized = source
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
  return `@${normalized || 'dinleyici'}`;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface AuthScreenProps {
  onAuthSuccess: (session: AuthSession, isNewSignup: boolean) => void;
  onGoogleContinue: () => Promise<{
    success?: boolean;
    user?: { name: string; email: string; photoUrl?: string };
    errorMessage?: string;
  }>;
  isGoogleLoading?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  onGoogleContinue,
  isGoogleLoading = false,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleModeSwitch = (nextMode: 'login' | 'signup') => {
    triggerHaptic(12);
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (mode === 'signup') {
      if (!trimmedName || trimmedName.length < 2) {
        setError('Lütfen en az 2 karakterlik bir ad veya rumuz gir.');
        return;
      }
    }

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError('Lütfen geçerli bir e-posta adresi gir.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Şifren en az 6 karakter uzunluğunda olmalı.');
      return;
    }

    setIsSubmitting(true);
    triggerHaptic(18);

    try {
      const accounts = getLocalAccounts();
      const existing = accounts.find((acc) => acc.email === trimmedEmail);
      const hashed = await hashPassword(password, trimmedEmail);

      if (mode === 'signup') {
        if (existing) {
          setError('Bu e-posta adresiyle kayıtlı bir hesap zaten var. Giriş Yap sekmesini kullanabilirsin.');
          setIsSubmitting(false);
          return;
        }

        const newRecord: LocalAccountRecord = {
          userId: `hq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: trimmedName,
          email: trimmedEmail,
          handle: buildHandleFromNameOrEmail(trimmedName, trimmedEmail),
          passwordHash: hashed,
          createdAt: new Date().toISOString(),
        };

        saveLocalAccounts([newRecord, ...accounts]);

        const session: AuthSession = {
          userId: newRecord.userId,
          name: newRecord.name,
          email: newRecord.email,
          handle: newRecord.handle,
          authProvider: 'email',
          isGuest: false,
          createdAt: newRecord.createdAt,
        };
        saveAuthSession(session);
        onAuthSuccess(session, true);
      } else {
        if (existing && existing.passwordHash !== hashed) {
          setError('Girdiğin şifre bu e-posta hesabıyla eşleşmiyor. Lütfen tekrar dene.');
          setIsSubmitting(false);
          return;
        }

        const resolvedName =
          existing?.name ||
          trimmedEmail
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

        const session: AuthSession = {
          userId: existing?.userId || `hq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: resolvedName,
          email: trimmedEmail,
          handle: existing?.handle || buildHandleFromNameOrEmail(resolvedName, trimmedEmail),
          authProvider: 'email',
          isGuest: false,
          createdAt: existing?.createdAt || new Date().toISOString(),
        };

        if (!existing) {
          saveLocalAccounts([
            {
              userId: session.userId,
              name: session.name,
              email: session.email,
              handle: session.handle,
              passwordHash: hashed,
              createdAt: session.createdAt,
            },
            ...accounts,
          ]);
        }

        saveAuthSession(session);
        onAuthSuccess(session, false);
      }
    } catch {
      setError('İşlem sırasında bir sorun oluştu. Lütfen tekrar dene.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    triggerHaptic(18);
    try {
      const result = await onGoogleContinue();
      if (result.success && result.user) {
        const previousSession = getStoredAuthSession();
        const wasGuest = Boolean(previousSession?.isGuest);
        const alreadyOnboarded =
          !wasGuest &&
          typeof window !== 'undefined' &&
          localStorage.getItem('harmoniq_onboarding_completed') === 'true';
        const session: AuthSession = {
          userId: `google_${result.user.email.toLowerCase()}`,
          name: result.user.name || 'Müzik Kaşifi',
          email: result.user.email,
          handle: buildHandleFromNameOrEmail(result.user.name, result.user.email),
          avatarUrl: result.user.photoUrl,
          authProvider: 'google',
          isGuest: false,
          createdAt: new Date().toISOString(),
        };
        saveAuthSession(session);
        onAuthSuccess(session, !alreadyOnboarded);
      } else if (result.errorMessage) {
        setError(result.errorMessage);
      }
    } catch {
      setError('Google oturumu açılamadı. E-posta veya Misafir moduyla devam edebilirsin.');
    }
  };

  const handleGuestContinue = () => {
    triggerHaptic(15);
    const guestSession: AuthSession = {
      userId: `guest_${Date.now()}`,
      name: 'Misafir Dinleyici',
      email: '',
      handle: '@misafir',
      authProvider: 'guest',
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
    saveAuthSession(guestSession);
    onAuthSuccess(guestSession, false);
  };

  return (
    <div className="keep-dark fixed inset-0 z-[100] min-h-screen w-full overflow-y-auto bg-[#0A090F] text-[#FAFAFA] flex flex-col items-center justify-center px-4 py-8 sm:px-6 selection:bg-purple-500/30">
      {/* Ambient Breathing Purple-Fuchsia Soundwave Aura */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="animate-auth-breathe absolute -top-28 left-1/2 -translate-x-1/2 w-[540px] h-[360px] rounded-full blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(147,51,234,0.42) 0%, rgba(236,72,153,0.24) 48%, rgba(10,9,15,0) 75%)',
          }}
        />
        <div
          className="animate-auth-breathe absolute -bottom-32 left-1/2 -translate-x-1/2 w-[620px] h-[320px] rounded-full blur-[130px]"
          style={{
            animationDelay: '2.4s',
            background:
              'radial-gradient(circle, rgba(219,39,119,0.28) 0%, rgba(147,51,234,0.2) 50%, rgba(10,9,15,0) 75%)',
          }}
        />
        {/* Subtle acoustic wave lines across background */}
        <svg
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-72 opacity-[0.14]"
          viewBox="0 0 1440 280"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 140 Q 180 40 360 140 T 720 140 T 1080 140 T 1440 140"
            stroke="url(#authWaveGrad1)"
            strokeWidth="2"
          />
          <path
            d="M0 165 Q 200 245 400 165 T 800 165 T 1200 165 T 1440 165"
            stroke="url(#authWaveGrad2)"
            strokeWidth="1.5"
          />
          <defs>
            <linearGradient id="authWaveGrad1" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9333EA" stopOpacity="0" />
              <stop offset="35%" stopColor="#A855F7" stopOpacity="1" />
              <stop offset="65%" stopColor="#EC4899" stopOpacity="1" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="authWaveGrad2" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EC4899" stopOpacity="0" />
              <stop offset="50%" stopColor="#9333EA" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#9333EA" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md space-y-6 my-auto">
        {/* Top Brand & Value Proposition */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 blur-xl opacity-55" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 flex items-center justify-center shadow-2xl border border-white/20">
              <Headphones className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-white">
              ListenHub
            </h1>
            <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed max-w-xs mx-auto [text-wrap:balance]">
              Aynı şarkının aynı saniyesinde frekansını yakala.
            </p>
          </div>
        </div>

        {/* Auth Glass Surface Card */}
        <div className="rounded-3xl bg-[#14121E]/90 border border-white/[0.09] backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.65)] p-5 sm:p-7 space-y-5">
          {/* Segmented Tab Switcher */}
          <div
            role="tablist"
            aria-label="Hesap işlemleri"
            className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#0C0B13] border border-white/[0.07]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => handleModeSwitch('login')}
              className={`min-h-[44px] rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-600/25'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => handleModeSwitch('signup')}
              className={`min-h-[44px] rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-600/25'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          {/* Inline Error Alert */}
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="auth-name" className="block text-xs font-medium text-zinc-300">
                  Ad / Rumuz
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Örn: Deniz, Gece Dinleyicisi..."
                    maxLength={32}
                    className="w-full min-h-[46px] pl-10 pr-4 rounded-xl bg-[#0C0B13] border border-white/[0.1] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 text-sm text-white placeholder:text-zinc-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-xs font-medium text-zinc-300">
                E-posta
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="ornek@eposta.com"
                  className="w-full min-h-[46px] pl-10 pr-4 rounded-xl bg-[#0C0B13] border border-white/[0.1] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 text-sm text-white placeholder:text-zinc-500 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-300">
                Şifre
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={mode === 'signup' ? 'En az 6 karakter' : 'Şifreni gir'}
                  className="w-full min-h-[46px] pl-10 pr-12 rounded-xl bg-[#0C0B13] border border-white/[0.1] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 text-sm text-white placeholder:text-zinc-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full min-h-[48px] mt-1 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 hover:brightness-110 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_8px_28px_rgba(147,51,234,0.4)] transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'signup' ? 'Hesap Oluşturuluyor...' : 'Giriş Yapılıyor...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Frekans Hesabı Oluştur' : 'Giriş Yap'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-0.5">
            <div className="w-full border-t border-white/[0.08]" />
            <span className="px-3 text-xs text-zinc-400 bg-[#14121E] shrink-0">veya</span>
            <div className="w-full border-t border-white/[0.08]" />
          </div>

          {/* Social & Guest Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full min-h-[48px] px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                  <span>Google ile Bağlanıyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="truncate">Google / YouTube Music ile Devam Et</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGuestContinue}
              disabled={isSubmitting || isGoogleLoading}
              className="w-full min-h-[44px] px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Misafir Olarak Keşfet</span>
            </button>
          </div>
        </div>

        {/* Quiet Footer Note */}
        <p className="text-center text-xs text-zinc-500 leading-relaxed px-4">
          Devam ederek müzikal frekans odalarına katılmayı kabul edersin. Hesabını dilediğin zaman Ayarlar üzerinden kapatabilirsin.
        </p>
      </div>
    </div>
  );
};
