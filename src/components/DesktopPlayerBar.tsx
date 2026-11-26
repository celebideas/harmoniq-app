import React, { useState, useRef } from 'react';
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

  return (
    <footer
      aria-label="Masaüstü Medya Çubuğu"
      className="hidden lg:flex items-center justify-between fixed bottom-0 inset-x-0 h-[84px] px-6 lg:px-8 z-40 bg-white/95 dark:bg-[#171412]/95 backdrop-blur-xl border-t border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] select-none transition-colors duration-200"
    >
      {/* LEFT (w-1/4): Cover + Track Info + Favorite */}
      <div className="w-1/4 min-w-0 flex items-center gap-3.5">
        <div
          onClick={onOpenNowPlaying}
          className="relative w-13 h-13 rounded-xl overflow-hidden bg-[#211D1A] shrink-0 ring-1 ring-black/5 dark:ring-[#FFF0E1]/10 cursor-pointer group"
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
              <Music className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenNowPlaying}
            className="text-sm font-semibold text-[#181512] dark:text-[#FAF7F2] hover:opacity-75 transition truncate block max-w-full text-left cursor-pointer"
            title={currentSong.title}
          >
            {currentSong.title}
          </button>
          <div className="text-xs text-[#6B635B] dark:text-[#A39A91] truncate">
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
              : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] hover:bg-[#F2EDE6] dark:hover:bg-[#211D1A]'
          }`}
          aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} strokeWidth={1.75} />
        </button>
      </div>

      {/* CENTER (w-2/4 max-w-xl): Copper-Amber Transport Controls + Minimal Seek Bar */}
      <div className="w-2/4 max-w-xl flex flex-col items-center justify-center gap-1.5 px-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(12);
              onPrevSong();
            }}
            className="p-2 rounded-xl text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] hover:bg-[#F2EDE6] dark:hover:bg-[#211D1A] transition cursor-pointer"
            aria-label="Önceki Şarkı"
            title="Önceki Şarkı"
          >
            <SkipBack className="w-4 h-4" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic(18);
              onTogglePlay();
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E87A3E] to-[#D97706] text-white shadow-lg shadow-amber-950/20 hover:brightness-105 flex items-center justify-center active:scale-95 transition cursor-pointer"
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

          <button
            type="button"
            onClick={() => {
              triggerHaptic(12);
              onNextSong();
            }}
            className="p-2 rounded-xl text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] hover:bg-[#F2EDE6] dark:hover:bg-[#211D1A] transition cursor-pointer"
            aria-label="Sonraki Şarkı"
            title="Sonraki Şarkı"
          >
            <SkipForward className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Minimal Copper-Amber Progress Scrubber */}
        <div className="w-full flex items-center gap-3">
          <span className="text-[11px] font-mono tabular-nums text-[#6B635B] dark:text-[#A39A91] w-10 text-right shrink-0">
            {formatTime(displaySecond)}
          </span>

          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setIsDragging(false)}
            className="flex-1 py-2 cursor-pointer touch-none group"
            role="slider"
            aria-label="Şarkı ilerleme çubuğu"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={displaySecond}
          >
            <div className="h-1 w-full rounded-full bg-[#EAE4DC] dark:bg-[#FFF0E1]/12 cursor-pointer relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E87A3E] to-[#D97706] transition-[width] duration-150"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#E87A3E] ring-2 ring-white dark:ring-[#171412] shadow-sm pointer-events-none transition-transform duration-150 ${
                  isDragging ? 'scale-125' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ left: `${progressPct}%` }}
              />
            </div>
          </div>

          <span className="text-[11px] font-mono tabular-nums text-[#6B635B] dark:text-[#A39A91] w-10 shrink-0">
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
            className="p-2 rounded-xl text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] transition cursor-pointer"
            aria-label={volume === 0 ? 'Sesi aç' : 'Sesi kapat'}
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" strokeWidth={1.75} />
            ) : volume < 50 ? (
              <Volume1 className="w-4 h-4" strokeWidth={1.75} />
            ) : (
              <Volume2 className="w-4 h-4" strokeWidth={1.75} />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            aria-label="Ses seviyesi"
            className="w-full h-1 accent-[#E87A3E] cursor-pointer rounded-full"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(12);
            onOpenNowPlaying();
          }}
          className="p-2 rounded-xl bg-[#F2EDE6] dark:bg-[#211D1A] hover:bg-[#EAE4DC] dark:hover:bg-[#FFF0E1]/10 border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] text-[#181512] dark:text-[#FAF7F2] transition cursor-pointer"
          aria-label="Tam Ekran Oynatıcıyı Aç"
          title="Tam Ekran Oynatıcıyı Aç"
        >
          <Maximize2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>
    </footer>
  );
};
