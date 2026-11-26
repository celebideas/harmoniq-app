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

  const isLight = themeMode === 'light';

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
      icon: (
        <Globe
          className={`w-3.5 h-3.5 ${isLight ? 'text-[#16A34A]' : 'text-[#22C55E]'}`}
          strokeWidth={1.75}
        />
      ),
    },
    {
      id: 'friends_only',
      label: 'Arkadaşlar',
      shortBadge: `Arkadaşlar · ${liveListenersCount}`,
      desc: 'Seni yalnızca onaylı arkadaşların canlı odada görebilir.',
      icon: (
        <Users
          className={`w-3.5 h-3.5 ${isLight ? 'text-[#16A34A]' : 'text-[#22C55E]'}`}
          strokeWidth={1.75}
        />
      ),
    },
    {
      id: 'private',
      label: 'Hayalet Mod',
      shortBadge: 'Hayalet Mod',
      desc: 'Tamamen görünmezsin. Kimse hangi saniyede olduğunu göremez.',
      icon: (
        <EyeOff
          className={`w-3.5 h-3.5 ${isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'}`}
          strokeWidth={1.75}
        />
      ),
    },
  ];

  const currentPrivacy =
    privacyOptions.find((p) => p.id === privacyMode) || privacyOptions[0];

  return (
    <aside
      aria-label="Masaüstü Navigasyon"
      className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-[84px] w-72 z-30 border-r p-5 select-none justify-between transition-colors duration-150 ${
        isLight
          ? 'bg-[#FAF8F4] border-[#EAE4DC] text-[#181512]'
          : 'bg-[#0E0C0B] border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
      }`}
    >
      {/* TOP: Warm Copper ListenHub Logo + Privacy Capsule */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onSelectTab('lounge');
          }}
          className={`w-full flex items-center gap-3.5 p-2.5 rounded-2xl cursor-pointer group active:scale-[0.96] transition-transform duration-100 ease-out text-left ${
            isLight ? 'hover:bg-[#F2EDE6]' : 'hover:bg-[#171412]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white shadow-lg shadow-amber-950/20 flex items-center justify-center shrink-0">
            <ListenHubLogo className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span
              className={`text-lg font-bold tracking-tight block leading-none ${
                isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
              }`}
            >
              ListenHub
            </span>
            <span
              className={`text-xs block mt-1 ${
                isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
              }`}
            >
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
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer border ${
              isLight
                ? 'bg-white border-[#EAE4DC] text-[#181512] hover:bg-[#F2EDE6]'
                : 'bg-[#171412] border-[#FFF0E1]/[0.08] text-[#FAF7F2] hover:bg-[#211D1A]'
            }`}
            title="Gizlilik Modunu Değiştir"
          >
            <span className="flex items-center gap-2 min-w-0">
              {privacyMode === 'private' ? (
                <EyeOff
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
                  }`}
                  strokeWidth={1.75}
                />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isLight ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
                  }`}
                />
              )}
              <span className="font-mono tabular-nums truncate">{currentPrivacy.shortBadge}</span>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
              } ${showPrivacyDropdown ? 'rotate-180' : ''}`}
              strokeWidth={1.75}
            />
          </button>

          {showPrivacyDropdown && (
            <div
              className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border p-2 shadow-xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150 ${
                isLight
                  ? 'border-[#EAE4DC] bg-white text-[#181512]'
                  : 'border-[#FFF0E1]/[0.08] bg-[#171412] text-[#FAF7F2]'
              }`}
            >
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
                        ? 'bg-[#E87A3E]/15 border border-[#E87A3E]/25'
                        : isLight
                        ? 'hover:bg-[#F2EDE6]/80 border border-transparent'
                        : 'hover:bg-[#211D1A] border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="mt-0.5 shrink-0">{opt.icon}</div>
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-semibold leading-none ${
                            isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                          }`}
                        >
                          {opt.label}
                        </div>
                        <div
                          className={`text-[10px] mt-1 leading-snug ${
                            isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
                          }`}
                        >
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isLight ? 'text-[#16A34A]' : 'text-[#22C55E]'
                        }`}
                        strokeWidth={1.75}
                      />
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
                className={`w-full px-4 py-3.5 rounded-xl text-[15px] flex items-center justify-between gap-3.5 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                  isActive
                    ? isLight
                      ? 'bg-[#E87A3E]/15 text-[#D96B2C] font-semibold border border-[#E87A3E]/25'
                      : 'bg-[#E87A3E]/15 text-[#F49A5E] font-semibold border border-[#E87A3E]/25'
                    : isLight
                    ? 'text-[#6B635B] hover:text-[#181512] hover:bg-[#F2EDE6] font-medium border border-transparent'
                    : 'text-[#A39A91] hover:text-[#FAF7F2] hover:bg-[#171412] font-medium border border-transparent'
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
                        ? isLight
                          ? 'bg-[#16A34A]/12 text-[#16A34A]'
                          : 'bg-[#22C55E]/15 text-[#22C55E]'
                        : 'studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white'
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
      <div
        className={`space-y-2.5 pt-4 border-t ${
          isLight ? 'border-[#EAE4DC]' : 'border-[#FFF0E1]/[0.08]'
        }`}
      >
        <button
          type="button"
          onClick={onToggleTheme}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
            isLight
              ? 'bg-white hover:bg-[#F2EDE6] border-[#EAE4DC] text-[#181512]'
              : 'bg-[#171412] hover:bg-[#211D1A] border-[#FFF0E1]/[0.08] text-[#FAF7F2]'
          }`}
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 shrink-0 text-[#F49A5E]" strokeWidth={1.75} />
          ) : (
            <Moon className="w-4 h-4 shrink-0 text-[#6B635B]" strokeWidth={1.75} />
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
          className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-left active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer group ${
            isLight
              ? 'bg-white hover:bg-[#F2EDE6] border-[#EAE4DC] shadow-[0_4px_20px_rgba(24,21,18,0.04)]'
              : 'bg-[#171412] hover:bg-[#211D1A] border-[#FFF0E1]/[0.08] shadow-none'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ${
              isLight ? 'ring-[#EAE4DC]' : 'ring-[#FFF0E1]/15'
            }`}
          >
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="avatar-circle w-full h-full bg-[#211D1A] flex items-center justify-center text-white text-xs font-semibold">
                {userProfile.avatarSeed}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`text-xs font-semibold truncate ${
                isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
              }`}
            >
              {userProfile.youtubeAccount?.name || userProfile.name}
            </div>
            <div
              className={`text-[11px] font-mono font-medium flex items-center gap-1 mt-0.5 tabular-nums ${
                isLight ? 'text-[#16A34A]' : 'text-[#22C55E]'
              }`}
            >
              <ShieldCheck className="w-3 h-3 shrink-0" strokeWidth={1.75} />
              <span>{userProfile.trustScore || 98}/100</span>
            </div>
          </div>
          <Settings
            className={`w-4 h-4 transition-colors shrink-0 ${
              isLight
                ? 'text-[#6B635B] group-hover:text-[#181512]'
                : 'text-[#A39A91] group-hover:text-[#FAF7F2]'
            }`}
            strokeWidth={1.75}
          />
        </button>
      </div>
    </aside>
  );
};
