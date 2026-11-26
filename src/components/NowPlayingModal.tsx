import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Mic2,
  Clock,
  Music,
  Music2,
  Loader2,
  Users,
  Search,
  MessageCircle,
  Zap,
  ExternalLink,
  Check,
} from 'lucide-react';
import { Song, PlatformType, LoungeUser } from '../types';
import { fetchArtistRadio } from '../services/musicResolver';
import { triggerHaptic } from '../services/themeService';
import {
  fetchSongLyrics,
  getGoogleLyricsSearchUrl,
  LyricsResult,
} from '../services/lyricsService';
import { extractPaletteFromImage, DEFAULT_PALETTE } from '../services/colorExtractor';

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

type DesktopPanelTab = 'lyrics' | 'queue' | 'radio' | 'listeners';
type MobileBottomTab = 'queue' | 'radio' | 'listeners';

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
      <div className="h-1.5 w-full rounded-full bg-[#E6E4DF] dark:bg-white/15 cursor-pointer relative group">
        <div
          className="h-full rounded-full bg-[#111113] dark:bg-white transition-[width] duration-150"
          style={{ width: `${activePercent}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#111113] dark:bg-white shadow-sm border-2 border-[#FAF9F6] dark:border-[#0B0B0D] pointer-events-none transition-transform duration-150 ${
            isDragging ? 'scale-125' : 'group-hover:scale-110'
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
  onStartRadioStation,
  isFavorite,
  onToggleFavorite,
  listeners = [],
  onSelectUser,
  onStartChatWithUser,
  isAudioLoading = false,
}) => {
  // Desktop right-column panel tab (Sözler | Sıradaki | Radyo | Odadakiler)
  const [desktopTab, setDesktopTab] = useState<DesktopPanelTab>('lyrics');
  // Mobile hero mode (Kapak | Sözler) & bottom list tab (Sıradaki | Radyo | Odadakiler)
  const [mobileHeroMode, setMobileHeroMode] = useState<'cover' | 'lyrics'>('cover');
  const [mobileBottomTab, setMobileBottomTab] = useState<MobileBottomTab>('queue');

  const [coverError, setCoverError] = useState<boolean>(false);
  const [albumRgb, setAlbumRgb] = useState<string>(DEFAULT_PALETTE.rgbString);
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

  // Room listeners filter state (used in both Desktop right column and Mobile bottom tab)
  const [listenerSearchQuery, setListenerSearchQuery] = useState<string>('');
  const [listenerFilter, setListenerFilter] = useState<'all' | 'synced' | 'kadikoy'>('all');

  const desktopLyricsRef = useRef<HTMLDivElement>(null);
  const mobileLyricsRef = useRef<HTMLDivElement>(null);
  const mobileQueueSectionRef = useRef<HTMLDivElement>(null);

  const [shareCopied, setShareCopied] = useState(false);
  const shareCopiedTimerRef = useRef<number | null>(null);

  // Lock background scroll & support Escape key while full-screen player is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setCoverError(false);
  }, [song.coverUrl, song.id]);

  // Extract organic ambient RGB color directly from active album cover
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    if (!song.coverUrl) {
      setAlbumRgb(DEFAULT_PALETTE.rgbString);
      return;
    }
    extractPaletteFromImage(song.coverUrl)
      .then((palette) => {
        if (!cancelled && palette?.rgbString) {
          setAlbumRgb(palette.rgbString);
        }
      })
      .catch(() => {
        if (!cancelled) setAlbumRgb(DEFAULT_PALETTE.rgbString);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, song.coverUrl, song.id]);

  useEffect(() => {
    if (!isOpen) {
      setShareCopied(false);
      if (shareCopiedTimerRef.current) {
        window.clearTimeout(shareCopiedTimerRef.current);
        shareCopiedTimerRef.current = null;
      }
    }
    return () => {
      if (shareCopiedTimerRef.current) {
        window.clearTimeout(shareCopiedTimerRef.current);
        shareCopiedTimerRef.current = null;
      }
    };
  }, [isOpen]);

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
    const safe = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
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

  // Auto-scroll active lyric line into view in Desktop Lyrics panel & Mobile Lyrics box
  useEffect(() => {
    if (lyricsData?.status !== 'synced') return;

    if (desktopTab === 'lyrics' && desktopLyricsRef.current) {
      const activeEl = desktopLyricsRef.current.querySelector('.active-lyric-line');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    if (mobileHeroMode === 'lyrics' && mobileLyricsRef.current) {
      const activeEl = mobileLyricsRef.current.querySelector('.active-lyric-line');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [progressSeconds, desktopTab, mobileHeroMode, lyricsData?.status]);

  // Active room listeners list
  const activeRoomListeners: LoungeUser[] = useMemo(() => {
    if (listeners && listeners.length >= 14) {
      return listeners;
    }
    const seed = [
      ...(listeners || []),
      {
        id: 'user-mert-room',
        name: 'Mert Arslan',
        age: 24,
        city: 'İstanbul, Kadıköy',
        avatarSeed: 'mert',
        avatarGradient: 'from-emerald-500 to-teal-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: Math.max(0, progressSeconds - 8),
        statusBubble: 'Gitar solosu tüyler ürpertiyor',
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
        city: 'İstanbul, Kadıköy',
        avatarSeed: 'selin',
        avatarGradient: 'from-purple-500 to-pink-600',
        platform: 'youtube_music' as PlatformType,
        currentSecond: progressSeconds,
        statusBubble: 'Aynı saniyedeyiz!',
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
        city: 'İstanbul, Beşiktaş',
        avatarSeed: 'burak',
        avatarGradient: 'from-zinc-600 to-zinc-800',
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
        city: 'İstanbul, Beyoğlu',
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
        city: 'İstanbul, Kadıköy',
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
        city: 'İstanbul, Üsküdar',
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
        city: 'İstanbul, Bakırköy',
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
        city: 'İstanbul, Kadıköy',
        avatarSeed: 'yagmur',
        avatarGradient: 'from-violet-500 to-purple-800',
        platform: 'youtube_music' as PlatformType,
        currentSecond: Math.max(0, progressSeconds - 5),
        statusBubble: 'Sürekli replay',
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
        city: 'İstanbul, Şişli',
        avatarSeed: 'onur',
        avatarGradient: 'from-slate-600 to-zinc-800',
        platform: 'youtube_music' as PlatformType,
        currentSecond: 74,
        statusBubble: 'Kulaklıkla yüksek ses',
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
        city: 'İstanbul, Kadıköy',
        avatarSeed: 'zeynep',
        avatarGradient: 'from-fuchsia-500 to-pink-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: progressSeconds,
        statusBubble: 'Tam bu saniye harika',
        topArtists: ['Duman', 'Jakuzi', 'Palmiyeler'],
        bio: 'Kadıköy sahil buluşmaları & indie rock.',
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
        city: 'İstanbul, Ataşehir',
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
        city: 'İstanbul, Beyoğlu',
        avatarSeed: 'irem',
        avatarGradient: 'from-indigo-500 to-slate-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: 180,
        statusBubble: 'Bırak dönsün devran',
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
        city: 'İstanbul, Kadıköy',
        avatarSeed: 'tolga',
        avatarGradient: 'from-stone-500 to-zinc-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: 215,
        statusBubble: 'Kapanış riffleri',
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
        city: 'İstanbul, Kadıköy',
        avatarSeed: 'asli',
        avatarGradient: 'from-rose-500 to-pink-700',
        platform: 'youtube_music' as PlatformType,
        currentSecond: progressSeconds,
        statusBubble: 'Aynı frekanstayız',
        topArtists: ['Duman', 'Mor ve Ötesi'],
        bio: 'ListenHub canlı dinleyicisi.',
        trustScore: 98,
        lastHeartbeatAgoSeconds: 1,
        isOnline: true,
        distanceKm: 0.6,
        compatibilityScore: 98,
      },
    ];

    const uniqueMap = new Map<string, LoungeUser>();
    for (const u of seed) {
      if (!uniqueMap.has(u.id)) {
        uniqueMap.set(u.id, u);
      }
    }
    return Array.from(uniqueMap.values()).slice(0, 14);
  }, [listeners, progressSeconds, song.durationSeconds]);

  const filteredListeners = useMemo(() => {
    return activeRoomListeners.filter((user) => {
      const q = listenerSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.city.toLowerCase().includes(q) ||
        (user.statusBubble && user.statusBubble.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (listenerFilter === 'synced') {
        return Math.abs(user.currentSecond - progressSeconds) <= 15;
      }
      if (listenerFilter === 'kadikoy') {
        return (
          user.city.toLowerCase().includes('kadıköy') || user.city.toLowerCase().includes('moda')
        );
      }
      return true;
    });
  }, [activeRoomListeners, listenerSearchQuery, listenerFilter, progressSeconds]);

  if (!isOpen) return null;

  const effectiveIsLiked = isFavorite !== undefined ? isFavorite : isLiked;

  const handleToggleLike = () => {
    setIsHeartPopping(false);
    requestAnimationFrame(() => setIsHeartPopping(true));
    setTimeout(() => setIsHeartPopping(false), 240);

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
      onShowToast(`"${song.title}" favorilerine eklendi.`);
    }

    if (onToggleFavorite) {
      onToggleFavorite(song);
    }
  };

  const handleToggleRepeat = () => {
    triggerHaptic(12);
    if (repeatMode === 'off') {
      setRepeatMode('all');
      onShowToast('Tümünü Tekrarla Açık');
    } else if (repeatMode === 'all') {
      setRepeatMode('one');
      onShowToast('Tek Şarkıyı Tekrarla Açık');
    } else {
      setRepeatMode('off');
      onShowToast('Tekrar Kapalı');
    }
  };

  const handleStartRadio = async () => {
    setIsLoadingRadio(true);
    setDesktopTab('radio');
    setMobileBottomTab('radio');
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
        `${radio?.stationName || song.artist + ' Radyosu'} başlatıldı. 35+ parça kesintisiz akıyor.`
      );
    } catch {
      setIsLoadingRadio(false);
    }
  };

  const handleShare = async () => {
    triggerHaptic(15);
    const shareUrl = `${window.location.origin}/?track=${encodeURIComponent(
      song.title
    )}&artist=${encodeURIComponent(song.artist)}&t=${Math.floor(progressSeconds)}`;
    const shareText = `ListenHub'da ${song.artist} – ${song.title} (${formatTime(
      progressSeconds
    )}) anına katıl!`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'ListenHub',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    let copied = false;
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, shareUrl.length);
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(textarea);
    }

    setShareCopied(true);
    if (shareCopiedTimerRef.current) {
      window.clearTimeout(shareCopiedTimerRef.current);
    }
    shareCopiedTimerRef.current = window.setTimeout(() => {
      setShareCopied(false);
      shareCopiedTimerRef.current = null;
    }, 2000);
  };

  // Upcoming queue songs (strictly deduplicated by id)
  const currentIndex = allSongs.findIndex((s) => s.id === song.id);
  const rawQueueSongs =
    currentIndex !== -1
      ? [...allSongs.slice(currentIndex + 1), ...allSongs.slice(0, currentIndex)]
      : allSongs.filter((s) => s.id !== song.id);
  const seenQueueIds = new Set<string>([song.id]);
  const queueSongs = rawQueueSongs.filter((s) => {
    if (!s?.id || seenQueueIds.has(s.id)) return false;
    seenQueueIds.add(s.id);
    return true;
  });

  // Reusable Lyrics Content Renderer
  const renderLyricsContent = (
    scrollRef: React.RefObject<HTMLDivElement | null>,
    compact: boolean
  ) => {
    if (isLoadingLyrics) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-2.5 px-6 py-10 text-center">
          <Loader2 className="w-5 h-5 text-[#111113] dark:text-[#F5F5F7] animate-spin" />
          <span className="text-xs font-semibold text-[#111113] dark:text-[#F5F5F7]">
            Şarkı sözleri getiriliyor...
          </span>
          <span className="text-[11px] text-[#63636B] dark:text-[#8E8E98] truncate max-w-full">
            {song.artist} — {song.title}
          </span>
        </div>
      );
    }

    if (lyricsData?.status === 'synced') {
      return (
        <div
          ref={scrollRef}
          className={`flex-1 w-full overflow-y-auto no-scrollbar ${
            compact ? 'py-8 px-4 text-center space-y-3' : 'py-10 px-6 text-left space-y-4'
          } [mask-image:linear-gradient(to_bottom,transparent_0%,black_12%,black_88%,transparent_100%)]`}
        >
          {lyricsData.syncedLines.map((line, idx) => {
            const nextLine = lyricsData.syncedLines[idx + 1];
            const isActive =
              progressSeconds >= line.second &&
              (!nextLine || progressSeconds < nextLine.second);
            return (
              <div
                key={`${line.second}-${idx}`}
                onClick={() => {
                  triggerHaptic(10);
                  onSeek(Math.floor(line.second));
                }}
                className={`cursor-pointer transition-all duration-300 py-1 select-none ${
                  isActive
                    ? `active-lyric-line text-[#111113] dark:text-[#F5F5F7] ${
                        compact ? 'text-lg justify-center' : 'text-xl lg:text-2xl justify-start'
                      } font-bold flex items-center gap-2.5`
                    : `${
                        compact ? 'text-sm' : 'text-base'
                      } font-medium text-[#63636B]/55 dark:text-white/35 hover:text-[#111113] dark:hover:text-white/80`
                }`}
              >
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#22C55E] shrink-0" />
                )}
                <span>{line.text}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (lyricsData?.status === 'plain') {
      return (
        <div
          ref={scrollRef}
          className={`flex-1 w-full overflow-y-auto no-scrollbar ${
            compact ? 'py-5 px-4 text-center space-y-2.5' : 'py-6 px-6 text-left space-y-3'
          }`}
        >
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#63636B] dark:text-[#8E8E98] pb-1">
            Şarkı Sözleri
          </div>
          {lyricsData.plainLines.map((line, idx) => (
            <p
              key={idx}
              className={`${
                compact ? 'text-sm' : 'text-[15px]'
              } font-medium text-[#111113] dark:text-[#F5F5F7] leading-relaxed`}
            >
              {line}
            </p>
          ))}
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08] flex items-center justify-center text-[#63636B] dark:text-[#8E8E98]">
          <Mic2 className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <p className="text-xs sm:text-sm font-semibold text-[#111113] dark:text-[#F5F5F7] max-w-xs">
          Bu parça için senkronize şarkı sözü bulunamadı.
        </p>
        <a
          href={getGoogleLyricsSearchUrl(song.artist, song.title)}
          target="_blank"
          rel="noopener noreferrer"
          className="studio-btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] shadow-sm text-xs font-semibold transition active:scale-95"
        >
          <span>Sözleri Web&apos;de Ara</span>
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
        </a>
      </div>
    );
  };

  // Reusable Queue List Renderer
  const renderQueueList = () => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs px-1 text-[#63636B] dark:text-[#8E8E98]">
        <span className="font-semibold text-[#111113] dark:text-[#F5F5F7]">
          Sırada ({queueSongs.length} parça)
        </span>
        <span className="text-[11px]">Dokunup anında çal</span>
      </div>

      {queueSongs.length === 0 ? (
        <div className="py-10 text-center text-xs text-[#63636B] dark:text-[#8E8E98] space-y-2">
          <p>Sırada başka parça yok.</p>
          <button
            type="button"
            onClick={onOpenSongPicker}
            className="studio-btn-primary px-4 py-2 rounded-xl bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] font-semibold text-xs cursor-pointer"
          >
            Şarkı Ekle / Ara
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {queueSongs.map((nextSong, idx) => (
            <button
              key={`${nextSong.id}-${idx}`}
              type="button"
              onClick={() => {
                triggerHaptic(12);
                onSelectSong(nextSong);
                onShowToast(`Şimdi çalıyor: ${nextSong.title} - ${nextSong.artist}`);
              }}
              className="w-full p-2.5 rounded-xl bg-white dark:bg-[#1C1C22]/75 hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.06] active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs text-[#63636B] dark:text-[#8E8E98] w-5 text-center tabular-nums shrink-0">
                  {idx + 1}
                </span>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-[#E6E4DF] dark:border-white/[0.08] shrink-0">
                  {nextSong.coverUrl ? (
                    <img
                      src={nextSong.coverUrl}
                      alt={nextSong.album}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-tr ${
                        nextSong.coverGradient || 'from-zinc-700 to-zinc-900'
                      }`}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#111113] dark:text-[#F5F5F7] truncate">
                    {nextSong.title}
                  </div>
                  <div className="text-[11px] text-[#63636B] dark:text-[#8E8E98] truncate">
                    {nextSong.artist}
                    {nextSong.genre ? ` · ${nextSong.genre}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="font-mono text-[11px] text-[#63636B] dark:text-[#8E8E98] tabular-nums">
                  {formatTime(nextSong.durationSeconds)}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#F1EFEA] dark:bg-white/[0.08] text-[10px] text-[#111113] dark:text-[#F5F5F7] font-semibold">
                  Çal
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Reusable Radio Content Renderer
  const renderRadioList = () => (
    <div className="space-y-3">
      {isLoadingRadio ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-xs text-[#63636B] dark:text-[#8E8E98]">
          <Loader2 className="w-5 h-5 text-[#111113] dark:text-[#F5F5F7] animate-spin" />
          <span className="font-medium text-[#111113] dark:text-[#F5F5F7]">
            {song.artist} Radyosu Hazırlanıyor...
          </span>
        </div>
      ) : radioStation ? (
        <>
          <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E2DFD9] dark:border-white/[0.06]">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#111113] dark:text-[#F5F5F7]">
                <Radio className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#22C55E] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{radioStation.stationName}</span>
              </div>
              <p className="text-[11px] text-[#63636B] dark:text-[#8E8E98] leading-relaxed">
                {radioStation.description}
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartRadio}
              className="studio-btn-primary px-3 py-1.5 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] shadow-sm text-xs font-semibold shrink-0 active:scale-[0.96] transition-transform duration-100 ease-out flex items-center gap-1 min-h-[34px] cursor-pointer"
            >
              <span>Yenile</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {radioStation.tracks.map((rTrack, idx) => {
              const isCurrent = rTrack.id === song.id;
              return (
                <button
                  key={`${rTrack.id}-${idx}`}
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    onSelectSong(rTrack);
                    onShowToast(`Radyo: ${rTrack.title} çalınıyor`);
                  }}
                  className={`w-full p-2.5 rounded-xl border active:scale-[0.98] transition-all flex items-center justify-between text-left group min-h-[44px] cursor-pointer ${
                    isCurrent
                      ? 'bg-[#F1EFEA] dark:bg-[#1C1C22] border-[#16A34A]/40 dark:border-[#22C55E]/40'
                      : 'bg-white dark:bg-[#1C1C22]/60 border-[#E6E4DF] dark:border-white/[0.06] hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-[#E6E4DF] dark:border-white/[0.08] bg-zinc-900">
                      {rTrack.coverUrl ? (
                        <img
                          src={rTrack.coverUrl}
                          alt={rTrack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-tr ${
                            rTrack.coverGradient || 'from-zinc-700 to-zinc-900'
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#111113] dark:text-[#F5F5F7] truncate flex items-center gap-1.5">
                        <span className="truncate">{rTrack.title}</span>
                        {isCurrent && (
                          <span className="text-[#16A34A] dark:text-[#22C55E] font-medium shrink-0">
                            · Çalıyor
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#63636B] dark:text-[#8E8E98] truncate mt-0.5">
                        {rTrack.artist} {rTrack.album ? `· ${rTrack.album}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#63636B] dark:text-[#8E8E98] font-mono tabular-nums shrink-0 ml-2">
                    {formatTime(rTrack.durationSeconds)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );

  // Reusable Room Listeners Panel Renderer
  const renderRoomListeners = () => (
    <div className="space-y-3">
      {/* Search & Filter Row */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#63636B] dark:text-[#8E8E98]" />
          <input
            type="text"
            value={listenerSearchQuery}
            onChange={(e) => setListenerSearchQuery(e.target.value)}
            placeholder="Dinleyici adı veya şehir ara..."
            className="w-full pl-8 pr-7 py-2 rounded-xl bg-[#FAF9F6] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08] text-xs text-[#111113] dark:text-[#F5F5F7] placeholder-[#63636B] dark:placeholder-[#8E8E98] focus:outline-none focus:border-[#111113]/40 dark:focus:border-white/30"
          />
          {listenerSearchQuery && (
            <button
              type="button"
              onClick={() => setListenerSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] text-xs cursor-pointer"
              aria-label="Aramayı temizle"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setListenerFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 border cursor-pointer ${
              listenerFilter === 'all'
                ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-white border-[#111113]/15 dark:border-white/20 font-semibold'
                : 'bg-white dark:bg-[#1C1C22] text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border-[#E6E4DF] dark:border-white/[0.06]'
            }`}
          >
            Tümü ({activeRoomListeners.length})
          </button>
          <button
            type="button"
            onClick={() => setListenerFilter('synced')}
            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 flex items-center gap-1 border cursor-pointer ${
              listenerFilter === 'synced'
                ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-white border-[#111113]/15 dark:border-white/20 font-semibold'
                : 'bg-white dark:bg-[#1C1C22] text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border-[#E6E4DF] dark:border-white/[0.06]'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Aynı Saniyede (±15s)</span>
          </button>
          <button
            type="button"
            onClick={() => setListenerFilter('kadikoy')}
            className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 border cursor-pointer ${
              listenerFilter === 'kadikoy'
                ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-white border-[#111113]/15 dark:border-white/20 font-semibold'
                : 'bg-white dark:bg-[#1C1C22] text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border-[#E6E4DF] dark:border-white/[0.06]'
            }`}
          >
            Kadıköy / Moda
          </button>
        </div>
      </div>

      {/* Listener Cards */}
      <div className="space-y-2">
        {filteredListeners.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#63636B] dark:text-[#8E8E98]">
            Arama kriterine uygun dinleyici bulunamadı.
          </div>
        ) : (
          filteredListeners.map((user) => {
            const isSynced = Math.abs(user.currentSecond - progressSeconds) <= 10;
            return (
              <div
                key={user.id}
                className="p-3 rounded-2xl bg-white dark:bg-[#1C1C22]/75 hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.06] transition flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div
                        className={`avatar-circle w-10 h-10 rounded-full bg-gradient-to-tr ${user.avatarGradient} flex items-center justify-center text-white text-xs font-bold shadow ring-[1.5px] ring-emerald-500/80 ring-offset-2 ring-offset-[#FAF9F6] dark:ring-offset-[#141418]`}
                      >
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#111113] dark:text-[#F5F5F7] truncate">
                          {user.name}
                        </span>
                        <span className="text-[11px] text-[#63636B] dark:text-[#8E8E98] shrink-0">
                          · {user.age}
                        </span>
                        {user.compatibilityScore && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-[#16A34A] dark:text-[#22C55E] text-[10px] font-mono font-bold border border-emerald-500/25 shrink-0">
                            %{user.compatibilityScore}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#63636B] dark:text-[#8E8E98] flex items-center gap-1.5 truncate">
                        <span className="truncate">{user.city}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums shrink-0">{user.distanceKm} km</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(12);
                      onSeek(user.currentSecond);
                      onShowToast(
                        `${user.name} ile senkronize olundu (${formatTime(user.currentSecond)})`
                      );
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                      isSynced
                        ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] font-bold shadow-sm'
                        : 'bg-[#F1EFEA] dark:bg-[#141418] hover:bg-[#E6E4DF] dark:hover:bg-white/10 text-[#111113] dark:text-[#F5F5F7] border border-[#E2DFD9] dark:border-white/[0.08]'
                    }`}
                    title="Bu dinleyicinin saniyesine sar"
                  >
                    <Clock className="w-3 h-3" />
                    <span className="font-mono tabular-nums">{formatTime(user.currentSecond)}&apos;te</span>
                  </button>
                </div>

                {user.statusBubble && (
                  <div className="text-[11px] text-[#63636B] dark:text-[#8E8E98] bg-[#FAF9F6] dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.06] px-2.5 py-1.5 rounded-lg italic">
                    &ldquo;{user.statusBubble}&rdquo;
                  </div>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#E6E4DF] dark:border-white/[0.06]">
                  {onSelectUser && (
                    <button
                      type="button"
                      onClick={() => onSelectUser(user)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#F1EFEA] dark:bg-[#141418] hover:bg-[#E6E4DF] dark:hover:bg-white/[0.08] text-[#111113] dark:text-[#F5F5F7] transition cursor-pointer"
                    >
                      Profili İncele
                    </button>
                  )}
                  {onStartChatWithUser && (
                    <button
                      type="button"
                      onClick={() => onStartChatWithUser(user)}
                      className="studio-btn-primary px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] transition flex items-center gap-1 cursor-pointer"
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
  );

  // Reusable Track Metadata + Like Row
  const renderTrackMeta = () => (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl sm:text-2xl font-bold text-[#111113] dark:text-[#F5F5F7] tracking-tight truncate">
          {song.title}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-[13px] text-[#63636B] dark:text-[#8E8E98] mt-1">
          <span className="font-semibold text-[#111113] dark:text-[#F5F5F7] truncate">
            {song.artist}
          </span>
          {song.album && (
            <>
              <span>·</span>
              <span className="truncate">{song.album}</span>
            </>
          )}
          {song.releaseYear && (
            <>
              <span>·</span>
              <span className="font-mono tabular-nums">{song.releaseYear}</span>
            </>
          )}
        </div>
      </div>

      {/* Like Heart Button */}
      <button
        type="button"
        onClick={handleToggleLike}
        className={`p-2.5 rounded-xl border transition-transform duration-100 ease-out active:scale-[0.96] flex flex-col items-center gap-0.5 min-w-[52px] shrink-0 cursor-pointer ${
          effectiveIsLiked
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            : 'bg-white/80 dark:bg-[#141418] border-[#E6E4DF] dark:border-white/[0.08] text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
        }`}
        title="Şarkıyı Beğen"
        aria-label="Şarkıyı Beğen"
      >
        <Heart
          className={`w-5 h-5 ${
            isHeartPopping ? 'animate-heart-pulse text-rose-500' : ''
          } ${effectiveIsLiked ? 'fill-current text-rose-500' : ''}`}
          strokeWidth={1.75}
        />
        <span className="font-mono text-[10px] font-semibold tabular-nums">{likeCount}</span>
      </button>
    </div>
  );

  // Reusable Seek Bar + Timestamps
  const renderSeekBlock = () => (
    <div className="w-full space-y-1">
      <ModernSeekBar
        progressSeconds={progressSeconds}
        durationSeconds={song.durationSeconds || 1}
        onSeek={onSeek}
      />
      <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-[#63636B] dark:text-[#8E8E98] -mt-1.5">
        <span>{formatTime(progressSeconds)}</span>
        <span>{formatTime(song.durationSeconds)}</span>
      </div>
    </div>
  );

  // Reusable Transport Controls (Shuffle | Prev | Big Play | Next | Repeat)
  const renderTransportControls = () => (
    <div className="w-full flex items-center justify-between px-1">
      <button
        type="button"
        onClick={() => {
          triggerHaptic(12);
          setIsShuffle(!isShuffle);
          onShowToast(!isShuffle ? 'Karışık çalma açık' : 'Karışık çalma kapalı');
        }}
        className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl flex items-center justify-center transition-transform duration-100 ease-out active:scale-[0.96] cursor-pointer border ${
          isShuffle
            ? 'bg-[#111113]/[0.08] dark:bg-white/[0.12] text-[#111113] dark:text-white border-[#111113]/15 dark:border-white/20'
            : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border-transparent'
        }`}
        title="Karışık Çal"
        aria-label="Karışık Çal"
      >
        <Shuffle className="w-5 h-5" strokeWidth={1.75} />
      </button>

      <button
        type="button"
        onClick={() => {
          triggerHaptic(14);
          onPrevSong();
        }}
        className="min-h-[48px] min-w-[48px] p-3 rounded-xl text-[#111113] dark:text-[#F5F5F7] hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22] transition-transform duration-100 ease-out active:scale-[0.96] flex items-center justify-center cursor-pointer"
        title="Önceki Şarkı"
        aria-label="Önceki Şarkı"
      >
        <SkipBack className="w-6 h-6 fill-current" />
      </button>

      <button
        type="button"
        onClick={() => {
          triggerHaptic(18);
          onTogglePlay();
        }}
        className="studio-btn-primary w-16 h-16 min-h-[64px] min-w-[64px] rounded-full bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] shadow-lg flex items-center justify-center transition-transform duration-100 ease-out active:scale-[0.96] cursor-pointer"
        title={isPlaying ? 'Duraklat' : 'Oynat'}
        aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
      >
        {isAudioLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-6 h-6 fill-current" />
        ) : (
          <Play className="w-6 h-6 fill-current ml-0.5" />
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          triggerHaptic(14);
          onNextSong();
        }}
        className="min-h-[48px] min-w-[48px] p-3 rounded-xl text-[#111113] dark:text-[#F5F5F7] hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22] transition-transform duration-100 ease-out active:scale-[0.96] flex items-center justify-center cursor-pointer"
        title="Sonraki Şarkı"
        aria-label="Sonraki Şarkı"
      >
        <SkipForward className="w-6 h-6 fill-current" />
      </button>

      <button
        type="button"
        onClick={handleToggleRepeat}
        className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl flex items-center justify-center transition-transform duration-100 ease-out active:scale-[0.96] cursor-pointer border ${
          repeatMode !== 'off'
            ? 'bg-[#111113]/[0.08] dark:bg-white/[0.12] text-[#111113] dark:text-white border-[#111113]/15 dark:border-white/20'
            : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border-transparent'
        }`}
        title="Tekrar Modu"
        aria-label="Tekrar Modu"
      >
        {repeatMode === 'one' ? (
          <Repeat1 className="w-5 h-5" strokeWidth={1.75} />
        ) : (
          <Repeat className="w-5 h-5" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tam Ekran Müzik Oynatıcı"
      className="fixed inset-0 z-[120] h-[100dvh] w-full flex flex-col bg-[#0B0B0D] light:bg-[#FAF9F6] text-[#F5F5F7] light:text-[#111113] overflow-hidden"
    >
      {/* Full-Screen Organic Album Cover Ambient Glow (Radial Gradient + Soft Blurred Artwork Wash) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Dark Mode Organic Radial Glow */}
        <div
          className="hidden dark:block absolute inset-0 transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 85% 65% at 30% 28%, rgba(${albumRgb}, 0.26) 0%, rgba(${albumRgb}, 0.08) 48%, rgba(11, 11, 13, 0) 80%)`,
          }}
        />
        {/* Light Mode Organic Radial Glow */}
        <div
          className="block dark:hidden absolute inset-0 transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 85% 65% at 30% 28%, rgba(${albumRgb}, 0.13) 0%, rgba(${albumRgb}, 0.04) 48%, rgba(250, 249, 246, 0) 80%)`,
          }}
        />
        {/* Ultra-Soft Blurred Full-Bleed Artwork Wash */}
        {song.coverUrl && !coverError && (
          <img
            src={song.coverUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover blur-[100px] scale-125 opacity-[0.05] dark:opacity-[0.12] select-none transition-all duration-700"
          />
        )}
      </div>

      {/* TOP STUDIO HEADER BAR (Aligned directly to max-w-5xl mx-auto px-6 axis) */}
      <header className="relative z-20 shrink-0 w-full border-b border-[#E6E4DF]/80 dark:border-white/[0.06] bg-[#FAF9F6]/90 dark:bg-[#0B0B0D]/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2.5 flex items-center justify-between gap-2">
          {/* Left: Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-2.5 sm:px-3 py-2 rounded-xl text-[#111113] dark:text-[#F5F5F7] hover:bg-[#F1EFEA] dark:hover:bg-white/[0.08] transition-transform duration-100 ease-out active:scale-[0.96] flex items-center gap-1.5 cursor-pointer"
            title="Kapat / Simge Durumuna Küçült"
            aria-label="Kapat"
          >
            <ChevronDown className="w-5 h-5" strokeWidth={1.85} />
            <span className="text-xs font-semibold">Kapat</span>
          </button>

          {/* Center: Passive Source Info Label (No external redirect links) */}
          <div className="flex items-center gap-1.5 text-xs text-[#63636B] dark:text-[#8E8E98] font-medium truncate max-w-[160px] sm:max-w-xs">
            <Music2 className="w-3.5 h-3.5 shrink-0 text-[#111113] dark:text-[#F5F5F7]" strokeWidth={1.75} />
            <span className="truncate">
              {activePlatform === 'youtube_music'
                ? 'YouTube Music'
                : activePlatform === 'spotify'
                ? 'Spotify'
                : 'Apple Music'}
            </span>
          </div>

          {/* Right: Share ListenHub Moment + Queue/Song Picker */}
          <div className="flex items-center gap-1">
            <div className="relative flex items-center">
              {shareCopied && (
                <div
                  role="status"
                  aria-live="polite"
                  className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-[130] whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-[#1C1C22] text-[#111113] dark:text-[#F5F5F7] border border-[#16A34A]/35 dark:border-[#22C55E]/35 shadow-lg flex items-center gap-1.5 pointer-events-none"
                >
                  <Check className="w-3 h-3 text-[#16A34A] dark:text-[#22C55E] shrink-0" strokeWidth={2.5} />
                  <span>ListenHub an bağlantısı kopyalandı</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleShare}
                className={`min-h-[42px] min-w-[42px] p-2 rounded-xl transition-transform duration-100 ease-out active:scale-[0.96] flex items-center justify-center cursor-pointer ${
                  shareCopied
                    ? 'bg-[#16A34A]/15 dark:bg-[#22C55E]/15 text-[#16A34A] dark:text-[#22C55E]'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] hover:bg-[#F1EFEA] dark:hover:bg-white/[0.08]'
                }`}
                title={shareCopied ? 'ListenHub an bağlantısı kopyalandı' : 'ListenHub Anını Paylaş'}
                aria-label="ListenHub Anını Paylaş"
              >
                {shareCopied ? (
                  <Check className="w-4 h-4 text-[#16A34A] dark:text-[#22C55E]" strokeWidth={2.25} />
                ) : (
                  <Share2 className="w-4 h-4" strokeWidth={1.75} />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(12);
                onOpenSongPicker();
              }}
              className="min-h-[42px] px-2.5 py-2 rounded-xl text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] hover:bg-[#F1EFEA] dark:hover:bg-white/[0.08] transition-transform duration-100 ease-out active:scale-[0.96] flex items-center gap-1.5 cursor-pointer"
              title="Şarkı Değiştir / Sıra"
              aria-label="Şarkı Değiştir"
            >
              <ListMusic className="w-5 h-5" strokeWidth={1.75} />
              <span className="text-xs font-semibold hidden sm:inline">Sıra</span>
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          DESKTOP LAYOUT (>= 1024px): 2-Column Wide Full-Screen Studio Stage
         ===================================================================== */}
      <main className="hidden lg:grid relative z-10 flex-1 min-h-0 max-w-5xl mx-auto w-full grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start px-6 py-6 overflow-y-auto no-scrollbar">
        {/* LEFT COLUMN: Clean Square Album Cover + Metadata + Seek + Monochrome Controls */}
        <section className="lg:col-span-6 flex flex-col items-center w-full max-w-[380px] mx-auto space-y-5">
          {/* Pure Uncropped Square Album Cover (No corner numbers/badges) */}
          <div className="w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-[#E6E4DF] dark:border-white/[0.08] bg-[#F1EFEA] dark:bg-[#141418] shrink-0 group">
            {song.coverUrl && !coverError ? (
              <img
                src={song.coverUrl}
                alt={song.album || song.title}
                referrerPolicy="no-referrer"
                onError={() => setCoverError(true)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-br ${
                  song.coverGradient || 'from-zinc-700 to-zinc-900'
                } flex items-center justify-center text-white/80`}
              >
                <Music className="w-20 h-20" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {/* Metadata + Heart */}
          <div className="w-full max-w-[340px] space-y-3">
            {renderTrackMeta()}

            {/* Live Room Counter Quick Jump */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(12);
                setDesktopTab('listeners');
              }}
              className="text-xs font-medium text-[#16A34A] dark:text-[#22C55E] hover:underline underline-offset-2 flex items-center gap-1.5 transition cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
              <span className="font-mono tabular-nums">{activeRoomListeners.length}</span>
              <span>kişi şu an bu odada</span>
            </button>

            {/* Seek Bar */}
            {renderSeekBlock()}

            {/* Transport Controls */}
            <div className="pt-1">{renderTransportControls()}</div>
          </div>
        </section>

        {/* RIGHT COLUMN: Full-Height Scrollable Studio Panel (Sözler | Sıradaki | Radyo | Oda (X)) */}
        <section className="lg:col-span-6 h-[calc(100dvh-132px)] max-h-[680px] flex flex-col rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] shadow-[0_12px_36px_rgba(17,17,19,0.05)] dark:shadow-none overflow-hidden">
          {/* Clean Single-Line 4-Tab Bar */}
          <div
            role="tablist"
            aria-label="Oynatıcı sekmeleri"
            className="shrink-0 p-2 border-b border-[#E6E4DF] dark:border-white/[0.08] bg-[#FAF9F6] dark:bg-[#0B0B0D]/40"
          >
            <div className="grid grid-cols-4 gap-1 w-full p-1 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E2DFD9] dark:border-white/[0.06]">
              <button
                type="button"
                role="tab"
                aria-selected={desktopTab === 'lyrics'}
                onClick={() => {
                  triggerHaptic(12);
                  setDesktopTab('lyrics');
                }}
                className={`whitespace-nowrap text-xs px-2 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  desktopTab === 'lyrics'
                    ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <Mic2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span>Sözler</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={desktopTab === 'queue'}
                onClick={() => {
                  triggerHaptic(12);
                  setDesktopTab('queue');
                }}
                className={`whitespace-nowrap text-xs px-2 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  desktopTab === 'queue'
                    ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span>Sıradaki</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={desktopTab === 'radio'}
                onClick={() => {
                  triggerHaptic(12);
                  setDesktopTab('radio');
                }}
                className={`whitespace-nowrap text-xs px-2 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  desktopTab === 'radio'
                    ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <Radio className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span>Radyo</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={desktopTab === 'listeners'}
                onClick={() => {
                  triggerHaptic(12);
                  setDesktopTab('listeners');
                }}
                className={`whitespace-nowrap text-xs px-2 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  desktopTab === 'listeners'
                    ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#22C55E] shrink-0" />
                <span>Oda ({activeRoomListeners.length})</span>
              </button>
            </div>
          </div>

          {/* Scrollable Tab Content Filling Full Right Column Height */}
          {desktopTab === 'lyrics' ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {renderLyricsContent(desktopLyricsRef, false)}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4">
              {desktopTab === 'queue' && renderQueueList()}
              {desktopTab === 'radio' && renderRadioList()}
              {desktopTab === 'listeners' && renderRoomListeners()}
            </div>
          )}
        </section>
      </main>

      {/* =====================================================================
          MOBILE & TABLET LAYOUT (< 1024px): Full-Screen Balanced Vertical Stage
         ===================================================================== */}
      <div className="lg:hidden relative z-10 flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="min-h-full w-full max-w-md mx-auto px-5 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] flex flex-col">
          {/* Primary Viewport Hero Block: Switcher + Cover/Lyrics + Metadata + Seek + Controls */}
          <div className="flex flex-col items-center justify-center space-y-5">
            {/* Compact Hero Mode Switcher: Kapak | Sözler */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E2DFD9] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  setMobileHeroMode('cover');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  mobileHeroMode === 'cover'
                    ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <Music className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Kapak</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  setMobileHeroMode('lyrics');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  mobileHeroMode === 'lyrics'
                    ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <Mic2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Sözler</span>
              </button>
            </div>

            {/* Breathing Full Square Album Cover OR Synchronized Lyrics in the Exact Same Slot */}
            {mobileHeroMode === 'cover' ? (
              <div className="w-[72vw] max-w-[300px] aspect-square mx-auto rounded-2xl overflow-hidden shadow-2xl border border-[#E6E4DF] dark:border-white/[0.08] bg-[#F1EFEA] dark:bg-[#141418] shrink-0">
                {song.coverUrl && !coverError ? (
                  <img
                    src={song.coverUrl}
                    alt={song.album || song.title}
                    referrerPolicy="no-referrer"
                    onError={() => setCoverError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${
                      song.coverGradient || 'from-zinc-700 to-zinc-900'
                    } flex items-center justify-center text-white/80`}
                  >
                    <Music className="w-16 h-16" strokeWidth={1.5} />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-[82vw] max-w-[320px] aspect-square mx-auto rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] shadow-xl flex flex-col overflow-hidden shrink-0">
                {renderLyricsContent(mobileLyricsRef, true)}
              </div>
            )}

            {/* Track Title, Artist & Like Button */}
            <div className="w-full space-y-3 pt-1">
              {renderTrackMeta()}
              {renderSeekBlock()}
              <div className="pt-1">{renderTransportControls()}</div>
            </div>
          </div>

          {/* Bottom Drawer/List Area: Sıradaki | Radyo | Oda (X) */}
          <section
            ref={mobileQueueSectionRef}
            className="mt-7 pt-5 border-t border-[#E6E4DF] dark:border-white/[0.08] space-y-4"
          >
            <div
              role="tablist"
              aria-label="Alt oynatıcı listeleri"
              className="grid grid-cols-3 gap-1 w-full p-1 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E2DFD9] dark:border-white/[0.06]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mobileBottomTab === 'queue'}
                onClick={() => {
                  triggerHaptic(12);
                  setMobileBottomTab('queue');
                }}
                className={`whitespace-nowrap text-xs px-2 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileBottomTab === 'queue'
                    ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span>Sıradaki</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mobileBottomTab === 'radio'}
                onClick={() => {
                  triggerHaptic(12);
                  setMobileBottomTab('radio');
                }}
                className={`whitespace-nowrap text-xs px-2 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileBottomTab === 'radio'
                    ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <Radio className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span>Radyo</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mobileBottomTab === 'listeners'}
                onClick={() => {
                  triggerHaptic(12);
                  setMobileBottomTab('listeners');
                }}
                className={`whitespace-nowrap text-xs px-2 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileBottomTab === 'listeners'
                    ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
                    : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span>Oda ({activeRoomListeners.length})</span>
              </button>
            </div>

            <div className="pb-4">
              {mobileBottomTab === 'queue' && renderQueueList()}
              {mobileBottomTab === 'radio' && renderRadioList()}
              {mobileBottomTab === 'listeners' && renderRoomListeners()}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
