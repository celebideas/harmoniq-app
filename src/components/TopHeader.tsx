import React, { useState, useRef, useEffect } from 'react';
import {
  Disc3,
  Globe,
  Users,
  EyeOff,
  ChevronDown,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { Song, PrivacyMode, UserProfile } from '../types';
import { NavTab } from './BottomNav';
import { triggerHaptic } from '../services/themeService';

interface Props {
  currentSong: Song;
  onOpenSongPicker: () => void;
  onOpenNowPlaying?: () => void;
  isPlaying?: boolean;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  privacyMode: PrivacyMode;
  onChangePrivacyMode: (mode: PrivacyMode) => void;
  onOpenInstallModal: () => void;
  isMobileFrameView?: boolean;
  onToggleMobileFrame?: () => void;
  userProfile?: UserProfile;
  themeMode?: 'dark' | 'light';
  onToggleTheme?: () => void;
  liveListenersCount?: number;
}

export const TopHeader: React.FC<Props> = ({
  isPlaying = false,
  activeTab,
  onSelectTab,
  privacyMode,
  onChangePrivacyMode,
  userProfile,
  themeMode = 'dark',
  onToggleTheme,
  liveListenersCount = 14,
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

  const privacyOptions: {
    id: PrivacyMode;
    label: string;
    shortBadge: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'public',
      label: '🌍 Herkese Açık',
      shortBadge: `Canlı: ${liveListenersCount} Frekans`,
      desc: 'Şarkı odalarında ve zaman rayında herkesle etkileşimdesin.',
      icon: <Globe className="w-3.5 h-3.5 text-emerald-500" />,
    },
    {
      id: 'friends_only',
      label: '👥 Arkadaşlar',
      shortBadge: `Arkadaşlar (${liveListenersCount})`,
      desc: 'Seni yalnızca onaylı arkadaşların canlı odada görebilir.',
      icon: <Users className="w-3.5 h-3.5 text-emerald-500" />,
    },
    {
      id: 'private',
      label: '👻 Hayalet Mod',
      shortBadge: '👻 Hayalet Mod',
      desc: 'Tamamen görünmezsin. Kimse hangi saniyede olduğunu göremez.',
      icon: <EyeOff className="w-3.5 h-3.5 text-zinc-400" />,
    },
  ];

  const currentPrivacy =
    privacyOptions.find((p) => p.id === privacyMode) || privacyOptions[0];

  const isLight = themeMode === 'light';

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-2xl select-none transition-colors duration-200 ${
        isLight
          ? 'bg-[#F5F4F8]/90 border-[#E4E2EC] text-[#12101B]'
          : 'bg-[#0A090F]/85 border-white/[0.07] text-zinc-50'
      }`}
    >
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* LEFT: Harmoniq Brand Icon & Title */}
        <div
          onClick={() => {
            triggerHaptic(10);
            onSelectTab('lounge');
          }}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-[0_4px_14px_rgba(147,51,234,0.35)]">
            <Disc3
              className={`w-4 h-4 text-force-white ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '5s' }}
            />
          </div>
          <span className="text-sm sm:text-base font-heading font-bold tracking-tight">
            Harmoniq
          </span>
        </div>

        {/* CENTER: "Canlı: X Frekans" Capsule (Toggles Privacy Mode Selector) */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setShowPrivacyDropdown((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition cursor-pointer active:scale-95 border ${
              privacyMode === 'private'
                ? isLight
                  ? 'bg-[#ECEAF2] border-[#DFDCE8] text-[#646073]'
                  : 'bg-[#1E1B2E]/80 border-white/10 text-zinc-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.12)]'
            }`}
            title="Gizlilik Modunu Değiştir (Herkese Açık | Arkadaşlar | Hayalet Mod)"
          >
            {privacyMode === 'private' ? (
              <EyeOff className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            ) : (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
            <span className="truncate max-w-[140px] sm:max-w-[180px]">
              {currentPrivacy.shortBadge}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 opacity-70 transition-transform ${
                showPrivacyDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Privacy Mode Selector Popover */}
          {showPrivacyDropdown && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 w-68 rounded-2xl border p-2 shadow-2xl z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ${
                isLight
                  ? 'bg-white/95 border-[#E4E2EC] text-[#12101B]'
                  : 'bg-[#14121E]/95 border-white/10 text-zinc-50'
              }`}
            >
              <div className="px-2.5 py-1.5 border-b border-white/[0.06] mb-1">
                <div className="text-[11px] font-bold">
                  Frekans Görünürlüğü
                </div>
                <div className="text-[10px] text-[#9E9AA8]">
                  Seni canlı odalarda kimlerin görebileceğini seç
                </div>
              </div>

              <div className="space-y-1">
                {privacyOptions.map((opt) => {
                  const isSelected = privacyMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(20);
                        onChangePrivacyMode(opt.id);
                        setShowPrivacyDropdown(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left flex items-start justify-between gap-2.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 border border-emerald-500/30'
                          : 'hover:bg-white/[0.05] border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="mt-0.5 shrink-0">{opt.icon}</div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-none">
                            {opt.label}
                          </div>
                          <div className="text-[10px] text-[#9E9AA8] mt-1 leading-snug">
                            {opt.desc}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: ONLY Theme Switcher (☀️/🌙) & Current User Profile Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition cursor-pointer active:scale-95 ${
                isLight
                  ? 'bg-[#ECEAF2]/90 border-[#DFDCE8] text-[#1E1B2E] hover:bg-[#E4E2EC]'
                  : 'bg-[#1E1B2E]/75 border-white/[0.07] text-zinc-200 hover:bg-white/[0.08]'
              }`}
              title={
                themeMode === 'dark'
                  ? 'Warm Vinyl Studio (Aydınlık Tema) Moduna Geç ☀️'
                  : 'Velvet Pitch (Karanlık Tema) Moduna Geç 🌙'
              }
              aria-label="Tema değiştir"
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-purple-600" />
              )}
            </button>
          )}

          {userProfile && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                onSelectTab('profile');
              }}
              className={`flex items-center justify-center cursor-pointer p-0.5 rounded-full ring-2 transition active:scale-95 ${
                activeTab === 'profile'
                  ? 'ring-purple-500 shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                  : isLight
                  ? 'ring-[#DFDCE8] hover:ring-purple-400'
                  : 'ring-white/15 hover:ring-purple-400'
              }`}
              title="Profilim ve Kütüphanem"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-tr ${userProfile.avatarGradient} flex items-center justify-center text-force-white text-[11px] font-bold`}
                  >
                    {userProfile.avatarSeed}
                  </div>
                )}
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
