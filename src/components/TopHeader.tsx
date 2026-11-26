import React from 'react';
import { Sun, Moon } from 'lucide-react';
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
  privacyMode?: PrivacyMode;
  onChangePrivacyMode?: (mode: PrivacyMode) => void;
  onOpenInstallModal: () => void;
  userProfile?: UserProfile;
  themeMode?: 'dark' | 'light';
  onToggleTheme?: () => void;
  liveListenersCount?: number;
}

export const TopHeader: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  userProfile,
  themeMode = 'dark',
  onToggleTheme,
}) => {
  const isLight = themeMode === 'light';

  return (
    <header
      className={`lg:hidden sticky top-0 z-40 border-b backdrop-blur-xl select-none transition-colors duration-200 ${
        isLight
          ? 'bg-[#FAF9F6]/92 border-[#E6E4DF] text-[#111113]'
          : 'bg-[#0B0B0D]/88 border-white/[0.08] text-[#F5F5F7]'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* LEFT: Pure Studio Monochrome ListenHub SVG Emblem & Title */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onSelectTab('lounge');
          }}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0 text-left active:scale-[0.96] transition-transform duration-100 ease-out"
        >
          <div
            className={`w-8 h-8 rounded-xl shadow-sm flex items-center justify-center shrink-0 ${
              isLight
                ? 'studio-btn-primary bg-[#111113] text-white'
                : 'bg-white text-[#0B0B0D]'
            }`}
          >
            <ListenHubLogo className="w-5 h-5" />
          </div>
          <div className="leading-none">
            <span className="text-sm font-bold tracking-tight block">
              ListenHub
            </span>
            <span className="text-[10px] text-[#63636B] dark:text-[#8E8E98] block mt-0.5">
              Canlı Müzik Ağı
            </span>
          </div>
        </button>

        {/* RIGHT: Theme Switcher & User Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E6E4DF] dark:border-white/[0.08] bg-white dark:bg-[#141418] text-[#111113] dark:text-[#F5F5F7] hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22] active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer"
              title={themeMode === 'dark' ? 'Gündüz Moduna Geç' : 'Gece Moduna Geç'}
              aria-label="Tema değiştir"
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-[#F5F5F7]" strokeWidth={1.75} />
              ) : (
                <Moon className="w-4 h-4 text-[#63636B]" strokeWidth={1.75} />
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
                  ? 'ring-[#111113] dark:ring-white'
                  : 'ring-[#E6E4DF] dark:ring-white/15 hover:ring-[#111113]/50 dark:hover:ring-white/50'
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
                  <div className="avatar-circle w-full h-full bg-[#1C1C22] flex items-center justify-center text-white text-[11px] font-semibold">
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
