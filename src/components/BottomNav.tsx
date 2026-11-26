import React from 'react';
import {
  AudioLines,
  Compass,
  MessageCircle,
  User,
  Play,
  Pause,
  SkipForward,
  Loader2,
} from 'lucide-react';
import { Song } from '../types';
import { triggerHaptic } from '../services/themeService';

export type NavTab = 'lounge' | 'rooms' | 'chat' | 'profile';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadCount: number;
  liveCount?: number;
  currentSong?: Song;
  isPlaying?: boolean;
  currentSecond?: number;
  isAudioLoading?: boolean;
  themeMode?: 'dark' | 'light';
  onTogglePlay?: () => void;
  onNextSong?: () => void;
  onOpenNowPlaying?: () => void;
  onSeekSecond?: (sec: number) => void;
}

export const BottomNav: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  unreadCount,
  liveCount = 12,
  currentSong,
  isPlaying = false,
  currentSecond = 0,
  isAudioLoading = false,
  themeMode = 'dark',
  onTogglePlay,
  onNextSong,
  onOpenNowPlaying,
  onSeekSecond,
}) => {
  const isLight = themeMode === 'light';

  const navItems: {
    id: NavTab;
    label: string;
    IconComponent: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    badge?: number | string;
    isLiveBadge?: boolean;
  }[] = [
    {
      id: 'lounge',
      label: 'Sahne',
      IconComponent: AudioLines,
      badge: liveCount,
      isLiveBadge: true,
    },
    {
      id: 'rooms',
      label: 'Keşfet',
      IconComponent: Compass,
    },
    {
      id: 'chat',
      label: 'Sohbet',
      IconComponent: MessageCircle,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'profile',
      label: 'Ben',
      IconComponent: User,
    },
  ];

  const showMiniPlayerStrip = activeTab !== 'lounge' && Boolean(currentSong);
  const progressPct = currentSong
    ? Math.min(100, Math.max(0, (currentSecond / (currentSong.durationSeconds || 1)) * 100))
    : 0;

  return (
    <nav
      aria-label="Birleşik Medya ve Navigasyon Konsolu"
      className={`lg:hidden fixed bottom-2.5 left-2.5 right-2.5 z-40 max-w-md mx-auto rounded-2xl backdrop-blur-xl border overflow-hidden select-none transition-colors duration-150 ${
        isLight
          ? 'bg-white/95 border-[#EAE4DC] shadow-[0_8px_30px_rgba(24,21,18,0.10)] text-[#181512]'
          : 'bg-[#171412]/95 border-[#FFF0E1]/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.6)] text-[#FAF7F2]'
      }`}
    >
      {/* UPPER TIER: MINI PLAYER STRIP */}
      {showMiniPlayerStrip && currentSong && (
        <div className="relative">
          <div className="flex items-center justify-between px-3.5 py-2.5 gap-3">
            <div
              onClick={() => {
                triggerHaptic(15);
                onOpenNowPlaying?.();
              }}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group active:scale-[0.96] transition-transform duration-100 ease-out"
              title="Tam Ekran Oynatıcıyı Aç"
            >
              <div
                className={`relative w-10 h-10 rounded-xl overflow-hidden bg-[#211D1A] shrink-0 ring-1 ${
                  isLight ? 'ring-black/5' : 'ring-[#FFF0E1]/10'
                }`}
              >
                {currentSong.coverUrl ? (
                  <img
                    src={currentSong.coverUrl}
                    alt={currentSong.album}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-tr ${currentSong.coverGradient}`}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`text-xs font-semibold truncate ${
                    isLight ? 'text-[#181512]' : 'text-[#FAF7F2]'
                  }`}
                >
                  {currentSong.title}
                </div>
                <div
                  className={`text-[11px] truncate mt-0.5 ${
                    isLight ? 'text-[#6B635B]' : 'text-[#A39A91]'
                  }`}
                >
                  {currentSong.artist}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(20);
                  onTogglePlay?.();
                }}
                className="w-9 h-9 rounded-full studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white shadow-lg shadow-amber-950/20 hover:brightness-105 flex items-center justify-center active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer"
                aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
                title={isPlaying ? 'Duraklat' : 'Oynat'}
              >
                {isAudioLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" strokeWidth={1.75} />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" strokeWidth={1.75} />
                )}
              </button>

              {onNextSong && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(15);
                    onNextSong();
                  }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                    isLight
                      ? 'text-[#6B635B] hover:text-[#181512] hover:bg-[#F2EDE6]'
                      : 'text-[#A39A91] hover:text-[#FAF7F2] hover:bg-[#211D1A]'
                  }`}
                  aria-label="Sonraki Şarkı"
                  title="Sonraki Şarkı"
                >
                  <SkipForward className="w-4 h-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>

          {/* 2px Copper-Amber Progress Line */}
          <div
            onClick={(e) => {
              if (!onSeekSecond || !currentSong) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onSeekSecond(Math.round(ratio * (currentSong.durationSeconds || 1)));
            }}
            className={`h-[2px] w-full cursor-pointer overflow-hidden ${
              isLight ? 'bg-[#EAE4DC]' : 'bg-[#FFF0E1]/10'
            }`}
            title="Şarkıda sar"
          >
            <div
              className="h-full bg-gradient-to-r from-[#E87A3E] to-[#D97706] transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* LOWER TIER: 4 FIXED TABS (Sahne, Keşfet, Sohbet, Ben) */}
      <div className="grid grid-cols-4 gap-1.5 px-2.5 py-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComp = item.IconComponent;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerHaptic(12);
                onSelectTab(item.id);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-h-[56px] py-2 px-2 rounded-xl transition-transform duration-100 ease-out cursor-pointer active:scale-[0.96] ${
                isActive
                  ? isLight
                    ? 'bg-[#E87A3E]/15 text-[#D96B2C] font-semibold'
                    : 'bg-[#E87A3E]/15 text-[#F49A5E] font-semibold'
                  : isLight
                  ? 'text-[#6B635B] hover:text-[#181512] font-medium'
                  : 'text-[#A39A91] hover:text-[#FAF7F2] font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <IconComp className="w-5 h-5" strokeWidth={isActive ? 2.1 : 1.75} />

                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold leading-none tabular-nums ${
                      item.isLiveBadge
                        ? isLight
                          ? 'bg-[#16A34A]/15 text-[#16A34A]'
                          : 'bg-[#22C55E]/20 text-[#22C55E]'
                        : 'studio-btn-primary bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] mt-1 tracking-normal leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
