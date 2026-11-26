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
  onTogglePlay,
  onNextSong,
  onOpenNowPlaying,
  onSeekSecond,
}) => {
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
      className="lg:hidden fixed bottom-2.5 left-2.5 right-2.5 z-40 max-w-md mx-auto rounded-2xl bg-white/95 dark:bg-[#141418]/95 backdrop-blur-xl border border-[#E8E6E1] dark:border-white/[0.08] shadow-[0_8px_30px_rgba(20,20,22,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.6)] overflow-hidden select-none transition-all duration-300"
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
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group active:scale-[0.99] transition-transform"
              title="Tam Ekran Oynatıcıyı Aç"
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#1C1C22] shrink-0 ring-1 ring-black/5 dark:ring-white/10">
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
                <div className="text-xs font-semibold text-[#141416] dark:text-[#F5F5F7] truncate">
                  {currentSong.title}
                </div>
                <div className="text-[11px] text-[#63636B] dark:text-[#8E8E98] truncate mt-0.5">
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
                className="studio-btn-primary w-9 h-9 rounded-full bg-[#141416] text-white hover:bg-zinc-800 dark:bg-white dark:text-[#0B0B0D] dark:hover:bg-zinc-200 flex items-center justify-center transition active:scale-95 cursor-pointer"
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
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#63636B] dark:text-[#8E8E98] hover:text-[#141416] dark:hover:text-[#F5F5F7] hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22] transition active:scale-95 cursor-pointer"
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
            className="h-[2px] w-full bg-[#E8E6E1] dark:bg-white/10 cursor-pointer overflow-hidden"
            title="Şarkıda sar"
          >
            <div
              className="h-full bg-[#141416] dark:bg-white transition-all duration-150"
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
              className={`relative flex flex-col items-center justify-center min-h-[56px] py-2 px-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-[#F1EFEA] dark:bg-[#1C1C22] text-[#141416] dark:text-[#F5F5F7] font-semibold'
                  : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#141416] dark:hover:text-[#F5F5F7] font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <IconComp className="w-5 h-5" strokeWidth={1.75} />

                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold leading-none tabular-nums ${
                      item.isLiveBadge
                        ? 'bg-[#16A34A]/15 dark:bg-[#22C55E]/20 text-[#16A34A] dark:text-[#22C55E]'
                        : 'bg-[#141416] text-white dark:bg-white dark:text-[#0B0B0D]'
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
