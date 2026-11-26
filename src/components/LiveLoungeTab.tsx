import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Search,
  Loader2,
  SkipBack,
  SkipForward,
  Send,
  Video,
  Disc3,
  Link2,
  RotateCcw,
  RotateCw,
  Headphones,
} from 'lucide-react';
import { Song, LoungeUser, PlatformType, PrivacyMode } from '../types';
import { TimelineTrack } from './TimelineTrack';
import { ytController } from '../services/youtubePlayerController';
import { soundEngine } from '../services/soundEngine';
import { triggerHaptic } from '../services/themeService';

interface VibeNote {
  id: string;
  userInitials: string;
  userName: string;
  avatarGradient: string;
  second: number;
  note: string;
  isMine?: boolean;
  userRef?: LoungeUser;
}

const VIBE_NOTES_STORAGE_KEY = 'listenhub_vibe_notes_by_song';

interface Props {
  currentSong: Song | null;
  mySecond: number;
  users: LoungeUser[];
  activePlatform: PlatformType;
  privacyMode: PrivacyMode;
  onChangePrivacyMode: (mode: PrivacyMode) => void;
  onChangePlatform: (p: PlatformType) => void;
  onSelectUser: (user: LoungeUser) => void;
  onDirectChat?: (user: LoungeUser) => void;
  onSeekSecond: (sec: number) => void;
  onOpenSongPicker: () => void;
  onOpenYouTubeConnect?: () => void;
  onToggleFriend?: (user: LoungeUser) => void;
  onOpenNowPlaying: () => void;
  onOpenRoomListeners?: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectSong: (song: Song) => void;
  onNextSong?: () => void;
  onPrevSong?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (song: Song) => void;
  onShowToast?: (msg: string) => void;
  allowExplicit?: boolean;
  autoRadioEnabled?: boolean;
  onToggleAutoRadio?: (val: boolean) => void;
  nextRadioSong?: Song | null;
  userCity?: string;
  onUpdateCity?: (city: string) => void;
  isAudioLoading?: boolean;
  candidateSongs?: Song[];
  onWhisperTrack?: (user: LoungeUser, track: Song, note?: string) => void;
  themeMode?: 'dark' | 'light';
}

export const LiveLoungeTab: React.FC<Props> = ({
  currentSong,
  mySecond,
  users,
  privacyMode,
  onChangePrivacyMode,
  onSelectUser,
  onDirectChat,
  onSeekSecond,
  onOpenSongPicker,
  onOpenYouTubeConnect,
  onToggleFriend,
  onOpenNowPlaying,
  onOpenRoomListeners,
  isPlaying,
  onTogglePlay,
  onNextSong,
  onPrevSong,
  onShowToast,
  autoRadioEnabled = true,
  onToggleAutoRadio,
  nextRadioSong,
  userCity,
  onUpdateCity,
  isAudioLoading = false,
  candidateSongs,
  onWhisperTrack,
  themeMode = 'dark',
}) => {
  // Memoize YouTube iframe URL ONLY by videoId so play/pause/seek NEVER reloads the iframe
  const ytIframeSrc = useMemo(() => {
    if (!currentSong?.youtubeVideoId) return '';
    const origin =
      typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
    const startSec = ytController.getPendingSeekSecond() ?? 0;
    const autoPlayFlag = ytController.getIsPlaying() ? '1' : '0';
    return `https://www.youtube.com/embed/${currentSong.youtubeVideoId}?autoplay=${autoPlayFlag}&start=${startSec}&enablejsapi=1&playsinline=1&origin=${origin}&widgetid=1`;
  }, [currentSong?.youtubeVideoId]);

  useEffect(() => {
    ytController.setActiveVideoId(currentSong?.youtubeVideoId || null);
  }, [currentSong?.youtubeVideoId]);

  // Per-song Saniye Anıları stored in localStorage (zero hardcoded Duman notes)
  const [vibeNotesBySong, setVibeNotesBySong] = useState<Record<string, VibeNote[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(VIBE_NOTES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return {};
  });

  const activeSongNotes: VibeNote[] = useMemo(() => {
    if (!currentSong?.id) return [];
    const raw = vibeNotesBySong[currentSong.id] || [];
    return raw.map((v) => {
      if (v.isMine || v.userRef) return v;
      const matched = users.find(
        (u) =>
          u.name.toLowerCase().includes(v.userName.toLowerCase()) ||
          v.userName.toLowerCase().includes(u.name.toLowerCase()) ||
          u.avatarSeed === v.userInitials
      );
      return matched ? { ...v, userRef: matched } : v;
    });
  }, [currentSong?.id, vibeNotesBySong, users]);

  const [customNoteText, setCustomNoteText] = useState('');
  const [showKlipMode, setShowKlipMode] = useState(false);

  // Mobile Touch Swipe to skip track
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeHint, setSwipeHint] = useState<'next' | 'prev' | null>(null);

  const displayUsers =
    privacyMode === 'friends_only'
      ? users.filter((u) => u.friendStatus === 'friends')
      : users;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleVibeRowSeek = (vibe: {
    id: string;
    userName: string;
    second: number;
  }) => {
    triggerHaptic(18);
    onSeekSecond(vibe.second);
    onShowToast?.(`${formatTime(vibe.second)} anına sarıldı (${vibe.userName})`);
  };

  const handleVibeUserOpen = (vibe: VibeNote) => {
    if (vibe.isMine) return;
    triggerHaptic(15);
    if (vibe.userRef) {
      onSelectUser(vibe.userRef);
      return;
    }
    const fallbackUser: LoungeUser = {
      id: `user-${vibe.id}`,
      name: vibe.userName,
      age: 24,
      city: userCity || 'İstanbul, Kadıköy',
      avatarSeed: vibe.userInitials,
      avatarGradient: vibe.avatarGradient,
      platform: 'youtube_music',
      currentSecond: vibe.second,
      statusBubble: vibe.note,
      topArtists: currentSong?.artist ? [currentSong.artist] : [],
      bio: 'Aynı şarkının aynı saniyesinde buluşan dinleyici.',
      trustScore: 98,
      lastHeartbeatAgoSeconds: 5,
      isOnline: true,
      distanceKm: 2.1,
      friendStatus: 'none',
      compatibilityScore: 94,
    };
    onSelectUser(fallbackUser);
  };

  const handleSendCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSong?.id) return;
    const trimmed = customNoteText.trim();
    if (!trimmed) return;

    triggerHaptic(22);
    const sec = Math.round(mySecond);
    const newVibe: VibeNote = {
      id: `vibe-${Date.now()}`,
      userInitials: 'SN',
      userName: 'Sen',
      avatarGradient: 'from-zinc-700 to-zinc-900',
      second: sec,
      note: trimmed,
      isMine: true,
    };

    setVibeNotesBySong((prev) => {
      const existing = prev[currentSong.id] || [];
      const nextMap = {
        ...prev,
        [currentSong.id]: [newVibe, ...existing],
      };
      try {
        localStorage.setItem(VIBE_NOTES_STORAGE_KEY, JSON.stringify(nextMap));
      } catch {
        // ignore storage errors
      }
      return nextMap;
    });
    setCustomNoteText('');
    onShowToast?.(`Notun ${formatTime(sec)} anına bırakıldı.`);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        triggerHaptic(20);
        setSwipeHint('next');
        setTimeout(() => setSwipeHint(null), 700);
        if (onNextSong) onNextSong();
      } else {
        triggerHaptic(20);
        setSwipeHint('prev');
        setTimeout(() => setSwipeHint(null), 700);
        if (onPrevSong) onPrevSong();
      }
    }
  };

  if (!currentSong) {
    return (
      <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 pb-8 max-w-xl lg:max-w-4xl mx-auto w-full relative select-none">
        <section
          aria-label="Sahnen Hazır"
          className="rounded-3xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_8px_32px_rgba(24,21,18,0.06)] dark:shadow-none p-7 sm:p-10 text-center flex flex-col items-center justify-center space-y-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#E87A3E]/15 border border-[#E87A3E]/25 flex items-center justify-center text-[#E87A3E]">
            <Disc3 className="w-8 h-8" strokeWidth={1.6} />
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[#181512] dark:text-[#FAF7F2] tracking-tight">
              Sahnen Hazır — İlk Parçanı Başlat
            </h2>
            <p className="text-xs sm:text-sm text-[#6B635B] dark:text-[#A39A91] leading-relaxed">
              Kendi kütüphanenden bir parça aç veya dilediğin şarkıyı arayıp canlı zaman rayında aynı saniyedeki dinleyicilerle buluş.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto pt-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                onOpenSongPicker();
              }}
              className="studio-btn-primary w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white shadow-lg shadow-amber-950/20 font-semibold text-xs sm:text-sm active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" strokeWidth={1.85} />
              <span>Şarkı Ara ve Başlat</span>
            </button>

            {onOpenYouTubeConnect && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  onOpenYouTubeConnect();
                }}
                className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl bg-[#F2EDE6] dark:bg-[#211D1A] hover:bg-[#EAE4DC] dark:hover:bg-[#FFF0E1]/10 border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] text-[#181512] dark:text-[#FAF7F2] font-semibold text-xs sm:text-sm active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer flex items-center justify-center gap-2"
              >
                <Link2 className="w-4 h-4 text-[#E87A3E]" strokeWidth={1.85} />
                <span>YouTube Music Kütüphaneni Bağla</span>
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 mt-3 sm:mt-4 pb-6 max-w-xl lg:max-w-6xl mx-auto w-full relative select-none">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
        {/* LEFT 7 COLUMNS (Desktop): Minimalist "Sahne" Player Card + Timeline / Map */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
          {/* 1. MINIMALIST "SAHNE" OYNATICI KARTI */}
          <section
            aria-label="Şu Anda Çalan"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative rounded-2xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none p-4 overflow-hidden"
          >
            {/* Swipe Visual Feedback */}
            {swipeHint && (
              <div className="absolute inset-0 z-30 bg-[#0E0C0B]/75 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-semibold text-xs flex items-center gap-2">
                  {swipeHint === 'next' ? (
                    <>
                      <span>Sonraki Şarkı</span>
                      <SkipForward className="w-4 h-4" strokeWidth={1.75} />
                    </>
                  ) : (
                    <>
                      <SkipBack className="w-4 h-4" strokeWidth={1.75} />
                      <span>Önceki Şarkı</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Embedded YouTube Player (kept mounted for uninterrupted playback) */}
            {currentSong.youtubeVideoId && (
              <>
                <div
                  className={
                    showKlipMode
                      ? 'mb-2.5 rounded-xl overflow-hidden border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] aspect-video w-full bg-black relative block'
                      : 'fixed -bottom-48 -right-48 w-56 h-36 opacity-0 pointer-events-none z-[-10]'
                  }
                >
                  <iframe
                    ref={(el) => ytController.setIframe(el)}
                    src={ytIframeSrc}
                    onLoad={() => ytController.sendListeningHandshake()}
                    title="ListenHub YouTube Music Player"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Single-Tap Video Control Strip (100% Synced with soundEngine & YouTube IFrame) */}
                {showKlipMode && (() => {
                  const totalDur = Math.max(1, Math.round(currentSong.durationSeconds || 240));
                  const clampedSec = Math.min(totalDur, Math.max(0, Math.floor(mySecond)));
                  const progressPct = Math.min(100, Math.max(0, (clampedSec / totalDur) * 100));
                  const handleVideoSeek = (nextSec: number) => {
                    const target = Math.min(totalDur, Math.max(0, Math.floor(nextSec)));
                    soundEngine.primeSong(currentSong);
                    onSeekSecond(target);
                  };

                  return (
                    <div
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      className="mb-3.5 rounded-xl p-2.5 sm:p-3 bg-[#FAF8F4] dark:bg-[#211D1A] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] space-y-2.5"
                    >
                      {/* Draggable Progress Bar + Live Monospace Timestamp */}
                      <div className="flex items-center gap-2.5">
                        <input
                          type="range"
                          min={0}
                          max={totalDur}
                          step={1}
                          value={clampedSec}
                          onChange={(e) => handleVideoSeek(Number(e.target.value))}
                          aria-label="Video ilerleme çubuğu"
                          style={{
                            background: `linear-gradient(to right, #E87A3E 0%, #D97706 ${progressPct}%, ${
                              themeMode === 'light' ? '#E2D9CE' : 'rgba(255,240,225,0.14)'
                            } ${progressPct}%, ${
                              themeMode === 'light' ? '#E2D9CE' : 'rgba(255,240,225,0.14)'
                            } 100%)`,
                          }}
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[#E87A3E] focus:outline-none"
                        />
                        <span className="text-[11px] font-mono tabular-nums font-semibold text-[#6B635B] dark:text-[#A39A91] shrink-0">
                          {formatTime(clampedSec)} / {formatTime(totalDur)}
                        </span>
                      </div>

                      {/* Transport Controls: -10 sn · Play/Pause · +10 sn · Sese Dön */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(12);
                              handleVideoSeek(clampedSec - 10);
                            }}
                            className="h-9 px-2.5 rounded-xl bg-white dark:bg-[#171412] hover:bg-[#F2EDE6] dark:hover:bg-[#FFF0E1]/10 border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] text-[#181512] dark:text-[#FAF7F2] text-[11px] font-semibold active:scale-[0.96] transition cursor-pointer flex items-center gap-1"
                            title="10 saniye geri sar"
                            aria-label="10 saniye geri sar"
                          >
                            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.85} />
                            <span className="font-mono tabular-nums">-10 sn</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(18);
                              onTogglePlay();
                            }}
                            className="studio-btn-primary h-9 px-3.5 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white shadow-md shadow-amber-950/20 text-xs font-semibold active:scale-[0.96] transition cursor-pointer flex items-center gap-1.5"
                            title={isPlaying ? 'Videoyu duraklat' : 'Videoyu oynat'}
                            aria-label={isPlaying ? 'Videoyu duraklat' : 'Videoyu oynat'}
                          >
                            {isAudioLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                            ) : isPlaying ? (
                              <Pause className="w-4 h-4 fill-current" strokeWidth={1.85} />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" strokeWidth={1.85} />
                            )}
                            <span>{isPlaying ? 'Duraklat' : 'Oynat'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(12);
                              handleVideoSeek(clampedSec + 10);
                            }}
                            className="h-9 px-2.5 rounded-xl bg-white dark:bg-[#171412] hover:bg-[#F2EDE6] dark:hover:bg-[#FFF0E1]/10 border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] text-[#181512] dark:text-[#FAF7F2] text-[11px] font-semibold active:scale-[0.96] transition cursor-pointer flex items-center gap-1"
                            title="10 saniye ileri sar"
                            aria-label="10 saniye ileri sar"
                          >
                            <RotateCw className="w-3.5 h-3.5" strokeWidth={1.85} />
                            <span className="font-mono tabular-nums">+10 sn</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(12);
                            setShowKlipMode(false);
                          }}
                          className="h-9 px-3 rounded-xl bg-white dark:bg-[#171412] hover:bg-[#F2EDE6] dark:hover:bg-[#FFF0E1]/10 border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] text-[11px] font-semibold active:scale-[0.96] transition cursor-pointer flex items-center gap-1.5 shrink-0"
                          title="Sadece ses moduna dön"
                          aria-label="Sadece ses moduna dön"
                        >
                          <Headphones className="w-3.5 h-3.5 text-[#E87A3E]" strokeWidth={1.85} />
                          <span>Sese Dön</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Ultra-Minimalist Row: Pure Cover (Left) · Title/Artist (Center) · Search + Play/Pause (Right) */}
            <div className="flex items-center justify-between gap-3.5">
              {/* Left: Pure Cover Art — ZERO badges, click opens NowPlaying */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  onOpenNowPlaying();
                }}
                className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer active:scale-[0.96] transition-transform duration-100 ease-out bg-[#211D1A] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08]"
                title="Tam ekran oynatıcıyı aç"
                aria-label={`${currentSong.title} tam ekran oynatıcıyı aç`}
              >
                {currentSong.coverUrl ? (
                  <img
                    src={currentSong.coverUrl}
                    alt={currentSong.album}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-tr ${currentSong.coverGradient}`}
                  />
                )}
              </button>

              {/* Center: Crisp Song Title + Calm Artist Subtitle */}
              <div
                onClick={onOpenNowPlaying}
                className="min-w-0 flex-1 cursor-pointer group/title active:scale-[0.98] transition-transform duration-100 ease-out"
              >
                <h2 className="text-base font-bold text-[#181512] dark:text-[#FAF7F2] truncate leading-snug tracking-tight group-hover/title:opacity-75 transition-opacity">
                  {currentSong.title}
                </h2>
                <p className="text-sm text-[#6B635B] dark:text-[#A39A91] truncate mt-0.5">
                  {currentSong.artist}
                </p>
              </div>

              {/* Right: Clean Search Button + Circular Copper-Amber Play/Pause */}
              <div className="flex items-center gap-2 shrink-0">
                {currentSong.youtubeVideoId && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setShowKlipMode((prev) => !prev);
                    }}
                    className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                      showKlipMode
                        ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] border-[#E87A3E]/30'
                        : 'bg-[#F2EDE6] dark:bg-[#211D1A] border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2]'
                    }`}
                    title={showKlipMode ? 'Klip görünümünü kapat' : 'Video klip görünümü'}
                    aria-label={showKlipMode ? 'Klip görünümünü kapat' : 'Video klip görünümü'}
                  >
                    <Video className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    onOpenSongPicker();
                  }}
                  className="w-10 h-10 rounded-full bg-[#F2EDE6] dark:bg-[#211D1A] hover:bg-[#E8E0D5] dark:hover:bg-[#FFF0E1]/10 border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] text-[#181512] dark:text-[#FAF7F2] flex items-center justify-center active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer"
                  title="Şarkı ara veya değiştir"
                  aria-label="Şarkı ara veya değiştir"
                >
                  <Search className="w-4 h-4" strokeWidth={1.75} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    onTogglePlay();
                  }}
                  className="studio-btn-primary w-12 h-12 rounded-full bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white flex items-center justify-center active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer shadow-lg shadow-amber-950/20"
                  title={isPlaying ? 'Duraklat' : 'Oynat'}
                  aria-label={isPlaying ? 'Şarkıyı duraklat' : 'Şarkıyı oynat'}
                >
                  {isAudioLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.75} />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" strokeWidth={1.75} />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* 2. SINGLE-FOCUSED TIMELINE TRACK */}
          <section aria-label="Şarkı Zaman Rayı">
            <TimelineTrack
              song={currentSong}
              mySecond={mySecond}
              users={displayUsers}
              privacyMode={privacyMode}
              onSelectUser={onSelectUser}
              onDirectChat={onDirectChat}
              onSeekSecond={onSeekSecond}
              onToggleFriend={onToggleFriend}
              onChangePrivacyMode={onChangePrivacyMode}
              candidateSongs={candidateSongs}
              onWhisperTrack={onWhisperTrack}
              onShowToast={onShowToast}
              onOpenRoomListeners={onOpenRoomListeners}
            />
          </section>
        </div>

        {/* RIGHT 5 COLUMNS (Desktop): Unified "Saniye Anıları" Card */}
        <aside className="lg:col-span-5 flex flex-col gap-4 min-w-0 lg:sticky lg:top-6">
          {/* 3. SAKİN "SANİYE ANILARI" BÖLÜMÜ (Dinamik, yalnızca çalan parçaya özel) */}
          <section
            aria-label="Saniye Anıları"
            className="rounded-2xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none p-4 sm:p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#181512] dark:text-[#FAF7F2] tracking-tight">
                Saniye Anıları
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-[#6B635B] dark:text-[#A39A91]">
                {activeSongNotes.length} anı
              </span>
            </div>

            {activeSongNotes.length === 0 ? (
              <div className="py-4 px-3 rounded-xl bg-[#FAF8F4] dark:bg-[#211D1A]/70 border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.06] text-center">
                <p className="text-xs text-[#6B635B] dark:text-[#A39A91]">
                  Bu parçada ilk saniye anısını sen bırak
                </p>
              </div>
            ) : (
              /* Clean Editorial Quote Rows (Comment left, clickable mono timestamp right) */
              <div className="divide-y divide-[#EAE4DC] dark:divide-[#FFF0E1]/[0.06]">
                {activeSongNotes.slice(0, 5).map((vibe) => {
                  const isNearCurrent = Math.abs(mySecond - vibe.second) <= 5;
                  return (
                    <div
                      key={vibe.id}
                      className={`py-2.5 first:pt-0.5 last:pb-0.5 flex items-start justify-between gap-3 transition-colors ${
                        isNearCurrent ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                      }`}
                    >
                      <div
                        onClick={() => handleVibeUserOpen(vibe)}
                        className={`min-w-0 flex-1 space-y-0.5 ${
                          vibe.isMine ? '' : 'cursor-pointer group/vibe'
                        }`}
                      >
                        <p className="text-xs sm:text-[13px] text-[#181512] dark:text-[#FAF7F2] leading-relaxed">
                          "{vibe.note}"
                        </p>
                        <span className="text-[11px] text-[#6B635B] dark:text-[#A39A91] group-hover/vibe:text-[#181512] dark:group-hover/vibe:text-[#FAF7F2] transition-colors block truncate">
                          {vibe.userName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleVibeRowSeek(vibe)}
                        className={`px-2.5 py-1 rounded-lg font-mono tabular-nums text-[11px] font-semibold shrink-0 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                          isNearCurrent
                            ? 'bg-[#16A34A]/15 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E] border border-[#16A34A]/30 dark:border-[#22C55E]/30'
                            : 'bg-[#F2EDE6] dark:bg-[#211D1A] text-[#181512] dark:text-[#FAF7F2] hover:bg-[#E8E0D5] dark:hover:bg-[#FFF0E1]/10 border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08]'
                        }`}
                        title={`${formatTime(vibe.second)} anına sar`}
                      >
                        {formatTime(vibe.second)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Single-line Calm Note Input */}
            <form
              onSubmit={handleSendCustomNote}
              className="pt-2 border-t border-[#EAE4DC] dark:border-[#FFF0E1]/[0.06] flex items-center gap-2"
            >
              <input
                type="text"
                value={customNoteText}
                onChange={(e) => setCustomNoteText(e.target.value)}
                placeholder={`${formatTime(mySecond)} anına kısa bir not bırak...`}
                maxLength={100}
                className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] focus:border-[#E87A3E]/60 text-xs text-[#181512] dark:text-[#FAF7F2] placeholder:text-[#6B635B] dark:placeholder:text-[#A39A91] focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={!customNoteText.trim()}
                className="studio-btn-primary w-10 h-10 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white flex items-center justify-center shrink-0 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer shadow-lg shadow-amber-950/20 disabled:opacity-35 disabled:cursor-not-allowed"
                title="Not bırak"
                aria-label="Not bırak"
              >
                <Send className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </form>
            {/* Quiet Single-Line Continuous Radio Footer */}
            <div className="pt-2.5 border-t border-[#EAE4DC] dark:border-[#FFF0E1]/[0.06] flex items-center justify-between gap-2 text-xs">
              <span className="text-[#6B635B] dark:text-[#A39A91] truncate">
                {nextRadioSong ? `Sıradaki: ${nextRadioSong.title}` : 'Sürekli Akış'}
              </span>
              <button
                type="button"
                onClick={() => onToggleAutoRadio?.(!autoRadioEnabled)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer shrink-0 border ${
                  autoRadioEnabled
                    ? 'bg-[#16A34A]/10 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E] border-[#16A34A]/25 dark:border-[#22C55E]/25'
                    : 'bg-[#F2EDE6] dark:bg-[#211D1A] text-[#6B635B] dark:text-[#A39A91] border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08]'
                }`}
              >
                {autoRadioEnabled ? 'Radyo Açık' : 'Radyo Kapalı'}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
