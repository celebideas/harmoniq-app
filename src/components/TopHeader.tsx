import React from 'react';
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

export const TopHeader: React.FC<Props> = React.memo(({
  activeTab,
  onSelectTab,
  userProfile,
}) => {
  return (
    <header className="lg:hidden sticky top-0 z-40 border-b backdrop-blur-md select-none bg-[#0B0B0D]/95 border-white/[0.08] text-[#F5F5F7]">
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
          <div className="w-8 h-8 rounded-xl shadow-sm flex items-center justify-center shrink-0 bg-white text-[#0B0B0D]">
            <ListenHubLogo className="w-5 h-5" />
          </div>
          <div className="leading-none">
            <span className="text-sm font-bold tracking-tight block text-[#F5F5F7]">
              ListenHub
            </span>
            <span className="text-xs font-normal text-[#8E8E98] block mt-0.5">
              Canlı Müzik Ağı
            </span>
          </div>
        </button>

        {/* RIGHT: User Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {userProfile && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                onSelectTab('profile');
              }}
              className={`flex items-center justify-center cursor-pointer p-0.5 rounded-full ring-1 active:scale-[0.96] transition-transform duration-100 ease-out ${
                activeTab === 'profile'
                  ? 'ring-white'
                  : 'ring-white/15 hover:ring-white/50'
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
                  <div className="avatar-circle w-full h-full bg-[#1C1C22] flex items-center justify-center text-white text-xs font-semibold">
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
});
