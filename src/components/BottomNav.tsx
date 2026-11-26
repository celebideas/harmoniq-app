import React from 'react';
import {
  Radio,
  Disc3,
  MessageCircle,
  Library,
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
      label: 'Canlı',
      IconComponent: Radio,
      badge: liveCount,
      isLiveBadge: true,
    },
    {
      id: 'rooms',
      label: 'Odalar',
      IconComponent: Disc3,
    },
    {
      id: 'chat',
      label: 'Sohbet',
      IconComponent: MessageCircle,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'profile',
      label: 'Kütüphanem',
      IconComponent: Library,
    },
  ];

  const showMiniPlayerStrip = activeTab !== 'lounge' && Boolean(currentSong);
  const progressPct = currentSong
    ? Math.min(100, Math.max(0, (currentSecond / (currentSong.durationSeconds || 1)) * 100))
    : 0;

  return (
    <nav
      aria-label="Birleşik Medya ve Navigasyon Konsolu"
      className="lg:hidden fixed bottom-2.5 left-2.5 right-2.5 z-40 max-w-md mx-auto rounded-3xl bg-white/95 dark:bg-[#14121E]/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-white/[0.09] shadow-[0_16px_40px_rgba(0,0,0,0.55)] overflow-hidden select-none transition-all duration-300"
    >
      {/* UPPER TIER: MINI PLAYER STRIP (Visible on Odalar, Sohbet, Kütüphanem tabs) */}
      {showMiniPlayerStrip && currentSong && (
        <div className="relative">
          <div className="flex items-center justify-between px-3.5 py-2.5 gap-3">
            {/* Left: Album Cover (w-10 h-10 rounded-xl) + Song & Artist Info */}
            <div
              onClick={() => {
                triggerHaptic(15);
                onOpenNowPlaying?.();
              }}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group active:scale-[0.99] transition-transform"
              title="Tam Ekran Oynatıcıyı Aç"
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 shrink-0 ring-1 ring-black/10 dark:ring-white/10 shadow-sm">
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
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {currentSong.title}
                </div>
                <div className="text-[11px] text-[#646073] dark:text-[#9E9AA8] truncate mt-0.5">
                  {currentSong.artist}
                </div>
              </div>
            </div>

            {/* Right: Play/Pause + Next Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(20);
                  onTogglePlay?.();
                }}
                className="w-9 h-9 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-force-white flex items-center justify-center shadow-[0_4px_14px_rgba(147,51,234,0.35)] transition active:scale-95 cursor-pointer"
                aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
                title={isPlaying ? 'Duraklat' : 'Oynat'}
              >
                {isAudioLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-force-white" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4 fill-current text-force-white" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5 text-force-white" />
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
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#646073] dark:text-[#9E9AA8] hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] transition active:scale-95 cursor-pointer"
                  aria-label="Sonraki Şarkı"
                  title="Sonraki Şarkı"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              )}
            </div>
          </div>

          {/* 2px Electric Violet Progress Line connecting Upper & Lower Tiers */}
          <div
            onClick={(e) => {
              if (!onSeekSecond || !currentSong) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onSeekSecond(Math.round(ratio * (currentSong.durationSeconds || 1)));
            }}
            className="h-[2px] w-full bg-zinc-200 dark:bg-white/[0.08] cursor-pointer overflow-hidden"
            title="Şarkıda sar"
          >
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* LOWER TIER: 4 MAIN TABS (Canlı, Odalar, Sohbet, Kütüphanem) */}
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
              className={`relative flex flex-col items-center justify-center min-h-[54px] py-2 px-2 rounded-2xl transition-all cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-purple-500/12 text-purple-600 dark:text-purple-400 font-bold'
                  : 'text-[#646073] dark:text-[#9E9AA8] hover:text-zinc-900 dark:hover:text-zinc-200 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <IconComp className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.9} />

                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none tabular-nums ${
                      item.isLiveBadge
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : 'bg-gradient-to-r from-purple-600 to-pink-500 text-force-white shadow-xs'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] font-semibold mt-1 tracking-normal leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
