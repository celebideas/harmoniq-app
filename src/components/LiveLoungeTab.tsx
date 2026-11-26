import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Users,
  Search,
  Loader2,
  MapPin,
  Clock,
  SkipBack,
  SkipForward,
  Send,
  Video,
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
}) => {
  // Memoize YouTube iframe URL ONLY by videoId so play/pause/seek NEVER reloads the iframe
  const ytIframeSrc = useMemo(() => {
    if (!currentSong.youtubeVideoId) return '';
    const origin =
      typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
    const startSec = ytController.getPendingSeekSecond() ?? 0;
    const autoPlayFlag = ytController.getIsPlaying() ? '1' : '0';
    return `https://www.youtube.com/embed/${currentSong.youtubeVideoId}?autoplay=${autoPlayFlag}&start=${startSec}&enablejsapi=1&playsinline=1&origin=${origin}&widgetid=1`;
  }, [currentSong.youtubeVideoId]);

  const [vibeNotes, setVibeNotes] = useState<
    Array<{
      id: string;
      userInitials: string;
      userName: string;
      avatarGradient: string;
      second: number;
      note: string;
      isMine?: boolean;
      userRef?: LoungeUser;
    }>
  >([
    {
      id: 'vibe-1',
      userInitials: 'DK',
      userName: 'Defne Kaya',
      avatarGradient: 'from-zinc-700 to-zinc-900',
      second: 102,
      note: 'Gitar solosu tüyleri diken diken etti.',
    },
    {
      id: 'vibe-2',
      userInitials: 'ET',
      userName: 'Emir Timur',
      avatarGradient: 'from-stone-700 to-stone-900',
      second: 135,
      note: 'Gece sürüşü için kusursuz.',
    },
    {
      id: 'vibe-3',
      userInitials: 'SY',
      userName: 'Selin Yılmaz',
      avatarGradient: 'from-neutral-700 to-neutral-900',
      second: 28,
      note: 'Giriş melodisi ilk saniyeden yakalıyor.',
    },
    {
      id: 'vibe-4',
      userInitials: 'BA',
      userName: 'Barış Alper',
      avatarGradient: 'from-zinc-600 to-zinc-800',
      second: 54,
      note: 'Bas yürüyüşü inanılmaz temiz.',
    },
    {
      id: 'vibe-5',
      userInitials: 'MK',
      userName: 'Melis Kurt',
      avatarGradient: 'from-stone-600 to-stone-800',
      second: 85,
      note: 'Nakaratın girdiği an odadaki herkes susuyor.',
    },
  ]);

  const [customNoteText, setCustomNoteText] = useState('');
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('all');
  const [loungeViewMode, setLoungeViewMode] = useState<'timeline' | 'map'>('timeline');
  const [showKlipMode, setShowKlipMode] = useState(false);

  // Mobile Touch Swipe to skip track
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeHint, setSwipeHint] = useState<'next' | 'prev' | null>(null);

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

  const handleVibeUserOpen = (vibe: {
    id: string;
    userInitials: string;
    userName: string;
    avatarGradient: string;
    second: number;
    note: string;
    isMine?: boolean;
    userRef?: LoungeUser;
  }) => {
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
      city: userCity || 'İstanbul, Moda',
      avatarSeed: vibe.userInitials,
      avatarGradient: vibe.avatarGradient,
      platform: 'youtube_music',
      currentSecond: vibe.second,
      statusBubble: vibe.note,
      topArtists: [currentSong.artist, 'Duman', 'Mor ve Ötesi'],
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
    const trimmed = customNoteText.trim();
    if (!trimmed) return;

    triggerHaptic(22);
    const sec = Math.round(mySecond);
    const newVibe = {
      id: `vibe-${Date.now()}`,
      userInitials: 'SN',
      userName: 'Sen',
      avatarGradient: 'from-zinc-700 to-zinc-900',
      second: sec,
      note: trimmed,
      isMine: true,
    };

    setVibeNotes((prev) => [newVibe, ...prev]);
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
              <div
                className={
                  showKlipMode
                    ? 'mb-3.5 rounded-xl overflow-hidden border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] aspect-video w-full bg-black relative block'
                    : 'fixed -bottom-48 -right-48 w-56 h-36 opacity-0 pointer-events-none z-[-10]'
                }
              >
                <iframe
                  ref={(el) => ytController.setIframe(el)}
                  src={ytIframeSrc}
                  title="ListenHub YouTube Music Player"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
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
                className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer transition-transform active:scale-95 bg-[#211D1A] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08]"
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
                className="min-w-0 flex-1 cursor-pointer group/title"
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
                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition cursor-pointer active:scale-95 ${
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
                  className="w-10 h-10 rounded-full bg-[#F2EDE6] dark:bg-[#211D1A] hover:bg-[#E8E0D5] dark:hover:bg-[#FFF0E1]/10 border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08] text-[#181512] dark:text-[#FAF7F2] flex items-center justify-center transition cursor-pointer active:scale-95"
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
                  className="studio-btn-primary w-12 h-12 rounded-full bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg shadow-amber-950/20"
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

          {/* 2. TIMELINE TRACK & COMPACT VIEW/DISTANCE CONTROLS */}
          <section aria-label="Şarkı Zaman Rayı ve Mesafe" className="space-y-3">
            {loungeViewMode === 'timeline' ? (
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
            ) : (
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
            )}

            {/* Quiet Studio Control Strip: Timeline | Harita | Liste + Distance Filter */}
            <div className="rounded-2xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none p-3 space-y-2.5">
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06] rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setLoungeViewMode('timeline')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    loungeViewMode === 'timeline'
                      ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] border border-[#E87A3E]/25'
                      : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] border border-transparent'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">Zaman Rayı</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLoungeViewMode('map')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    loungeViewMode === 'map'
                      ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] border border-[#E87A3E]/25'
                      : 'text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] border border-transparent'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">Harita</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenRoomListeners}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] transition cursor-pointer flex items-center justify-center gap-1.5 border border-transparent"
                >
                  <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate font-mono tabular-nums">
                    Liste ({distanceFilteredUsers.length + 1})
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap">
                {[
                  { id: 'all' as DistanceFilter, label: 'Tümü', count: displayUsers.length },
                  {
                    id: '1km' as DistanceFilter,
                    label: '1 km',
                    count: displayUsers.filter((u) => u.distanceKm <= 1).length,
                  },
                  {
                    id: '5km' as DistanceFilter,
                    label: '5 km',
                    count: displayUsers.filter((u) => u.distanceKm <= 5).length,
                  },
                  {
                    id: 'city' as DistanceFilter,
                    label: '15 km',
                    count: displayUsers.filter((u) => u.distanceKm <= 15).length,
                  },
                ].map((f) => {
                  const isSelected = distanceFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setDistanceFilter(f.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap shrink-0 transition cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-[#E87A3E]/15 text-[#D96B2C] dark:text-[#F49A5E] font-semibold border-[#E87A3E]/25'
                          : 'bg-[#F2EDE6] dark:bg-[#211D1A] text-[#6B635B] dark:text-[#A39A91] hover:text-[#181512] dark:hover:text-[#FAF7F2] border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06]'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className="font-mono tabular-nums text-[10px] opacity-80">
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {distanceFilteredUsers.length === 0 && loungeViewMode === 'timeline' && (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] text-center space-y-2">
                <p className="text-xs text-[#181512] dark:text-[#FAF7F2] font-medium">
                  Seçili yarıçapta şu anda başka dinleyici yok.
                </p>
                <button
                  type="button"
                  onClick={() => setDistanceFilter('all')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#F2EDE6] dark:bg-[#211D1A] border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06] text-xs font-semibold text-[#181512] dark:text-[#FAF7F2] transition cursor-pointer"
                >
                  Tüm Dinleyicileri Göster
                </button>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT 5 COLUMNS (Desktop): Calm "Saniye Anıları" Card + Quiet Listener Summary */}
        <aside className="lg:col-span-5 flex flex-col gap-4 min-w-0 lg:sticky lg:top-6">
          {/* 3. SAKİN "SANİYE ANILARI" BÖLÜMÜ */}
          <section
            aria-label="Saniye Anıları"
            className="rounded-2xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none p-4 sm:p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#181512] dark:text-[#FAF7F2] tracking-tight">
                Saniye Anıları
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-[#6B635B] dark:text-[#A39A91]">
                {vibeNotes.length} anı
              </span>
            </div>

            {/* Clean Editorial Quote Rows (Comment left, clickable mono timestamp right) */}
            <div className="divide-y divide-[#EAE4DC] dark:divide-[#FFF0E1]/[0.06]">
              {vibeNotes.slice(0, 5).map((vibe) => {
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
                      className={`px-2.5 py-1 rounded-lg font-mono tabular-nums text-[11px] font-semibold shrink-0 transition cursor-pointer active:scale-95 ${
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
                className="studio-btn-primary w-10 h-10 rounded-xl bg-gradient-to-br from-[#E87A3E] to-[#D97706] hover:brightness-105 text-white flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer shadow-lg shadow-amber-950/20 disabled:opacity-35 disabled:cursor-not-allowed"
                title="Not bırak"
                aria-label="Not bırak"
              >
                <Send className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </form>
          </section>

          {/* Quiet Room Listeners & Continuous Radio Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#171412] border border-[#EAE4DC] dark:border-[#FFF0E1]/[0.08] shadow-[0_4px_20px_rgba(24,21,18,0.04)] dark:shadow-none space-y-3">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex -space-x-1.5 shrink-0">
                  {distanceFilteredUsers.slice(0, 4).map((u) => (
                    <div
                      key={u.id}
                      onClick={() => onSelectUser(u)}
                      title={`${u.name} (${u.distanceKm} km)`}
                      className={`avatar-circle w-8 h-8 rounded-full bg-gradient-to-tr ${u.avatarGradient} flex items-center justify-center text-white font-bold text-[10px] cursor-pointer hover:scale-110 transition-transform overflow-hidden ${
                        u.isRealUser
                          ? 'ring-2 ring-[#16A34A] dark:ring-[#22C55E] z-10'
                          : 'ring-2 ring-white dark:ring-[#171412]'
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
                  <div className="text-xs font-semibold text-[#181512] dark:text-[#FAF7F2] truncate">
                    Odadaki Dinleyiciler
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-[#6B635B] dark:text-[#A39A91] truncate">
                    {distanceFilteredUsers.length + 1} kişi aynı şarkıda
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenRoomListeners}
                className="px-3 py-1.5 rounded-xl bg-[#F2EDE6] dark:bg-[#211D1A] hover:bg-[#E8E0D5] dark:hover:bg-[#FFF0E1]/10 border border-[#E2D9CE] dark:border-[#FFF0E1]/[0.06] text-xs font-semibold text-[#181512] dark:text-[#FAF7F2] transition cursor-pointer shrink-0"
              >
                Tümü
              </button>
            </div>

            <div className="pt-2.5 border-t border-[#EAE4DC] dark:border-[#FFF0E1]/[0.06] flex items-center justify-between gap-2 text-xs">
              <span className="text-[#6B635B] dark:text-[#A39A91] truncate">
                {nextRadioSong ? `Sıradaki: ${nextRadioSong.title}` : 'Sürekli Akış'}
              </span>
              <button
                type="button"
                onClick={() => onToggleAutoRadio?.(!autoRadioEnabled)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0 border ${
                  autoRadioEnabled
                    ? 'bg-[#16A34A]/10 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E] border-[#16A34A]/25 dark:border-[#22C55E]/25'
                    : 'bg-[#F2EDE6] dark:bg-[#211D1A] text-[#6B635B] dark:text-[#A39A91] border-[#E2D9CE] dark:border-[#FFF0E1]/[0.08]'
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
