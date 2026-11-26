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
  X,
  Music,
} from 'lucide-react';
import { Song, LoungeUser, PlatformType, PrivacyMode, ActiveCoListenSession } from '../types';
import { SAMPLE_SONGS, INITIAL_LOUNGE_USERS } from '../data/mockData';
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
  activeCoListen?: ActiveCoListenSession | null;
  onStartCoListen?: (user: LoungeUser, track?: Song, second?: number) => void;
  onSuggestCoListenSong?: () => void;
  onLeaveCoListen?: () => void;
  nearbyFrequencyUsers?: LoungeUser[];
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
  onSelectSong,
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
  activeCoListen = null,
  onStartCoListen,
  onSuggestCoListenSong,
  onLeaveCoListen,
  nearbyFrequencyUsers,
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

  // Cold-start protection: 3 nearby-frequency listeners matched to current genre/artist ONLY when room has 0 exact listeners
  const nearFrequencySuggestions = useMemo(() => {
    if (displayUsers.length > 0 || !currentSong) return [];
    const pool =
      nearbyFrequencyUsers && nearbyFrequencyUsers.length > 0
        ? nearbyFrequencyUsers
        : INITIAL_LOUNGE_USERS;

    const songGenreLower = (currentSong.genre || '').toLowerCase();
    const songArtistLower = (currentSong.artist || '').toLowerCase();

    const scored = pool.map((u, idx) => {
      const artistsLower = (u.topArtists || []).map((a) => a.toLowerCase());
      const hasArtistHit = artistsLower.some(
        (a) => songArtistLower.includes(a) || a.includes(songArtistLower)
      );
      const roomSong =
        SAMPLE_SONGS.find(
          (s) =>
            artistsLower.some((a) => s.artist.toLowerCase().includes(a)) ||
            (songGenreLower && s.genre.toLowerCase().includes(songGenreLower.split('/')[0].trim()))
        ) || SAMPLE_SONGS[idx % SAMPLE_SONGS.length];

      const hasGenreHit = Boolean(
        songGenreLower &&
          roomSong.genre.toLowerCase().includes(songGenreLower.split('/')[0].trim())
      );

      const compat = Math.min(
        96,
        Math.max(88, u.compatibilityScore || (hasArtistHit ? 95 : hasGenreHit ? 92 : 90))
      );
      const rank = (hasArtistHit ? 100 : 0) + (hasGenreHit ? 40 : 0) + compat;

      return { user: u, roomSong, compat, rank };
    });

    return scored
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 3);
  }, [displayUsers.length, currentSong, nearbyFrequencyUsers]);

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
          className="rounded-3xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] shadow-[0_8px_32px_rgba(24,21,18,0.06)] dark:shadow-none p-7 sm:p-10 text-center flex flex-col items-center justify-center space-y-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#111113]/[0.08] dark:bg-white/[0.10] border border-[#111113]/15 dark:border-white/15 flex items-center justify-center text-[#111113] dark:text-[#F5F5F7]">
            <Disc3 className="w-8 h-8" strokeWidth={1.6} />
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5F7] tracking-tight">
              Sahnen Hazır — İlk Parçanı Başlat
            </h2>
            <p className="text-xs sm:text-sm text-[#63636B] dark:text-[#8E8E98] leading-relaxed">
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
              className="studio-btn-primary w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] shadow-sm font-semibold text-xs sm:text-sm active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer flex items-center justify-center gap-2"
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
                className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E6E4DF] dark:hover:bg-white/10 border border-[#E2DFD9] dark:border-white/[0.08] text-[#111113] dark:text-[#F5F5F7] font-semibold text-xs sm:text-sm active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer flex items-center justify-center gap-2"
              >
                <Link2 className="w-4 h-4 text-[#111113] dark:text-[#F5F5F7]" strokeWidth={1.85} />
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
      {/* Sleek Single-Line Active Co-Listen Session Bar */}
      {activeCoListen && (
        <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.10] shadow-[0_2px_12px_rgba(17,17,19,0.04)] dark:shadow-none flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#22C55E] shrink-0" />
            <span className="text-xs sm:text-[13px] font-semibold text-[#111113] dark:text-[#F5F5F7] truncate">
              {activeCoListen.partnerName} ile birlikte dinliyorsun
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onSuggestCoListenSong && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  onSuggestCoListenSong();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E6E4DF] dark:hover:bg-white/10 border border-[#E2DFD9] dark:border-white/[0.08] text-xs font-semibold text-[#111113] dark:text-[#F5F5F7] flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Music className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Şarkı Öner</span>
              </button>
            )}
            {onLeaveCoListen && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  onLeaveCoListen();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 border border-[#E2DFD9] dark:border-white/[0.08] text-xs font-semibold text-[#63636B] dark:text-[#8E8E98] flex items-center gap-1 transition active:scale-95 cursor-pointer"
                title="Birlikte dinleme oturumundan ayrıl"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.85} />
                <span>Ayrıl</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
        {/* LEFT 7 COLUMNS (Desktop): Minimalist "Sahne" Player Card + Timeline / Map */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
          {/* 1. MINIMALIST "SAHNE" OYNATICI KARTI */}
          <section
            aria-label="Şu Anda Çalan"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none p-4 overflow-hidden"
          >
            {/* Swipe Visual Feedback */}
            {swipeHint && (
              <div className="absolute inset-0 z-30 bg-[#0B0B0D]/75 backdrop-blur-sm flex items-center justify-center pointer-events-none">
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
                      ? 'mb-2.5 rounded-xl overflow-hidden border border-[#E6E4DF] dark:border-white/[0.08] aspect-video w-full bg-black relative block'
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
                      className="mb-3.5 rounded-xl p-2.5 sm:p-3 bg-[#FAF9F6] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08] space-y-2.5"
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
                            background: `linear-gradient(to right, ${
                              themeMode === 'light' ? '#111113' : '#FFFFFF'
                            } 0%, ${
                              themeMode === 'light' ? '#111113' : '#FFFFFF'
                            } ${progressPct}%, ${
                              themeMode === 'light' ? '#E2DFD9' : 'rgba(255,255,255,0.16)'
                            } ${progressPct}%, ${
                              themeMode === 'light' ? '#E2DFD9' : 'rgba(255,255,255,0.16)'
                            } 100%)`,
                          }}
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[#111113] dark:accent-white focus:outline-none"
                        />
                        <span className="text-xs tabular-nums font-semibold text-[#63636B] dark:text-[#8E8E98] shrink-0">
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
                            className="h-9 px-2.5 rounded-xl bg-white dark:bg-[#141418] hover:bg-[#F1EFEA] dark:hover:bg-white/10 border border-[#E6E4DF] dark:border-white/[0.08] text-[#111113] dark:text-[#F5F5F7] text-xs font-semibold active:scale-[0.96] transition cursor-pointer flex items-center gap-1"
                            title="10 saniye geri sar"
                            aria-label="10 saniye geri sar"
                          >
                            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.85} />
                            <span className="tabular-nums">-10 sn</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(18);
                              onTogglePlay();
                            }}
                            className="studio-btn-primary h-9 px-3.5 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] shadow-sm text-xs font-semibold active:scale-[0.96] transition cursor-pointer flex items-center gap-1.5"
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
                            className="h-9 px-2.5 rounded-xl bg-white dark:bg-[#141418] hover:bg-[#F1EFEA] dark:hover:bg-white/10 border border-[#E6E4DF] dark:border-white/[0.08] text-[#111113] dark:text-[#F5F5F7] text-xs font-semibold active:scale-[0.96] transition cursor-pointer flex items-center gap-1"
                            title="10 saniye ileri sar"
                            aria-label="10 saniye ileri sar"
                          >
                            <RotateCw className="w-3.5 h-3.5" strokeWidth={1.85} />
                            <span className="tabular-nums">+10 sn</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(12);
                            setShowKlipMode(false);
                          }}
                          className="h-9 px-3 rounded-xl bg-white dark:bg-[#141418] hover:bg-[#F1EFEA] dark:hover:bg-white/10 border border-[#E6E4DF] dark:border-white/[0.08] text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] text-xs font-semibold active:scale-[0.96] transition cursor-pointer flex items-center gap-1.5 shrink-0"
                          title="Sadece ses moduna dön"
                          aria-label="Sadece ses moduna dön"
                        >
                          <Headphones className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" strokeWidth={1.85} />
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
                className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer active:scale-[0.96] transition-transform duration-100 ease-out bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08]"
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
                <h2 className="text-sm sm:text-base font-semibold text-[#F5F5F7] truncate leading-snug tracking-tight group-hover/title:opacity-75 transition-opacity">
                  {currentSong.title}
                </h2>
                <p className="text-sm text-[#63636B] dark:text-[#8E8E98] truncate mt-0.5">
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
                        ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] border-[#111113]/20 dark:border-white/20'
                        : 'bg-[#F1EFEA] dark:bg-[#1C1C22] border-[#E2DFD9] dark:border-white/[0.08] text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
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
                  className="w-10 h-10 rounded-full bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E5E2DC] dark:hover:bg-white/10 border border-[#E2DFD9] dark:border-white/[0.08] text-[#111113] dark:text-[#F5F5F7] flex items-center justify-center active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer"
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
                  className="studio-btn-primary w-12 h-12 rounded-full bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] flex items-center justify-center active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer shadow-sm"
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
          <section aria-label="Şarkı Zaman Rayı" className="space-y-4">
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
              onStartCoListen={onStartCoListen ? (u) => onStartCoListen(u, currentSong, u.currentSecond) : undefined}
            />

            {/* Cold-Start Protection: Shown ONLY when 0 listeners are on this exact rare song */}
            {displayUsers.length === 0 && nearFrequencySuggestions.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(17,17,19,0.04)] dark:shadow-none p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#22C55E] shrink-0" />
                    <h3 className="text-sm font-bold text-[#111113] dark:text-[#F5F5F7] tracking-tight truncate">
                      Yakın Frekansta Şu An Dinleyenler
                    </h3>
                  </div>
                  <span className="text-xs text-[#63636B] dark:text-[#8E8E98] shrink-0">
                    {currentSong.genre || 'Benzer Tür'}
                  </span>
                </div>

                <div className="space-y-2">
                  {nearFrequencySuggestions.map(({ user, roomSong, compat }) => (
                    <div
                      key={`near-${user.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#1C1C22]/60 border border-white/[0.05]"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectUser(user)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <div className="relative shrink-0">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-9 h-9 rounded-full object-cover ring-[1.5px] ring-emerald-500/80 ring-offset-2 ring-offset-[#1C1C22]"
                            />
                          ) : (
                            <div
                              className={`avatar-circle w-9 h-9 rounded-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white text-xs font-bold ring-[1.5px] ring-emerald-500/80 ring-offset-2 ring-offset-[#1C1C22]`}
                            >
                              {user.avatarSeed}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-semibold text-[#F5F5F7] truncate">
                              {user.name}
                            </span>
                            <span className="text-xs tabular-nums font-semibold text-[#22C55E] shrink-0">
                              %{compat} Yakın Frekans
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 truncate">
                            {roomSong.artist} · {roomSong.title}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(18);
                          if (onStartCoListen) {
                            onStartCoListen(user, roomSong, user.currentSecond);
                          } else {
                            onSelectSong(roomSong);
                          }
                        }}
                        className="studio-btn-primary h-8 px-3 rounded-lg bg-white hover:bg-zinc-200 text-[#0B0B0D] text-xs font-semibold transition active:scale-95 cursor-pointer shrink-0"
                      >
                        Odasına Katıl
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT 5 COLUMNS (Desktop): Unified "Saniye Anıları" Card */}
        <aside className="lg:col-span-5 flex flex-col gap-4 min-w-0 lg:sticky lg:top-6">
          {/* 3. SAKİN "SANİYE ANILARI" BÖLÜMÜ (Dinamik, yalnızca çalan parçaya özel) */}
          <section
            aria-label="Saniye Anıları"
            className="rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none p-4 sm:p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#111113] dark:text-[#F5F5F7] tracking-tight">
                Saniye Anıları
              </h3>
              <span className="text-xs tabular-nums text-[#63636B] dark:text-[#8E8E98]">
                {activeSongNotes.length} anı
              </span>
            </div>

            {activeSongNotes.length === 0 ? (
              <div className="py-4 px-3 rounded-xl bg-[#FAF9F6] dark:bg-[#1C1C22]/70 border border-[#E6E4DF] dark:border-white/[0.06] text-center">
                <p className="text-xs text-[#63636B] dark:text-[#8E8E98]">
                  Bu parçada ilk saniye anısını sen bırak
                </p>
              </div>
            ) : (
              /* Clean Editorial Quote Rows (Comment left, clickable mono timestamp right) */
              <div className="divide-y divide-[#E6E4DF] dark:divide-white/[0.06]">
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
                        <p className="text-xs sm:text-[13px] text-[#111113] dark:text-[#F5F5F7] leading-relaxed">
                          "{vibe.note}"
                        </p>
                        <span className="text-xs text-[#63636B] dark:text-[#8E8E98] group-hover/vibe:text-[#111113] dark:group-hover/vibe:text-[#F5F5F7] transition-colors block truncate">
                          {vibe.userName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleVibeRowSeek(vibe)}
                        className={`px-2.5 py-1 rounded-lg tabular-nums text-xs font-semibold shrink-0 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                          isNearCurrent
                            ? 'bg-[#16A34A]/15 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E] border border-[#16A34A]/30 dark:border-[#22C55E]/30'
                            : 'bg-[#F1EFEA] dark:bg-[#1C1C22] text-[#111113] dark:text-[#F5F5F7] hover:bg-[#E5E2DC] dark:hover:bg-white/10 border border-[#E2DFD9] dark:border-white/[0.08]'
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
              className="pt-2 border-t border-[#E6E4DF] dark:border-white/[0.06] flex items-center gap-2"
            >
              <input
                type="text"
                value={customNoteText}
                onChange={(e) => setCustomNoteText(e.target.value)}
                placeholder={`${formatTime(mySecond)} anına kısa bir not bırak...`}
                maxLength={100}
                className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E2DFD9] dark:border-white/[0.08] focus:border-[#111113]/40 dark:focus:border-white/30 text-xs text-[#111113] dark:text-[#F5F5F7] placeholder:text-[#63636B] dark:placeholder:text-[#8E8E98] focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={!customNoteText.trim()}
                className="studio-btn-primary w-10 h-10 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] flex items-center justify-center shrink-0 active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer shadow-sm disabled:opacity-35 disabled:cursor-not-allowed"
                title="Not bırak"
                aria-label="Not bırak"
              >
                <Send className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </form>
            {/* Quiet Single-Line Continuous Radio Footer */}
            <div className="pt-2.5 border-t border-[#E6E4DF] dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs">
              <span className="text-[#63636B] dark:text-[#8E8E98] truncate">
                {nextRadioSong ? `Sıradaki: ${nextRadioSong.title}` : 'Sürekli Akış'}
              </span>
              <button
                type="button"
                onClick={() => onToggleAutoRadio?.(!autoRadioEnabled)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer shrink-0 border ${
                  autoRadioEnabled
                    ? 'bg-[#16A34A]/10 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E] border-[#16A34A]/25 dark:border-[#22C55E]/25'
                    : 'bg-[#F1EFEA] dark:bg-[#1C1C22] text-[#63636B] dark:text-[#8E8E98] border-[#E2DFD9] dark:border-white/[0.08]'
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
