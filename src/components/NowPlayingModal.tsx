import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Share2,
  Radio,
  ListMusic,
  Sparkles,
  Volume2,
  VolumeX,
  Mic2,
  Clock,
  Flame,
  Music,
  Loader2,
  Users,
  X,
  Search,
  MessageCircle,
  UserCheck,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { Song, PlatformType, LoungeUser } from '../types';
import { fetchArtistRadio } from '../services/musicResolver';
import { triggerHaptic } from '../services/themeService';
import {
  fetchSongLyrics,
  getGoogleLyricsSearchUrl,
  LyricsResult,
} from '../services/lyricsService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  isPlaying: boolean;
  onTogglePlay: () => void;
  progressSeconds: number;
  onSeek: (seconds: number) => void;
  onNextSong: () => void;
  onPrevSong: () => void;
  onSelectSong: (song: Song) => void;
  allSongs: Song[];
  onOpenSongPicker: () => void;
  activePlatform: PlatformType;
  onShowToast: (message: string) => void;
  onOpenRoomListeners?: () => void;
  onStartRadioStation?: (seedSong: Song) => Promise<any> | void;
  isFavorite?: boolean;
  onToggleFavorite?: (song: Song) => void;
  listeners?: LoungeUser[];
  onSelectUser?: (user: LoungeUser) => void;
  onStartChatWithUser?: (user: LoungeUser) => void;
  isAudioLoading?: boolean;
}

interface ModernSeekBarProps {
  progressSeconds: number;
  durationSeconds: number;
  onSeek: (seconds: number) => void;
}

const ModernSeekBar: React.FC<ModernSeekBarProps> = ({
  progressSeconds,
  durationSeconds,
  onSeek,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const safeDuration = Math.max(1, durationSeconds || 1);
  const livePercent = Math.min(100, Math.max(0, (progressSeconds / safeDuration) * 100));
  const activePercent = dragPercent !== null ? dragPercent : livePercent;

  const computeRatioFromClientX = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);
    const ratio = computeRatioFromClientX(e.clientX);
    setDragPercent(ratio * 100);
    triggerHaptic(12);
    onSeek(Math.round(ratio * safeDuration));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const ratio = computeRatioFromClientX(e.clientX);
    setDragPercent(ratio * 100);
    onSeek(Math.round(ratio * safeDuration));
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const ratio = computeRatioFromClientX(e.clientX);
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragPercent(null);
    onSeek(Math.round(ratio * safeDuration));
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Şarkı ilerleme çubuğu"
      aria-valuemin={0}
      aria-valuemax={Math.round(safeDuration)}
      aria-valuenow={Math.round((activePercent / 100) * safeDuration)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          onSeek(Math.min(safeDuration, progressSeconds + 5));
        } else if (e.key === 'ArrowLeft') {
          onSeek(Math.max(0, progressSeconds - 5));
        }
      }}
      className="py-3 select-none touch-none cursor-pointer group"
      title="Sarmak için dokun veya sürükle"
    >
      <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-white/15 cursor-pointer relative group">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 transition-[width] duration-150"
          style={{ width: `${activePercent}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border border-purple-500/30 pointer-events-none transition-transform duration-150 ${
            isDragging ? 'scale-125 ring-4 ring-purple-500/25' : 'group-hover:scale-110'
          }`}
          style={{ left: `${activePercent}%` }}
        />
      </div>
    </div>
  );
};

export const NowPlayingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  song,
  isPlaying,
  onTogglePlay,
  progressSeconds,
  onSeek,
  onNextSong,
  onPrevSong,
  onSelectSong,
  allSongs,
  onOpenSongPicker,
  activePlatform,
  onShowToast,
  onOpenRoomListeners,
  onStartRadioStation,
  isFavorite,
  onToggleFavorite,
  listeners = [],
  onSelectUser,
  onStartChatWithUser,
  isAudioLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'radio' | 'lyrics'>('queue');
  const [viewMode, setViewMode] = useState<'cover' | 'lyrics'>('cover');
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(142);
  const [isHeartPopping, setIsHeartPopping] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const [radioStation, setRadioStation] = useState<{
    stationName: string;
    description: string;
    tracks: Song[];
  } | null>(null);
  const [isLoadingRadio, setIsLoadingRadio] = useState<boolean>(false);

  // Synchronized viewMode and activeTab management
  const handleSelectViewMode = (mode: 'cover' | 'lyrics') => {
    triggerHaptic(15);
    setViewMode(mode);
    if (mode === 'lyrics') {
      setActiveTab('lyrics');
    } else if (activeTab === 'lyrics') {
      setActiveTab('queue');
    }
  };

  const handleSelectTab = (tab: 'queue' | 'radio' | 'lyrics') => {
    triggerHaptic(15);
    setActiveTab(tab);
    if (tab === 'lyrics') {
      setViewMode('lyrics');
      setTimeout(() => {
        heroLyricsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    } else if (viewMode === 'lyrics') {
      setViewMode('cover');
    }
  };

  // In-player Listeners Bottom Sheet state
  const [showListenersSheet, setShowListenersSheet] = useState<boolean>(false);
  const [sheetSearchQuery, setSheetSearchQuery] = useState<string>('');
  const [sheetFilter, setSheetFilter] = useState<'all' | 'synced' | 'kadikoy'>('all');

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const heroLyricsContainerRef = useRef<HTMLDivElement>(null);

  // Initialize like state with song favorite status
  useEffect(() => {
    if (isFavorite !== undefined) {
      setIsLiked(isFavorite);
    }
  }, [isFavorite, song.id]);

  // Dynamically generate genuine artist radio whenever song changes
  useEffect(() => {
    let cancelled = false;
    setIsLoadingRadio(true);
    fetchArtistRadio(song).then((radio) => {
      if (!cancelled) {
        setRadioStation(radio);
        setIsLoadingRadio(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [song]);

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Real LRCLIB synchronized & plain lyrics state (zero fabricated lyrics)
  const [lyricsData, setLyricsData] = useState<LyricsResult | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoadingLyrics(true);
    setLyricsData(null);

    fetchSongLyrics({
      id: song.id,
      title: song.title,
      artist: song.artist,
    })
      .then((result) => {
        if (!cancelled) {
          setLyricsData(result);
          setIsLoadingLyrics(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLyricsData({ status: 'not_found', syncedLines: [], plainLines: [] });
          setIsLoadingLyrics(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, song.id, song.title, song.artist]);

  // Auto scroll active lyric line into view in bottom tab
  useEffect(() => {
    if (activeTab === 'lyrics' && lyricsData?.status === 'synced' && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.querySelector('.active-lyric-line');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [progressSeconds, activeTab, lyricsData?.status]);

  // Auto scroll active lyric line into view in Hero Lyrics Mode
  useEffect(() => {
    if (viewMode === 'lyrics' && lyricsData?.status === 'synced' && heroLyricsContainerRef.current) {
      const activeEl = heroLyricsContainerRef.current.querySelector('.hero-active-lyric');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [progressSeconds, viewMode, lyricsData?.status]);

  // Ensure there are 14 listeners for the room
  const activeRoomListeners: LoungeUser[] = useMemo(() => {
    if (listeners && listeners.length >= 14) {
      return listeners;
    }
    // Supplemental default room listeners if passed count is less than 14
    const seed = [
      ...(listeners || []),
      {
        id: 'user-mert-room',
        name: 'Mert Arslan',
        age: 24,
        city: 'Kadıköy',
        avatarSeed: 'mert',
        avatarGradient: 'from-emerald-500 to-teal-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: Math.max(0, progressSeconds - 8),
        statusBubble: 'Gitar solosu tüyler ürpertiyor 🔥',
        topArtists: ['Duman', 'Mor ve Ötesi', 'Teoman'],
        bio: 'Kadıköy sahilinde indie & rock dinleyicisi.',
        trustScore: 98,
        lastHeartbeatAgoSeconds: 3,
        isOnline: true,
        distanceKm: 0.8,
        compatibilityScore: 96,
      },
      {
        id: 'user-selin-room',
        name: 'Selin Kaya',
        age: 22,
        city: 'Moda',
        avatarSeed: 'selin',
        avatarGradient: 'from-purple-500 to-pink-600',
        platform: 'youtube_music' as PlatformType,
        currentSecond: progressSeconds,
        statusBubble: 'Aynı saniyedeyiz! ⚡',
        topArtists: ['Duman', 'Arctic Monkeys', 'Jakuzi'],
        bio: 'Konserlerde ön sıralarda buluşalım.',
        trustScore: 95,
        lastHeartbeatAgoSeconds: 2,
        isOnline: true,
        distanceKm: 1.2,
        compatibilityScore: 94,
      },
      {
        id: 'user-burak-room',
        name: 'Burak Çelik',
        age: 26,
        city: 'Beşiktaş',
        avatarSeed: 'burak',
        avatarGradient: 'from-amber-500 to-orange-600',
        platform: 'youtube_music' as PlatformType,
        currentSecond: Math.min(song.durationSeconds, progressSeconds + 12),
        statusBubble: 'Bas yürüyüşleri çok temiz',
        topArtists: ['Duman', 'Yüzyüzeyken Konuşuruz'],
        bio: 'Analog ses tutkunu.',
        trustScore: 92,
        lastHeartbeatAgoSeconds: 5,
        isOnline: true,
        distanceKm: 3.5,
        compatibilityScore: 91,
      },
      {
        id: 'user-ezgi-room',
        name: 'Ezgi Demir',
        age: 23,
        city: 'Cihangir',
        avatarSeed: 'ezgi',
        avatarGradient: 'from-blue-500 to-indigo-600',
        platform: 'youtube_music' as PlatformType,
        currentSecond: Math.max(0, progressSeconds - 20),
        statusBubble: 'Sözleri ezbere bilenler derneği',
        topArtists: ['Duman', 'Büyük Ev Ablukada'],
        bio: 'Kahve & plak günleri.',
        trustScore: 94,
        lastHeartbeatAgoSeconds: 4,
        isOnline: true,
        distanceKm: 4.1,
        compatibilityScore: 89,
      },
      {
        id: 'user-can-room',
        name: 'Can Yılmaz',
        age: 25,
        city: 'Kadıköy',
        avatarSeed: 'can',
        avatarGradient: 'from-rose-500 to-red-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: 85,
        statusBubble: 'Nakarat bekleyenler',
        topArtists: ['Duman', 'Kurban'],
        bio: 'Elektro gitar çalıyorum.',
        trustScore: 90,
        lastHeartbeatAgoSeconds: 8,
        isOnline: true,
        distanceKm: 1.5,
        compatibilityScore: 88,
      },
      {
        id: 'user-deniz-room',
        name: 'Deniz Aksoy',
        age: 21,
        city: 'Üsküdar',
        avatarSeed: 'deniz',
        avatarGradient: 'from-cyan-500 to-blue-600',
        platform: 'youtube_music' as PlatformType,
        currentSecond: 142,
        statusBubble: 'Soloda durdum bekliyorum',
        topArtists: ['Duman', 'Athena'],
        bio: 'Müzik zevkim hayatım.',
        trustScore: 96,
        lastHeartbeatAgoSeconds: 1,
        isOnline: true,
        distanceKm: 2.8,
        compatibilityScore: 92,
      },
      {
        id: 'user-alp-room',
        name: 'Alp Eren',
        age: 27,
        city: 'Bakırköy',
        avatarSeed: 'alp',
        avatarGradient: 'from-teal-500 to-emerald-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: 28,
        statusBubble: 'Giriş riffi efsanedir',
        topArtists: ['Duman', 'Pentagram'],
        bio: 'Canlı performans sevdalısı.',
        trustScore: 91,
        lastHeartbeatAgoSeconds: 9,
        isOnline: true,
        distanceKm: 11.0,
        compatibilityScore: 85,
      },
      {
        id: 'user-yagmur-room',
        name: 'Yağmur Tan',
        age: 23,
        city: 'Kadıköy',
        avatarSeed: 'yagmur',
        avatarGradient: 'from-violet-500 to-purple-800',
        platform: 'youtube_music' as PlatformType,
        currentSecond: Math.max(0, progressSeconds - 5),
        statusBubble: 'Sürekli replay 🔁',
        topArtists: ['Duman', 'Son Feci Bisiklet'],
        bio: 'Gündüz öğrenci, gece indie dinleyicisi.',
        trustScore: 93,
        lastHeartbeatAgoSeconds: 6,
        isOnline: true,
        distanceKm: 0.9,
        compatibilityScore: 95,
      },
      {
        id: 'user-onur-room',
        name: 'Onur Şahin',
        age: 28,
        city: 'Şişli',
        avatarSeed: 'onur',
        avatarGradient: 'from-lime-500 to-green-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: 74,
        statusBubble: 'Kulaklıkla yüksek ses 🎧',
        topArtists: ['Duman', 'Manga'],
        bio: 'Prodüksiyon ve miksajla ilgileniyorum.',
        trustScore: 89,
        lastHeartbeatAgoSeconds: 12,
        isOnline: true,
        distanceKm: 6.2,
        compatibilityScore: 84,
      },
      {
        id: 'user-zeynep-room',
        name: 'Zeynep Koç',
        age: 22,
        city: 'Moda',
        avatarSeed: 'zeynep',
        avatarGradient: 'from-fuchsia-500 to-pink-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: progressSeconds,
        statusBubble: 'Tam bu saniye harika',
        topArtists: ['Duman', 'Jakuzi', 'Palmiyeler'],
        bio: 'Moda sahil piknikleri & indie rock.',
        trustScore: 97,
        lastHeartbeatAgoSeconds: 2,
        isOnline: true,
        distanceKm: 1.1,
        compatibilityScore: 97,
      },
      {
        id: 'user-berk-room',
        name: 'Berk Aydın',
        age: 24,
        city: 'Ataşehir',
        avatarSeed: 'berk',
        avatarGradient: 'from-sky-500 to-blue-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: 120,
        statusBubble: 'Albüm baştan sona başyapıt',
        topArtists: ['Duman', 'Adamlar'],
        bio: 'Kod yazarken arka planda Türkçe Rock.',
        trustScore: 92,
        lastHeartbeatAgoSeconds: 7,
        isOnline: true,
        distanceKm: 8.5,
        compatibilityScore: 87,
      },
      {
        id: 'user-irem-room',
        name: 'İrem Vural',
        age: 25,
        city: 'Karaköy',
        avatarSeed: 'irem',
        avatarGradient: 'from-yellow-500 to-amber-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: 180,
        statusBubble: 'Bırak dönsün devran ✨',
        topArtists: ['Duman', 'Gripin'],
        bio: 'Tasarımcı & müzik gurmesi.',
        trustScore: 95,
        lastHeartbeatAgoSeconds: 3,
        isOnline: true,
        distanceKm: 5.0,
        compatibilityScore: 90,
      },
      {
        id: 'user-tolga-room',
        name: 'Tolga Çetin',
        age: 29,
        city: 'Bostancı',
        avatarSeed: 'tolga',
        avatarGradient: 'from-stone-500 to-zinc-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: 215,
        statusBubble: 'Kapanış riffleri 🖤',
        topArtists: ['Duman', 'Redd'],
        bio: 'Konser biletleri koleksiyoneri.',
        trustScore: 94,
        lastHeartbeatAgoSeconds: 10,
        isOnline: true,
        distanceKm: 7.2,
        compatibilityScore: 86,
      },
      {
        id: 'user-asli-room',
        name: 'Aslı Güneş',
        age: 23,
        city: 'Kadıköy',
        avatarSeed: 'asli',
        avatarGradient: 'from-rose-500 to-orange-500',
        platform: 'youtube_music' as PlatformType,
        currentSecond: progressSeconds,
        statusBubble: 'Aynı frekanstayız ⚡',
        topArtists: ['Duman', 'Mor ve Ötesi'],
        bio: 'ListenHub canlı dinleyicisi.',
        trustScore: 98,
        lastHeartbeatAgoSeconds: 1,
        isOnline: true,
        distanceKm: 0.6,
        compatibilityScore: 98,
      },
    ];

    // Deduplicate by ID and take first 14
    const uniqueMap = new Map<string, LoungeUser>();
    for (const u of seed) {
      if (!uniqueMap.has(u.id)) {
        uniqueMap.set(u.id, u);
      }
    }
    return Array.from(uniqueMap.values()).slice(0, 14);
  }, [listeners, progressSeconds, song.durationSeconds]);

  // Filtered listeners for bottom sheet
  const filteredSheetListeners = useMemo(() => {
    return activeRoomListeners.filter((user) => {
      const q = sheetSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.city.toLowerCase().includes(q) ||
        (user.statusBubble && user.statusBubble.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (sheetFilter === 'synced') {
        return Math.abs(user.currentSecond - progressSeconds) <= 15;
      }
      if (sheetFilter === 'kadikoy') {
        return (
          user.city.toLowerCase().includes('kadıköy') || user.city.toLowerCase().includes('moda')
        );
      }
      return true;
    });
  }, [activeRoomListeners, sheetSearchQuery, sheetFilter, progressSeconds]);

  if (!isOpen) return null;

  const effectiveIsLiked = isFavorite !== undefined ? isFavorite : isLiked;

  // Like button action with pop animation & haptic
  const handleToggleLike = () => {
    setIsHeartPopping(true);
    setTimeout(() => setIsHeartPopping(false), 350);

    // Browser haptic feedback if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // ignore
      }
    }

    if (effectiveIsLiked) {
      setIsLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
      onShowToast(`"${song.title}" favorilerden çıkarıldı.`);
    } else {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
      onShowToast(`"${song.title}" favorilerine eklendi! ❤️`);
    }

    if (onToggleFavorite) {
      onToggleFavorite(song);
    }
  };

  const handleToggleRepeat = () => {
    if (repeatMode === 'off') {
      setRepeatMode('all');
      onShowToast('Tümünü Tekrarla Açık 🔁');
    } else if (repeatMode === 'all') {
      setRepeatMode('one');
      onShowToast('Tek Şarkıyı Tekrarla Açık 🔂');
    } else {
      setRepeatMode('off');
      onShowToast('Tekrar Kapalı');
    }
  };

  const handleStartRadio = async () => {
    setIsLoadingRadio(true);
    handleSelectTab('radio');
    try {
      let radio: any = null;
      if (onStartRadioStation) {
        radio = await onStartRadioStation(song);
      } else {
        radio = await fetchArtistRadio(song);
      }
      if (radio) {
        setRadioStation(radio);
      }
      setIsLoadingRadio(false);
      onShowToast(
        `📻 ${radio?.stationName || song.artist + ' Radyosu'} başlatıldı! 35+ parça kesintisiz akıyor.`
      );
    } catch {
      setIsLoadingRadio(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    onShowToast(`"${song.title} - ${song.artist}" bağlantısı kopyalandı! 🔗`);
  };

  // Find upcoming queue songs (other songs after current)
  const currentIndex = allSongs.findIndex((s) => s.id === song.id);
  const queueSongs =
    currentIndex !== -1
      ? [...allSongs.slice(currentIndex + 1), ...allSongs.slice(0, currentIndex)]
      : allSongs.filter((s) => s.id !== song.id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Click outside to close (top backdrop area) */}
      <div className="flex-1" onClick={onClose} />

      {/* Main Bottom Sheet / Full Player Container */}
      <div className="relative w-full max-w-xl mx-auto bg-[#0A0A0C] border-t border-x border-white/[0.08] rounded-t-[32px] p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Top Grab Handle & Header Bar */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-1 rounded-full bg-white/20 cursor-pointer" onClick={onClose} />

          <div className="w-full flex items-center justify-between pt-1">
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition flex items-center justify-center active:scale-95"
              title="Kapat / Simge Durumuna Küçült"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            {/* Platform & Status Badge */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400 font-medium truncate max-w-[140px] sm:max-w-xs flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-accent-theme" />
                <span>
                  {activePlatform === 'youtube_music'
                    ? 'YouTube Music'
                    : activePlatform === 'spotify'
                    ? 'Spotify'
                    : 'Apple Music'}
                </span>
              </span>

              {song.youtubeVideoId && (
                <a
                  href={`https://music.youtube.com/watch?v=${song.youtubeVideoId}&t=${Math.floor(
                    progressSeconds
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[30px] flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] transition active:scale-95"
                >
                  <span>YT Music'te Aç ↗</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleShare}
                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition flex items-center justify-center active:scale-95"
                title="Şarkıyı Paylaş"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenSongPicker}
                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-neutral-400 hover:text-lime-300 hover:bg-neutral-900 transition flex items-center justify-center active:scale-95"
                title="Şarkı Değiştir / Ara"
              >
                <ListMusic className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 1. HERO VISUAL SHOWCASE (Mode Switcher + Cover / Vinyl / Lyrics) */}
        <div className="relative flex flex-col items-center justify-center pt-1 pb-2">
          {/* Ambient Colored Glow behind cover */}
          <div
            className="absolute w-60 h-60 rounded-full blur-3xl opacity-25 pointer-events-none transition-all duration-700"
            style={{
              background: song.coverGradient
                ? `linear-gradient(to right, #84cc16, #10b981)`
                : '#84cc16',
            }}
          />

          {/* Mode Switcher Pill (Kapak | Sözler | Canlı Oda) */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-md mb-3 shadow-inner z-10">
            <button
              onClick={() => handleSelectViewMode('cover')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cover'
                  ? 'bg-white text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Kapak</span>
            </button>
            <button
              onClick={() => handleSelectViewMode('lyrics')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'lyrics'
                  ? 'bg-white text-zinc-950 font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>Sözler</span>
            </button>
            <button
              onClick={() => setShowListenersSheet(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 text-orange-400 hover:bg-orange-500/10 active:scale-95 ml-0.5 border border-orange-500/20 cursor-pointer"
              title="Odadaki dinleyicileri incele"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Oda ({activeRoomListeners.length})</span>
            </button>
          </div>

          {/* VIEW MODE 1: High-res Album Jacket */}
          {viewMode === 'cover' && (
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border border-neutral-700/80 group">
              {song.coverUrl ? (
                <img
                  src={song.coverUrl}
                  alt={song.album}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-tr ${song.coverGradient} flex items-center justify-center text-white`}
                >
                  <Music className="w-20 h-20 opacity-40" />
                </div>
              )}

            </div>
          )}

          {/* VIEW MODE 2: Real LRCLIB Synchronized / Plain Lyrics */}
          {viewMode === 'lyrics' && (
            <div className="relative w-full max-w-md h-64 sm:h-72 rounded-2xl bg-white/95 dark:bg-black/50 border border-zinc-200 dark:border-white/[0.08] overflow-hidden flex flex-col shadow-inner">
              {isLoadingLyrics ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2.5 px-6 text-center">
                  <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    Gerçek şarkı sözleri getiriliyor...
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-full">
                    {song.artist} — {song.title}
                  </span>
                </div>
              ) : lyricsData?.status === 'synced' ? (
                <div
                  ref={heroLyricsContainerRef}
                  className="w-full h-full overflow-y-auto no-scrollbar py-10 px-5 text-center space-y-3 [mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]"
                >
                  {lyricsData.syncedLines.map((line, idx) => {
                    const nextLine = lyricsData.syncedLines[idx + 1];
                    const isActive =
                      progressSeconds >= line.second &&
                      (!nextLine || progressSeconds < nextLine.second);
                    return (
                      <div
                        key={`${line.second}-${idx}`}
                        onClick={() => onSeek(Math.floor(line.second))}
                        className={`cursor-pointer transition-all duration-300 py-1.5 select-none ${
                          isActive
                            ? 'hero-active-lyric text-zinc-900 dark:text-white text-lg font-bold scale-[1.02] flex items-center justify-center gap-2'
                            : 'text-sm font-medium text-zinc-400 dark:text-white/40 hover:text-zinc-700 dark:hover:text-white/80'
                        }`}
                      >
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
                        )}
                        <span>{line.text}</span>
                      </div>
                    );
                  })}
                </div>
              ) : lyricsData?.status === 'plain' ? (
                <div
                  ref={heroLyricsContainerRef}
                  className="w-full h-full overflow-y-auto no-scrollbar py-5 px-5 text-center space-y-2.5"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-500 dark:text-purple-400 pb-1">
                    Şarkı Sözleri (Düz Metin)
                  </div>
                  {lyricsData.plainLines.map((line, idx) => (
                    <p
                      key={idx}
                      className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 dark:text-purple-400">
                    <Mic2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 max-w-xs">
                    Bu parça için senkronize şarkı sözü bulunamadı.
                  </p>
                  <a
                    href={getGoogleLyricsSearchUrl(song.artist, song.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white text-xs font-bold shadow-md hover:opacity-95 transition active:scale-95"
                  >
                    <span>Sözleri Web&apos;de Ara</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. TRACK METADATA & HEART FAVORITE */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight truncate">
              {song.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
              <span className="font-semibold text-neutral-200">{song.artist}</span>
              <span>·</span>
              <span className="truncate">{song.album}</span>
              <span>·</span>
              <span className="text-neutral-500">{song.releaseYear}</span>
              <span>·</span>
              <span className="text-lime-400 font-medium">{song.genre}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setShowListenersSheet(true)}
                className="text-xs font-semibold text-lime-400 hover:text-lime-300 flex items-center gap-1.5 transition cursor-pointer py-0.5 group"
                title="Şu an aynı anda dinleyen kişilerin hesaplarını incele"
              >
                <Flame className="w-4 h-4 text-orange-400 fill-current" />
                <span>{activeRoomListeners.length} Dinleyici Odada</span>
                <span className="group-hover:translate-x-0.5 transition-transform text-neutral-400 font-normal">
                  · Hesapları Gör →
                </span>
              </button>
            </div>
          </div>

          {/* Like Heart Button with Bounce scale-125 animation */}
          <button
            onClick={handleToggleLike}
            className={`p-3 rounded-2xl border transition-all active:scale-95 flex flex-col items-center gap-1 min-w-[56px] ${
              effectiveIsLiked
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 shadow-lg shadow-rose-500/20'
                : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
            }`}
            title="Şarkıyı Beğen"
          >
            <Heart
              className={`w-6 h-6 transition-transform duration-200 ${
                isHeartPopping ? 'scale-125 rotate-12 text-rose-500' : 'scale-100'
              } ${effectiveIsLiked ? 'fill-current text-rose-500' : ''}`}
            />
            <span className="text-[10px] font-bold tabular-nums">{likeCount}</span>
          </button>
        </div>

        {/* 3. ULTRA-CLEAN MODERN SEEK BAR */}
        <div className="space-y-1 pt-1">
          <ModernSeekBar
            progressSeconds={progressSeconds}
            durationSeconds={song.durationSeconds || 1}
            onSeek={onSeek}
          />

          <div className="flex items-center justify-between text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400 -mt-1.5">
            <span>{formatTime(progressSeconds)}</span>
            <span>{formatTime(song.durationSeconds)}</span>
          </div>
        </div>

        {/* 4. MAIN TRANSPORT CONTROLS (Shuffle, Prev, Big Play, Next, Repeat) */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          {/* Shuffle Button */}
          <button
            onClick={() => {
              setIsShuffle(!isShuffle);
              onShowToast(!isShuffle ? 'Karışık Çalma Açık 🔀' : 'Karışık Çalma Kapalı');
            }}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-2xl flex items-center justify-center transition active:scale-95 ${
              isShuffle
                ? 'text-accent-theme bg-accent-subtle'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Karışık Çal"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Previous Track */}
          <button
            onClick={onPrevSong}
            className="min-h-[48px] min-w-[48px] p-3 rounded-2xl text-neutral-200 hover:text-white hover:bg-neutral-900 transition flex items-center justify-center active:scale-90"
            title="Önceki Şarkı"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          {/* Big Iconic Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            className="w-16 h-16 min-h-[64px] min-w-[64px] rounded-full bg-accent-theme glow-accent-theme flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xl text-zinc-950"
            title={isPlaying ? 'Durdur' : 'Çal'}
          >
            {isAudioLoading ? (
              <Loader2 className="w-7 h-7 animate-spin text-zinc-950" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNextSong}
            className="min-h-[48px] min-w-[48px] p-3 rounded-2xl text-neutral-200 hover:text-white hover:bg-neutral-900 transition flex items-center justify-center active:scale-90"
            title="Bir Sonraki Şarkı"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>

          {/* Repeat Button */}
          <button
            onClick={handleToggleRepeat}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-2xl flex items-center justify-center transition active:scale-95 ${
              repeatMode !== 'off'
                ? 'text-accent-theme bg-accent-subtle'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Tekrar Modu"
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 5. TABS: QUEUE, RADIO GENERATOR, LYRICS */}
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
          {/* Tab Selector */}
          <div className="flex rounded-xl bg-white/[0.03] p-1 border border-white/[0.06]">
            <button
              onClick={() => handleSelectTab('queue')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'queue'
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Sıradaki Parçalar</span>
            </button>
            <button
              onClick={() => handleSelectTab('radio')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'radio'
                  ? 'bg-accent-theme text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Radyo Oluştur</span>
            </button>
            <button
              onClick={() => handleSelectTab('lyrics')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'lyrics'
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>Sözler</span>
            </button>
          </div>

          {/* Tab 1: Queue / Up Next */}
          {activeTab === 'queue' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-1 text-zinc-400">
                <span className="font-semibold text-zinc-300">
                  Sırada Çalacaklar ({queueSongs.length} parça)
                </span>
                <span className="text-[11px] text-accent-theme">Parçaya dokunup anında çal</span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
                {queueSongs.map((nextSong, idx) => (
                  <button
                    key={nextSong.id}
                    onClick={() => {
                      onSelectSong(nextSong);
                      onShowToast(`Şimdi çalıyor: ${nextSong.title} - ${nextSong.artist} 🎶`);
                    }}
                    className="w-full p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-zinc-500 w-4 text-center">
                        {idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border border-white/[0.08] shrink-0">
                        {nextSong.coverUrl ? (
                          <img
                            src={nextSong.coverUrl}
                            alt={nextSong.album}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-tr ${nextSong.coverGradient}`}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white group-hover:text-accent-theme truncate">
                          {nextSong.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {nextSong.artist} ·{' '}
                          <span className="text-zinc-500">{nextSong.genre}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[11px] text-zinc-500 tabular-nums">
                        {formatTime(nextSong.durationSeconds)}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-white/[0.06] text-[10px] text-accent-theme font-semibold group-hover:bg-accent-theme group-hover:text-zinc-950 transition">
                        Çal
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Radio Station */}
          {activeTab === 'radio' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
              {isLoadingRadio ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-center text-xs text-neutral-400">
                  <Loader2 className="w-6 h-6 text-lime-400 animate-spin" />
                  <span className="font-medium text-white">
                    {song.artist} Sanatçı Radyosu Hazırlanıyor...
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Hit parçalar ve benzer frekanslar taranıyor
                  </span>
                </div>
              ) : radioStation ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-lime-400">
                        <Radio className="w-4 h-4" />
                        <span>{radioStation.stationName}</span>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {radioStation.description}
                      </p>
                    </div>
                    <button
                      onClick={handleStartRadio}
                      className="px-3 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-neutral-950 text-xs font-bold shrink-0 transition flex items-center gap-1 shadow min-h-[34px]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Yenile</span>
                    </button>
                  </div>

                  {/* Radio Tracklist */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar pt-1">
                    {radioStation.tracks.map((rTrack) => {
                      const isCurrent = rTrack.id === song.id;
                      return (
                        <button
                          key={rTrack.id}
                          onClick={() => {
                            onSelectSong(rTrack);
                            onShowToast(`Radyo Frekansı: ${rTrack.title} çalınıyor ✨`);
                          }}
                          className={`w-full p-2.5 rounded-xl border transition flex items-center justify-between text-left group min-h-[44px] ${
                            isCurrent
                              ? 'bg-lime-400/15 border-lime-400/40 text-lime-300'
                              : 'bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-neutral-700 bg-neutral-900">
                              {rTrack.coverUrl ? (
                                <img
                                  src={rTrack.coverUrl}
                                  alt={rTrack.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div
                                  className={`w-full h-full bg-gradient-to-tr ${rTrack.coverGradient}`}
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white group-hover:text-lime-300 transition truncate flex items-center gap-1.5">
                                <span className="truncate">{rTrack.title}</span>
                                {isCurrent && (
                                  <span className="text-lime-400 font-bold">· Çalıyor</span>
                                )}
                                {rTrack.isExplicit && (
                                  <span className="text-[9px] text-amber-400 font-mono font-bold shrink-0">
                                    · E
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                                {rTrack.artist} {rTrack.album ? `· ${rTrack.album}` : ''}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-neutral-400 font-mono tabular-nums shrink-0 ml-2">
                            {formatTime(rTrack.durationSeconds)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Tab 3: Real LRCLIB Synchronized & Plain Lyrics */}
          {activeTab === 'lyrics' && (
            <div
              ref={lyricsContainerRef}
              className="p-4 rounded-2xl bg-white/95 dark:bg-neutral-900/80 border border-zinc-200 dark:border-neutral-800 max-h-56 overflow-y-auto space-y-3 text-center no-scrollbar"
            >
              {isLoadingLyrics ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Gerçek şarkı sözleri getiriliyor...
                  </span>
                </div>
              ) : lyricsData?.status === 'synced' ? (
                <>
                  <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                    Senkronize Şarkı Sözleri
                  </div>
                  {lyricsData.syncedLines.map((line, idx) => {
                    const nextLine = lyricsData.syncedLines[idx + 1];
                    const isActive =
                      progressSeconds >= line.second &&
                      (!nextLine || progressSeconds < nextLine.second);
                    return (
                      <p
                        key={`${line.second}-${idx}`}
                        onClick={() => onSeek(Math.floor(line.second))}
                        className={`cursor-pointer transition-all duration-300 py-1 ${
                          isActive
                            ? 'active-lyric-line text-zinc-900 dark:text-white text-lg font-bold scale-[1.02]'
                            : 'text-sm font-medium text-zinc-400 dark:text-neutral-500 hover:text-zinc-700 dark:hover:text-neutral-300'
                        }`}
                      >
                        {line.text}
                      </p>
                    );
                  })}
                </>
              ) : lyricsData?.status === 'plain' ? (
                <>
                  <div className="text-[11px] font-bold text-zinc-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                    Şarkı Sözleri (Düz Metin)
                  </div>
                  {lyricsData.plainLines.map((line, idx) => (
                    <p
                      key={idx}
                      className="text-sm font-medium text-zinc-700 dark:text-zinc-200 leading-relaxed"
                    >
                      {line}
                    </p>
                  ))}
                </>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center gap-2.5">
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Bu parça için senkronize şarkı sözü bulunamadı.
                  </p>
                  <a
                    href={getGoogleLyricsSearchUrl(song.artist, song.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white text-xs font-bold shadow-sm hover:opacity-95 transition active:scale-95"
                  >
                    <span>Sözleri Web&apos;de Ara</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. IN-PLAYER LISTENERS BOTTOM SHEET (Stay inside player modal!) */}
        {showListenersSheet && (
          <div
            className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md rounded-t-[32px] flex flex-col justify-end overflow-hidden animate-in fade-in duration-200"
            onClick={() => setShowListenersSheet(false)}
          >
            <div
              className="w-full bg-[#0E0E12] border-t border-white/10 rounded-t-[28px] p-4 sm:p-5 shadow-2xl flex flex-col max-h-[82vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Grab handle */}
              <div
                className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-3 cursor-pointer"
                onClick={() => setShowListenersSheet(false)}
              />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                    <Flame className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Canlı Oda Dinleyicileri</span>
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[11px] font-mono font-bold">
                        {activeRoomListeners.length} Dinleyici
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      "{song.title}" parçasını şu an aynı anda dinleyenler
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowListenersSheet(false)}
                  className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Quick Filters */}
              <div className="py-2.5 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={sheetSearchQuery}
                    onChange={(e) => setSheetSearchQuery(e.target.value)}
                    placeholder="Dinleyici adı veya şehir ara..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-theme"
                  />
                  {sheetSearchQuery && (
                    <button
                      onClick={() => setSheetSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                  <button
                    onClick={() => setSheetFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                      sheetFilter === 'all'
                        ? 'bg-white text-zinc-950 font-bold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    Tümü ({activeRoomListeners.length})
                  </button>
                  <button
                    onClick={() => setSheetFilter('synced')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 flex items-center gap-1 ${
                      sheetFilter === 'synced'
                        ? 'bg-accent-theme text-zinc-950 font-bold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>Aynı Saniyede (±15s)</span>
                  </button>
                  <button
                    onClick={() => setSheetFilter('kadikoy')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                      sheetFilter === 'kadikoy'
                        ? 'bg-white text-zinc-950 font-bold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    Kadıköy / Moda
                  </button>
                </div>
              </div>

              {/* Scrollable list of listeners */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5">
                {filteredSheetListeners.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Arama kriterine uygun dinleyici bulunamadı.
                  </div>
                ) : (
                  filteredSheetListeners.map((user) => {
                    const isSynced = Math.abs(user.currentSecond - progressSeconds) <= 10;
                    return (
                      <div
                        key={user.id}
                        className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition flex flex-col gap-2 group"
                      >
                        <div className="flex items-center justify-between">
                          {/* User Avatar + Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <div
                                className={`w-10 h-10 rounded-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white text-xs font-bold border border-white/20 shadow`}
                              >
                                {user.name.slice(0, 2).toUpperCase()}
                              </div>
                              {/* Online green indicator */}
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">
                                  {user.name}
                                </span>
                                <span className="text-[11px] text-zinc-400">· {user.age}</span>
                                {user.compatibilityScore && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                    %{user.compatibilityScore}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                                <span>{user.city}</span>
                                <span>·</span>
                                <span className="text-zinc-500">{user.distanceKm} km</span>
                              </div>
                            </div>
                          </div>

                          {/* Second in Song & Sync Button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                onSeek(user.currentSecond);
                                onShowToast(
                                  `⚡ ${user.name} ile senkronize olundu (${formatTime(
                                    user.currentSecond
                                  )})`
                                );
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition flex items-center gap-1 ${
                                isSynced
                                  ? 'bg-accent-theme text-zinc-950 font-bold shadow'
                                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 border border-white/[0.08]'
                              }`}
                              title="Bu dinleyicinin saniyesine sar"
                            >
                              <Clock className="w-3 h-3 text-accent-theme" />
                              <span className="font-mono">{formatTime(user.currentSecond)}'te</span>
                            </button>
                          </div>
                        </div>

                        {/* Status quote bubble if present */}
                        {user.statusBubble && (
                          <div className="text-[11px] text-zinc-300 bg-white/[0.02] border border-white/[0.04] px-2.5 py-1 rounded-lg italic">
                            "{user.statusBubble}"
                          </div>
                        )}

                        {/* Quick action buttons */}
                        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-white/[0.04]">
                          {onSelectUser && (
                            <button
                              onClick={() => {
                                onSelectUser(user);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 transition"
                            >
                              Profili İncele
                            </button>
                          )}
                          {onStartChatWithUser && (
                            <button
                              onClick={() => {
                                onStartChatWithUser(user);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-accent-theme/15 hover:bg-accent-theme text-accent-theme hover:text-zinc-950 border border-accent-theme/30 transition flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>Sohbet Et</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
