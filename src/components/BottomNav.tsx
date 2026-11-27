import React, { useMemo } from 'react';
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
  currentSong?: Song | null;
  isPlaying?: boolean;
  currentSecond?: number;
  isAudioLoading?: boolean;
  themeMode?: 'dark' | 'light';
  onTogglePlay?: () => void;
  onNextSong?: () => void;
  onOpenNowPlaying?: () => void;
  onSeekSecond?: (sec: number) => void;
}

export const BottomNav: React.FC<Props> = React.memo(({
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

  const navItems = useMemo<{
    id: NavTab;
    label: string;
    IconComponent: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    badge?: number | string;
    isLiveBadge?: boolean;
  }[]>(
    () => [
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
    ],
    [liveCount, unreadCount]
  );

  const showMiniPlayerStrip = activeTab !== 'lounge' && Boolean(currentSong);
  const progressPct = currentSong
    ? Math.min(100, Math.max(0, (currentSecond / (currentSong.durationSeconds || 1)) * 100))
    : 0;

  return (
    <nav
      aria-label="Birleşik Medya ve Navigasyon Konsolu"
      className={`lg:hidden fixed bottom-2.5 left-2.5 right-2.5 z-40 max-w-md mx-auto rounded-2xl backdrop-blur-md border overflow-hidden select-none transition-colors duration-150 ${
        isLight
          ? 'bg-white/95 border-[#E6E4DF] shadow-[0_8px_30px_rgba(17,17,19,0.08)] text-[#111113]'
          : 'bg-[#0B0B0D]/95 border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.6)] text-[#F5F5F7]'
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
                className={`relative w-10 h-10 rounded-xl overflow-hidden bg-[#1C1C22] shrink-0 ring-1 ${
                  isLight ? 'ring-black/5' : 'ring-white/10'
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
                    isLight ? 'text-[#111113]' : 'text-[#F5F5F7]'
                  }`}
                >
                  {currentSong.title}
                </div>
                <div
                  className={`text-xs truncate mt-0.5 ${
                    isLight ? 'text-[#63636B]' : 'text-[#8E8E98]'
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
                className={`w-9 h-9 rounded-full shadow-sm flex items-center justify-center active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                  isLight
                    ? 'studio-btn-primary bg-[#111113] hover:bg-zinc-800 text-white'
                    : 'bg-white hover:bg-zinc-200 text-[#0B0B0D]'
                }`}
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
                      ? 'text-[#63636B] hover:text-[#111113] hover:bg-[#F1EFEA]'
                      : 'text-[#8E8E98] hover:text-[#F5F5F7] hover:bg-[#1C1C22]'
                  }`}
                  aria-label="Sonraki Şarkı"
                  title="Sonraki Şarkı"
                >
                  <SkipForward className="w-4 h-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>

          {/* 2px Monochrome Progress Line */}
          <div
            onClick={(e) => {
              if (!onSeekSecond || !currentSong) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onSeekSecond(Math.round(ratio * (currentSong.durationSeconds || 1)));
            }}
            className={`h-[2px] w-full cursor-pointer overflow-hidden ${
              isLight ? 'bg-[#E6E4DF]' : 'bg-white/10'
            }`}
            title="Şarkıda sar"
          >
            <div
              className="h-full transition-[width,background-color] duration-700 ease-in-out"
              style={{
                width: `${progressPct}%`,
                backgroundColor: 'var(--dynamic-track-color, #F5F5F7)',
              }}
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
                    ? 'bg-[#111113]/[0.08] text-[#111113] font-semibold'
                    : 'bg-white/[0.10] text-white font-semibold'
                  : isLight
                  ? 'text-[#63636B] hover:text-[#111113] font-medium'
                  : 'text-[#8E8E98] hover:text-[#F5F5F7] font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <IconComp className="w-5 h-5" strokeWidth={isActive ? 2.1 : 1.75} />

                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 px-1.5 py-0.5 rounded-full text-xs font-semibold leading-none tabular-nums ${
                      item.isLiveBadge
                        ? isLight
                          ? 'bg-[#16A34A]/15 text-[#16A34A]'
                          : 'bg-[#22C55E]/20 text-[#22C55E]'
                        : isLight
                        ? 'studio-btn-primary bg-[#111113] text-white'
                        : 'bg-white text-[#0B0B0D]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-xs mt-1 tracking-normal leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
