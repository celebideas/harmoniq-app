import React, { useState, useRef, useEffect } from 'react';
import {
  AudioLines,
  Compass,
  MessageCircle,
  User,
  Globe,
  Users,
  EyeOff,
  ChevronDown,
  Check,
  Sun,
  Moon,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { PrivacyMode, UserProfile } from '../types';
import { NavTab } from './BottomNav';
import { ListenHubLogo } from './ListenHubLogo';
import { triggerHaptic } from '../services/themeService';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSettings?: () => void;
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
  onOpenSettings,
  unreadCount,
  liveListenersCount,
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
      label: 'Sahne',
      icon: <AudioLines className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
      badge: liveListenersCount,
      isLiveBadge: true,
    },
    {
      id: 'rooms',
      label: 'Keşfet',
      icon: <Compass className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
    },
    {
      id: 'chat',
      label: 'Sohbet',
      icon: <MessageCircle className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'profile',
      label: 'Ben',
      icon: <User className="w-5 h-5 shrink-0" strokeWidth={1.75} />,
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
      shortBadge: `Canlı · ${liveListenersCount} Frekans`,
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
      icon: <EyeOff className="w-3.5 h-3.5 text-[#63636B] dark:text-[#8E8E98]" strokeWidth={1.75} />,
    },
  ];

  const currentPrivacy =
    privacyOptions.find((p) => p.id === privacyMode) || privacyOptions[0];

  return (
    <aside
      aria-label="Masaüstü Navigasyon"
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-[84px] w-72 z-30 bg-[#FAF9F6] dark:bg-[#0B0B0D] border-r border-[#E8E6E1] dark:border-white/[0.08] p-5 select-none justify-between transition-colors duration-200"
    >
      {/* TOP: Bespoke ListenHub Logo + Privacy Capsule */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onSelectTab('lounge');
          }}
          className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl cursor-pointer group hover:bg-[#F1EFEA] dark:hover:bg-[#141418] transition text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#141416] text-white dark:bg-white dark:text-[#0B0B0D] flex items-center justify-center shrink-0">
            <ListenHubLogo className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-bold tracking-tight text-[#141416] dark:text-[#F5F5F7] block leading-none">
              ListenHub
            </span>
            <span className="text-xs text-[#63636B] dark:text-[#8E8E98] block mt-1">
              Canlı Müzik Ağı
            </span>
          </div>
        </button>

        {/* Live Frequency / Privacy Mode Capsule */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(12);
              setShowPrivacyDropdown((prev) => !prev);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition cursor-pointer border bg-white dark:bg-[#141418] border-[#E8E6E1] dark:border-white/[0.08] text-[#141416] dark:text-[#F5F5F7] hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22]"
            title="Gizlilik Modunu Değiştir"
          >
            <span className="flex items-center gap-2 min-w-0">
              {privacyMode === 'private' ? (
                <EyeOff className="w-3.5 h-3.5 text-[#63636B] dark:text-[#8E8E98] shrink-0" strokeWidth={1.75} />
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#22C55E] shrink-0" />
              )}
              <span className="font-mono tabular-nums truncate">{currentPrivacy.shortBadge}</span>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#63636B] dark:text-[#8E8E98] shrink-0 transition-transform ${
                showPrivacyDropdown ? 'rotate-180' : ''
              }`}
              strokeWidth={1.75}
            />
          </button>

          {showPrivacyDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-[#E8E6E1] dark:border-white/[0.08] bg-white dark:bg-[#141418] p-2 shadow-xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
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
                        ? 'bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E8E6E1] dark:border-white/[0.12]'
                        : 'hover:bg-[#F1EFEA]/70 dark:hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="mt-0.5 shrink-0">{opt.icon}</div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#141416] dark:text-[#F5F5F7] leading-none">
                          {opt.label}
                        </div>
                        <div className="text-[10px] text-[#63636B] dark:text-[#8E8E98] mt-1 leading-snug">
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#22C55E] shrink-0 mt-0.5" strokeWidth={1.75} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* MIDDLE: 4 Fixed Studio Navigation Tabs */}
        <nav className="space-y-1.5 pt-2" aria-label="Ana Bölümler">
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
                className={`w-full px-4 py-3.5 rounded-xl text-[15px] flex items-center justify-between gap-3.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#1C1C22] text-[#141416] dark:text-[#F5F5F7] font-semibold border border-[#E8E6E1] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(20,20,22,0.04)] dark:shadow-none'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#141416] dark:hover:text-[#F5F5F7] hover:bg-[#F1EFEA] dark:hover:bg-[#141418] font-medium border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3.5 min-w-0">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium tabular-nums shrink-0 ${
                      item.isLiveBadge
                        ? 'bg-[#16A34A]/12 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E]'
                        : 'bg-[#141416] text-white dark:bg-white dark:text-[#0B0B0D]'
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

      {/* BOTTOM: Theme Switcher & User Settings Card */}
      <div className="space-y-2.5 pt-4 border-t border-[#E8E6E1] dark:border-white/[0.08]">
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#141418] hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22] border border-[#E8E6E1] dark:border-white/[0.08] text-xs font-medium text-[#141416] dark:text-[#F5F5F7] flex items-center gap-2.5 transition cursor-pointer"
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <Moon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          )}
          <span className="truncate">
            {themeMode === 'dark' ? 'Gündüz Moduna Geç' : 'Gece Moduna Geç'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            if (onOpenSettings) {
              onOpenSettings();
            } else {
              onSelectTab('profile');
            }
          }}
          title="Ayarlar & Hesap"
          className="w-full p-3 rounded-2xl border bg-white dark:bg-[#141418] hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22] border-[#E8E6E1] dark:border-white/[0.08] flex items-center gap-3 text-left transition cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ring-[#E8E6E1] dark:ring-white/15">
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="avatar-circle w-full h-full bg-[#1C1C22] dark:bg-[#27272A] flex items-center justify-center text-white text-xs font-semibold">
                {userProfile.avatarSeed}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#141416] dark:text-[#F5F5F7] truncate">
              {userProfile.youtubeAccount?.name || userProfile.name}
            </div>
            <div className="text-[11px] text-[#16A34A] dark:text-[#22C55E] font-mono font-medium flex items-center gap-1 mt-0.5 tabular-nums">
              <ShieldCheck className="w-3 h-3 shrink-0" strokeWidth={1.75} />
              <span>{userProfile.trustScore || 98}/100</span>
            </div>
          </div>
          <Settings
            className="w-4 h-4 text-[#63636B] dark:text-[#8E8E98] group-hover:text-[#141416] dark:group-hover:text-[#F5F5F7] transition-colors shrink-0"
            strokeWidth={1.75}
          />
        </button>
      </div>
    </aside>
  );
};
