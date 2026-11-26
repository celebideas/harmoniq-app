import React, { useState, useRef, useEffect } from 'react';
import {
  Disc3,
  Radio,
  MessageCircle,
  Library,
  Globe,
  Users,
  EyeOff,
  ChevronDown,
  Check,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { PrivacyMode, UserProfile } from '../types';
import { NavTab } from './BottomNav';
import { triggerHaptic } from '../services/themeService';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadCount: number;
  liveListenersCount: number;
  isPlaying: boolean;
  privacyMode: PrivacyMode;
  onChangePrivacyMode: (mode: PrivacyMode) => void;
  userProfile: UserProfile;
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const DesktopSidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  unreadCount,
  liveListenersCount,
  isPlaying,
  privacyMode,
  onChangePrivacyMode,
  userProfile,
  themeMode,
  onToggleTheme,
}) => {
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPrivacyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    isLiveBadge?: boolean;
  }[] = [
    {
      id: 'lounge',
      label: 'Canlı',
      icon: <Radio className="w-5 h-5 shrink-0" />,
      badge: liveListenersCount,
      isLiveBadge: true,
    },
    {
      id: 'rooms',
      label: 'Odalar',
      icon: <Disc3 className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'chat',
      label: 'Sohbet',
      icon: <MessageCircle className="w-5 h-5 shrink-0" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'profile',
      label: 'Kütüphanem',
      icon: <Library className="w-5 h-5 shrink-0" />,
    },
  ];

  const privacyOptions: {
    id: PrivacyMode;
    label: string;
    shortBadge: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'public',
      label: 'Herkese Açık',
      shortBadge: `Canlı: ${liveListenersCount} Frekans`,
      desc: 'Şarkı odalarında ve zaman rayında herkesle etkileşimdesin.',
      icon: <Globe className="w-3.5 h-3.5 text-emerald-500" />,
    },
    {
      id: 'friends_only',
      label: 'Arkadaşlar',
      shortBadge: `Arkadaşlar (${liveListenersCount})`,
      desc: 'Seni yalnızca onaylı arkadaşların canlı odada görebilir.',
      icon: <Users className="w-3.5 h-3.5 text-emerald-500" />,
    },
    {
      id: 'private',
      label: 'Hayalet Mod',
      shortBadge: 'Hayalet Mod',
      desc: 'Tamamen görünmezsin. Kimse hangi saniyede olduğunu göremez.',
      icon: <EyeOff className="w-3.5 h-3.5 text-zinc-400" />,
    },
  ];

  const currentPrivacy =
    privacyOptions.find((p) => p.id === privacyMode) || privacyOptions[0];

  return (
    <aside
      aria-label="Masaüstü Navigasyon"
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-[84px] w-72 z-30 bg-white/95 dark:bg-[#0E0C16]/95 backdrop-blur-2xl border-r border-zinc-200 dark:border-white/[0.07] p-5 select-none justify-between"
    >
      {/* TOP: Brand + Privacy Frequency Capsule */}
      <div className="space-y-4">
        <div
          onClick={() => {
            triggerHaptic(10);
            onSelectTab('lounge');
          }}
          className="flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer group hover:bg-zinc-100/70 dark:hover:bg-white/[0.03] transition"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-[0_4px_16px_rgba(147,51,234,0.38)] shrink-0">
            <Disc3
              className={`w-5 h-5 text-white ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '5s' }}
            />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-heading font-extrabold tracking-tight text-zinc-900 dark:text-white block leading-none">
              ListenHub
            </span>
            <span className="text-xs text-zinc-500 dark:text-[#9E9AA8] block mt-1">
              Canlı Müzik Ağı
            </span>
          </div>
        </div>

        {/* Interactive Live Frequency / Privacy Capsule */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(12);
              setShowPrivacyDropdown((prev) => !prev);
            }}
            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition cursor-pointer border ${
              privacyMode === 'private'
                ? 'bg-zinc-100 dark:bg-[#1E1B2E]/80 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15'
            }`}
            title="Gizlilik Modunu Değiştir"
          >
            <span className="flex items-center gap-2 min-w-0">
              {privacyMode === 'private' ? (
                <EyeOff className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              ) : (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
              <span className="truncate">{currentPrivacy.shortBadge}</span>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 opacity-70 shrink-0 transition-transform ${
                showPrivacyDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showPrivacyDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/98 dark:bg-[#14121E]/98 p-2 shadow-2xl z-50 backdrop-blur-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
              {privacyOptions.map((opt) => {
                const isSelected = privacyMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      onChangePrivacyMode(opt.id);
                      setShowPrivacyDropdown(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-start justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/12 border border-emerald-500/30'
                        : 'hover:bg-zinc-100 dark:hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="mt-0.5 shrink-0">{opt.icon}</div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-900 dark:text-white leading-none">
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* MIDDLE: 4 Main Navigation Tabs */}
        <nav className="space-y-2 pt-2" aria-label="Ana Bölümler">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  onSelectTab(item.id);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full px-4 py-3.5 rounded-2xl text-[15px] font-semibold flex items-center justify-between gap-3.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/15 via-fuchsia-500/12 to-pink-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/25 shadow-xs'
                    : 'text-zinc-600 dark:text-[#9E9AA8] hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/90 dark:hover:bg-white/[0.05] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3.5 min-w-0">
                  <span className={isActive ? 'text-purple-600 dark:text-purple-400' : ''}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>

                {item.badge !== undefined && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums shrink-0 ${
                      item.isLiveBadge
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM: Theme Switcher & User Profile Card */}
      <div className="space-y-2.5 pt-4 border-t border-zinc-200/80 dark:border-white/[0.07]">
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100/90 dark:bg-white/[0.04] hover:bg-zinc-200/80 dark:hover:bg-white/[0.08] border border-zinc-200/80 dark:border-white/[0.07] text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center justify-between transition cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-purple-600" />
            )}
            <span>{themeMode === 'dark' ? 'Gündüz Moduna Geç' : 'Gece Moduna Geç'}</span>
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {themeMode === 'dark' ? '☀️' : '🌙'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onSelectTab('profile');
          }}
          className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-left transition cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-purple-500/10 border-purple-500/30'
              : 'bg-zinc-50/90 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] border-zinc-200/80 dark:border-white/[0.07]'
          }`}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-purple-500/30">
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="avatar-circle w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                {userProfile.avatarSeed}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
              {userProfile.youtubeAccount?.name || userProfile.name}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5 tabular-nums">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>Güven: {userProfile.trustScore || 98}/100</span>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
};
