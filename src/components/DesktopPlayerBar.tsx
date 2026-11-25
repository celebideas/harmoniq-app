import React, { useState, useRef, useId } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Loader2,
  Music,
} from 'lucide-react';
import { Song } from '../types';
import { soundEngine } from '../services/soundEngine';
import { triggerHaptic } from '../services/themeService';

interface Props {
  currentSong: Song;
  isPlaying: boolean;
  isAudioLoading?: boolean;
  currentSecond: number;
  isFavorite: boolean;
  onTogglePlay: () => void;
  onNextSong: () => void;
  onPrevSong: () => void;
  onSeekSecond: (sec: number) => void;
  onToggleFavorite: (song: Song) => void;
  onOpenNowPlaying: () => void;
}

const formatTime = (secs: number) => {
  const safe = Math.max(0, Math.floor(secs || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const DesktopPlayerBar: React.FC<Props> = ({
  currentSong,
  isPlaying,
  isAudioLoading = false,
  currentSecond,
  isFavorite,
  onTogglePlay,
  onNextSong,
  onPrevSong,
  onSeekSecond,
  onToggleFavorite,
  onOpenNowPlaying,
}) => {
  const [volume, setVolume] = useState<number>(100);
  const [previousVolume, setPreviousVolume] = useState<number>(100);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragSecond, setDragSecond] = useState<number>(currentSecond);
  const trackRef = useRef<HTMLDivElement>(null);
  const waveGradientId = useId();

  const duration = Math.max(1, currentSong.durationSeconds || 210);
  const displaySecond = isDragging ? dragSecond : currentSecond;
  const progressPct = Math.min(100, Math.max(0, (displaySecond / duration) * 100));

  const computeSecondFromClientX = (clientX: number) => {
    if (!trackRef.current) return displaySecond;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * duration);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const nextSec = computeSecondFromClientX(e.clientX);
    setIsDragging(true);
    setDragSecond(nextSec);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragSecond(computeSecondFromClientX(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const finalSec = computeSecondFromClientX(e.clientX);
    setIsDragging(false);
    onSeekSecond(finalSec);
  };

  const handleVolumeChange = (nextVal: number) => {
    const clamped = Math.max(0, Math.min(100, nextVal));
    setVolume(clamped);
    if (clamped > 0) setPreviousVolume(clamped);
    soundEngine.setVolume(clamped / 100);
  };

  const handleToggleMute = () => {
    if (volume === 0) {
      handleVolumeChange(previousVolume || 80);
    } else {
      setPreviousVolume(volume);
      handleVolumeChange(0);
    }
  };

  // Smooth sine wave path for Material You wavy progress bar
  const wavePath = React.useMemo(() => {
    const segments: string[] = ['M 0 8'];
    for (let x = 0; x < 720; x += 24) {
      segments.push(`Q ${x + 6} 2.5, ${x + 12} 8 T ${x + 24} 8`);
    }
    return segments.join(' ');
  }, []);

  return (
    <footer
      aria-label="Masaüstü Medya Çubuğu"
      className="hidden lg:flex items-center justify-between fixed bottom-0 inset-x-0 h-20 px-6 z-40 bg-white/95 dark:bg-[#12101C]/95 backdrop-blur-2xl border-t border-zinc-200 dark:border-white/[0.08] select-none shadow-[0_-8px_30px_rgba(0,0,0,0.22)]"
    >
      {/* LEFT (w-1/4): Cover + Track Info + Favorite */}
      <div className="w-1/4 min-w-0 flex items-center gap-3.5">
        <div
          onClick={onOpenNowPlaying}
          className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 shrink-0 ring-1 ring-black/10 dark:ring-white/10 shadow-md cursor-pointer group"
          title="Tam Ekran Oynatıcıyı Aç"
        >
          {currentSong.coverUrl ? (
            <img
              src={currentSong.coverUrl}
              alt={currentSong.album}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-tr ${currentSong.coverGradient} flex items-center justify-center`}
            >
              <Music className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenNowPlaying}
            className="text-sm font-bold text-zinc-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition truncate block max-w-full text-left cursor-pointer"
            title={currentSong.title}
          >
            {currentSong.title}
          </button>
          <div className="text-xs text-zinc-500 dark:text-[#9E9AA8] truncate">
            {currentSong.artist}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            onToggleFavorite(currentSong);
          }}
          className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
            isFavorite
              ? 'text-rose-500 bg-rose-500/10'
              : 'text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
          }`}
          aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* CENTER (w-2/4 max-w-xl): Controls + Android Material You Wavy Seek Bar */}
      <div className="w-2/4 max-w-xl flex flex-col items-center justify-center gap-1.5 px-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(12);
              onPrevSong();
            }}
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Önceki Şarkı"
            title="Önceki Şarkı"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic(18);
              onTogglePlay();
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(147,51,234,0.4)] hover:brightness-110 active:scale-95 transition cursor-pointer"
            aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
            title={isPlaying ? 'Duraklat' : 'Oynat'}
          >
            {isAudioLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-current text-white" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5 text-white" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(12);
              onNextSong();
            }}
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Sonraki Şarkı"
            title="Sonraki Şarkı"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Wavy Progress Scrubber */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400 w-10 text-right shrink-0">
            {formatTime(displaySecond)}
          </span>

          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setIsDragging(false)}
            className="relative flex-1 h-5 flex items-center cursor-pointer touch-none group"
            role="slider"
            aria-label="Şarkı ilerleme çubuğu"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={displaySecond}
          >
            {/* Inactive straight track */}
            <div className="absolute inset-x-0 h-[3px] rounded-full bg-zinc-200 dark:bg-white/15" />

            {/* Active Wavy Progress */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-4 overflow-hidden pointer-events-none"
              style={{ width: `${progressPct}%` }}
            >
              {isPlaying && !isDragging ? (
                <svg
                  className="h-4 w-[720px] max-w-none animate-wavy-flow"
                  viewBox="0 0 720 16"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id={waveGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#9333EA" />
                      <stop offset="55%" stopColor="#D946EF" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                  <path
                    d={wavePath}
                    stroke={`url(#${waveGradientId})`}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <div className="w-full h-[3px] mt-[6.5px] rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500" />
              )}
            </div>

            {/* Vertical pill thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3.5 rounded-full bg-purple-600 dark:bg-white shadow-md pointer-events-none transition-transform group-hover:scale-125"
              style={{ left: `${progressPct}%` }}
            />
          </div>

          <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400 w-10 shrink-0">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* RIGHT (w-1/4 justify-end): Volume Slider + Fullscreen Player Toggle */}
      <div className="w-1/4 flex items-center justify-end gap-3">
        <div className="flex items-center gap-2 w-32">
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
            aria-label={volume === 0 ? 'Sesi aç' : 'Sesi kapat'}
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : volume < 50 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            aria-label="Ses seviyesi"
            className="w-full h-1.5 accent-purple-600 cursor-pointer rounded-full"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(12);
            onOpenNowPlaying();
          }}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.12] border border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
          aria-label="Tam Ekran Oynatıcıyı Aç"
          title="Tam Ekran Oynatıcıyı Aç"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
