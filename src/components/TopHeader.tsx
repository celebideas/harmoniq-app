import React, { useState, useRef, useEffect } from 'react';
import {
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
import { ListenHubLogo } from './ListenHubLogo';
import { triggerHaptic } from '../services/themeService';

interface Props {
  currentSong: Song | null;
  onOpenSongPicker: () => void;
  onOpenNowPlaying?: () => void;
  isPlaying?: boolean;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  privacyMode: PrivacyMode;
  onChangePrivacyMode: (mode: PrivacyMode) => void;
  onOpenInstallModal: () => void;
  userProfile?: UserProfile;
  themeMode?: 'dark' | 'light';
  onToggleTheme?: () => void;
  liveListenersCount?: number;
}

export const TopHeader: React.FC<Props> = ({
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
      label: 'Herkese Açık',
      shortBadge: `Canlı · ${liveListenersCount}`,
      desc: 'Şarkı odalarında ve zaman rayında herkesle etkileşimdesin.',
      icon: <Globe className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#22C55E]" strokeWidth={1.75} />,
    },
    {
      id: 'friends_only',
      label: 'Arkadaşlar',
      shortBadge: `Arkadaşlar · ${liveListenersCount}`,
      desc: 'Seni yalnızca onaylı arkadaşların canlı odada görebilir.',
      icon: <Users className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#22C55E]" strokeWidth={1.75} />,
    },
    {
      id: 'private',
      label: 'Hayalet Mod',
      shortBadge: 'Hayalet Mod',
      desc: 'Tamamen görünmezsin. Kimse hangi saniyede olduğunu göremez.',
      icon: <EyeOff className="w-3.5 h-3.5 text-[#6B635B] dark:text-[#A39A91]" strokeWidth={1.75} />,
    },
  ];

  const currentPrivacy =
    privacyOptions.find((p) => p.id === privacyMode) || privacyOptions[0];

  const isLight = themeMode === 'light';

  return (
    <header
      className={`lg:hidden sticky top-0 z-40 border-b backdrop-blur-xl select-none transition-colors duration-200 ${
        isLight
          ? 'bg-[#FAF8F4]/92 border-[#EAE4DC] text-[#181512]'
          : 'bg-[#0E0C0B]/88 border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* LEFT: Warm Copper ListenHub SVG Emblem & Title */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onSelectTab('lounge');
          }}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0 text-left active:scale-[0.96] transition-transform duration-100 ease-out"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white shadow-lg shadow-amber-950/20 flex items-center justify-center shrink-0">
            <ListenHubLogo className="w-5 h-5" />
          </div>
          <div className="leading-none">
            <span className="text-sm font-bold tracking-tight block">
              ListenHub
            </span>
            <span className="text-[10px] text-[#6B635B] dark:text-[#A39A91] block mt-0.5">
              Canlı Müzik Ağı
            </span>
          </div>
        </button>

        {/* CENTER: Live Frequency / Privacy Mode Capsule */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setShowPrivacyDropdown((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer border ${
              privacyMode === 'private'
                ? 'bg-[#F2EDE6] dark:bg-[#211D1A] border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] text-[#6B635B] dark:text-[#A39A91]'
                : 'bg-white dark:bg-[#171412] border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] text-[#181512] dark:text-[#FAF7F2]'
            }`}
            title="Gizlilik Modunu Değiştir"
          >
            {privacyMode === 'private' ? (
              <EyeOff className="w-3.5 h-3.5 text-[#6B635B] dark:text-[#A39A91] shrink-0" strokeWidth={1.75} />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#22C55E] shrink-0" />
            )}
            <span className="font-mono tabular-nums truncate max-w-[130px] sm:max-w-[170px]">
              {currentPrivacy.shortBadge}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#6B635B] dark:text-[#A39A91] transition-transform ${
                showPrivacyDropdown ? 'rotate-180' : ''
              }`}
              strokeWidth={1.75}
            />
          </button>

          {showPrivacyDropdown && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-68 rounded-2xl border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] bg-white dark:bg-[#171412] text-[#181512] dark:text-[#FAF7F2] p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 border-b border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] mb-1">
                <div className="text-[11px] font-semibold">
                  Frekans Görünürlüğü
                </div>
                <div className="text-[10px] text-[#6B635B] dark:text-[#A39A91]">
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
                          ? 'bg-[#E87A3E]/15 border border-[#E87A3E]/25'
                          : 'hover:bg-[#F2EDE6]/80 dark:hover:bg-[#211D1A] border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="mt-0.5 shrink-0">{opt.icon}</div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold leading-none">
                            {opt.label}
                          </div>
                          <div className="text-[10px] mt-1 leading-snug text-[#6B635B] dark:text-[#A39A91]">
                            {opt.desc}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E] shrink-0 mt-0.5" strokeWidth={1.75} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Theme Switcher & User Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] bg-white dark:bg-[#171412] text-[#181512] dark:text-[#FAF7F2] hover:bg-[#F2EDE6] dark:hover:bg-[#211D1A] active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer"
              title={themeMode === 'dark' ? 'Gündüz Moduna Geç' : 'Gece Moduna Geç'}
              aria-label="Tema değiştir"
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-[#F49A5E]" strokeWidth={1.75} />
              ) : (
                <Moon className="w-4 h-4 text-[#6B635B]" strokeWidth={1.75} />
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
              className={`flex items-center justify-center cursor-pointer p-0.5 rounded-full ring-1 active:scale-[0.96] transition-transform duration-100 ease-out ${
                activeTab === 'profile'
                  ? 'ring-[#E87A3E]'
                  : 'ring-[#EAE4DC] dark:ring-[#FFF0E1]/15 hover:ring-[#E87A3E]/60'
              }`}
              title="Ben"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="avatar-circle w-full h-full bg-[#211D1A] flex items-center justify-center text-white text-[11px] font-semibold">
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
