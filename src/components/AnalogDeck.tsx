import React, { useState, useMemo } from 'react';
import { Play, Pause, Clock } from 'lucide-react';
import { Song, TimelineMarker } from '../types';

interface Props {
  song: Song;
  isPlaying: boolean;
  onTogglePlay: () => void;
  progressSeconds?: number;
  onSeek?: (seconds: number) => void;
}

export const AnalogDeck: React.FC<Props> = ({
  song,
  isPlaying,
  onTogglePlay,
  progressSeconds = 45,
  onSeek,
}) => {
  const [rpm, setRpm] = useState<'33' | '45'>('33');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const dur = song.durationSeconds || 210;
  const progressPercent = Math.min(100, (progressSeconds / dur) * 100);

  // Dynamic 4-Section BÖLÜMLER recalculated on every song.id change (%8, %32, %62, %85)
  const dynamicSections: TimelineMarker[] = useMemo(() => {
    const g = (song.genre || '').toLowerCase();
    const isSynth = g.includes('synth') || g.includes('electronic') || g.includes('pop') || g.includes('hip-hop') || g.includes('rap');
    return [
      { second: Math.round(dur * 0.08), label: 'Giriş Melodisi', emoji: '⚡' },
      { second: Math.round(dur * 0.32), label: 'Nakarat', emoji: '🔥' },
      {
        second: Math.round(dur * 0.62),
        label: isSynth ? 'Synth / Bass Drop' : 'Gitar Solosu',
        emoji: isSynth ? '🎹' : '🎸',
      },
      { second: Math.round(dur * 0.85), label: 'Final Akışı', emoji: '✨' },
    ];
  }, [song.id, dur, song.genre]);

  // 8-Line Synchronized Stage & Lyrics Stream
  const synchronizedLyrics = useMemo(() => {
    if (song.lyrics && song.lyrics.length >= 8) {
      return song.lyrics;
    }
    const g = (song.genre || '').toLowerCase();
    const isSynth = g.includes('synth') || g.includes('electronic');
    return [
      { second: 0, text: `♪ ${song.artist} — ${song.title} (Enstrümantal Giriş) ♪` },
      { second: Math.round(dur * 0.08), text: `⚡ İlk akorlar ve ritim frekansı yükseliyor...` },
      { second: Math.round(dur * 0.20), text: `Gecenin içinden yükselen tanıdık melodi` },
      { second: Math.round(dur * 0.32), text: `🔥 "${song.title}" nakaratında tüm oda aynı saniyede buluşuyor` },
      { second: Math.round(dur * 0.48), text: `Ritim derinleşiyor, bas ve davul kusursuz akışta` },
      { second: Math.round(dur * 0.62), text: isSynth ? `🎹 Synth & Bass Drop zirve noktası!` : `🎸 Efsane gitar solosu ve rifler yankılanıyor!` },
      { second: Math.round(dur * 0.75), text: `Son nakarat öncesi duygusal köprü geçişi` },
      { second: Math.round(dur * 0.85), text: `✨ Final akışı — ${song.artist} • ${song.album || 'Single'}` },
    ];
  }, [song.id, song.lyrics, dur, song.title, song.artist, song.genre, song.album]);

  return (
    <div className="relative rounded-3xl bg-white/95 dark:bg-[#14121E]/95 border border-[#E4E2EC] dark:border-white/[0.08] p-5 shadow-xl select-none space-y-4">
      {/* Top Header Strip */}
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200 dark:border-white/[0.08] text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Canlı Pikap Çalar</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium text-[11px]">
          <span>{song.genre}</span>
          <span className="text-zinc-400 dark:text-zinc-600">·</span>
          <span className="text-purple-600 dark:text-purple-300 font-semibold">{song.keyNote} · {song.bpm} BPM</span>
        </div>
      </div>

      {/* Main Turntable Bay */}
      <div className="py-2 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Platter and Vinyl */}
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full bg-neutral-950 p-3 shadow-2xl border-2 border-neutral-800 flex items-center justify-center shrink-0">
          {/* Subtle perimeter reflection */}
          <div className="absolute inset-1 rounded-full border border-neutral-800/60 pointer-events-none" />

          {/* Vinyl Disc */}
          <div
            onClick={onTogglePlay}
            className={`cursor-pointer relative w-full h-full rounded-full bg-[#0a0a0c] shadow-inner flex items-center justify-center transition-transform ${
              isPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: rpm === '45' ? '1.8s' : '2.4s' }}
            title={isPlaying ? 'Durdur' : 'İğneyi Bırak & Çal'}
          >
            {/* Vinyl Groove Rings */}
            <div className="absolute inset-3 rounded-full border border-neutral-900 pointer-events-none" />
            <div className="absolute inset-6 rounded-full border border-neutral-800/40 pointer-events-none" />
            <div className="absolute inset-9 rounded-full border border-neutral-800/30 pointer-events-none" />
            <div className="absolute inset-12 rounded-full border border-neutral-800/20 pointer-events-none" />

            {/* Light sheen reflections across grooves */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/[0.05] via-transparent to-white/[0.04] pointer-events-none" />

            {/* Center Label (Realistic Vinyl Sticker with Album Art) */}
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-neutral-700 shadow-md flex items-center justify-center">
              {song.coverUrl ? (
                <img
                  src={song.coverUrl}
                  alt={song.album}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-tr ${song.coverGradient} flex flex-col items-center justify-center p-1 text-center`} />
              )}

              {/* Tint overlay for authentic printed vinyl label look */}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] flex flex-col items-center justify-center p-1 text-center">
                <span className="text-[7.5px] font-heading font-black text-purple-400 tracking-wider uppercase drop-shadow-sm">
                  HARMONIQ
                </span>
                <span className="text-[8.5px] font-bold text-white truncate max-w-[65px] leading-tight drop-shadow-sm">
                  {song.title}
                </span>
                <span className="text-[7.5px] text-neutral-300 truncate max-w-[60px] drop-shadow-sm">
                  {song.artist}
                </span>

                {/* Spindle hole */}
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-950 border border-neutral-400 mt-0.5 shadow-inner" />
              </div>
            </div>
          </div>

          {/* Calibrated Mechanical Tonearm (top-4 right-4 origin-top-right, rotate-[18deg] resting on black vinyl grooves) */}
          <div
            className={`absolute top-4 right-4 w-14 h-34 pointer-events-none origin-top-right transition-transform duration-700 ease-out z-20 ${
              isPlaying ? 'rotate-[18deg]' : 'rotate-0'
            }`}
          >
            {/* Pivot base */}
            <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-neutral-800 border-2 border-neutral-600 shadow" />
            {/* Tone arm metallic rod */}
            <div className="absolute top-3 right-2.5 w-1 h-28 bg-gradient-to-b from-neutral-300 via-neutral-200 to-neutral-400 rounded-full shadow" />
            {/* Headshell and Cartridge/Needle resting on outer/middle black groove */}
            <div className="absolute bottom-1 right-1.5 w-3.5 h-5 bg-purple-500 rounded-sm shadow-md flex items-end justify-center pb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            </div>
          </div>
        </div>

        {/* Right Console: Track Meta, Album Sleeve, Timeline, Analog Controls */}
        <div className="flex-1 w-full flex flex-col justify-between space-y-3.5">
          <div className="flex items-start gap-3.5">
            {song.coverUrl && (
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-700 shadow-lg shrink-0 relative group">
                <img
                  src={song.coverUrl}
                  alt={song.album}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-neutral-400 mb-1">
                <span className="text-purple-600 dark:text-purple-400 font-semibold">Orijinal Albüm Kaydı</span>
                <span>{song.releaseYear}</span>
              </div>
              <h3 className="text-lg font-heading font-bold text-zinc-900 dark:text-white tracking-tight leading-snug truncate">
                {song.title}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-neutral-400 font-medium mt-0.5 truncate">
                {song.artist} · <span className="text-zinc-400 dark:text-neutral-500">{song.album}</span>
              </p>
            </div>
          </div>

          {/* Real-time Needle Drop Scrubber */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-neutral-400 tabular-nums">
              <span className="text-purple-600 dark:text-purple-300 font-semibold">{formatTime(progressSeconds)}</span>
              <span>{formatTime(dur)}</span>
            </div>
            <div className="relative h-2 bg-zinc-200 dark:bg-neutral-950 rounded-full overflow-hidden border border-zinc-300 dark:border-neutral-800/80">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Dynamic 4-Section BÖLÜMLER Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>BÖLÜMLER:</span>
            </span>
            {dynamicSections.map((sec) => (
              <button
                key={sec.second}
                type="button"
                onClick={() => onSeek?.(sec.second)}
                className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[10px] font-semibold shrink-0 cursor-pointer hover:bg-amber-500/25 transition"
              >
                {sec.emoji} {sec.label} ({formatTime(sec.second)})
              </button>
            ))}
          </div>

          {/* Analog Controls Strip */}
          <div className="pt-2 border-t border-zinc-200 dark:border-neutral-800/80 flex items-center justify-between">
            <button
              onClick={onTogglePlay}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition active:scale-95 shadow-md cursor-pointer ${
                isPlaying
                  ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white font-bold'
                  : 'bg-zinc-900 dark:bg-neutral-800 hover:opacity-90 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Durdur</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span>İğneyi Bırak & Çal</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-neutral-950 p-1 rounded-xl border border-zinc-200 dark:border-neutral-800 text-[11px]">
              <button
                onClick={() => setRpm('33')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  rpm === '33' ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-300 font-bold shadow' : 'text-zinc-500'
                }`}
              >
                33 RPM
              </button>
              <button
                onClick={() => setRpm('45')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  rpm === '45' ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-300 font-bold shadow' : 'text-zinc-500'
                }`}
              >
                45 RPM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized 8-Line Stage & Lyrics Stream */}
      <div className="p-3.5 rounded-2xl bg-[#ECEAF2]/80 dark:bg-[#1E1B2E]/75 border border-[#DFDCE8] dark:border-white/[0.06] max-h-40 overflow-y-auto no-scrollbar text-center space-y-2">
        {synchronizedLyrics.map((line, idx) => {
          const nextLine = synchronizedLyrics[idx + 1];
          const isActive =
            progressSeconds >= line.second &&
            (!nextLine || progressSeconds < nextLine.second);
          return (
            <div
              key={idx}
              onClick={() => onSeek?.(line.second)}
              className={`cursor-pointer transition-all duration-300 py-0.5 ${
                isActive
                  ? 'text-zinc-900 dark:text-white text-lg font-bold scale-[1.02]'
                  : 'text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};
