import React from 'react';
import {
  AudioLines,
  Compass,
  MessageCircle,
  User,
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
  privacyMode?: PrivacyMode;
  onChangePrivacyMode?: (mode: PrivacyMode) => void;
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
  userProfile,
  themeMode,
  onToggleTheme,
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

  const isLight = themeMode === 'light';

  return (
    <aside
      aria-label="Masaüstü Navigasyon"
      className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-[84px] w-72 z-30 border-r p-5 select-none justify-between transition-colors duration-150 ${
        isLight
          ? 'bg-[#FAF9F6] border-[#E6E4DF] text-[#111113]'
          : 'bg-[#0B0B0D] border-white/[0.08] text-[#F5F5F7]'
      }`}
    >
      {/* TOP: Pure Studio Monochrome ListenHub Logo + Privacy Capsule */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onSelectTab('lounge');
          }}
          className={`w-full flex items-center gap-3.5 p-2.5 rounded-2xl cursor-pointer group active:scale-[0.96] transition-transform duration-100 ease-out text-left ${
            isLight ? 'hover:bg-[#F1EFEA]' : 'hover:bg-[#141418]'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl shadow-sm flex items-center justify-center shrink-0 ${
              isLight
                ? 'studio-btn-primary bg-[#111113] text-white'
                : 'bg-white text-[#0B0B0D]'
            }`}
          >
            <ListenHubLogo className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span
              className={`text-lg font-bold tracking-tight block leading-none ${
                isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
              }`}
            >
              ListenHub
            </span>
            <span
              className={`text-xs block mt-1 ${
                isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
              }`}
            >
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
                className={`w-full px-4 py-3.5 rounded-xl text-[15px] flex items-center justify-between gap-3.5 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                  isActive
                    ? isLight
                      ? 'bg-[#111113]/[0.08] text-[#111113] font-semibold border border-[#111113]/12'
                      : 'bg-white/[0.10] text-white font-semibold border border-white/[0.12]'
                    : isLight
                    ? 'text-[#63636B] hover:text-[#111113] hover:bg-[#F1EFEA] font-medium border border-transparent'
                    : 'text-[#8E8E98] hover:text-[#F5F5F7] hover:bg-[#141418] font-medium border border-transparent'
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
                        : isLight
                        ? 'studio-btn-primary bg-[#111113] text-white'
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

      {/* BOTTOM: Theme Switcher & User Settings Card */}
      <div
        className={`space-y-2.5 pt-4 border-t ${
          isLight ? 'border-[#E6E4DF]' : 'border-white/[0.08]'
        }`}
      >
        <button
          type="button"
          onClick={onToggleTheme}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
            isLight
              ? 'bg-white hover:bg-[#F1EFEA] border-[#E6E4DF] text-[#111113]'
              : 'bg-[#141418] hover:bg-[#1C1C22] border-white/[0.08] text-[#F5F5F7]'
          }`}
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 shrink-0 text-[#F5F5F7]" strokeWidth={1.75} />
          ) : (
            <Moon className="w-4 h-4 shrink-0 text-[#63636B]" strokeWidth={1.75} />
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
              ? 'bg-white hover:bg-[#F1EFEA] border-[#E6E4DF] shadow-[0_2px_12px_rgba(17,17,19,0.04)]'
              : 'bg-[#141418] hover:bg-[#1C1C22] border-white/[0.08] shadow-none'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ${
              isLight ? 'ring-[#E6E4DF]' : 'ring-white/15'
            }`}
          >
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
            <div
              className={`text-xs font-semibold truncate ${
                isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
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
                ? 'text-[#63636B] group-hover:text-[#111113]'
                : 'text-[#8E8E98] group-hover:text-[#F5F5F7]'
            }`}
            strokeWidth={1.75}
          />
        </button>
      </div>
    </aside>
  );
};
