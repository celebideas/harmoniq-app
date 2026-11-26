import React from 'react';
import {
  AudioLines,
  Compass,
  MessageCircle,
  User,
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
  privacyMode?: PrivacyMode;
  onChangePrivacyMode?: (mode: PrivacyMode) => void;
  userProfile: UserProfile;
  themeMode?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const DesktopSidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  unreadCount,
  liveListenersCount,
  userProfile,
}) => {
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

  return (
    <aside
      aria-label="Masaüstü Navigasyon"
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-[84px] w-72 z-30 border-r p-5 select-none justify-between bg-[#0B0B0D] border-white/[0.08] text-[#F5F5F7]"
    >
      {/* TOP: Pure Studio Monochrome ListenHub Logo */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onSelectTab('lounge');
          }}
          className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl cursor-pointer group active:scale-[0.96] transition-transform duration-100 ease-out text-left hover:bg-[#141418]"
        >
          <div className="w-10 h-10 rounded-xl shadow-sm flex items-center justify-center shrink-0 bg-white text-[#0B0B0D]">
            <ListenHubLogo className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-bold tracking-tight block leading-none text-[#F5F5F7]">
              ListenHub
            </span>
            <span className="text-xs font-normal text-[#8E8E98] block mt-1">
              Canlı Müzik Ağı
            </span>
          </div>
        </button>

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
                className={`w-full px-4 py-3.5 rounded-xl text-sm flex items-center justify-between gap-3.5 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                  isActive
                    ? 'bg-white/[0.10] text-[#F5F5F7] font-semibold border border-white/[0.12]'
                    : 'text-[#8E8E98] hover:text-[#F5F5F7] hover:bg-[#141418] font-medium border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3.5 min-w-0">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium tabular-nums shrink-0 ${
                      item.isLiveBadge
                        ? 'bg-[#22C55E]/15 text-[#22C55E]'
                        : 'bg-white text-[#0B0B0D]'
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

      {/* BOTTOM: User Settings Card */}
      <div className="pt-4 border-t border-white/[0.08]">
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
          className="w-full p-3 rounded-2xl border flex items-center gap-3 text-left active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer group bg-[#141418] hover:bg-[#1C1C22] border-white/[0.08]"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ring-white/15">
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="avatar-circle w-full h-full bg-[#1C1C22] flex items-center justify-center text-white text-xs font-semibold">
                {userProfile.avatarSeed}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold tracking-tight truncate text-[#F5F5F7]">
              {userProfile.youtubeAccount?.name || userProfile.name}
            </div>
            <div className="text-xs font-medium flex items-center gap-1 mt-0.5 tabular-nums text-[#22C55E]">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span>{userProfile.trustScore || 98}/100</span>
            </div>
          </div>
          <Settings
            className="w-4 h-4 transition-colors shrink-0 text-[#8E8E98] group-hover:text-[#F5F5F7]"
            strokeWidth={1.75}
          />
        </button>
      </div>
    </aside>
  );
};
