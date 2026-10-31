import { useState, useEffect, useRef, useCallback } from 'react';
import { NavTab, BottomNav } from './components/BottomNav';
import { TopHeader } from './components/TopHeader';
import { LiveLoungeTab } from './components/LiveLoungeTab';
import { RoomsTab } from './components/RoomsTab';
import { ChatTab } from './components/ChatTab';
import { ProfileTab } from './components/ProfileTab';
import { MiniProfileDrawer } from './components/MiniProfileDrawer';
import { SongPickerModal } from './components/SongPickerModal';
import { InstallAppModal } from './components/InstallAppModal';
import { NowPlayingModal } from './components/NowPlayingModal';
import { LiveRoomListenersModal } from './components/LiveRoomListenersModal';
import { YouTubeMusicConnectModal } from './components/YouTubeMusicConnectModal';
import {
  SAMPLE_SONGS,
  INITIAL_LOUNGE_USERS,
  INITIAL_LOUNGE_CONVERSATIONS,
  INITIAL_FRIEND_REQUESTS,
} from './data/mockData';
import {
  Song,
  LoungeUser,
  PlatformType,
  LoungeConversation,
  IntentType,
  PrivacyMode,
  UserProfile,
  FriendRequest,
  UserPlaylist,
  PersonalMusicTaste,
  SubscribedChannelDetail,
  ChatMessage,
} from './types';
import { soundEngine } from './services/soundEngine';
import { usePwaUpdate } from './hooks/usePwaUpdate';
import {
  fetchArtistRadio,
  fetchMoreRadioRecommendations,
  fetchYouTubeVideoIdForSong,
  searchITunesAudio,
  syncYouTubeLibraryByInput,
  TURKISH_ROCK_RADIO_POOL,
} from './services/musicResolver';
import {
  DEFAULT_PERSONAL_TASTE,
  calculateLoungeCompatibilityWithTaste,
  generatePersonalizedRadioQueue,
  derivePersonalTasteFromData,
  calculateSongCompatibilityWithUser,
} from './services/tasteSyncService';
import {
  signInWithGoogle,
  logoutGoogle,
  fetchAllUserYouTubeMusicData,
  initAuth,
  getCachedAccessToken,
} from './services/googleAuthService';
import {
  cleanNonMusicArtists,
  purgeNonMusicFromLocalStorage,
} from './services/artistFilterService';
import { STORAGE_KEYS, safeLocalStorageSet, safeLocalStorageGet } from './services/storageService';
import { Play, Pause, SkipBack, SkipForward, Disc3, RefreshCw, Zap, Sparkles, X, Loader2 } from 'lucide-react';
import {
  extractPaletteFromImage,
  applyThemeToDocument,
  DEFAULT_PALETTE,
  ExtractedPalette,
} from './services/colorExtractor';
import { getSavedLocation, detectLiveLocation, localizeUsersForCity, setManualLocation } from './services/locationService';
import {
  ThemeMode,
  getSavedTheme,
  applyTheme,
  toggleThemeMode,
  resolveEffectiveTheme,
  triggerHaptic,
} from './services/themeService';

export default function App() {
  const pwa = usePwaUpdate();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getSavedTheme());

  // Initialize theme mode on mount & changes
  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    triggerHaptic(20);
    const next = toggleThemeMode(themeMode);
    setThemeMode(next);
    setToastMessage(next === 'dark' ? 'Obsidyen Gece Modu Aktif 🌙' : 'Stüdyo Gündüz Modu Aktif ☀️');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    applyTheme(mode);
    setToastMessage(
      mode === 'dark'
        ? 'Obsidyen Gece Modu Aktif 🌙'
        : mode === 'light'
        ? 'Stüdyo Gündüz Modu Aktif ☀️'
        : 'Otomatik Sistem Teması Aktif 📱'
    );
    setTimeout(() => setToastMessage(null), 2500);
  };
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam === 'lounge' || tabParam === 'rooms' || tabParam === 'chat' || tabParam === 'profile') {
        return tabParam as NavTab;
      }
    }
    return 'lounge';
  });
  const [currentSong, setCurrentSong] = useState<Song>(SAMPLE_SONGS[0]);
  const [activeTheme, setActiveTheme] = useState<ExtractedPalette>(DEFAULT_PALETTE);

  // Dynamic Color Theme Engine: Extracts palette from album artwork only when song or cover changes
  const lastExtractedSongRef = useRef<string>('');
  useEffect(() => {
    const key = `${currentSong.id}::${currentSong.coverUrl || ''}`;
    if (lastExtractedSongRef.current === key) return;
    lastExtractedSongRef.current = key;
    let isCancelled = false;
    extractPaletteFromImage(currentSong.coverUrl, currentSong.artist || currentSong.title).then((palette) => {
      if (!isCancelled) {
        setActiveTheme(palette);
        applyThemeToDocument(palette);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [currentSong.id, currentSong.coverUrl, currentSong.artist, currentSong.title]);

  const [mySecond, setMySecond] = useState<number>(0);
  const [activePlatform, setActivePlatform] = useState<PlatformType>('youtube_music');
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('public');

  const isTemplatePlaylist = (id: string) =>
    id === 'pl-yc-liked' || id === 'pl-yc-mix' || id === 'pl-yc-night';
  const isTemplateSong = (id: string) =>
    id === 'song-duman' ||
    id === 'song-morveotesi' ||
    id === 'song-arctic' ||
    id === 'song-jakuzi' ||
    id === 'song-teoman';

  const [syncedPlaylists, setSyncedPlaylists] = useState<UserPlaylist[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('harmoniq_user_playlists');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((p: UserPlaylist) => !isTemplatePlaylist(p.id));
          }
        } catch {
          // ignore parsing error
        }
      }
    }
    return [];
  });

  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('harmoniq_user_favorite_songs');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((s: Song) => !isTemplateSong(s.id));
          }
        } catch {
          // ignore parsing error
        }
      }
    }
    return [];
  });

  const [favoriteArtists, setFavoriteArtists] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('harmoniq_user_favorite_artists');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return cleanNonMusicArtists(parsed);
          }
        } catch {
          // ignore parsing error
        }
      }
    }
    return [];
  });

  // Automatically purge non-music YouTube channels (e.g. Marques Brownlee, tech reviewers) on mount
  useEffect(() => {
    purgeNonMusicFromLocalStorage(favoriteSongs);
  }, []);

  const [personalTaste, setPersonalTaste] = useState<PersonalMusicTaste>(DEFAULT_PERSONAL_TASTE);
  const [isTasteSynced, setIsTasteSynced] = useState<boolean>(false);
  const initialCity = typeof window !== 'undefined' ? getSavedLocation().city : 'İstanbul, Kadıköy';
  const [loungeUsers, setLoungeUsers] = useState<LoungeUser[]>(() =>
    localizeUsersForCity(calculateLoungeCompatibilityWithTaste([], INITIAL_LOUNGE_USERS), initialCity)
  );
  const [friendsList, setFriendsList] = useState<LoungeUser[]>(() =>
    localizeUsersForCity(
      INITIAL_LOUNGE_USERS.filter((u) => u.friendStatus === 'friends'),
      initialCity
    )
  );
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() =>
    INITIAL_FRIEND_REQUESTS.map((req) => ({
      ...req,
      fromUser: req.fromUser ? localizeUsersForCity([req.fromUser], initialCity)[0] : req.fromUser,
    }))
  );
  const [conversations, setConversations] = useState<LoungeConversation[]>(() =>
    INITIAL_LOUNGE_CONVERSATIONS.map((c) => ({
      ...c,
      user: localizeUsersForCity([c.user], initialCity)[0],
    }))
  );
  const [selectedDrawerUser, setSelectedDrawerUser] = useState<LoungeUser | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<LoungeUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [highCompatibilityToast, setHighCompatibilityToast] = useState<{
    user: LoungeUser;
    score: number;
    reason: string;
    songTitle: string;
    songArtist: string;
  } | null>(null);
  const notifiedMatchKeysRef = useRef<Set<string>>(new Set());
  const [toastDragOffsetY, setToastDragOffsetY] = useState<number>(0);
  const toastTouchStartYRef = useRef<number | null>(null);

  const handleToastTouchStart = (e: React.TouchEvent) => {
    toastTouchStartYRef.current = e.touches[0].clientY;
  };

  const handleToastTouchMove = (e: React.TouchEvent) => {
    if (toastTouchStartYRef.current !== null) {
      const deltaY = e.touches[0].clientY - toastTouchStartYRef.current;
      if (deltaY < 0) {
        setToastDragOffsetY(deltaY);
      }
    }
  };

  const handleToastTouchEnd = () => {
    if (toastDragOffsetY < -25) {
      triggerHaptic(15);
      setHighCompatibilityToast(null);
    }
    setToastDragOffsetY(0);
    toastTouchStartYRef.current = null;
  };

  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('harmoniq_user_avatar') || null;
    }
    return null;
  });

  const handleUpdateAvatar = (url: string | null) => {
    setUserAvatarUrl(url);
    if (typeof window !== 'undefined') {
      if (url) {
        localStorage.setItem('harmoniq_user_avatar', url);
      } else {
        localStorage.removeItem('harmoniq_user_avatar');
      }
    }
    setToastMessage(url ? 'Profil fotoğrafınız güncellendi.' : 'Profil fotoğrafınız kaldırıldı.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [isYouTubeConnected, setIsYouTubeConnected] = useState<boolean>(true);
  const [youtubeAccount, setYoutubeAccount] = useState<{ email: string; handle: string; name: string }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('harmoniq_user_account');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return {
      email: 'contact.yasincelebi@gmail.com',
      handle: '@yasincelebi',
      name: 'Yasin Çelebi',
    };
  });

  const [userBio, setUserBio] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('harmoniq_user_bio') || 'Müzik ruhun gerçek frekansıdır.';
    }
    return 'Müzik ruhun gerçek frekansıdır.';
  });

  const [userCity, setUserCity] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = getSavedLocation();
      return saved.city;
    }
    return 'İstanbul, Kadıköy';
  });

  // Synchronize 1 km - 15 km listener neighborhoods & density clusters whenever userCity changes
  useEffect(() => {
    setLoungeUsers((prev) => localizeUsersForCity(prev, userCity));
    setFriendsList((prev) => localizeUsersForCity(prev, userCity));
    setFriendRequests((prev) =>
      prev.map((req) => ({
        ...req,
        fromUser: req.fromUser ? localizeUsersForCity([req.fromUser], userCity)[0] : req.fromUser,
      }))
    );
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        user: localizeUsersForCity([c.user], userCity)[0],
      }))
    );
    setSelectedDrawerUser((prev) => (prev ? localizeUsersForCity([prev], userCity)[0] : null));
    setActiveChatUser((prev) => (prev ? localizeUsersForCity([prev], userCity)[0] : null));
  }, [userCity]);

  const [subscribedChannels, setSubscribedChannels] = useState<SubscribedChannelDetail[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('harmoniq_user_subscribed_channels');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  const handleUpdateAccount = (acc: { email: string; handle: string; name: string }) => {
    setYoutubeAccount(acc);
    if (typeof window !== 'undefined') {
      localStorage.setItem('harmoniq_user_account', JSON.stringify(acc));
    }
    setToastMessage('Profil ve hesap bilgileriniz güncellendi.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Playback & Infinite Radio Queue State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeQueue, setActiveQueue] = useState<Song[]>(SAMPLE_SONGS);
  const [autoRadioEnabled, setAutoRadioEnabled] = useState<boolean>(true);
  const [nextRadioSong, setNextRadioSong] = useState<Song | null>(null);
  const playedSongTitlesRef = useRef<Set<string>>(new Set([SAMPLE_SONGS[0].title.toLowerCase()]));
  const isFetchingMoreRadioRef = useRef<boolean>(false);
  const currentRadioSeedRef = useRef<Song>(SAMPLE_SONGS[0]);

  const [showNowPlayingModal, setShowNowPlayingModal] = useState<boolean>(false);
  const [showRoomListenersModal, setShowRoomListenersModal] = useState<boolean>(false);
  const [showSongPickerModal, setShowSongPickerModal] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [showYouTubeConnectModal, setShowYouTubeConnectModal] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isMobileFrameView, setIsMobileFrameView] = useState<boolean>(false);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState<boolean>(false);
  const [hasActiveYouTubeToken, setHasActiveYouTubeToken] = useState<boolean>(false);
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; photoUrl?: string } | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [syncDiagnosticError, setSyncDiagnosticError] = useState<string | null>(null);

  // Listen to Google Auth state
  useEffect(() => {
    const unsub = initAuth((user, token) => {
      if (user) {
        setIsGoogleAuthenticated(true);
        setHasActiveYouTubeToken(Boolean(token));
        setGoogleUser({
          name: user.displayName || 'Google Kullanıcısı',
          email: user.email || '',
          photoUrl: user.photoURL || undefined,
        });
      } else {
        setIsGoogleAuthenticated(false);
        setHasActiveYouTubeToken(false);
        setGoogleUser(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const unsubTime = soundEngine.onTimeUpdate((sec) => {
      setMySecond(sec);
    });
    const unsubState = soundEngine.onStateChange((playing) => {
      setIsPlaying(playing);
    });
    const unsubLoading = soundEngine.onLoadingChange((loading) => {
      setIsAudioLoading(loading);
    });

    soundEngine.onErrorFallback((failedSong) => {
      setToastMessage(`"${failedSong.title}" akışı atlandı, kesintisiz radyo devam ediyor...`);
      setTimeout(() => setToastMessage(null), 3500);
      handleNextSong();
    });

    return () => {
      unsubTime();
      unsubState();
      unsubLoading();
    };
  }, []);

  useEffect(() => {
    fetchArtistRadio(SAMPLE_SONGS[0])
      .then((res) => {
        if (res.tracks && res.tracks.length > 0) {
          setActiveQueue(res.tracks);
          setNextRadioSong(res.tracks[1] || null);
        }
      })
      .catch((err: any) => {
        console.info('[Harmoniq Sync Diagnostic] Initial artist radio fetch error:', {
          message: err?.message,
        });
      });
  }, []);

  // Anlık konum: Otomatik GPS modundaysa arka planda konumu tazele
  useEffect(() => {
    const saved = getSavedLocation();
    if (saved.isAuto && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      detectLiveLocation()
        .then((loc) => {
          if (loc && loc.city) {
            setUserCity(loc.city);
          }
        })
        .catch(() => {
          // Arka plan yenilemesinde hata olursa mevcut konumu koru
        });
    }
  }, []);

  useEffect(() => {
    soundEngine.setMediaSessionActions({
      onPrevTrack: () => handlePrevSong(),
      onNextTrack: () => handleNextSong(),
      onTogglePlay: () => handleTogglePlay(),
      onSeek: (sec) => handleSeekSecond(sec),
    });
    soundEngine.updateMediaSession(currentSong);
  }, [currentSong, isPlaying, activeQueue]);

  // Real-time High Compatibility Toast Detector for Live Lounge listeners:
  // Detects when a lounge listener has >= 85% affinity with the currently playing track
  useEffect(() => {
    if (!currentSong || loungeUsers.length === 0) return;
    const songKey = `${currentSong.id || currentSong.title}`;

    // Evaluate compatibility against currently playing track for each lounge user
    const highMatches = loungeUsers
      .map((u) => {
        const comp = calculateSongCompatibilityWithUser(currentSong, u);
        return {
          user: u,
          score: comp.score,
          reason: comp.reason,
          songTitle: currentSong.title,
          songArtist: currentSong.artist,
        };
      })
      .filter((m) => m.score >= 85 && !notifiedMatchKeysRef.current.has(`${songKey}-${m.user.id}`));

    if (highMatches.length === 0) return;

    // Pick listener with highest affinity
    highMatches.sort((a, b) => b.score - a.score);
    const topMatch = highMatches[0];

    // Detection delay (2s after song change or lounge load)
    const timer = setTimeout(() => {
      notifiedMatchKeysRef.current.add(`${songKey}-${topMatch.user.id}`);
      setHighCompatibilityToast(topMatch);
      triggerHaptic(25);

      const hideTimer = setTimeout(() => {
        setHighCompatibilityToast((prev) => (prev?.user.id === topMatch.user.id ? null : prev));
      }, 7000);

      return () => clearTimeout(hideTimer);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentSong.id, currentSong.title, currentSong.artist, loungeUsers]);

  const handleStartRadioStation = async (seedSong?: Song) => {
    const seed = seedSong || currentSong;
    currentRadioSeedRef.current = seed;
    playedSongTitlesRef.current = new Set([seed.title.toLowerCase()]);
    setToastMessage(`${seed.artist} radyosu hazırlanıyor...`);

    try {
      const res = await fetchArtistRadio(seed);
      if (res.tracks && res.tracks.length > 0) {
        setActiveQueue(res.tracks);
        const firstSong = res.tracks[0];
        const secondSong = res.tracks[1] || null;
        setNextRadioSong(secondSong);
        await handleSelectSong(firstSong, true);
        setToastMessage(`${res.stationName} başlatıldı (${res.tracks.length} parça)`);
        setTimeout(() => setToastMessage(null), 3500);
        return res;
      } else {
        setToastMessage(`${seed.artist} için radyo parçaları bulunamadı.`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (e: any) {
      console.info('[Harmoniq Sync Diagnostic] handleStartRadioStation error:', {
        artist: seed.artist,
        title: seed.title,
        message: e?.message,
      });
      setToastMessage(`Radyo istasyonu başlatılamadı: ${e?.message || 'Bağlantı hatası'}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleStartPersonalRadio = async () => {
    const res = generatePersonalizedRadioQueue(personalTaste, syncedPlaylists, favoriteSongs);
    if (res.tracks && res.tracks.length > 0) {
      setActiveQueue(res.tracks);
      const firstSong = res.tracks[0];
      const secondSong = res.tracks[1] || null;
      setNextRadioSong(secondSong);
      await handleSelectSong(firstSong, true);
      setToastMessage(`${res.stationName} başlatıldı (${res.tracks.length} parça)`);
      setTimeout(() => setToastMessage(null), 3500);
    } else {
      await handleStartRadioStation(currentSong);
    }
  };

  const handlePlayPlaylist = async (playlist: UserPlaylist, shuffle?: boolean) => {
    if (!playlist.tracks || playlist.tracks.length === 0) return;
    const tracksToPlay = shuffle ? [...playlist.tracks].sort(() => Math.random() - 0.5) : playlist.tracks;
    setActiveQueue(tracksToPlay);
    const firstSong = tracksToPlay[0];
    const secondSong = tracksToPlay[1] || null;
    setNextRadioSong(secondSong);
    await handleSelectSong(firstSong, true);
    setToastMessage(`"${playlist.title}" çalıyor (${playlist.tracks.length} parça)`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePlaySongsList = async (songs: Song[], shuffle?: boolean) => {
    if (!songs || songs.length === 0) return;
    const queue = shuffle ? [...songs].sort(() => Math.random() - 0.5) : [...songs];
    setActiveQueue(queue);
    const firstSong = queue[0];
    const secondSong = queue[1] || null;
    setNextRadioSong(secondSong);
    await handleSelectSong(firstSong, true);
    setToastMessage(`${queue.length} parça çalınıyor`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleFavoriteSong = (song: Song) => {
    setFavoriteSongs((prev) => {
      const exists = prev.some(
        (s) =>
          s.id === song.id ||
          (s.title.toLowerCase() === song.title.toLowerCase() &&
            s.artist.toLowerCase() === song.artist.toLowerCase())
      );
      let updated: Song[];
      if (exists) {
        updated = prev.filter(
          (s) =>
            !(
              s.id === song.id ||
              (s.title.toLowerCase() === song.title.toLowerCase() &&
                s.artist.toLowerCase() === song.artist.toLowerCase())
            )
        );
        setToastMessage(`"${song.title}" favorilerden çıkarıldı.`);
      } else {
        updated = [song, ...prev];
        setToastMessage(`"${song.title}" favorilerine eklendi.`);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('harmoniq_user_favorite_songs', JSON.stringify(updated));
      }
      return updated;
    });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleFavoriteArtist = (artistName: string) => {
    setFavoriteArtists((prev) => {
      const exists = prev.some((a) => a.toLowerCase() === artistName.toLowerCase());
      let updated: string[];
      if (exists) {
        updated = prev.filter((a) => a.toLowerCase() !== artistName.toLowerCase());
        setToastMessage(`"${artistName}" kaldırıldı.`);
      } else {
        updated = [artistName, ...prev];
        setToastMessage(`"${artistName}" sanatçılarına eklendi.`);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('harmoniq_user_favorite_artists', JSON.stringify(updated));
      }
      return updated;
    });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddFavoriteArtist = (artistName: string) => {
    const trimmed = artistName.trim();
    if (!trimmed) return;
    setFavoriteArtists((prev) => {
      if (prev.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const updated = [trimmed, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('harmoniq_user_favorite_artists', JSON.stringify(updated));
      }
      setPersonalTaste((pt) => ({
        ...pt,
        topArtists: Array.from(new Set([trimmed, ...pt.topArtists])).slice(0, 15),
      }));
      setLoungeUsers((lu) => calculateLoungeCompatibilityWithTaste([trimmed], lu));
      setToastMessage(`"${trimmed}" sanatçılarına eklendi.`);
      setTimeout(() => setToastMessage(null), 3000);
      return updated;
    });
  };

  const handleStartArtistRadioByName = async (artistName: string) => {
    const allKnownTracks = [
      ...SAMPLE_SONGS,
      ...syncedPlaylists.flatMap((p) => p.tracks || []),
      ...favoriteSongs,
    ];
    const matchingTrack = allKnownTracks.find(
      (t) =>
        (t.artist.toLowerCase().includes(artistName.toLowerCase()) ||
          artistName.toLowerCase().includes(t.artist.toLowerCase())) &&
        t.title.toLowerCase() !== t.artist.toLowerCase() &&
        !t.title.includes('Radyosu')
    );

    const matchingPool = TURKISH_ROCK_RADIO_POOL.find(
      (t) =>
        t.artist.toLowerCase().includes(artistName.toLowerCase()) ||
        artistName.toLowerCase().includes(t.artist.toLowerCase())
    );

    let seed: Song;
    if (matchingTrack) {
      seed = matchingTrack;
    } else if (matchingPool) {
      const dur = matchingPool.durationSeconds;
      seed = {
        id: `seed_${matchingPool.id}`,
        title: matchingPool.title,
        artist: matchingPool.artist,
        album: matchingPool.album,
        genre: matchingPool.genre,
        rawMediaTitle: `${matchingPool.artist} - ${matchingPool.title}`,
        coverGradient: matchingPool.coverGradient,
        durationSeconds: dur,
        bpm: matchingPool.bpm,
        keyNote: matchingPool.keyNote,
        catalogNumber: `RAD-${matchingPool.id.toUpperCase()}`,
        releaseYear: 2023,
        soundType: matchingPool.soundType,
        timelineMarkers: [
          { second: Math.round(dur * 0.10), label: 'Giriş', emoji: '⚡' },
          { second: Math.round(dur * 0.32), label: 'Vokal', emoji: '🎙️' },
          { second: Math.round(dur * 0.50), label: 'Nakarat', emoji: '🔥' },
          { second: Math.round(dur * 0.70), label: 'Gitar Solosu', emoji: '🎸' },
          { second: Math.round(dur * 0.88), label: 'Kapanış', emoji: '✨' },
        ],
      };
    } else {
      seed = {
        id: `seed_${artistName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        title: 'Özel Canlı Kayıt',
        artist: artistName,
        album: `${artistName} Koleksiyonu`,
        genre: 'Türkçe Rock & Alternatif',
        rawMediaTitle: `${artistName} - Canlı Performans`,
        coverGradient: 'from-zinc-800 via-zinc-900 to-black',
        durationSeconds: 235,
        bpm: 120,
        keyNote: 'Am',
        catalogNumber: 'RAD-01',
        releaseYear: 2024,
        soundType: 'rock',
        timelineMarkers: [
          { second: 24, label: 'Giriş', emoji: '⚡' },
          { second: 75, label: 'Vokal', emoji: '🎙️' },
          { second: 120, label: 'Nakarat', emoji: '🔥' },
          { second: 165, label: 'Gitar Solosu', emoji: '🎸' },
          { second: 210, label: 'Kapanış', emoji: '✨' },
        ],
      };
    }

    await handleStartRadioStation(seed);
  };

  // Sync authentic playlists, liked songs, and subscribed artists from YouTube Music via OAuth token
  const syncFromYouTubeAccessToken = useCallback(
    async (token: string, userName?: string, userEmail?: string) => {
      try {
        setHasActiveYouTubeToken(true);
        setSyncDiagnosticError(null);
        setToastMessage('YouTube Music çalma listelerin, beğendiğin şarkılar ve sanatçıların çekiliyor...');
        const ytData = await fetchAllUserYouTubeMusicData(token);

        let finalPlaylists = syncedPlaylists;
        if (ytData.playlists && ytData.playlists.length > 0) {
          finalPlaylists = ytData.playlists;
          setSyncedPlaylists(finalPlaylists);
          if (typeof window !== 'undefined') {
            localStorage.setItem('harmoniq_user_playlists', JSON.stringify(finalPlaylists));
          }
        }

        let finalFavoriteSongs = favoriteSongs;
        if (ytData.favoriteSongs && ytData.favoriteSongs.length > 0) {
          finalFavoriteSongs = ytData.favoriteSongs;
          setFavoriteSongs(finalFavoriteSongs);
          if (typeof window !== 'undefined') {
            localStorage.setItem('harmoniq_user_favorite_songs', JSON.stringify(finalFavoriteSongs));
          }
        }

        let finalFavoriteArtists = favoriteArtists;
        if (ytData.favoriteArtists && ytData.favoriteArtists.length > 0) {
          finalFavoriteArtists = ytData.favoriteArtists;
          setFavoriteArtists(finalFavoriteArtists);
          if (typeof window !== 'undefined') {
            localStorage.setItem('harmoniq_user_favorite_artists', JSON.stringify(finalFavoriteArtists));
          }
        }

        if (ytData.allSubscribedChannels && ytData.allSubscribedChannels.length > 0) {
          setSubscribedChannels(ytData.allSubscribedChannels);
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'harmoniq_user_subscribed_channels',
              JSON.stringify(ytData.allSubscribedChannels)
            );
          }
        }

        const name = userName || googleUser?.name || 'Yasin Çelebi';
        const handle = userEmail ? `@${userEmail.split('@')[0]}` : '@yasincelebi';
        const updatedTaste = derivePersonalTasteFromData(
          name,
          handle,
          finalPlaylists,
          finalFavoriteSongs,
          finalFavoriteArtists
        );
        setPersonalTaste(updatedTaste);
        setIsTasteSynced(true);

        const allArtists = [
          ...finalFavoriteArtists,
          ...finalPlaylists.flatMap((p) => p.tracks.map((t) => t.artist)),
        ];
        setLoungeUsers((prev) => calculateLoungeCompatibilityWithTaste(allArtists, prev));

        if (ytData.errors && ytData.errors.length > 0) {
          const combinedErr = ytData.errors.join(' | ');
          setSyncDiagnosticError(combinedErr);
          console.info('[Harmoniq Sync Diagnostic] Partial/API errors in syncFromYouTubeAccessToken:', {
            errors: ytData.errors,
            playlistsFetched: ytData.playlists.length,
            songsFetched: ytData.favoriteSongs.length,
            artistsFetched: ytData.favoriteArtists.length,
          });
          if (
            ytData.playlists.length === 0 &&
            ytData.favoriteSongs.length === 0 &&
            ytData.favoriteArtists.length === 0
          ) {
            setToastMessage(ytData.errors[0]);
            setTimeout(() => setToastMessage(null), 5500);
            return;
          }
        }

        setToastMessage(
          `${finalPlaylists.length} liste, ${finalFavoriteSongs.length} beğenilen şarkı ve ${finalFavoriteArtists.length} sanatçı senkronize edildi.`
        );
        setTimeout(() => setToastMessage(null), 4500);
      } catch (err: any) {
        const detailedMsg = `YouTube Music senkronizasyonu sırasında hata oluştu: ${
          err?.message || 'Bağlantı kurulamadı.'
        }`;
        console.info('[Harmoniq Sync Diagnostic] Exception in syncFromYouTubeAccessToken:', {
          timestamp: new Date().toISOString(),
          message: err?.message,
          stack: err?.stack,
        });
        setSyncDiagnosticError(detailedMsg);
        setToastMessage(detailedMsg);
        setTimeout(() => setToastMessage(null), 5000);
      }
    },
    [googleUser, syncedPlaylists, favoriteSongs, favoriteArtists]
  );

  // Google OAuth Sign In & Profile Sync (Detailed try-catch & descriptive user-facing error messages)
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setSyncDiagnosticError(null);
    setToastMessage('Google hesabı bağlanıyor...');
    try {
      const res = await signInWithGoogle(true);
      if (res && res.user) {
        const authedUser = res.user;
        setIsGoogleAuthenticated(true);
        setHasActiveYouTubeToken(Boolean(res.accessToken));
        const userData = {
          name: authedUser.displayName || 'Google Kullanıcısı',
          email: authedUser.email || '',
          photoUrl: authedUser.photoURL || undefined,
        };
        setGoogleUser(userData);

        if (authedUser.photoURL) {
          handleUpdateAvatar(authedUser.photoURL);
        }
        if (authedUser.displayName) {
          setYoutubeAccount((prev) => ({
            ...prev,
            name: authedUser.displayName || prev.name,
            email: authedUser.email || prev.email,
            handle: authedUser.email ? `@${authedUser.email.split('@')[0]}` : prev.handle,
          }));
        }

        if (res.accessToken) {
          await syncFromYouTubeAccessToken(res.accessToken, userData.name, userData.email);
        } else {
          const errMsg =
            res.userFacingError ||
            'Google oturumu açıldı ancak YouTube okuma anahtarı alınamadı. Lütfen izinleri onaylayın.';
          setSyncDiagnosticError(errMsg);
          setToastMessage(errMsg);
        }
      } else {
        const errMsg =
          res?.userFacingError ||
          'Google OAuth bağlantısı tamamlanamadı. Hata 403 (Test Modu) gördüyseniz aşağıdaki rehberden hesabınızı yetkilendirebilir veya direkt liste linki yapıştırabilirsiniz.';
        setSyncDiagnosticError(errMsg);
        setToastMessage(errMsg);
      }
    } catch (err: any) {
      const errMsg = `Google oturumu açılırken beklenmeyen hata: ${err?.message || 'Lütfen tekrar deneyin.'}`;
      console.info('[Harmoniq Sync Diagnostic] Exception in handleGoogleSignIn:', {
        timestamp: new Date().toISOString(),
        code: err?.code,
        message: err?.message,
      });
      setSyncDiagnosticError(errMsg);
      setToastMessage(errMsg);
    } finally {
      setIsGoogleLoading(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  // Automated background sync: updates playlists, taste and room compatibility periodically
  const autoSyncUserData = useCallback(async () => {
    try {
      const token = getCachedAccessToken();
      if (token) {
        setHasActiveYouTubeToken(true);
        const ytData = await fetchAllUserYouTubeMusicData(token);
        if (ytData.playlists && ytData.playlists.length > 0) {
          setSyncedPlaylists(ytData.playlists);
          if (typeof window !== 'undefined') {
            localStorage.setItem('harmoniq_user_playlists', JSON.stringify(ytData.playlists));
          }
        }
        if (ytData.favoriteSongs && ytData.favoriteSongs.length > 0) {
          setFavoriteSongs(ytData.favoriteSongs);
          if (typeof window !== 'undefined') {
            localStorage.setItem('harmoniq_user_favorite_songs', JSON.stringify(ytData.favoriteSongs));
          }
        }
        if (ytData.favoriteArtists && ytData.favoriteArtists.length > 0) {
          setFavoriteArtists(ytData.favoriteArtists);
          if (typeof window !== 'undefined') {
            localStorage.setItem('harmoniq_user_favorite_artists', JSON.stringify(ytData.favoriteArtists));
          }
        }
        if (ytData.errors && ytData.errors.length > 0) {
          setSyncDiagnosticError(ytData.errors.join(' | '));
        }

        const updatedTaste = derivePersonalTasteFromData(
          googleUser?.name || 'Yasin Çelebi',
          googleUser?.email ? `@${googleUser.email.split('@')[0]}` : '@yasincelebi',
          ytData.playlists.length > 0 ? ytData.playlists : syncedPlaylists,
          ytData.favoriteSongs.length > 0 ? ytData.favoriteSongs : favoriteSongs,
          ytData.favoriteArtists.length > 0 ? ytData.favoriteArtists : favoriteArtists
        );
        setPersonalTaste(updatedTaste);
        setIsTasteSynced(true);

        const allArtists = [
          ...ytData.favoriteArtists,
          ...ytData.playlists.flatMap((p) => p.tracks.map((t) => t.artist)),
        ];
        setLoungeUsers((prev) => calculateLoungeCompatibilityWithTaste(allArtists, prev));
        return;
      } else {
        setHasActiveYouTubeToken(false);
      }

      setPersonalTaste((prev) =>
        derivePersonalTasteFromData(
          googleUser?.name || prev.accountName,
          googleUser?.email ? `@${googleUser.email.split('@')[0]}` : prev.accountHandle,
          syncedPlaylists,
          favoriteSongs,
          favoriteArtists
        )
      );

      setLoungeUsers((prev) => {
        const allArtists = [
          ...favoriteArtists,
          ...syncedPlaylists.flatMap((p) => p.tracks.map((t) => t.artist)),
        ];
        return calculateLoungeCompatibilityWithTaste(allArtists, prev);
      });
    } catch (bgErr: any) {
      console.info('[Harmoniq Sync Diagnostic] Background autoSyncUserData exception:', {
        timestamp: new Date().toISOString(),
        message: bgErr?.message,
      });
    }
  }, [googleUser, syncedPlaylists, favoriteSongs, favoriteArtists]);

  useEffect(() => {
    autoSyncUserData();

    let intervalId: any = null;

    const startSyncInterval = () => {
      if (intervalId) clearInterval(intervalId);
      // Background tab optimization: if hidden, reduce frequency to 5 min (300s); if active, 60s
      const delay = typeof document !== 'undefined' && document.visibilityState === 'hidden' ? 300000 : 60000;
      intervalId = setInterval(() => {
        autoSyncUserData();
      }, delay);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Instant resync on tab resume
        autoSyncUserData();
        const currentSec = soundEngine.getCurrentTime();
        if (currentSec >= 0) {
          setMySecond(currentSec);
        }
        startSyncInterval();
      } else {
        startSyncInterval();
      }
    };

    startSyncInterval();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [autoSyncUserData]);

  // Synchronize and refresh personal taste from YouTube Music
  const handleSyncTaste = async () => {
    try {
      setIsTasteSynced(true);
      setSyncDiagnosticError(null);
      const token = getCachedAccessToken();
      if (token) {
        await syncFromYouTubeAccessToken(token);
        return;
      }
      await handleGoogleSignIn();
    } catch (err: any) {
      const msg = `Kütüphane senkronizasyonu başlatılamadı: ${err?.message || 'Bilinmeyen hata'}`;
      console.info('[Harmoniq Sync Diagnostic] handleSyncTaste exception:', {
        timestamp: new Date().toISOString(),
        message: err?.message,
      });
      setSyncDiagnosticError(msg);
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4500);
    }
  };

  // Universal OAuth-free YouTube / YouTube Music importer (Playlist URL, Multiple URLs, Channel @handle, or Video URL)
  // Populates syncedPlaylists, favoriteSongs, and favoriteArtists simultaneously
  const handleImportPlaylistUrl = async (urlOrId: string): Promise<boolean> => {
    try {
      setSyncDiagnosticError(null);
      setToastMessage('YouTube Music verilerin çözümleniyor ve aktarılıyor...');
      const result = await syncYouTubeLibraryByInput(urlOrId);
      const hasData =
        result.playlists.length > 0 || result.songs.length > 0 || result.artists.length > 0;

      if (hasData) {
        if (result.playlists.length > 0) {
          setSyncedPlaylists((prev) => {
            const newIds = new Set(result.playlists.map((p) => p.id));
            const filtered = prev.filter((p) => !newIds.has(p.id));
            const updated = [...result.playlists, ...filtered];
            if (typeof window !== 'undefined') {
              localStorage.setItem('harmoniq_user_playlists', JSON.stringify(updated));
            }
            return updated;
          });
        }

        if (result.songs.length > 0) {
          setFavoriteSongs((prev) => {
            const existingKeys = new Set(
              prev.map((s) => s.youtubeVideoId || `${s.artist}-${s.title}`.toLowerCase())
            );
            const freshTracks = result.songs.filter(
              (t) => !existingKeys.has(t.youtubeVideoId || `${t.artist}-${t.title}`.toLowerCase())
            );
            const updated = [...freshTracks, ...prev];
            if (typeof window !== 'undefined') {
              localStorage.setItem('harmoniq_user_favorite_songs', JSON.stringify(updated));
            }
            return updated;
          });
        }

        if (result.artists.length > 0) {
          setFavoriteArtists((prev) => {
            const merged = Array.from(new Set([...result.artists, ...prev]));
            if (typeof window !== 'undefined') {
              localStorage.setItem('harmoniq_user_favorite_artists', JSON.stringify(merged));
            }
            return merged;
          });
          setPersonalTaste((prev) => {
            const combined = Array.from(new Set([...result.artists, ...prev.topArtists])).slice(
              0,
              15
            );
            return {
              ...prev,
              topArtists: combined,
              totalTracksAnalyzed: prev.totalTracksAnalyzed + result.songs.length,
            };
          });
          setLoungeUsers((prev) => calculateLoungeCompatibilityWithTaste(result.artists, prev));
        }

        setToastMessage(
          `${result.playlists.length} çalma listesi, ${result.songs.length} şarkı ve ${result.artists.length} sanatçı kütüphanene aktarıldı.`
        );
        setTimeout(() => setToastMessage(null), 4500);
        return true;
      } else {
        const detailedReason =
          result.errors && result.errors.length > 0
            ? result.errors.join(' ')
            : 'Liste bulunamadı. Lütfen YouTube Music çalma listesi linkini (Herkese Açık veya Liste Dışı) yapıştırın.';
        setSyncDiagnosticError(detailedReason);
        setToastMessage(detailedReason);
        setTimeout(() => setToastMessage(null), 5000);
        return false;
      }
    } catch (err: any) {
      const msg = `Çalma listesi aktarılırken hata oluştu: ${err?.message || 'Bağlantı hatası'}`;
      console.info('[Harmoniq Sync Diagnostic] handleImportPlaylistUrl exception:', {
        urlOrId,
        message: err?.message,
        stack: err?.stack,
      });
      setSyncDiagnosticError(msg);
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4500);
      return false;
    }
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setSyncedPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== playlistId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('harmoniq_user_playlists', JSON.stringify(updated));
      }
      return updated;
    });
    setToastMessage('Çalma listesi kaldırıldı.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setIsGoogleAuthenticated(false);
    setHasActiveYouTubeToken(false);
    setGoogleUser(null);
    setToastMessage('Google oturumu kapatıldı.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      soundEngine.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      soundEngine.playSong(currentSong, mySecond);
    }
  };

  const handleSeekSecond = (sec: number) => {
    setMySecond(sec);
    soundEngine.seek(sec);
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
  };

  const handleSelectSong = async (song: Song, autoPlay = true) => {
    let playableSong = song;
    if (!song.youtubeVideoId && song.artist && song.title) {
      try {
        const ytId = await fetchYouTubeVideoIdForSong(song.artist, song.title);
        if (ytId) {
          playableSong = { ...song, youtubeVideoId: ytId };
        } else if (!playableSong.audioUrl) {
          const appleFallback = await searchITunesAudio(`${song.artist} ${song.title}`, true);
          if (appleFallback && appleFallback.audioUrl) {
            playableSong = {
              ...playableSong,
              audioUrl: appleFallback.audioUrl,
              coverUrl: playableSong.coverUrl || appleFallback.coverUrl,
            };
          }
        }
      } catch {
        // fallback
      }
    }

    setCurrentSong(playableSong);
    playedSongTitlesRef.current.add(playableSong.title.toLowerCase());
    setMySecond(0);
    if (autoPlay || isPlaying) {
      setIsPlaying(true);
      soundEngine.playSong(playableSong, 0);
    }
  };

  const handleNextSong = async () => {
    const queue = activeQueue && activeQueue.length > 0 ? activeQueue : SAMPLE_SONGS;
    const currentIdx = queue.findIndex(
      (s) => s.id === currentSong.id || s.title.toLowerCase() === currentSong.title.toLowerCase()
    );
    const nextIdx = currentIdx !== -1 ? currentIdx + 1 : 0;

    if (queue.length - nextIdx <= 4 && !isFetchingMoreRadioRef.current) {
      isFetchingMoreRadioRef.current = true;
      fetchMoreRadioRecommendations(currentRadioSeedRef.current, playedSongTitlesRef.current)
        .then((newTracks) => {
          isFetchingMoreRadioRef.current = false;
          if (newTracks && newTracks.length > 0) {
            setActiveQueue((prev) => {
              const existingKeys = new Set(prev.map((p) => `${p.artist.toLowerCase()} - ${p.title.toLowerCase()}`));
              const fresh = newTracks.filter((t) => !existingKeys.has(`${t.artist.toLowerCase()} - ${t.title.toLowerCase()}`));
              return [...prev, ...fresh];
            });
          }
        })
        .catch(() => {
          isFetchingMoreRadioRef.current = false;
        });
    }

    if (nextIdx < queue.length) {
      const nextSong = queue[nextIdx];
      playedSongTitlesRef.current.add(nextSong.title.toLowerCase());
      setNextRadioSong(queue[nextIdx + 1] || null);
      await handleSelectSong(nextSong, true);
    } else {
      const more = await fetchMoreRadioRecommendations(currentRadioSeedRef.current, playedSongTitlesRef.current);
      if (more.length > 0) {
        setActiveQueue((prev) => [...prev, ...more]);
        const nextSong = more[0];
        playedSongTitlesRef.current.add(nextSong.title.toLowerCase());
        setNextRadioSong(more[1] || null);
        await handleSelectSong(nextSong, true);
      } else {
        await handleSelectSong(queue[0], true);
      }
    }
  };

  const handlePrevSong = async () => {
    const queue = activeQueue && activeQueue.length > 0 ? activeQueue : SAMPLE_SONGS;
    const currentIdx = queue.findIndex(
      (s) => s.id === currentSong.id || s.title.toLowerCase() === currentSong.title.toLowerCase()
    );
    if (currentIdx > 0) {
      const prevSong = queue[currentIdx - 1];
      await handleSelectSong(prevSong, true);
    } else {
      handleSeekSecond(0);
    }
  };

  const handleToggleFriend = (user: LoungeUser) => {
    if (user.friendStatus === 'friends') {
      setFriendsList((prev) => prev.filter((f) => f.id !== user.id));
      setLoungeUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, friendStatus: 'none' as const } : u))
      );
      if (selectedDrawerUser?.id === user.id) {
        setSelectedDrawerUser({ ...user, friendStatus: 'none' as const });
      }
      setToastMessage(`${user.name} arkadaş listenden çıkarıldı.`);
    } else if (user.friendStatus === 'pending') {
      setLoungeUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, friendStatus: 'none' as const } : u))
      );
      if (selectedDrawerUser?.id === user.id) {
        setSelectedDrawerUser({ ...user, friendStatus: 'none' as const });
      }
      setToastMessage('İstek geri çekildi.');
    } else {
      if (user.privacyMode === 'private') {
        const updatedUser: LoungeUser = { ...user, friendStatus: 'pending' as const };
        setLoungeUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
        if (selectedDrawerUser?.id === user.id) {
          setSelectedDrawerUser(updatedUser);
        }
        setToastMessage(`${user.name} için arkadaşlık isteği gönderildi.`);
      } else {
        const updatedUser: LoungeUser = { ...user, friendStatus: 'friends' as const };
        setFriendsList((prev) => [...prev, updatedUser]);
        setLoungeUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
        if (selectedDrawerUser?.id === user.id) {
          setSelectedDrawerUser(updatedUser);
        }
        setToastMessage(`${user.name} arkadaşlarına eklendi.`);
      }
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAcceptFriendRequest = (requestId: string) => {
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req) return;
    const acceptedUser: LoungeUser = { ...req.fromUser, friendStatus: 'friends' };
    setFriendsList((prev) => [...prev, acceptedUser]);
    setLoungeUsers((prev) => {
      const exists = prev.some((u) => u.id === acceptedUser.id);
      return exists ? prev.map((u) => (u.id === acceptedUser.id ? acceptedUser : u)) : [acceptedUser, ...prev];
    });
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    setToastMessage(`${req.fromUser.name} ile artık arkadaşsınız.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeclineFriendRequest = (requestId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleCancelSentRequest = (userId: string) => {
    setLoungeUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, friendStatus: 'none' as const } : u))
    );
    if (selectedDrawerUser?.id === userId) {
      setSelectedDrawerUser({ ...selectedDrawerUser, friendStatus: 'none' as const });
    }
  };

  const handleSendFrequency = (user: LoungeUser, icebreakerText?: string) => {
    setSelectedDrawerUser(null);
    setActiveChatUser(user);
    setActiveTab('chat');

    const existing = conversations.find((c) => c.user.id === user.id);
    const initialText = icebreakerText || `Selam ${user.name}! ${currentSong.title} şarkısında aynı frekansta karşılaştık.`;

    if (!existing) {
      const newConv: LoungeConversation = {
        matchId: `conv-${user.id}-${Date.now()}`,
        user,
        matchedTrack: currentSong,
        matchedSecond: currentSong.id === 'song-duman' ? 102 : (mySecond || 102),
        matchedPlatform: activePlatform,
        contextBanner: `${currentSong.artist} - ${currentSong.title}`,
        lastMessage: initialText,
        lastMessageTime: 'Şimdi',
        unreadCount: 0,
        messages: [
          {
            id: `msg-${Date.now()}`,
            senderId: 'me',
            text: initialText,
            timestamp: 'Şimdi',
          },
        ],
      };
      setConversations((prev) => [newConv, ...prev]);
    }
  };

  const handleSendMessage = (matchId: string, text: string, isIcebreaker?: boolean) => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      text,
      timestamp: 'Şimdi',
      isIcebreaker,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.matchId === matchId) {
          return {
            ...c,
            lastMessage: text,
            lastMessageTime: 'Şimdi',
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );
  };

  const handleSendSongMessage = (matchId: string, song: Song, comment?: string, timestampSecond?: number) => {
    const formattedTime = timestampSecond !== undefined
      ? `${Math.floor(timestampSecond / 60)}:${timestampSecond % 60 < 10 ? '0' : ''}${Math.floor(timestampSecond % 60)}`
      : null;
    const defaultText = formattedTime
      ? `🎸 Bu şarkının ${formattedTime} saniyesini dinle!`
      : `🎵 Sana bu şarkıyı öneriyorum: ${song.artist} - ${song.title}`;
    const text = comment && comment.trim() ? comment.trim() : defaultText;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      text,
      timestamp: 'Şimdi',
      sharedSong: song,
      sharedTimestampSecond: timestampSecond,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.matchId === matchId) {
          return {
            ...c,
            lastMessage: formattedTime ? `🎵 ${song.title} (${formattedTime})` : `Önerilen şarkı: ${song.title}`,
            lastMessageTime: 'Şimdi',
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );
  };

  const handleWhisperTrack = (user: LoungeUser, track: Song, note?: string) => {
    const whisperNote = note || 'Bu şarkı bittiğinde şuna geçmelisin';
    const fullText = `🎧 ${whisperNote}: ${track.title} - ${track.artist}`;

    const existing = conversations.find((c) => c.user.id === user.id);
    if (existing) {
      handleSendMessage(existing.matchId, fullText);
    } else {
      const newConv: LoungeConversation = {
        matchId: `conv-${user.id}-${Date.now()}`,
        user,
        matchedTrack: currentSong,
        matchedSecond: mySecond,
        matchedPlatform: activePlatform,
        contextBanner: `${currentSong.artist} - ${currentSong.title}`,
        lastMessage: fullText,
        lastMessageTime: 'Şimdi',
        unreadCount: 0,
        messages: [
          {
            id: `msg-${Date.now()}`,
            senderId: 'me',
            text: fullText,
            timestamp: 'Şimdi',
          },
        ],
      };
      setConversations((prev) => [newConv, ...prev]);
    }

    setToastMessage(`🎧 ${user.name} kullanıcısına "${track.title}" fısıldandı!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePlayMoment = (track: Song, second: number) => {
    handleSelectSong(track, true);
    setTimeout(() => {
      handleSeekSecond(second);
    }, 150);
    const m = Math.floor(second / 60);
    const s = Math.floor(second % 60);
    const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
    setToastMessage(`"${track.title}" ${timeStr} anından çalınıyor.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentUserProfile: UserProfile = {
    id: 'me',
    name: googleUser?.name || youtubeAccount.name || 'Yasin Çelebi',
    age: 24,
    city: userCity,
    avatarGradient: 'from-zinc-700 to-zinc-900',
    avatarSeed: (youtubeAccount.name || 'YÇ')
      .split(' ')
      .map((s) => s[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'YÇ',
    avatarUrl: userAvatarUrl || googleUser?.photoUrl || undefined,
    isYouTubeConnected,
    youtubeAccount,
    email: googleUser?.email || youtubeAccount.email,
    bio: userBio,
    currentSong,
    songProgressSeconds: mySecond,
    isListeningNow: true,
    lastActiveMinutesAgo: 0,
    isSpotifyVerified: true,
    intent: 'concert_buddy' as IntentType,
    topArtists: personalTaste.topArtists,
    topGenres: personalTaste.topGenres,
    compatibilityScore: 100,
    sharedArtists: [],
    sharedGenres: [],
    trustScore: 99,
    isOnline: true,
    distanceKm: 0,
    privacyMode,
    syncedPlaylists,
    personalTaste,
    isTasteSynced,
    friendsCount: friendsList.length,
  };

  const totalUnread = conversations.reduce((acc, curr) => acc + curr.unreadCount, 0);
  const isLight = resolveEffectiveTheme(themeMode) === 'light';

  return (
    <div
      className={`min-h-screen ${
        isLight ? 'bg-[#F5F4F8] text-[#14121E]' : 'bg-[#0A090F] text-[#F4F3F8]'
      } flex flex-col font-sans selection:bg-purple-500 selection:text-white relative overflow-x-hidden ${
        isMobileFrameView ? 'lg:py-8 lg:px-4 lg:items-center lg:justify-center' : ''
      }`}
    >
      {/* Top Ceiling Ambient Glow (Velvet Pitch & Electric Resonance) */}
      <div
        className="fixed inset-x-0 top-0 h-56 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -15%, rgba(147, 51, 234, 0.20), transparent)',
        }}
      />

      {/* Dynamic Cover Ambient Glow across the Canvas */}
      {currentSong.coverUrl && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <img
            src={currentSong.coverUrl}
            alt=""
            aria-hidden="true"
            className={`w-[520px] h-[520px] object-cover rounded-full blur-[130px] absolute -top-24 left-1/2 -translate-x-1/2 transition-all duration-1000 ${
              isLight ? 'opacity-10' : 'opacity-15'
            }`}
          />
        </div>
      )}

      <div
        className={`w-full flex-1 flex flex-col ${
          isLight ? 'bg-[#F5F4F8]/95 shadow-sm' : 'bg-[#0A090F]/90'
        } relative z-10 transition-all duration-300 ${
          isMobileFrameView
            ? isLight
              ? 'lg:max-w-[420px] lg:h-[890px] lg:rounded-[44px] lg:border-[6px] lg:border-zinc-300 lg:shadow-2xl lg:overflow-hidden'
              : 'lg:max-w-[420px] lg:h-[890px] lg:rounded-[44px] lg:border-[6px] lg:border-zinc-800 lg:shadow-2xl lg:overflow-hidden'
            : ''
        }`}
      >
        <TopHeader
          currentSong={currentSong}
          onOpenSongPicker={() => setShowSongPickerModal(true)}
          onOpenNowPlaying={() => setShowNowPlayingModal(true)}
          isPlaying={isPlaying}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          privacyMode={privacyMode}
          onChangePrivacyMode={(mode) => {
            setPrivacyMode(mode);
          }}
          onOpenInstallModal={() => setShowInstallModal(true)}
          isMobileFrameView={isMobileFrameView}
          onToggleMobileFrame={() => setIsMobileFrameView(!isMobileFrameView)}
          userProfile={currentUserProfile}
          themeMode={resolveEffectiveTheme(themeMode)}
          onToggleTheme={handleToggleTheme}
          liveListenersCount={privacyMode === 'friends_only' ? friendsList.length + 1 : loungeUsers.length}
        />

        <main
          className={`flex-1 flex flex-col overflow-y-auto no-scrollbar transition-all duration-300 ${
            activeTab === 'lounge' ? 'pb-24' : 'pb-40'
          }`}
        >
          <div className={activeTab === 'lounge' ? 'flex-1 flex flex-col' : 'hidden'}>
            <LiveLoungeTab
              currentSong={currentSong}
              mySecond={mySecond}
              users={loungeUsers}
              activePlatform={activePlatform}
              privacyMode={privacyMode}
              onChangePrivacyMode={setPrivacyMode}
              onChangePlatform={setActivePlatform}
              onSelectUser={(user) => setSelectedDrawerUser(user)}
              onDirectChat={(user) => handleSendFrequency(user)}
              onSeekSecond={handleSeekSecond}
              onOpenSongPicker={() => setShowSongPickerModal(true)}
              onToggleFriend={handleToggleFriend}
              onOpenNowPlaying={() => setShowNowPlayingModal(true)}
              onOpenRoomListeners={() => setShowRoomListenersModal(true)}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onSelectSong={handleSelectSong}
              onNextSong={handleNextSong}
              onPrevSong={handlePrevSong}
              isFavorite={favoriteSongs.some(
                (s) =>
                  s.id === currentSong.id ||
                  (s.title.toLowerCase() === currentSong.title.toLowerCase() &&
                    s.artist.toLowerCase() === currentSong.artist.toLowerCase())
              )}
              onToggleFavorite={handleToggleFavoriteSong}
              onShowToast={(msg) => {
                setToastMessage(msg);
                setTimeout(() => setToastMessage(null), 2500);
              }}
              autoRadioEnabled={autoRadioEnabled}
              onToggleAutoRadio={setAutoRadioEnabled}
              nextRadioSong={nextRadioSong}
              userCity={userCity}
              onUpdateCity={(city) => {
                const updated = setManualLocation(city);
                setUserCity(updated.city);
                setToastMessage(`📍 Konum ve Yoğunluk Haritası "${updated.city}" olarak güncellendi`);
                setTimeout(() => setToastMessage(null), 3000);
              }}
              candidateSongs={favoriteSongs.length > 0 ? favoriteSongs : activeQueue.length > 0 ? activeQueue : SAMPLE_SONGS}
              onWhisperTrack={handleWhisperTrack}
            />
          </div>

          {activeTab === 'rooms' && (
            <RoomsTab
              currentSong={currentSong}
              onSelectRoom={(song) => {
                handleSelectSong(song);
                setActiveTab('lounge');
              }}
              syncedPlaylists={syncedPlaylists}
              onPlayPlaylist={(pl) => {
                handlePlayPlaylist(pl);
                setActiveTab('lounge');
              }}
              onStartPersonalRadio={() => {
                handleStartPersonalRadio();
                setActiveTab('lounge');
              }}
              favoriteArtists={favoriteArtists}
              favoriteSongs={favoriteSongs}
              personalTaste={personalTaste}
              onStartArtistRadio={async (artistName) => {
                await handleStartArtistRadioByName(artistName);
                setActiveTab('lounge');
              }}
            />
          )}

          {activeTab === 'chat' && (
            <ChatTab
              conversations={conversations}
              activeChatUser={activeChatUser}
              onSelectConversation={(conv) => setActiveChatUser(conv.user)}
              onBackToList={() => setActiveChatUser(null)}
              onSendMessage={handleSendMessage}
              onSendSongMessage={handleSendSongMessage}
              onPlayMoment={handlePlayMoment}
              onPlaySong={(song) => handleSelectSong(song, true)}
              onStartChatWithUser={(user, text) => handleSendFrequency(user, text)}
              onOpenUserProfile={(user) => setSelectedDrawerUser(user)}
              recentListeners={loungeUsers}
              currentSong={currentSong}
              currentSecond={mySecond}
              allSongs={activeQueue.length > 0 ? activeQueue : SAMPLE_SONGS}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab
              userProfile={currentUserProfile}
              friendsList={friendsList}
              friendRequests={friendRequests}
              pendingSentUsers={loungeUsers.filter((u) => u.friendStatus === 'pending')}
              onAcceptFriendRequest={handleAcceptFriendRequest}
              onDeclineFriendRequest={handleDeclineFriendRequest}
              onCancelSentRequest={handleCancelSentRequest}
              onUpdateIntent={() => {}}
              onUpdatePrivacyMode={(mode) => {
                setPrivacyMode(mode);
              }}
              onOpenSongPicker={() => setShowSongPickerModal(true)}
              onToggleFriend={handleToggleFriend}
              onStartChatWithFriend={(friend) => {
                setActiveChatUser(friend);
                setActiveTab('chat');
              }}
              appVersion={pwa.appVersion}
              isCheckingUpdates={pwa.isChecking}
              onCheckForUpdates={pwa.checkForUpdates}
              onOpenYouTubeConnect={() => setShowYouTubeConnectModal(true)}
              onUpdateAvatar={handleUpdateAvatar}
              syncedPlaylists={syncedPlaylists}
              onPlayPlaylist={handlePlayPlaylist}
              onStartPersonalRadio={handleStartPersonalRadio}
              onSyncTaste={handleSyncTaste}
              onImportPlaylist={handleImportPlaylistUrl}
              onDeletePlaylist={handleDeletePlaylist}
              favoriteSongs={favoriteSongs}
              onToggleFavoriteSong={handleToggleFavoriteSong}
              favoriteArtists={favoriteArtists}
              subscribedChannels={subscribedChannels}
              onToggleFavoriteArtist={handleToggleFavoriteArtist}
              onAddFavoriteArtist={handleAddFavoriteArtist}
              onPlaySong={(song) => handleSelectSong(song, true)}
              onPlaySongsList={handlePlaySongsList}
              onStartArtistRadio={handleStartArtistRadioByName}
              isGoogleAuthenticated={isGoogleAuthenticated}
              hasActiveYouTubeToken={hasActiveYouTubeToken}
              isGoogleLoading={isGoogleLoading}
              onGoogleSignIn={handleGoogleSignIn}
              onGoogleSignOut={handleGoogleSignOut}
              googleUser={googleUser}
              onUpdateAccount={handleUpdateAccount}
              onUpdateBio={(bio) => {
                setUserBio(bio);
                if (typeof window !== 'undefined') localStorage.setItem('harmoniq_user_bio', bio);
              }}
              onUpdateCity={(city) => {
                setUserCity(city);
                if (typeof window !== 'undefined') localStorage.setItem('harmoniq_user_city', city);
              }}
              syncDiagnosticError={syncDiagnosticError}
              onClearSyncError={() => setSyncDiagnosticError(null)}
              themeMode={themeMode}
              onChangeThemeMode={handleThemeModeChange}
            />
          )}
        </main>

        {pwa.isUpdateAvailable && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-white/15 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm w-11/12">
            <RefreshCw className="w-4 h-4 text-lime-400 shrink-0" />
            <div className="text-xs flex-1 min-w-0 truncate">Yeni sürüm hazır.</div>
            <button
              onClick={pwa.applyUpdate}
              className="px-3 py-1 rounded-xl bg-lime-400 text-zinc-950 font-semibold text-xs shrink-0"
            >
              Yenile
            </button>
          </div>
        )}

        {/* High Compatibility Listener Toast Banner (Hidden if any modal or sheet window is open) */}
        {highCompatibilityToast && !Boolean(
          showNowPlayingModal ||
          showSongPickerModal ||
          showInstallModal ||
          selectedDrawerUser ||
          showYouTubeConnectModal ||
          showRoomListenersModal ||
          (activeTab === 'chat' && activeChatUser)
        ) && (
          <div
            onTouchStart={handleToastTouchStart}
            onTouchMove={handleToastTouchMove}
            onTouchEnd={handleToastTouchEnd}
            style={{
              transform: toastDragOffsetY ? `translateY(${toastDragOffsetY}px)` : undefined,
              transition: toastDragOffsetY ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
            className="fixed top-[68px] left-4 right-4 z-50 max-w-md mx-auto pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-300"
          >
            <div className="relative rounded-2xl bg-zinc-950/90 border border-emerald-500/40 shadow-[0_12px_40px_rgba(16,185,129,0.2)] backdrop-blur-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 overflow-hidden">
              {/* Subtle emerald background aura */}
              <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* 7-Second Progress Bar (Right-to-Left / shrinking smoothly) */}
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500/15 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 origin-left"
                  style={{
                    animation: 'toastProgress 7s linear forwards',
                  }}
                />
              </div>

              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* User Avatar with pulsing compatibility ring */}
                <div
                  onClick={() => {
                    triggerHaptic(15);
                    setSelectedDrawerUser(highCompatibilityToast.user);
                    setHighCompatibilityToast(null);
                  }}
                  className="relative cursor-pointer shrink-0 group/av"
                  title="Profili Gör"
                >
                  <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-black">
                    {highCompatibilityToast.user.avatarUrl ? (
                      <img
                        src={highCompatibilityToast.user.avatarUrl}
                        alt={highCompatibilityToast.user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-tr ${highCompatibilityToast.user.avatarGradient} flex items-center justify-center text-white font-bold text-xs`}
                      >
                        {highCompatibilityToast.user.avatarSeed}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-zinc-950 rounded-full animate-pulse" />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white truncate">
                      {highCompatibilityToast.user.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                      <Zap className="w-2.5 h-2.5 fill-current" />
                      <span>%{highCompatibilityToast.score} Uyum</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 truncate mt-0.5">
                    {highCompatibilityToast.reason}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    handleSendFrequency(highCompatibilityToast.user);
                    setHighCompatibilityToast(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm flex items-center gap-1"
                  title="Frekans Gönder / Sohbet Başlat"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span className="hidden xs:inline">Frekans</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    setSelectedDrawerUser(highCompatibilityToast.user);
                    setHighCompatibilityToast(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium text-xs transition active:scale-95 cursor-pointer border border-white/10"
                >
                  Profil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    setHighCompatibilityToast(null);
                  }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                  aria-label="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] pointer-events-none bg-white/95 dark:bg-[#14121E]/95 backdrop-blur-xl border border-[#E4E2EC] dark:border-white/10 text-zinc-900 dark:text-zinc-100 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}

        <BottomNav
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          unreadCount={totalUnread}
          liveCount={privacyMode === 'friends_only' ? friendsList.length + 1 : loungeUsers.length}
          currentSong={currentSong}
          isPlaying={isPlaying}
          currentSecond={mySecond}
          isAudioLoading={isAudioLoading}
          onTogglePlay={handleTogglePlay}
          onNextSong={handleNextSong}
          onOpenNowPlaying={() => setShowNowPlayingModal(true)}
          onSeekSecond={handleSeekSecond}
        />
      </div>

      <MiniProfileDrawer
        user={selectedDrawerUser}
        song={currentSong}
        onClose={() => setSelectedDrawerUser(null)}
        onSendFrequency={handleSendFrequency}
        onToggleFriend={handleToggleFriend}
      />

      <SongPickerModal
        isOpen={showSongPickerModal}
        onClose={() => setShowSongPickerModal(false)}
        currentSong={currentSong}
        onSelectSong={handleSelectSong}
      />

      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => {
          setToastMessage('Harmoniq ana ekranınıza kuruldu.');
          setTimeout(() => setToastMessage(null), 3000);
        }}
        onCheckForUpdates={pwa.checkForUpdates}
        isCheckingUpdates={pwa.isChecking}
      />

      <NowPlayingModal
        isOpen={showNowPlayingModal}
        onClose={() => setShowNowPlayingModal(false)}
        song={currentSong}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        progressSeconds={mySecond}
        onSeek={handleSeekSecond}
        onNextSong={handleNextSong}
        onPrevSong={handlePrevSong}
        onSelectSong={handleSelectSong}
        allSongs={activeQueue.length > 0 ? activeQueue : SAMPLE_SONGS}
        onStartRadioStation={handleStartRadioStation}
        onOpenSongPicker={() => {
          setShowNowPlayingModal(false);
          setShowSongPickerModal(true);
        }}
        activePlatform={activePlatform}
        onShowToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3000);
        }}
        onOpenRoomListeners={() => {
          setShowRoomListenersModal(true);
        }}
        listeners={loungeUsers}
        onSelectUser={(user) => {
          setSelectedDrawerUser(user);
        }}
        onStartChatWithUser={(user) => {
          setActiveChatUser(user);
          setActiveTab('chat');
          setShowNowPlayingModal(false);
        }}
        isFavorite={favoriteSongs.some(
          (s) =>
            s.id === currentSong.id ||
            (s.title.toLowerCase() === currentSong.title.toLowerCase() &&
              s.artist.toLowerCase() === currentSong.artist.toLowerCase())
        )}
        onToggleFavorite={handleToggleFavoriteSong}
      />

      <LiveRoomListenersModal
        isOpen={showRoomListenersModal}
        onClose={() => setShowRoomListenersModal(false)}
        song={currentSong}
        listeners={loungeUsers}
        onSelectUser={(user) => {
          setSelectedDrawerUser(user);
          setShowRoomListenersModal(false);
        }}
        onStartChatWithUser={(user) => {
          setActiveChatUser(user);
          setActiveTab('chat');
          setShowRoomListenersModal(false);
        }}
        onToggleFriend={handleToggleFriend}
        activePlatform={activePlatform}
      />

      <YouTubeMusicConnectModal
        isOpen={showYouTubeConnectModal}
        onClose={() => setShowYouTubeConnectModal(false)}
        currentSong={currentSong}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onSelectSong={handleSelectSong}
        onShowToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 3000);
        }}
        isConnected={isYouTubeConnected}
        onToggleConnection={(conn) => setIsYouTubeConnected(conn)}
        account={youtubeAccount}
        onUpdateAccount={(acc) => setYoutubeAccount(acc)}
        isTasteSynced={isTasteSynced}
        onSyncTaste={handleSyncTaste}
        onStartPersonalRadio={handleStartPersonalRadio}
        syncedPlaylistsCount={syncedPlaylists.length}
        syncedPlaylists={syncedPlaylists}
        onImportPlaylist={handleImportPlaylistUrl}
        isGoogleAuthenticated={isGoogleAuthenticated}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        googleUser={googleUser}
        isGoogleLoading={isGoogleLoading}
      />
    </div>
  );
}
