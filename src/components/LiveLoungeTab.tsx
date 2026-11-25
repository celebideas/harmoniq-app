import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Users,
  ChevronUp,
  Search,
  Loader2,
  X,
  Youtube,
  Radio,
  ExternalLink,
  MapPin,
  Clock,
  Compass,
  Filter,
  Heart,
  SkipBack,
  SkipForward,
  Sparkles,
  Zap,
  Flame,
  MessageCircle,
  Send,
} from 'lucide-react';
import { Song, LoungeUser, PlatformType, PrivacyMode } from '../types';
import { TimelineTrack } from './TimelineTrack';
import { ProximityDensityMap, DistanceFilter } from './ProximityDensityMap';
import { ytController } from '../services/youtubePlayerController';
import { triggerHaptic } from '../services/themeService';

interface Props {
  currentSong: Song;
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
  onToggleFriend,
  onOpenNowPlaying,
  onOpenRoomListeners,
  isPlaying,
  onTogglePlay,
  onSelectSong,
  onNextSong,
  onPrevSong,
  isFavorite = false,
  onToggleFavorite,
  onShowToast,
  allowExplicit = true,
  autoRadioEnabled = true,
  onToggleAutoRadio,
  nextRadioSong,
  userCity,
  onUpdateCity,
  isAudioLoading = false,
  candidateSongs,
  onWhisperTrack,
}) => {
  const [myStatus, setMyStatus] = useState('01:42 gitar solosu efsane');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [tempStatus, setTempStatus] = useState('');

  // Live Vibe Stream & Anı Yakala Barı State
  const [vibeNotes, setVibeNotes] = useState<Array<{
    id: string;
    userInitials: string;
    userName: string;
    avatarGradient: string;
    second: number;
    note: string;
    likes: number;
    isMine?: boolean;
    userRef?: LoungeUser;
  }>>([
    {
      id: 'vibe-1',
      userInitials: 'DK',
      userName: 'Defne Kaya',
      avatarGradient: 'from-purple-500 to-indigo-600',
      second: 102, // 01:42
      note: 'Gitar solosu tüyleri diken diken etti 🎸',
      likes: 19,
    },
    {
      id: 'vibe-2',
      userInitials: 'ET',
      userName: 'Emir Timur',
      avatarGradient: 'from-amber-500 to-orange-600',
      second: 135, // 02:15
      note: 'Gece sürüşü için kusursuz 🌙',
      likes: 14,
    },
    {
      id: 'vibe-3',
      userInitials: 'SY',
      userName: 'Selin Yılmaz',
      avatarGradient: 'from-pink-500 to-rose-600',
      second: 28, // 00:28
      note: 'Giriş melodisi ilk saniyeden yakalıyor ⚡',
      likes: 27,
    },
    {
      id: 'vibe-4',
      userInitials: 'BA',
      userName: 'Barış Alper',
      avatarGradient: 'from-emerald-500 to-teal-600',
      second: 54, // 00:54
      note: 'Bas yürüyüşü inanılmaz temiz 🎧',
      likes: 11,
    },
    {
      id: 'vibe-5',
      userInitials: 'MK',
      userName: 'Melis Kurt',
      avatarGradient: 'from-cyan-500 to-blue-600',
      second: 85, // 01:25
      note: 'Nakarat başladığı an ciğerimi bıraktım 🔥',
      likes: 33,
    },
  ]);

  const [floatingReactions, setFloatingReactions] = useState<Array<{
    id: string;
    text: string;
    second: number;
  }>>([]);
  const [isWritingNote, setIsWritingNote] = useState(false);
  const [customNoteText, setCustomNoteText] = useState('');

  // Sync users with vibeNotes
  useEffect(() => {
    if (users.length > 0) {
      setVibeNotes((prev) =>
        prev.map((v) => {
          const matched = users.find(
            (u) =>
              u.name.toLowerCase().includes(v.userName.toLowerCase()) ||
              v.userName.toLowerCase().includes(u.name.toLowerCase()) ||
              u.avatarSeed === v.userInitials
          );
          return matched ? { ...v, userRef: matched } : v;
        })
      );
    }
  }, [users]);

  // Mobile Touch Gestures State (Swipe to skip, Double-tap to heart)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeHint, setSwipeHint] = useState<'next' | 'prev' | null>(null);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const lastTapRef = useRef<number>(0);

  // Proximity & Density Map Filter State
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('all');
  const [loungeViewMode, setLoungeViewMode] = useState<'timeline' | 'map'>('timeline');

  // Video / Klip Mode Toggle in Song Console
  const [showKlipMode, setShowKlipMode] = useState(false);

  const displayUsers =
    privacyMode === 'friends_only'
      ? users.filter((u) => u.friendStatus === 'friends')
      : users;

  const distanceFilteredUsers = displayUsers.filter((u) => {
    if (distanceFilter === '1km') return u.distanceKm <= 1.0;
    if (distanceFilter === '5km') return u.distanceKm <= 5.0;
    if (distanceFilter === 'city') return u.distanceKm <= 15.0;
    return true;
  });

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempStatus.trim()) {
      setMyStatus(tempStatus.trim());
    }
    setIsEditingStatus(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, (mySecond / (currentSong.durationSeconds || 1)) * 100);

  // Live Vibe Stream Handlers
  const handleVibeCardClick = (vibe: {
    id: string;
    userInitials: string;
    userName: string;
    avatarGradient: string;
    second: number;
    note: string;
    likes: number;
    isMine?: boolean;
    userRef?: LoungeUser;
  }) => {
    triggerHaptic(20);
    onSeekSecond(vibe.second);
    onShowToast?.(`🎵 ${formatTime(vibe.second)} anına sarıldı (${vibe.userName})`);
    if (vibe.userRef) {
      onSelectUser(vibe.userRef);
    } else if (!vibe.isMine) {
      const mockUser: LoungeUser = {
        id: `user-${vibe.id}`,
        name: vibe.userName,
        age: 24,
        city: userCity || 'İzmir',
        avatarSeed: vibe.userInitials,
        avatarGradient: vibe.avatarGradient,
        platform: 'youtube_music',
        currentSecond: vibe.second,
        statusBubble: vibe.note,
        topArtists: [currentSong.artist, 'Duman', 'Mor ve Ötesi'],
        bio: 'Müzik frekansında anı yakalayan dinleyici.',
        trustScore: 98,
        lastHeartbeatAgoSeconds: 5,
        isOnline: true,
        distanceKm: 2.1,
        friendStatus: 'none',
        compatibilityScore: 94,
      };
      onSelectUser(mockUser);
    }
  };

  const handleToggleVibeLike = (e: React.MouseEvent, vibeId: string) => {
    e.stopPropagation();
    triggerHaptic(15);
    setVibeNotes((prev) =>
      prev.map((v) => (v.id === vibeId ? { ...v, likes: v.likes + 1 } : v))
    );
  };

  const triggerQuickReaction = (reactionText: string) => {
    triggerHaptic(25);
    const sec = Math.round(mySecond);
    const floatId = `float-${Date.now()}-${Math.random()}`;

    setFloatingReactions((prev) => [
      ...prev,
      { id: floatId, text: reactionText, second: sec },
    ]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== floatId));
    }, 1600);

    const newVibe = {
      id: `vibe-${Date.now()}`,
      userInitials: 'SEN',
      userName: 'Sen',
      avatarGradient: 'from-accent-theme to-amber-600',
      second: sec,
      note: reactionText,
      likes: 1,
      isMine: true,
    };

    setVibeNotes((prev) => [newVibe, ...prev]);
    onShowToast?.(`"${reactionText}" tepkisi ${formatTime(sec)} saniyesine fırlatıldı! 🚀`);
  };

  const handleSendCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customNoteText.trim();
    if (!trimmed) return;

    triggerHaptic(25);
    const sec = Math.round(mySecond);
    const floatId = `float-${Date.now()}-${Math.random()}`;

    setFloatingReactions((prev) => [
      ...prev,
      { id: floatId, text: `✍️ "${trimmed}"`, second: sec },
    ]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== floatId));
    }, 1600);

    const newVibe = {
      id: `vibe-${Date.now()}`,
      userInitials: 'SEN',
      userName: 'Sen',
      avatarGradient: 'from-accent-theme to-amber-600',
      second: sec,
      note: trimmed,
      likes: 1,
      isMine: true,
    };

    setVibeNotes((prev) => [newVibe, ...prev]);
    setCustomNoteText('');
    setIsWritingNote(false);
    onShowToast?.(`Notun ${formatTime(sec)} saniyesine eklendi! ✍️`);
  };

  // Swipe to skip track handlers
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
        // Swiped left -> Next song
        triggerHaptic(20);
        setSwipeHint('next');
        setTimeout(() => setSwipeHint(null), 800);
        if (onNextSong) {
          onNextSong();
        } else {
          onShowToast?.('Sonraki Şarkı');
        }
      } else {
        // Swiped right -> Previous song
        triggerHaptic(20);
        setSwipeHint('prev');
        setTimeout(() => setSwipeHint(null), 800);
        if (onPrevSong) {
          onPrevSong();
        } else {
          onShowToast?.('Önceki Şarkı');
        }
      }
    }
  };

  // Double tap to like on cover
  const handleCoverClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      // Double tap detected!
      triggerHaptic(30);
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 900);
      if (onToggleFavorite) {
        onToggleFavorite(currentSong);
        onShowToast?.(isFavorite ? `"${currentSong.title}" favorilerden çıkarıldı` : `"${currentSong.title}" favorilere eklendi! ❤️`);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap -> toggle play/pause after brief double-tap window
      setTimeout(() => {
        if (lastTapRef.current === now) {
          triggerHaptic(15);
          onTogglePlay();
        }
      }, 330);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-3.5 sm:px-6 py-3.5 sm:py-5 max-w-xl lg:max-w-6xl mx-auto w-full relative select-none">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
        {/* LEFT 7 COLUMNS (Desktop): Live Player Console + Timeline / Leaflet Map */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
      {/* =========================================================================
          1. KOMPAKT "CANLI FREKANS SAHNESİ" KARTI (FOCAL ANCHOR)
         ========================================================================= */}
      <section
        aria-label="Şu Anda Çalan"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#14121E]/90 border border-[#E4E2EC] dark:border-white/[0.08] p-3.5 sm:p-5 overflow-hidden shadow-xl"
      >
        {/* Dynamic Ambient Glow inside Console */}
        {currentSong.coverUrl && (
          <img
            src={currentSong.coverUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-15 dark:opacity-25 scale-125 pointer-events-none transition-all duration-700"
          />
        )}

        {/* Swipe Visual Feedback Overlay */}
        {swipeHint && (
          <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-150 pointer-events-none">
            <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold text-xs flex items-center gap-2">
              {swipeHint === 'next' ? (
                <>
                  <span>Sonraki Şarkıya Geçiliyor</span>
                  <SkipForward className="w-4 h-4 text-purple-400" />
                </>
              ) : (
                <>
                  <SkipBack className="w-4 h-4 text-purple-400" />
                  <span>Önceki Şarkıya Dönülüyor</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="relative z-10 space-y-3">
          {/* Top Bar of Console */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.08] text-[11px] font-medium text-zinc-700 dark:text-zinc-300 shrink-0">
                <Radio className="w-3 h-3 text-purple-500 shrink-0" />
                <span>{currentSong.youtubeVideoId ? 'YouTube Music' : 'Apple Music'}</span>
              </div>
              <button
                type="button"
                onClick={onOpenSongPicker}
                className="px-2.5 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-zinc-600 dark:text-zinc-300 text-[11px] font-medium transition cursor-pointer active:scale-95 border border-zinc-200 dark:border-white/[0.08]"
              >
                Şarkı Değiştir
              </button>
            </div>

            {currentSong.youtubeVideoId && (
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`https://music.youtube.com/watch?v=${currentSong.youtubeVideoId}&t=${Math.floor(mySecond)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-white/[0.05] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 text-[11px] font-medium flex items-center gap-1 transition"
                  title="YouTube Music'te Aç"
                >
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                  <span className="hidden xs:inline">Uygulamada Aç</span>
                </a>

                <div className="flex items-center p-0.5 rounded-lg bg-zinc-200/80 dark:bg-black/40 border border-zinc-300 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setShowKlipMode(false)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                      !showKlipMode ? 'bg-white text-zinc-950 font-semibold shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    Ses
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKlipMode(true)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
                      showKlipMode ? 'bg-white text-zinc-950 font-semibold shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Youtube className="w-3 h-3 text-red-500" />
                    <span>Klip</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Embedded YouTube Player (visible only when Klip mode is active) */}
          {currentSong.youtubeVideoId && (
            <div
              className={
                showKlipMode
                  ? 'rounded-xl overflow-hidden border border-white/[0.08] aspect-video w-full bg-black shadow-2xl relative block'
                  : 'fixed -bottom-48 -right-48 w-56 h-36 opacity-0 pointer-events-none z-[-10]'
              }
            >
              <iframe
                ref={(el) => ytController.setIframe(el)}
                src={`https://www.youtube.com/embed/${currentSong.youtubeVideoId}?autoplay=${isPlaying ? '1' : '0'}&enablejsapi=1&playsinline=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}&widgetid=1`}
                title="ListenHub YouTube Music Player"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Main Compact "Canlı Frekans Sahnesi" Row */}
          <div className="flex items-center justify-between gap-3.5">
            {/* Left: w-16 h-16 rounded-2xl object-cover shadow-md Album Cover */}
            <div
              onClick={handleCoverClick}
              className="cursor-pointer relative w-16 h-16 rounded-2xl overflow-hidden shadow-md shrink-0 transition-transform active:scale-95 group/cover bg-zinc-900"
              title="Çift dokun: Beğen ❤️ · Tek dokun: Çal/Durdur"
            >
              {currentSong.coverUrl ? (
                <img
                  src={currentSong.coverUrl}
                  alt={currentSong.album}
                  className="w-16 h-16 rounded-2xl object-cover shadow-md"
                />
              ) : (
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${currentSong.coverGradient} flex items-center justify-center text-white shadow-md`}
                />
              )}

              {/* Heart Pop Animation on Double Tap */}
              {showHeartPop && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in zoom-in-50 fade-in duration-200">
                  <Heart className="w-8 h-8 text-rose-500 fill-current drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
                </div>
              )}

              {/* Mini VU-meter when playing */}
              {isPlaying && !showHeartPop && (
                <div className="absolute bottom-1.5 left-1.5 flex items-end gap-0.5 px-1 py-0.5 rounded bg-black/60 backdrop-blur-sm pointer-events-none z-10">
                  <span className="w-0.5 h-2.5 bg-purple-400 rounded-full animate-vu-bar" />
                  <span className="w-0.5 h-3.5 bg-fuchsia-400 rounded-full animate-vu-bar" style={{ animationDelay: '150ms' }} />
                  <span className="w-0.5 h-2 bg-pink-400 rounded-full animate-vu-bar" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>

            {/* Center: Full Readable Song Title, Artist • Album, and Side-by-Side 2 Non-Truncated Badges */}
            <div
              onClick={onOpenNowPlaying}
              className="min-w-0 flex-1 cursor-pointer group/title"
            >
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white group-hover/title:text-purple-500 dark:group-hover/title:text-purple-400 transition-colors flex items-center gap-1 leading-snug">
                <span>{currentSong.title}</span>
                <ChevronUp className="w-3.5 h-3.5 text-zinc-400 group-hover/title:text-purple-400 shrink-0" />
              </h2>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {currentSong.artist} • {currentSong.album}
              </p>

              {/* Clean typographic metadata (genre & active listener count) */}
              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-medium">
                <span className="text-purple-600 dark:text-purple-300 truncate">
                  {(currentSong.genre || 'Türkçe Rock').split(/[·,\/]/)[0].trim() || 'Türkçe Rock'}
                </span>
                <span className="text-zinc-400 dark:text-zinc-600" aria-hidden="true">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums whitespace-nowrap">
                  {distanceFilteredUsers.length + 1} dinleyici rayda
                </span>
              </div>
            </div>

            {/* Right: Quick Song Picker + Play/Pause Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  onOpenSongPicker();
                }}
                className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.12] border border-[#E4E2EC] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Şarkı veya oda değiştir"
                aria-label="Şarkı ara veya değiştir"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  onTogglePlay();
                }}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 text-force-white shadow-lg flex items-center justify-center transition active:scale-95 cursor-pointer"
                title={isPlaying ? 'Duraklat' : 'Oynat'}
                aria-label={isPlaying ? 'Şarkıyı duraklat' : 'Şarkıyı oynat'}
              >
                {isAudioLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-force-white" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* Slim Electric Violet Progress Bar */}
          <div className="flex items-center gap-2.5 pt-0.5">
            <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums shrink-0">
              {formatTime(mySecond)} / {formatTime(currentSong.durationSeconds)}
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. LIVE PRESENCE, DISTANCE FILTER & VISUALIZATION LAYER
         ========================================================================= */}
      <section aria-label="Dinleyici Frekansı ve Mesafe Katmanı" className="space-y-3">
        {/* Tekil Kontrol Çubuğu (Görünüm Seçici + Mesafe Seçici) */}
        <div className="p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#14121E]/90 border border-[#E4E2EC] dark:border-white/[0.08] backdrop-blur-md space-y-2.5 shadow-sm">
          {/* Top Row: Görünüm Seçici: [⏱ Zaman Rayı | 📍 Radar Harita | 👥 Liste (X)] */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 dark:bg-black/40 border border-zinc-200/80 dark:border-white/[0.06] rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setLoungeViewMode('timeline')}
              className={`py-1.5 px-2 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                loungeViewMode === 'timeline'
                  ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white font-bold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>⏱ Zaman Rayı</span>
            </button>

            <button
              type="button"
              onClick={() => setLoungeViewMode('map')}
              className={`py-1.5 px-2 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                loungeViewMode === 'map'
                  ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white font-bold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>📍 Radar Harita</span>
            </button>

            <button
              type="button"
              onClick={onOpenRoomListeners}
              className="py-1.5 px-2 rounded-lg font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.06] transition cursor-pointer flex items-center justify-center gap-1"
              title="Tüm Dinleyici Listesi"
            >
              <span>👥 Liste ({distanceFilteredUsers.length + 1})</span>
            </button>
          </div>

          {/* Bottom Row: Mesafe Seçici: [1 km • Yürüme | 5 km • İlçe | Şehir • 15 km | Tümü] */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar whitespace-nowrap">
            {[
              { id: '1km' as DistanceFilter, label: '1 km • Yürüme', count: displayUsers.filter(u => u.distanceKm <= 1).length },
              { id: '5km' as DistanceFilter, label: '5 km • İlçe', count: displayUsers.filter(u => u.distanceKm <= 5).length },
              { id: 'city' as DistanceFilter, label: 'Şehir • 15 km', count: displayUsers.filter(u => u.distanceKm <= 15).length },
              { id: 'all' as DistanceFilter, label: 'Tümü', count: displayUsers.length },
            ].map((f) => {
              const isSelected = distanceFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDistanceFilter(f.id)}
                  className={`py-1.5 px-3 rounded-lg text-center text-xs whitespace-nowrap shrink-0 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/35 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 leading-none ${
                    isSelected ? 'bg-purple-600 text-white font-bold' : 'bg-zinc-200 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode 1: Timeline Track with Floating Reaction Animation */}
        {loungeViewMode === 'timeline' && (
          <div className="space-y-3.5">
            {/* Timeline Track with Floating Reaction Overlay */}
            <div className="relative">
              {floatingReactions.length > 0 && (
                <div className="absolute inset-x-0 -top-8 h-24 pointer-events-none z-50 overflow-visible">
                  {floatingReactions.map((f) => {
                    const duration = currentSong.durationSeconds || 240;
                    const leftPct = Math.min(88, Math.max(12, (f.second / duration) * 100));
                    return (
                      <div
                        key={f.id}
                        style={{ left: `${leftPct}%` }}
                        className="absolute bottom-2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-zinc-950/95 border border-accent-theme/60 text-accent-theme font-bold text-xs shadow-[0_0_24px_var(--theme-accent-glow)] flex items-center gap-1.5 animate-float-up backdrop-blur-xl whitespace-nowrap"
                      >
                        <span>{f.text}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          [{formatTime(f.second)}]
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <TimelineTrack
                song={currentSong}
                mySecond={mySecond}
                users={distanceFilteredUsers}
                privacyMode={privacyMode}
                onSelectUser={onSelectUser}
                onDirectChat={onDirectChat}
                onSeekSecond={onSeekSecond}
                onToggleFriend={onToggleFriend}
                onChangePrivacyMode={onChangePrivacyMode}
                candidateSongs={candidateSongs}
                onWhisperTrack={onWhisperTrack}
                onShowToast={onShowToast}
              />
            </div>

            {distanceFilteredUsers.length === 0 && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-1.5">
                <p className="text-xs text-zinc-300 font-medium">
                  Seçtiğiniz {distanceFilter === '1km' ? '1 km' : distanceFilter === '5km' ? '5 km' : '15 km'} yarıçapında şu anda dinleyici yok.
                </p>
                <p className="text-[11px] text-zinc-500">
                  Mesafeyi genişleterek veya harita katmanına bakarak çevre illerdeki dinleyicileri görebilirsiniz.
                </p>
                <button
                  type="button"
                  onClick={() => setDistanceFilter('all')}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition cursor-pointer min-h-[44px] lg:min-h-0"
                >
                  Tüm Dinleyicileri Göster
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Proximity & Density Map Layer */}
        {loungeViewMode === 'map' && (
          <div className="space-y-3.5">
            <ProximityDensityMap
              users={displayUsers}
              activeFilter={distanceFilter}
              onChangeFilter={setDistanceFilter}
              onSelectUser={onSelectUser}
              onDirectChat={onDirectChat}
              onSeekSecond={onSeekSecond}
              currentSong={currentSong}
              myCity={userCity}
              onChangeCity={onUpdateCity}
            />

            <button
              type="button"
              onClick={() => setLoungeViewMode('timeline')}
              className="w-full py-2.5 rounded-xl bg-white/90 dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 border border-zinc-200 dark:border-white/[0.06] min-h-[44px]"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Zaman Çizelgesi Görünümüne Dön</span>
            </button>
          </div>
        )}
      </section>
        </div>

        {/* RIGHT 5 COLUMNS (Desktop): Unified Saniye Notları & Hızlı Tepki Card + Room Listeners Summary */}
        <aside className="lg:col-span-5 flex flex-col gap-4 min-w-0 lg:sticky lg:top-6">
          {/* ===============================================================
              BİRLEŞİK KART: SANİYE NOTLARI & HIZLI TEPKİ
             =============================================================== */}
          <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#14121E]/90 border border-[#E4E2EC] dark:border-white/[0.08] backdrop-blur-xl space-y-3 shadow-lg">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                </span>
                <h3 className="font-heading font-bold text-zinc-900 dark:text-white text-xs sm:text-sm truncate">
                  Saniye Notları & Hızlı Tepki
                </h3>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 font-bold tabular-nums shrink-0">
                ⏱️ {formatTime(mySecond)}
              </span>
            </div>

            {/* Top: Single-Row Quick Reaction Chips with Smooth Right Fade */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-6 py-0.5 [mask-image:linear-gradient(to_right,black_88%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_88%,transparent_100%)]">
              {[
                { label: '⚡ Tüyler Diken' },
                { label: '🔥 Efsane Solo' },
                { label: '🎸 Ritim Harika' },
                { label: '🖤 Tam Modum' },
              ].map((rec) => (
                <button
                  key={rec.label}
                  type="button"
                  onClick={() => triggerQuickReaction(rec.label)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.05] hover:bg-zinc-200 dark:hover:bg-white/[0.1] border border-zinc-200 dark:border-white/[0.08] hover:border-purple-500/40 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition cursor-pointer shrink-0 active:scale-95 shadow-xs min-h-[36px]"
                >
                  {rec.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setIsWritingNote((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 flex items-center gap-1 shadow-xs min-h-[36px] ${
                  isWritingNote
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
                    : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                }`}
              >
                <span>✍️</span>
                <span>Not Bırak</span>
              </button>
            </div>

            {/* Inline Custom Note Writer */}
            {isWritingNote && (
              <form
                onSubmit={handleSendCustomNote}
                className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customNoteText}
                    onChange={(e) => setCustomNoteText(e.target.value)}
                    placeholder={`${formatTime(mySecond)} anında ne hissettin?`}
                    maxLength={80}
                    autoFocus
                    className="w-full py-2 px-3 bg-zinc-100 dark:bg-black/60 border border-purple-500/50 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none placeholder-zinc-500 font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customNoteText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-xs hover:brightness-110 active:scale-95 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1"
                >
                  <span>Fırlat</span>
                  <span>🚀</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsWritingNote(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* Bottom: Horizontally Scrollable Timestamp Note Cards */}
            <div className="pt-1 border-t border-zinc-200/80 dark:border-white/[0.06]">
              <div
                className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-1.5 scroll-smooth pr-6 [mask-image:linear-gradient(to_right,black_88%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_88%,transparent_100%)]"
              >
                {vibeNotes.map((vibe) => {
                  const isNearCurrent = Math.abs(mySecond - vibe.second) < 8;
                  return (
                    <div
                      key={vibe.id}
                      onClick={() => handleVibeCardClick(vibe)}
                      className={`min-w-[235px] sm:min-w-[250px] max-w-[265px] p-2.5 rounded-2xl transition-all flex flex-col justify-between shrink-0 shadow-sm cursor-pointer group/card border ${
                        isNearCurrent
                          ? 'bg-purple-500/10 border-purple-500/45 ring-1 ring-purple-500/25'
                          : 'bg-zinc-50 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.06] border-zinc-200/80 dark:border-white/[0.08]'
                      }`}
                      title="Tıkla: Şarkıyı bu saniyeye sar ve dinleyiciyi gör"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative shrink-0">
                              <div
                                className={`avatar-circle w-6 h-6 rounded-full bg-gradient-to-tr ${vibe.avatarGradient} flex items-center justify-center text-white font-bold text-[10px] ring-1 ring-white/20 shadow-sm`}
                              >
                                {vibe.userInitials}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white dark:ring-[#14121E]" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-zinc-900 dark:text-white block truncate group-hover/card:text-purple-600 dark:group-hover/card:text-purple-400 transition-colors">
                                {vibe.userName}
                              </span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 shrink-0">
                            {formatTime(vibe.second)}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white/80 dark:bg-black/35 border border-zinc-200/70 dark:border-white/[0.04] min-h-[42px] flex items-center">
                          <p className="line-clamp-2 italic text-zinc-700 dark:text-zinc-200 text-xs leading-relaxed">
                            "{vibe.note}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-2 mt-1.5 border-t border-zinc-200/70 dark:border-white/[0.05] text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => handleToggleVibeLike(e, vibe.id)}
                          className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:text-rose-500 font-medium transition cursor-pointer flex items-center gap-1 active:scale-95"
                          title="Beğen"
                        >
                          <Heart className="w-3 h-3 text-rose-500 fill-current" />
                          <span className="tabular-nums font-mono text-[10px]">{vibe.likes}</span>
                        </button>

                        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold group-hover/card:translate-x-0.5 transition-transform">
                          <span>O Anı Dinle</span>
                          <span>▶</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Room Listeners Summary & Auto-Radio Card */}
          <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#14121E]/90 border border-[#E4E2EC] dark:border-white/[0.08] shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex -space-x-1.5 shrink-0">
                  {distanceFilteredUsers.slice(0, 4).map((u) => (
                    <div
                      key={u.id}
                      onClick={() => onSelectUser(u)}
                      title={`${u.name}${u.isRealUser ? ' · 🟢 GERÇEK CANLI' : ''} (${u.distanceKm} km)`}
                      className={`avatar-circle w-8 h-8 rounded-full bg-gradient-to-tr ${u.avatarGradient} flex items-center justify-center text-white font-bold text-[10px] cursor-pointer hover:scale-110 transition-transform overflow-hidden ${
                        u.isRealUser
                          ? 'ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.75)] z-10'
                          : 'ring-2 ring-white dark:ring-[#14121E]'
                      }`}
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        u.avatarSeed
                      )}
                    </div>
                  ))}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    Odadaki Dinleyiciler
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {distanceFilteredUsers.length} kişi şu anda bu frekansta
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenRoomListeners}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.12] text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition cursor-pointer shrink-0 min-h-[36px]"
              >
                Tümü ({distanceFilteredUsers.length + 1})
              </button>
            </div>

            {distanceFilteredUsers.some((u) => u.isRealUser) && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/45 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold tracking-wide">
                <span>🟢 GERÇEK CANLI DİNLEYİCİ BAĞLI</span>
              </div>
            )}

            {/* Auto-Radio Toggle Row */}
            <div className="pt-2.5 border-t border-zinc-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 truncate">
                {nextRadioSong ? `Sıradaki: ${nextRadioSong.title}` : 'Sonsuz Radyo'}
              </span>
              <button
                type="button"
                onClick={() => onToggleAutoRadio?.(!autoRadioEnabled)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                  autoRadioEnabled
                    ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                    : 'bg-zinc-100 dark:bg-white/[0.05] text-zinc-500'
                }`}
              >
                {autoRadioEnabled ? 'Radyo Açık' : 'Radyo Kapalı'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
