import React, { useState } from 'react';
import {
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
import { ListenHubLogo } from './ListenHubLogo';

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
    <div className="keep-dark fixed inset-0 z-[100] min-h-screen w-full overflow-y-auto bg-[#0E0C0B] text-[#FAF7F2] flex flex-col items-center justify-center px-4 py-8 sm:px-6 selection:bg-[#E87A3E]/30">
      {/* Warm Copper Analog Studio Spotlight */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[580px] h-[360px] rounded-full blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(232,122,62,0.16) 0%, rgba(217,119,6,0.06) 42%, rgba(14,12,11,0) 74%)',
          }}
        />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md space-y-6 my-auto">
        {/* Top Brand & Editorial Value Proposition */}
        <div className="flex flex-col items-center text-center space-y-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white flex items-center justify-center shadow-lg shadow-amber-950/35 border border-[#FFF0E1]/15">
            <ListenHubLogo className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#FAF7F2]">
              ListenHub
            </h1>
            <p className="text-sm sm:text-[15px] text-[#A39A91] leading-relaxed max-w-xs mx-auto [text-wrap:balance]">
              Aynı şarkının aynı saniyesinde, gerçekten orada olanlarla.
            </p>
          </div>
        </div>

        {/* Warm Matte Studio Card */}
        <div className="rounded-2xl bg-[#171412] border border-[#FFF0E1]/[0.08] shadow-[0_24px_70px_rgba(0,0,0,0.65)] p-5 sm:p-7 space-y-5">
          {/* Segmented Tab Switcher */}
          <div
            role="tablist"
            aria-label="Hesap işlemleri"
            className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0E0C0B] border border-[#FFF0E1]/[0.06]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => handleModeSwitch('login')}
              className={`min-h-[42px] rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                mode === 'login'
                  ? 'bg-[#E87A3E]/15 text-[#F49A5E] border-[#E87A3E]/30'
                  : 'text-[#A39A91] hover:text-[#FAF7F2] border-transparent'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => handleModeSwitch('signup')}
              className={`min-h-[42px] rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                mode === 'signup'
                  ? 'bg-[#E87A3E]/15 text-[#F49A5E] border-[#E87A3E]/30'
                  : 'text-[#A39A91] hover:text-[#FAF7F2] border-transparent'
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          {/* Inline Error Alert */}
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="auth-name" className="block text-xs font-medium text-[#A39A91]">
                  Ad / Rumuz
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#A39A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
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
                    className="w-full min-h-[46px] pl-10 pr-4 rounded-xl bg-[#0E0C0B] border border-[#FFF0E1]/[0.1] focus:border-[#E87A3E]/60 text-sm text-[#FAF7F2] placeholder:text-[#A39A91]/60 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-xs font-medium text-[#A39A91]">
                E-posta
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A39A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
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
                  className="w-full min-h-[46px] pl-10 pr-4 rounded-xl bg-[#0E0C0B] border border-[#FFF0E1]/[0.1] focus:border-[#E87A3E]/60 text-sm text-[#FAF7F2] placeholder:text-[#A39A91]/60 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="block text-xs font-medium text-[#A39A91]">
                Şifre
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A39A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
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
                  className="w-full min-h-[46px] pl-10 pr-12 rounded-xl bg-[#0E0C0B] border border-[#FFF0E1]/[0.1] focus:border-[#E87A3E]/60 text-sm text-[#FAF7F2] placeholder:text-[#A39A91]/60 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#A39A91] hover:text-[#FAF7F2] transition cursor-pointer"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="studio-btn-primary w-full min-h-[48px] mt-1 px-4 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer shadow-lg shadow-amber-950/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'signup' ? 'Hesap Oluşturuluyor...' : 'Giriş Yapılıyor...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Hesap Oluştur' : 'Giriş Yap'}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-0.5">
            <div className="w-full border-t border-[#FFF0E1]/[0.08]" />
            <span className="px-3 text-xs text-[#A39A91] bg-[#171412] shrink-0">veya</span>
            <div className="w-full border-t border-[#FFF0E1]/[0.08]" />
          </div>

          {/* Social & Guest Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full min-h-[46px] px-4 rounded-xl bg-[#211D1A] hover:bg-[#FFF0E1]/[0.08] border border-[#FFF0E1]/[0.1] text-[#FAF7F2] font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FAF7F2]" />
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
              className="w-full min-h-[42px] px-4 rounded-xl bg-transparent hover:bg-[#FFF0E1]/[0.05] text-[#A39A91] hover:text-[#FAF7F2] font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Compass className="w-4 h-4" strokeWidth={1.75} />
              <span>Misafir Olarak Keşfet</span>
            </button>
          </div>
        </div>

        {/* Quiet Footer Note */}
        <p className="text-center text-xs text-[#A39A91]/80 leading-relaxed px-4">
          Devam ederek müzikal dinleme odalarına katılmayı kabul edersin. Hesabını dilediğin zaman Ayarlar üzerinden kapatabilirsin.
        </p>
      </div>
    </div>
  );
};
