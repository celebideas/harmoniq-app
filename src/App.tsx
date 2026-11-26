import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { NavTab, BottomNav } from './components/BottomNav';
import { TopHeader } from './components/TopHeader';
import { DesktopSidebar } from './components/DesktopSidebar';
import { DesktopPlayerBar } from './components/DesktopPlayerBar';
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
import { OnboardingModal } from './components/OnboardingModal';
import {
  AuthScreen,
  AuthSession,
  getStoredAuthSession,
  saveAuthSession,
  clearAuthSession,
} from './components/AuthScreen';
import { realtimePresence } from './services/realtimePresenceService';
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
  recordListeningPulse,
  recordTrackScrobble,
  clearListeningHistory,
} from './services/listeningHistoryService';
import { User as FirebaseAuthUser } from 'firebase/auth';
import {
  signInWithGoogle,
  logoutGoogle,
  fetchAllUserYouTubeMusicData,
  initAuth,
  getCachedAccessToken,
  getPersistentYouTubeAccount,
  savePersistentYouTubeAccount,
  clearPersistentYouTubeAccount,
  getPersistentYouTubeLibrary,
  savePersistentYouTubeLibrary,
  registerSyncedPlaylistIds,
  extractYouTubePlaylistId,
  fetchSilentPlaylistUpdates,
} from './services/googleAuthService';
import {
  PublicProfileDoc,
  CloudFriendRequest,
  CloudFriendship,
  CloudConversationDoc,
  getPairId,
  sortPair,
  formatCloudTimestamp,
  publicProfileToLoungeUser,
  cloudConversationToLoungeConversation,
  syncUserProfileToFirestore,
  updateLiveListeningPresence,
  markProfileOffline,
  subscribeDiscoverableProfiles,
  subscribeFriendRequests,
  subscribeFriendships,
  subscribeConversations,
  subscribeConversationMessages,
  sendCloudFriendRequest,
  acceptCloudFriendRequest,
  declineCloudFriendRequest,
  cancelCloudFriendRequest,
  removeCloudFriendship,
  sendOrStartCloudMessage,
  markCloudConversationRead,
} from './services/socialFirestoreService';
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
import { testFirestoreConnection } from './firebase';
import {
  ThemeMode,
  getSavedTheme,
  applyTheme,
  toggleThemeMode,
  resolveEffectiveTheme,
  subscribeSystemThemeChange,
  triggerHaptic,
} from './services/themeService';

export default function App() {
  const pwa = usePwaUpdate();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getSavedTheme());
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(() =>
    resolveEffectiveTheme(getSavedTheme())
  );

  // Initialize theme mode on mount & react live to OS theme changes when in 'system' mode
  useEffect(() => {
    setEffectiveTheme(applyTheme(themeMode));
    if (themeMode === 'system') {
      return subscribeSystemThemeChange(() => {
        setEffectiveTheme(applyTheme('system'));
      });
    }
  }, [themeMode]);

  const handleToggleTheme = () => {
    triggerHaptic(20);
    const next = toggleThemeMode(themeMode);
    setThemeMode(next);
    setEffectiveTheme(resolveEffectiveTheme(next));
    setToastMessage(next === 'dark' ? 'Obsidyen Gece Modu Aktif 🌙' : 'Stüdyo Gündüz Modu Aktif ☀️');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    setEffectiveTheme(applyTheme(mode));
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
      const persistedLib = getPersistentYouTubeLibrary();
      if (persistedLib && persistedLib.playlists.length > 0) {
        return persistedLib.playlists.filter((p: UserPlaylist) => !isTemplatePlaylist(p.id));
      }
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
      const persistedLib = getPersistentYouTubeLibrary();
      if (persistedLib && persistedLib.favoriteSongs.length > 0) {
        return persistedLib.favoriteSongs.filter((s: Song) => !isTemplateSong(s.id));
      }
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
      const persistedLib = getPersistentYouTubeLibrary();
      if (persistedLib && persistedLib.favoriteArtists.length > 0) {
        return cleanNonMusicArtists(persistedLib.favoriteArtists);
      }
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
  const appBootTimestampRef = useRef<number>(Date.now());
  const lastToastTimestampRef = useRef<number>(0);
  const sessionToastCountRef = useRef<number>(0);
  const toastHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastToggleClickRef = useRef<number>(0);
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
      lastToastTimestampRef.current = Date.now();
      if (toastHideTimerRef.current) {
        clearTimeout(toastHideTimerRef.current);
        toastHideTimerRef.current = null;
      }
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

  const [isYouTubeConnected, setIsYouTubeConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const persisted = getPersistentYouTubeAccount();
      return Boolean(persisted) || localStorage.getItem('harmoniq_youtube_connected') === 'true';
    }
    return false;
  });
  const [silentSyncNotice, setSilentSyncNotice] = useState<string | null>(null);
  const silentSyncExecutedRef = useRef<boolean>(false);

  const [youtubeAccount, setYoutubeAccount] = useState<{ email: string; handle: string; name: string }>(() => {
    if (typeof window !== 'undefined') {
      const persisted = getPersistentYouTubeAccount();
      if (persisted) {
        return {
          email: persisted.email || '',
          handle: persisted.handle || '@muziksever',
          name: persisted.name || 'Müzik Kaşifi',
        };
      }
      const saved = localStorage.getItem('harmoniq_user_account');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email !== 'contact.yasincelebi@gmail.com') {
            return parsed;
          }
        } catch {
          // ignore
        }
      }
    }
    return {
      email: '',
      handle: '@muziksever',
      name: 'Müzik Kaşifi',
    };
  });

  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getStoredAuthSession());

  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const existingSession = getStoredAuthSession();
      if (!existingSession || existingSession.isGuest) return false;
      return !localStorage.getItem('harmoniq_onboarding_completed');
    }
    return false;
  });

  const [realLiveListeners, setRealLiveListeners] = useState<LoungeUser[]>([]);

  const handleOnboardingComplete = (data: {
    name: string;
    avatarUrl?: string;
    avatarGradient: string;
    avatarSeed: string;
    genres: string[];
    city: string;
  }) => {
    const resolvedEmail = authSession?.email || youtubeAccount.email || '';
    const resolvedHandle = `@${data.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'kesif'}`;
    const acc = {
      email: resolvedEmail,
      handle: resolvedHandle,
      name: data.name,
    };
    setYoutubeAccount(acc);
    setUserCity(data.city);
    setManualLocation(data.city);
    if (data.avatarUrl) {
      setUserAvatarUrl(data.avatarUrl);
    }
    if (authSession) {
      const updatedSession: AuthSession = {
        ...authSession,
        name: data.name,
        handle: resolvedHandle,
        avatarUrl: data.avatarUrl || authSession.avatarUrl,
      };
      setAuthSession(updatedSession);
      saveAuthSession(updatedSession);
    }
    setPersonalTaste((prev) => ({
      ...prev,
      topGenres: data.genres,
    }));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('harmoniq_onboarding_completed', 'true');
      localStorage.setItem('harmoniq_user_account', JSON.stringify(acc));
      if (data.avatarUrl) {
        localStorage.setItem('harmoniq_user_avatar', data.avatarUrl);
      }
      localStorage.setItem('harmoniq_user_city', data.city);
    }
    setShowOnboardingModal(false);
    setActiveTab('lounge');
    setToastMessage(`⚡ Frekans kimliğin hazır! Hoş geldin, ${data.name}.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const purgeAllUserSessionData = useCallback(() => {
    clearAuthSession();
    clearPersistentYouTubeAccount();
    clearListeningHistory();

    if (typeof window !== 'undefined') {
      const keysToRemove = [
        'harmoniq_auth_session',
        'harmoniq_user_account',
        'harmoniq_onboarding_completed',
        'harmoniq_user_avatar',
        'harmoniq_user_bio',
        'harmoniq_user_city',
        'harmoniq_youtube_connected',
        'harmoniq_yt_connected_account',
        'harmoniq_yt_synced_library',
        'listenhub_play_history',
        ...Object.values(STORAGE_KEYS),
      ];
      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore storage errors
        }
      });
    }

    setYoutubeAccount({
      email: '',
      handle: '@muziksever',
      name: 'Müzik Kaşifi',
    });
    setUserAvatarUrl(null);
    setUserBio('Müzik ruhun gerçek frekansıdır.');
    setUserCity('İstanbul, Kadıköy');
    setIsYouTubeConnected(false);
    setHasActiveYouTubeToken(false);
    setSyncedPlaylists([]);
    setFavoriteSongs([]);
    setFavoriteArtists([]);
    setSubscribedChannels([]);
    setPersonalTaste(DEFAULT_PERSONAL_TASTE);
    setIsTasteSynced(false);
    setGoogleUser(null);
    setIsGoogleAuthenticated(false);
    setFirebaseUser(null);
    setCloudProfiles([]);
    setCloudIncomingRequests([]);
    setCloudOutgoingRequests([]);
    setCloudFriendships([]);
    setCloudConversations([]);
    setActiveCloudMessages([]);
    silentSyncExecutedRef.current = false;
  }, []);

  const handleOnboardingSkip = () => {
    if (typeof localStorage !== 'undefined' && authSession && !authSession.isGuest) {
      localStorage.setItem('harmoniq_onboarding_completed', 'true');
    }
    setShowOnboardingModal(false);
    setActiveTab('lounge');
    setToastMessage('Frekansa bağlandınız.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAuthSuccess = (session: AuthSession, isNewSignup: boolean) => {
    const storedAccountRaw =
      typeof window !== 'undefined' ? localStorage.getItem('harmoniq_user_account') : null;
    const hasGuestAccountRemnant =
      Boolean(authSession?.isGuest) ||
      Boolean(
        storedAccountRaw &&
          (storedAccountRaw.includes('Misafir Dinleyici') || storedAccountRaw.includes('@misafir'))
      );

    // If transitioning from Guest mode into a real account, wipe all guest remnants first
    if (!session.isGuest && hasGuestAccountRemnant) {
      if (typeof window !== 'undefined') {
        [
          'harmoniq_user_account',
          'harmoniq_user_avatar',
          'harmoniq_user_bio',
          'harmoniq_onboarding_completed',
          'harmoniq_youtube_connected',
          'harmoniq_yt_connected_account',
          'harmoniq_yt_synced_library',
        ].forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch {}
        });
      }
      setUserAvatarUrl(null);
      setUserBio('Müzik ruhun gerçek frekansıdır.');
    }

    setAuthSession(session);
    const updatedAcc = {
      name: session.name,
      email: session.email,
      handle: session.handle,
    };
    setYoutubeAccount(updatedAcc);
    setUserAvatarUrl(session.avatarUrl || null);

    if (typeof window !== 'undefined') {
      localStorage.setItem('harmoniq_user_account', JSON.stringify(updatedAcc));
      if (session.avatarUrl) {
        localStorage.setItem('harmoniq_user_avatar', session.avatarUrl);
      } else {
        localStorage.removeItem('harmoniq_user_avatar');
      }
    }

    setActiveTab('lounge');
    if (session.isGuest) {
      // Guest sessions MUST NEVER permanently lock onboarding for future real accounts
      setShowOnboardingModal(false);
      setToastMessage('Misafir olarak frekansa bağlandın.');
      setTimeout(() => setToastMessage(null), 3000);
    } else if (isNewSignup) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('harmoniq_onboarding_completed');
      }
      setShowOnboardingModal(true);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('harmoniq_onboarding_completed', 'true');
      }
      setShowOnboardingModal(false);
      setToastMessage(`Tekrar hoş geldin, ${session.name}!`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleLoadPopularCollection = () => {
    const popularPlaylists: UserPlaylist[] = [
      {
        id: 'pl-turkce-rock-klasikler',
        title: '🎸 Türkçe Rock & Grunge Frekansları',
        description: 'Duman, Mor ve Ötesi, Teoman ve döneme damgasını vuran kült riff’ler.',
        coverUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80',
        trackCount: 4,
        duration: '14:20',
        genre: 'Türkçe Rock',
        source: 'custom',
        tracks: [SAMPLE_SONGS[0], SAMPLE_SONGS[1], SAMPLE_SONGS[4], SAMPLE_SONGS[2]],
        isFavorite: true,
        updatedAt: 'Az önce',
      },
      {
        id: 'pl-gece-indie-darkwave',
        title: '⚡ Gece Yarısı Indie & Darkwave',
        description: 'She Past Away, Jakuzi, Arctic Monkeys ile post-punk ve synth dalgaları.',
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
        trackCount: 3,
        duration: '11:45',
        genre: 'Indie & Darkwave',
        source: 'custom',
        tracks: [SAMPLE_SONGS[5], SAMPLE_SONGS[3], SAMPLE_SONGS[2]],
        isFavorite: true,
        updatedAt: 'Az önce',
      },
      {
        id: 'pl-kadikoy-akustik-lofi',
        title: '☕ Kadıköy Akustik & Lo-Fi Odası',
        description: 'Yağmurlu Moda sokakları, analog gitarlar ve derin melodi rezonansı.',
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        trackCount: 3,
        duration: '10:50',
        genre: 'Lo-Fi & Akustik',
        source: 'custom',
        tracks: [SAMPLE_SONGS[4], SAMPLE_SONGS[0], SAMPLE_SONGS[3]],
        isFavorite: false,
        updatedAt: 'Az önce',
      },
    ];

    setSyncedPlaylists(popularPlaylists);
    setFavoriteSongs(SAMPLE_SONGS.slice(0, 4));
    setFavoriteArtists(['Duman', 'Mor ve Ötesi', 'Arctic Monkeys', 'Teoman', 'She Past Away']);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('harmoniq_user_playlists', JSON.stringify(popularPlaylists));
      localStorage.setItem('harmoniq_user_favorite_songs', JSON.stringify(SAMPLE_SONGS.slice(0, 4)));
      localStorage.setItem('harmoniq_user_favorite_artists', JSON.stringify(['Duman', 'Mor ve Ötesi', 'Arctic Monkeys', 'Teoman', 'She Past Away']));
    }
    setToastMessage('🔥 Popüler Rock & Indie koleksiyonu kütüphanene başarıyla eklendi!');
    setTimeout(() => setToastMessage(null), 3500);
  };

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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState<boolean>(false);
  const [hasActiveYouTubeToken, setHasActiveYouTubeToken] = useState<boolean>(false);
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; photoUrl?: string } | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [syncDiagnosticError, setSyncDiagnosticError] = useState<string | null>(null);

  // Real-Time Cloud Firestore Social State
  const [cloudProfiles, setCloudProfiles] = useState<PublicProfileDoc[]>([]);
  const [cloudIncomingRequests, setCloudIncomingRequests] = useState<CloudFriendRequest[]>([]);
  const [cloudOutgoingRequests, setCloudOutgoingRequests] = useState<CloudFriendRequest[]>([]);
  const [cloudFriendships, setCloudFriendships] = useState<CloudFriendship[]>([]);
  const [cloudConversations, setCloudConversations] = useState<CloudConversationDoc[]>([]);
  const [activeCloudMessages, setActiveCloudMessages] = useState<ChatMessage[]>([]);

  // Verify Firestore connectivity on boot
  useEffect(() => {
    void testFirestoreConnection();
  }, []);

  // Listen to Firebase Google Auth state
  useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        setFirebaseUser(user);
        setIsGoogleAuthenticated(true);
        setHasActiveYouTubeToken(Boolean(token));
        setGoogleUser({
          name: user.displayName || 'Google Kullanıcısı',
          email: user.email || '',
          photoUrl: user.photoURL || undefined,
        });
      },
      () => {
        setFirebaseUser(null);
        setIsGoogleAuthenticated(false);
        setHasActiveYouTubeToken(false);
        setGoogleUser(null);
        setCloudProfiles([]);
        setCloudIncomingRequests([]);
        setCloudOutgoingRequests([]);
        setCloudFriendships([]);
        setCloudConversations([]);
        setActiveCloudMessages([]);
      }
    );
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

  const lastPlayIntentRef = useRef<{ playing: boolean; time: number }>({ playing: false, time: 0 });
  const pendingStartSecondRef = useRef<number | null>(null);
  const pendingStartTimestampRef = useRef<number>(0);

  useEffect(() => {
    const unsubTime = soundEngine.onTimeUpdate((sec) => {
      if (pendingStartSecondRef.current !== null) {
        const target = pendingStartSecondRef.current;
        const elapsed = Date.now() - pendingStartTimestampRef.current;
        if (sec >= target - 1 || elapsed >= 1200) {
          pendingStartSecondRef.current = null;
        } else if (target > 2 && sec < 2) {
          return;
        }
      }
      setMySecond(sec);
    });
    const unsubState = soundEngine.onStateChange((playing) => {
      const elapsed = Date.now() - lastPlayIntentRef.current.time;
      if (elapsed < 1500 && playing !== lastPlayIntentRef.current.playing) {
        return;
      }
      setIsPlaying((prev) => (prev === playing ? prev : playing));
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

  // Real-time listening analytics tracker (persists every 5s + scrobbles at >=10s into listenhub_play_history)
  const trackedSongRef = useRef<Song>(currentSong);
  const unsavedPlaySecRef = useRef<number>(0);
  const trackSessionSecRef = useRef<number>(0);
  const trackScrobbledRef = useRef<boolean>(false);

  useEffect(() => {
    trackedSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    trackSessionSecRef.current = 0;
    trackScrobbledRef.current = false;
  }, [currentSong.id]);

  useEffect(() => {
    if (!isPlaying) return;
    const activeSongSnapshot = trackedSongRef.current;

    const timer = window.setInterval(() => {
      const songNow = trackedSongRef.current;
      unsavedPlaySecRef.current += 1;
      trackSessionSecRef.current += 1;

      if (unsavedPlaySecRef.current >= 5) {
        recordListeningPulse(songNow, unsavedPlaySecRef.current);
        unsavedPlaySecRef.current = 0;
      }

      if (!trackScrobbledRef.current && trackSessionSecRef.current >= 10) {
        recordTrackScrobble(songNow);
        trackScrobbledRef.current = true;
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      if (unsavedPlaySecRef.current > 0) {
        recordListeningPulse(activeSongSnapshot, unsavedPlaySecRef.current);
        unsavedPlaySecRef.current = 0;
      }
    };
  }, [isPlaying, currentSong.id]);

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
      onPlayPause: (play) => {
        lastPlayIntentRef.current = { playing: play, time: Date.now() };
        if (play) {
          setIsPlaying(true);
          if (soundEngine.getCurrentSongId() === currentSong.id) {
            soundEngine.resume();
          } else {
            soundEngine.playSong(currentSong, mySecond);
          }
        } else {
          setIsPlaying(false);
          soundEngine.pause();
        }
      },
      onSeek: (sec) => handleSeekSecond(sec),
    });
    soundEngine.updateMediaSession(currentSong, isPlaying);
    soundEngine.syncMediaSessionPlaybackState(isPlaying);
  }, [currentSong, isPlaying, activeQueue]);

  // Real-time High Compatibility Toast Detector for Live Lounge listeners:
  // Enforces strict global cooldowns so notifications stay rare, calm, and non-intrusive:
  // 1) Never within first 20s after boot, 2) Min 3 min between toasts, 3) Max 2 per session, 4) Visible for 5s
  useEffect(() => {
    if (!currentSong || loungeUsers.length === 0) return;

    const now = Date.now();
    // Rule 1: Never show within the first 20 seconds of app boot
    if (now - appBootTimestampRef.current < 20000) return;
    // Rule 2: Minimum 3 minutes (180,000 ms) cooldown between toasts
    if (lastToastTimestampRef.current > 0 && now - lastToastTimestampRef.current < 180000) return;
    // Rule 3: Maximum 2 automatic toasts per session
    if (sessionToastCountRef.current >= 2) return;

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
      const showTime = Date.now();
      if (
        showTime - appBootTimestampRef.current < 20000 ||
        (lastToastTimestampRef.current > 0 && showTime - lastToastTimestampRef.current < 180000) ||
        sessionToastCountRef.current >= 2
      ) {
        return;
      }

      notifiedMatchKeysRef.current.add(`${songKey}-${topMatch.user.id}`);
      lastToastTimestampRef.current = showTime;
      sessionToastCountRef.current += 1;
      setHighCompatibilityToast(topMatch);
      triggerHaptic(25);

      if (toastHideTimerRef.current) {
        clearTimeout(toastHideTimerRef.current);
      }
      // Rule 4: Stay visible for 5 seconds
      toastHideTimerRef.current = setTimeout(() => {
        setHighCompatibilityToast((prev) => (prev?.user.id === topMatch.user.id ? null : prev));
        toastHideTimerRef.current = null;
      }, 5000);
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

        const name = userName || googleUser?.name || youtubeAccount.name || 'Müzik Kaşifi';
        const handle = userEmail ? `@${userEmail.split('@')[0]}` : youtubeAccount.handle || '@muziksever';
        const updatedTaste = derivePersonalTasteFromData(
          name,
          handle,
          finalPlaylists,
          finalFavoriteSongs,
          finalFavoriteArtists
        );
        setPersonalTaste(updatedTaste);
        setIsTasteSynced(true);
        setIsYouTubeConnected(true);

        savePersistentYouTubeLibrary({
          playlists: finalPlaylists,
          favoriteSongs: finalFavoriteSongs,
          favoriteArtists: finalFavoriteArtists,
        });
        const ytIds = finalPlaylists
          .map((p) => extractYouTubePlaylistId(p.id))
          .filter((id): id is string => Boolean(id));
        if (ytIds.length > 0) {
          registerSyncedPlaylistIds(ytIds);
        }

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

  // Google OAuth Sign In & Profile Sync (Detailed try-catch & returns errorCode for Vercel/popup dual-mode fallback)
  const handleGoogleSignIn = async (): Promise<{ errorCode?: string; success?: boolean }> => {
    setIsGoogleLoading(true);
    setSyncDiagnosticError(null);
    setToastMessage('Google hesabı bağlanıyor...');
    try {
      const res = await signInWithGoogle(true);
      if (res && res.user) {
        const authedUser = res.user;
        setIsGoogleAuthenticated(true);
        setIsYouTubeConnected(true);
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
        const nextHandle = authedUser.email ? `@${authedUser.email.split('@')[0]}` : youtubeAccount.handle;
        setYoutubeAccount((prev) => ({
          ...prev,
          name: authedUser.displayName || prev.name,
          email: authedUser.email || prev.email,
          handle: nextHandle,
        }));
        savePersistentYouTubeAccount({
          name: userData.name,
          email: userData.email,
          avatar: userData.photoUrl,
          handle: nextHandle,
          channelId: authedUser.uid,
          authMode: 'oauth',
        });

        if (res.accessToken) {
          await syncFromYouTubeAccessToken(res.accessToken, userData.name, userData.email);
        } else {
          const errMsg =
            res.userFacingError ||
            'Google oturumu açıldı ancak YouTube okuma anahtarı alınamadı. Lütfen izinleri onaylayın.';
          setSyncDiagnosticError(errMsg);
          setToastMessage(errMsg);
        }
        return { success: true };
      } else {
        const errorCode = res?.errorCode;
        if (errorCode === 'auth/unauthorized-domain' || errorCode === 'auth/popup-blocked') {
          setToastMessage('Kalıcı YouTube Kanal & Liste bağlantısı açıldı.');
        } else {
          const errMsg =
            res?.userFacingError ||
            'Google OAuth bağlantısı tamamlanamadı. Kanal adı veya çalma listesi linkiyle kalıcı bağlanabilirsiniz.';
          setSyncDiagnosticError(errMsg);
          setToastMessage(errMsg);
        }
        return { errorCode, success: false };
      }
    } catch (err: any) {
      const code = err?.code;
      const errMsg = `Google oturumu açılırken beklenmeyen hata: ${err?.message || 'Lütfen tekrar deneyin.'}`;
      console.info('[Harmoniq Sync Diagnostic] Exception in handleGoogleSignIn:', {
        timestamp: new Date().toISOString(),
        code,
        message: err?.message,
      });
      setSyncDiagnosticError(errMsg);
      setToastMessage(errMsg);
      return { errorCode: code, success: false };
    } finally {
      setIsGoogleLoading(false);
      setTimeout(() => setToastMessage(null), 4500);
    }
  };

  // Dual-mode persistent YouTube / YT Music connection via @handle and/or playlist URL (works seamlessly on Vercel)
  const handlePersistentChannelConnect = async (data: {
    name?: string;
    handle: string;
    playlistUrl?: string;
  }): Promise<boolean> => {
    const cleanHandle = data.handle.startsWith('@') ? data.handle : `@${data.handle}`;
    const displayName =
      data.name ||
      (youtubeAccount.name && youtubeAccount.name !== 'Müzik Kaşifi'
        ? youtubeAccount.name
        : cleanHandle.replace(/^@/, ''));

    const extractedListId = data.playlistUrl ? extractYouTubePlaylistId(data.playlistUrl) : null;

    savePersistentYouTubeAccount({
      name: displayName,
      email: youtubeAccount.email || '',
      avatar: userAvatarUrl || undefined,
      handle: cleanHandle,
      syncedPlaylistIds: extractedListId ? [extractedListId] : [],
      authMode: 'channel_link',
    });

    setYoutubeAccount((prev) => ({
      ...prev,
      name: displayName,
      handle: cleanHandle,
    }));
    setIsYouTubeConnected(true);
    setIsTasteSynced(true);

    if (data.playlistUrl) {
      await handleImportPlaylistUrl(data.playlistUrl);
    } else if (cleanHandle) {
      await handleImportPlaylistUrl(cleanHandle);
    }

    setToastMessage(`✓ ${cleanHandle} kalıcı olarak bağlandı! Kütüphanen otomatik güncel kalacak.`);
    setTimeout(() => setToastMessage(null), 4000);
    return true;
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
          googleUser?.name || youtubeAccount.name || 'Müzik Kaşifi',
          googleUser?.email ? `@${googleUser.email.split('@')[0]}` : youtubeAccount.handle || '@muziksever',
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
      console.info('[ListenHub Sync Diagnostic] Background autoSyncUserData exception:', {
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
        if (currentSec >= 0 && pendingStartSecondRef.current === null) {
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

  // Silent OAuth-free background auto-sync on app mount:
  // Checks saved syncedPlaylistIds via /api/youtube-playlist without EVER prompting a Google popup
  useEffect(() => {
    if (silentSyncExecutedRef.current) return;
    silentSyncExecutedRef.current = true;

    const persistedAcc = getPersistentYouTubeAccount();
    const playlistIdsFromState = syncedPlaylists
      .map((p) => extractYouTubePlaylistId(p.id))
      .filter((id): id is string => Boolean(id));
    const allTargetIds = Array.from(
      new Set([...(persistedAcc?.syncedPlaylistIds || []), ...playlistIdsFromState])
    );

    if (!persistedAcc && allTargetIds.length === 0) return;

    // Ensure connected status is restored silently on mount
    if (persistedAcc) {
      setIsYouTubeConnected(true);
    }

    if (allTargetIds.length === 0) return;

    let cancelled = false;
    fetchSilentPlaylistUpdates(allTargetIds, syncedPlaylists)
      .then((res) => {
        if (cancelled) return;
        if (res.updatedPlaylists.length > 0) {
          setSyncedPlaylists(res.updatedPlaylists);
          if (typeof window !== 'undefined') {
            localStorage.setItem('harmoniq_user_playlists', JSON.stringify(res.updatedPlaylists));
          }
        }
        if (res.freshSongs.length > 0) {
          setFavoriteSongs((prev) => {
            const existingKeys = new Set(
              prev.map((s) => s.youtubeVideoId || `${s.artist}-${s.title}`.toLowerCase())
            );
            const brandNew = res.freshSongs.filter(
              (s) => !existingKeys.has(s.youtubeVideoId || `${s.artist}-${s.title}`.toLowerCase())
            );
            const merged = [...brandNew, ...prev];
            if (typeof window !== 'undefined') {
              localStorage.setItem('harmoniq_user_favorite_songs', JSON.stringify(merged));
            }
            return merged;
          });
        }
        if (res.freshArtists.length > 0) {
          setFavoriteArtists((prev) => {
            const merged = Array.from(new Set([...res.freshArtists, ...prev]));
            if (typeof window !== 'undefined') {
              localStorage.setItem('harmoniq_user_favorite_artists', JSON.stringify(merged));
            }
            return merged;
          });
        }
        savePersistentYouTubeLibrary({
          playlists: res.updatedPlaylists,
        });

        // Only notify the user subtly if genuinely new tracks were discovered
        if (res.addedTracksCount > 0) {
          setSilentSyncNotice('✓ YouTube Music kütüphanen güncellendi');
          setTimeout(() => setSilentSyncNotice(null), 4000);
        }
      })
      .catch(() => {
        // Silent background check: never disrupt the user
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

        const importedYtIds = [
          extractYouTubePlaylistId(urlOrId),
          ...result.playlists.map((p) => extractYouTubePlaylistId(p.id)),
        ].filter((id): id is string => Boolean(id));

        if (importedYtIds.length > 0) {
          registerSyncedPlaylistIds(importedYtIds);
          setIsYouTubeConnected(true);
        }
        savePersistentYouTubeLibrary({
          playlists: result.playlists.length > 0 ? [...result.playlists, ...syncedPlaylists.filter((p) => !result.playlists.some((np) => np.id === p.id))] : syncedPlaylists,
          favoriteSongs: result.songs.length > 0 ? [...result.songs, ...favoriteSongs] : favoriteSongs,
          favoriteArtists: result.artists.length > 0 ? Array.from(new Set([...result.artists, ...favoriteArtists])) : favoriteArtists,
        });

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

  // Quick Google Sign-In dedicated to Real-Time Cloud Social (Chat & Friendships) without requiring YouTube API scope
  const handleSocialGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setToastMessage('Google hesabıyla bulut sohbete bağlanılıyor...');
    try {
      const res = await signInWithGoogle(false);
      if (res && res.user) {
        const authedUser = res.user;
        setFirebaseUser(authedUser);
        setIsGoogleAuthenticated(true);
        setGoogleUser({
          name: authedUser.displayName || 'Google Kullanıcısı',
          email: authedUser.email || '',
          photoUrl: authedUser.photoURL || undefined,
        });
        if (authedUser.photoURL && !userAvatarUrl) {
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
        setToastMessage(`Hoş geldin ${authedUser.displayName || ''}! Bulut sohbet ve arkadaşlıklar aktif.`);
      } else {
        setToastMessage(res?.userFacingError || 'Google girişi tamamlanamadı.');
      }
    } catch (err: any) {
      setToastMessage(`Giriş hatası: ${err?.message || 'Lütfen tekrar deneyin.'}`);
    } finally {
      setIsGoogleLoading(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleGoogleSignOut = async () => {
    if (firebaseUser) {
      await markProfileOffline(firebaseUser.uid);
    }
    await logoutGoogle();
    clearPersistentYouTubeAccount();
    setFirebaseUser(null);
    setIsGoogleAuthenticated(false);
    setIsYouTubeConnected(false);
    setHasActiveYouTubeToken(false);
    setGoogleUser(null);
    setCloudProfiles([]);
    setCloudIncomingRequests([]);
    setCloudOutgoingRequests([]);
    setCloudFriendships([]);
    setCloudConversations([]);
    setActiveCloudMessages([]);
    setToastMessage('Oturum ve bağlı YouTube Music hesabı kapatıldı.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAuthGoogleContinue = async (): Promise<{
    success?: boolean;
    user?: { name: string; email: string; photoUrl?: string };
    errorMessage?: string;
  }> => {
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogle(true);
      if (res?.user) {
        const u = res.user;
        setFirebaseUser(u);
        setIsGoogleAuthenticated(true);
        setGoogleUser({
          name: u.displayName || 'Müzik Kaşifi',
          email: u.email || '',
          photoUrl: u.photoURL || undefined,
        });
        const handleStr = u.email ? `@${u.email.split('@')[0]}` : '@muziksever';
        savePersistentYouTubeAccount({
          name: u.displayName || 'Müzik Kaşifi',
          email: u.email || '',
          avatar: u.photoURL || undefined,
          handle: handleStr,
          authMode: 'oauth',
        });
        setIsYouTubeConnected(true);
        if (res.accessToken) {
          setHasActiveYouTubeToken(true);
          void syncFromYouTubeAccessToken(res.accessToken).catch(() => {});
        }
        return {
          success: true,
          user: {
            name: u.displayName || 'Müzik Kaşifi',
            email: u.email || '',
            photoUrl: u.photoURL || undefined,
          },
        };
      }
      return {
        success: false,
        errorMessage:
          res?.userFacingError ||
          'Google ile giriş tamamlanamadı. E-posta veya Misafir moduyla devam edebilirsin.',
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage:
          err?.message || 'Google bağlantısı başarısız oldu. E-posta ile giriş yapabilirsin.',
      };
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFullLogout = async () => {
    soundEngine.pause();
    lastPlayIntentRef.current = { playing: false, time: Date.now() };
    setIsPlaying(false);
    setShowNowPlayingModal(false);
    setShowRoomListenersModal(false);
    setShowSongPickerModal(false);
    setShowYouTubeConnectModal(false);
    setSelectedDrawerUser(null);
    setActiveChatUser(null);
    if (firebaseUser || isGoogleAuthenticated) {
      await handleGoogleSignOut();
    }
    purgeAllUserSessionData();
    setAuthSession(null);
    setShowOnboardingModal(false);
    setActiveTab('lounge');
  };

  const handleTogglePlay = () => {
    const now = Date.now();
    // 250ms debounce guard to prevent accidental mobile double-tap toggles
    if (now - lastToggleClickRef.current < 250) {
      return;
    }
    lastToggleClickRef.current = now;

    if (isPlaying) {
      lastPlayIntentRef.current = { playing: false, time: now };
      setIsPlaying(false);
      soundEngine.pause();
    } else {
      lastPlayIntentRef.current = { playing: true, time: now };
      setIsPlaying(true);
      if (soundEngine.getCurrentSongId() === currentSong.id) {
        soundEngine.resume();
      } else {
        soundEngine.playSong(currentSong, mySecond);
      }
    }
  };

  const handleSeekSecond = (sec: number) => {
    setMySecond(sec);
    soundEngine.seek(sec);
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
  };

  const handleSelectSong = async (song: Song, autoPlay = true, startSecond = 0) => {
    const safeStart = Math.max(0, Math.floor(startSecond || 0));
    pendingStartSecondRef.current = safeStart > 0 ? safeStart : null;
    pendingStartTimestampRef.current = Date.now();

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

    if (autoPlay || isPlaying) {
      lastPlayIntentRef.current = { playing: true, time: Date.now() };
      setIsPlaying(true);
      soundEngine.playSong(playableSong, safeStart);
    }
    setCurrentSong(playableSong);
    playedSongTitlesRef.current.add(playableSong.title.toLowerCase());
    setMySecond(safeStart);
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

  const handleToggleFriend = async (user: LoungeUser) => {
    if (user.isRealUser) {
      if (!firebaseUser) {
        setToastMessage('Gerçek kullanıcılarla arkadaş olmak için Google ile giriş yapın.');
        setTimeout(() => setToastMessage(null), 3500);
        await handleSocialGoogleSignIn();
        return;
      }

      const pairId = getPairId(firebaseUser.uid, user.id);
      try {
        if (user.friendStatus === 'friends') {
          await removeCloudFriendship(pairId);
          setToastMessage(`${user.name} arkadaş listenden çıkarıldı.`);
        } else if (user.friendStatus === 'pending' && user.friendDirection === 'incoming') {
          await acceptCloudFriendRequest(pairId, user.id, firebaseUser.uid);
          setToastMessage(`${user.name} ile artık arkadaşsınız.`);
        } else if (user.friendStatus === 'pending') {
          await cancelCloudFriendRequest(pairId);
          setToastMessage('Arkadaşlık isteği geri çekildi.');
        } else {
          await sendCloudFriendRequest({
            myUid: firebaseUser.uid,
            myName: currentUserProfile.name,
            myAvatarUrl: currentUserProfile.avatarUrl,
            myAvatarSeed: currentUserProfile.avatarSeed,
            myAvatarGradient: currentUserProfile.avatarGradient,
            myCity: currentUserProfile.city,
            targetUid: user.id,
            songContext: `${currentSong.artist} - ${currentSong.title}`,
          });
          setToastMessage(`${user.name} için gerçek arkadaşlık isteği gönderildi.`);
        }
      } catch {
        setToastMessage('Arkadaşlık işlemi tamamlanamadı. Lütfen tekrar deneyin.');
      }
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

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

  const handleAcceptFriendRequest = async (requestId: string) => {
    const cloudReq = cloudIncomingRequests.find((r) => r.pairId === requestId);
    if (cloudReq && firebaseUser) {
      try {
        await acceptCloudFriendRequest(cloudReq.pairId, cloudReq.fromUid, firebaseUser.uid);
        setToastMessage(`${cloudReq.fromName} ile artık arkadaşsınız.`);
      } catch {
        setToastMessage('İstek kabul edilirken bir hata oluştu.');
      }
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

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

  const handleDeclineFriendRequest = async (requestId: string) => {
    const cloudReq = cloudIncomingRequests.find((r) => r.pairId === requestId);
    if (cloudReq && firebaseUser) {
      try {
        await declineCloudFriendRequest(cloudReq.pairId);
        setToastMessage('Arkadaşlık isteği reddedildi.');
      } catch {
        setToastMessage('İstek reddedilemedi.');
      }
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleCancelSentRequest = async (userId: string) => {
    const cloudOut = cloudOutgoingRequests.find((r) => r.toUid === userId);
    if (cloudOut && firebaseUser) {
      try {
        await cancelCloudFriendRequest(cloudOut.pairId);
        setToastMessage('Gönderilen istek iptal edildi.');
      } catch {
        setToastMessage('İstek iptal edilemedi.');
      }
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setLoungeUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, friendStatus: 'none' as const } : u))
    );
    if (selectedDrawerUser?.id === userId) {
      setSelectedDrawerUser({ ...selectedDrawerUser, friendStatus: 'none' as const });
    }
  };

  const handleSendFrequency = async (user: LoungeUser, icebreakerText?: string) => {
    setSelectedDrawerUser(null);

    if (user.isRealUser) {
      if (!firebaseUser) {
        setToastMessage('Gerçek kullanıcıya mesaj göndermek için Google ile giriş yapın.');
        setTimeout(() => setToastMessage(null), 3500);
        await handleSocialGoogleSignIn();
        return;
      }

      setActiveChatUser(user);
      setActiveTab('chat');

      const pairId = getPairId(firebaseUser.uid, user.id);
      const existingCloud = cloudConversations.find((c) => c.pairId === pairId);
      if (!existingCloud || icebreakerText) {
        const initialText =
          icebreakerText || `Selam ${user.name}! ${currentSong.title} şarkısında aynı frekansta karşılaştık.`;
        try {
          await sendOrStartCloudMessage({
            myUid: firebaseUser.uid,
            myName: currentUserProfile.name,
            myAvatarUrl: currentUserProfile.avatarUrl,
            myAvatarSeed: currentUserProfile.avatarSeed,
            myAvatarGradient: currentUserProfile.avatarGradient,
            myCity: currentUserProfile.city,
            targetUser: user,
            text: initialText,
            currentSong,
            currentSecond: mySecond,
            isIcebreaker: Boolean(icebreakerText),
          });
        } catch {
          setToastMessage('Mesaj buluta iletilemedi. Lütfen tekrar deneyin.');
          setTimeout(() => setToastMessage(null), 3500);
        }
      }
      return;
    }

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

  const handleSendMessage = async (matchId: string, text: string, isIcebreaker?: boolean) => {
    const cloudTarget = mergedConversations.find((c) => c.matchId === matchId && c.isCloudConversation);
    if ((cloudTarget || activeChatUser?.isRealUser) && firebaseUser) {
      const targetUser = cloudTarget?.user || activeChatUser;
      if (!targetUser) return;
      try {
        await sendOrStartCloudMessage({
          myUid: firebaseUser.uid,
          myName: currentUserProfile.name,
          myAvatarUrl: currentUserProfile.avatarUrl,
          myAvatarSeed: currentUserProfile.avatarSeed,
          myAvatarGradient: currentUserProfile.avatarGradient,
          myCity: currentUserProfile.city,
          targetUser,
          text,
          currentSong,
          currentSecond: mySecond,
          isIcebreaker,
        });
      } catch {
        setToastMessage('Mesaj gönderilemedi. Bağlantınızı kontrol edin.');
        setTimeout(() => setToastMessage(null), 3500);
      }
      return;
    }

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

  const handleSendSongMessage = async (
    matchId: string,
    song: Song,
    comment?: string,
    timestampSecond?: number
  ) => {
    const formattedTime = timestampSecond !== undefined
      ? `${Math.floor(timestampSecond / 60)}:${timestampSecond % 60 < 10 ? '0' : ''}${Math.floor(timestampSecond % 60)}`
      : null;
    const defaultText = formattedTime
      ? `Bu şarkının ${formattedTime} saniyesini dinle!`
      : `Sana bu şarkıyı öneriyorum: ${song.artist} - ${song.title}`;
    const text = comment && comment.trim() ? comment.trim() : defaultText;

    const cloudTarget = mergedConversations.find((c) => c.matchId === matchId && c.isCloudConversation);
    if ((cloudTarget || activeChatUser?.isRealUser) && firebaseUser) {
      const targetUser = cloudTarget?.user || activeChatUser;
      if (!targetUser) return;
      try {
        await sendOrStartCloudMessage({
          myUid: firebaseUser.uid,
          myName: currentUserProfile.name,
          myAvatarUrl: currentUserProfile.avatarUrl,
          myAvatarSeed: currentUserProfile.avatarSeed,
          myAvatarGradient: currentUserProfile.avatarGradient,
          myCity: currentUserProfile.city,
          targetUser,
          text,
          currentSong,
          currentSecond: mySecond,
          sharedSong: song,
          sharedTimestampSecond: timestampSecond,
        });
      } catch {
        setToastMessage('Şarkı kartı gönderilemedi.');
        setTimeout(() => setToastMessage(null), 3500);
      }
      return;
    }

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
    const targetSecond = Math.max(0, Math.floor(Number(second) || 0));
    pendingStartSecondRef.current = targetSecond > 0 ? targetSecond : null;
    pendingStartTimestampRef.current = Date.now();
    setMySecond(targetSecond);

    const isSameTrack =
      currentSong.id === track.id ||
      (currentSong.title.trim().toLowerCase() === track.title.trim().toLowerCase() &&
        currentSong.artist.trim().toLowerCase() === track.artist.trim().toLowerCase());

    if (isSameTrack && soundEngine.getCurrentSongId() === currentSong.id) {
      soundEngine.seekTo(targetSecond);
      if (!isPlaying || !soundEngine.getIsPlaying()) {
        lastPlayIntentRef.current = { playing: true, time: Date.now() };
        setIsPlaying(true);
        soundEngine.resume();
      }
    } else if (isSameTrack && soundEngine.getCurrentSongId() === track.id) {
      soundEngine.seekTo(targetSecond);
      if (!isPlaying || !soundEngine.getIsPlaying()) {
        lastPlayIntentRef.current = { playing: true, time: Date.now() };
        setIsPlaying(true);
        soundEngine.resume();
      }
    } else {
      void handleSelectSong(track, true, targetSecond);
    }

    const m = Math.floor(targetSecond / 60);
    const s = Math.floor(targetSecond % 60);
    const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
    setToastMessage(`"${track.title}" ${timeStr} anından çalınıyor.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const resolvedDisplayName =
    googleUser?.name ||
    (!authSession?.isGuest && authSession?.name ? authSession.name : '') ||
    (youtubeAccount.name && youtubeAccount.name !== 'Yasin Çelebi' ? youtubeAccount.name : '') ||
    authSession?.name ||
    'Müzik Kaşifi';

  const currentUserProfile: UserProfile = {
    id: 'me',
    name: resolvedDisplayName,
    age: 24,
    city: userCity,
    avatarGradient: 'from-purple-600 to-pink-500',
    avatarSeed:
      resolvedDisplayName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((s) => s[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'MK',
    avatarUrl: userAvatarUrl || googleUser?.photoUrl || authSession?.avatarUrl || undefined,
    isYouTubeConnected,
    youtubeAccount,
    email:
      googleUser?.email ||
      (!authSession?.isGuest && authSession?.email ? authSession.email : undefined) ||
      (youtubeAccount.email && youtubeAccount.email !== 'contact.yasincelebi@gmail.com'
        ? youtubeAccount.email
        : undefined),
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

  // Sync authenticated profile & attach real-time Firestore social listeners
  useEffect(() => {
    if (!firebaseUser) return;
    const myUid = firebaseUser.uid;

    void syncUserProfileToFirestore({
      firebaseUser,
      displayName: currentUserProfile.name,
      handle: youtubeAccount.handle || (firebaseUser.email ? `@${firebaseUser.email.split('@')[0]}` : undefined),
      avatarUrl: currentUserProfile.avatarUrl,
      avatarSeed: currentUserProfile.avatarSeed,
      avatarGradient: currentUserProfile.avatarGradient,
      city: currentUserProfile.city,
      bio: currentUserProfile.bio,
      topGenres: currentUserProfile.topGenres,
      currentSong,
      currentSecond: mySecond,
      statusBubble: `${currentSong.title} dinliyor`,
      privacyMode,
    }).catch(() => {});

    const unsubProfiles = subscribeDiscoverableProfiles(myUid, setCloudProfiles);
    const unsubReqs = subscribeFriendRequests(myUid, ({ incoming, outgoing }) => {
      setCloudIncomingRequests(incoming);
      setCloudOutgoingRequests(outgoing);
    });
    const unsubFriends = subscribeFriendships(myUid, setCloudFriendships);
    const unsubConvs = subscribeConversations(myUid, setCloudConversations);

    return () => {
      unsubProfiles();
      unsubReqs();
      unsubFriends();
      unsubConvs();
    };
  }, [
    firebaseUser?.uid,
    currentUserProfile.name,
    currentUserProfile.city,
    currentUserProfile.bio,
    currentUserProfile.avatarUrl,
    privacyMode,
  ]);

  // Periodic live listening heartbeat to /publicProfiles/{uid}
  const latestPlaybackRef = useRef({ song: currentSong, sec: mySecond });
  latestPlaybackRef.current = { song: currentSong, sec: mySecond };

  useEffect(() => {
    if (!firebaseUser) return;
    const sendPulse = () => {
      const { song, sec } = latestPlaybackRef.current;
      void updateLiveListeningPresence({
        uid: firebaseUser.uid,
        currentSong: song,
        currentSecond: sec,
        statusBubble: `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')} · ${song.title}`,
        isOnline: true,
      }).catch(() => {});
    };
    sendPulse();
    const timer = setInterval(sendPulse, 25000);
    return () => clearInterval(timer);
  }, [firebaseUser?.uid, currentSong.id]);

  // Subscribe to real-time messages for the currently open cloud conversation
  useEffect(() => {
    if (!firebaseUser || !activeChatUser?.isRealUser) {
      setActiveCloudMessages([]);
      return;
    }
    const [uidA, uidB] = sortPair(firebaseUser.uid, activeChatUser.id);
    const pairId = `${uidA}_${uidB}`;
    const unsub = subscribeConversationMessages(
      pairId,
      uidA,
      uidB,
      firebaseUser.uid,
      setActiveCloudMessages
    );
    return () => unsub();
  }, [firebaseUser?.uid, activeChatUser?.id, activeChatUser?.isRealUser]);

  // Real-time Heartbeat & Cross-Tab Presence (BroadcastChannel)
  useEffect(() => {
    realtimePresence.startHeartbeatCycle();
    const unsub = realtimePresence.subscribeToRealListeners(currentSong.id, (realUsers) => {
      setRealLiveListeners(realUsers);
    });
    return () => {
      unsub();
      realtimePresence.stopHeartbeatCycle();
    };
  }, [currentSong.id]);

  useEffect(() => {
    const clientUid =
      firebaseUser?.uid ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('harmoniq_client_uid') ||
          (() => {
            const id = 'u_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('harmoniq_client_uid', id);
            return id;
          })()
        : 'user_me');

    realtimePresence.updateLocalUserPresence({
      userId: clientUid,
      name: currentUserProfile.name,
      avatarUrl: currentUserProfile.avatarUrl,
      avatarGradient: currentUserProfile.avatarGradient,
      avatarSeed: currentUserProfile.avatarSeed,
      city: currentUserProfile.city,
      currentSong,
      currentSecond: mySecond,
      trustScore: currentUserProfile.trustScore,
      statusBubble: `${Math.floor(mySecond / 60)}:${(mySecond % 60).toString().padStart(2, '0')} anında aynı frekansta 🎧`,
    });
  }, [firebaseUser?.uid, currentSong.id, currentSong.title, mySecond, currentUserProfile.name, currentUserProfile.city]);

  // Unified Cloud + Local Derived Social Models
  const cloudProfileMap = useMemo(() => {
    const map = new Map<string, PublicProfileDoc>();
    cloudProfiles.forEach((p) => map.set(p.uid, p));
    return map;
  }, [cloudProfiles]);

  const cloudFriendUidSet = useMemo(() => {
    const set = new Set<string>();
    if (!firebaseUser) return set;
    cloudFriendships.forEach((f) => {
      const otherUid = f.uidA === firebaseUser.uid ? f.uidB : f.uidA;
      set.add(otherUid);
    });
    return set;
  }, [cloudFriendships, firebaseUser]);

  const discoverableCloudUsers = useMemo<LoungeUser[]>(() => {
    const incomingFromSet = new Set(cloudIncomingRequests.map((r) => r.fromUid));
    const outgoingToSet = new Set(cloudOutgoingRequests.map((r) => r.toUid));
    return cloudProfiles.map((p) => {
      if (cloudFriendUidSet.has(p.uid)) {
        return publicProfileToLoungeUser(p, 'friends');
      }
      if (incomingFromSet.has(p.uid)) {
        return publicProfileToLoungeUser(p, 'pending', 'incoming');
      }
      if (outgoingToSet.has(p.uid)) {
        return publicProfileToLoungeUser(p, 'pending', 'outgoing');
      }
      return publicProfileToLoungeUser(p, 'none');
    });
  }, [cloudProfiles, cloudFriendUidSet, cloudIncomingRequests, cloudOutgoingRequests]);

  const mergedFriendsList = useMemo<LoungeUser[]>(() => {
    const realFriends: LoungeUser[] = [];
    cloudFriendUidSet.forEach((uid) => {
      const p = cloudProfileMap.get(uid);
      if (p) {
        realFriends.push(publicProfileToLoungeUser(p, 'friends'));
      } else {
        const conv = cloudConversations.find((c) => c.uidA === uid || c.uidB === uid);
        const summary = conv ? (conv.uidA === uid ? conv.participantA : conv.participantB) : null;
        if (summary) {
          realFriends.push({
            id: summary.uid,
            name: summary.name,
            age: 24,
            city: summary.city,
            avatarSeed: summary.avatarSeed,
            avatarGradient: summary.avatarGradient,
            avatarUrl: summary.avatarUrl,
            platform: 'youtube_music',
            currentSecond: 0,
            topArtists: ['ListenHub'],
            bio: 'ListenHub arkadaşı.',
            trustScore: 98,
            lastHeartbeatAgoSeconds: 30,
            isOnline: false,
            distanceKm: 1.5,
            friendStatus: 'friends',
            isRealUser: true,
          });
        }
      }
    });
    const realIds = new Set(realFriends.map((f) => f.id));
    return [...realFriends, ...friendsList.filter((f) => !realIds.has(f.id))];
  }, [cloudFriendUidSet, cloudProfileMap, cloudConversations, friendsList]);

  const mergedIncomingRequests = useMemo<FriendRequest[]>(() => {
    const realReqs: FriendRequest[] = cloudIncomingRequests.map((r) => {
      const liveProfile = cloudProfileMap.get(r.fromUid);
      const fromUser: LoungeUser = liveProfile
        ? publicProfileToLoungeUser(liveProfile, 'pending', 'incoming')
        : {
            id: r.fromUid,
            name: r.fromName,
            age: 24,
            city: r.fromCity,
            avatarSeed: r.fromAvatarSeed,
            avatarGradient: r.fromAvatarGradient,
            avatarUrl: r.fromAvatarUrl,
            platform: 'youtube_music',
            currentSecond: 0,
            topArtists: ['ListenHub'],
            bio: 'ListenHub dinleyicisi.',
            trustScore: 98,
            lastHeartbeatAgoSeconds: 10,
            isOnline: true,
            distanceKm: 1.5,
            friendStatus: 'pending',
            friendDirection: 'incoming',
            isRealUser: true,
          };
      return {
        id: r.pairId,
        fromUser,
        timestamp: formatCloudTimestamp(r.createdAt),
        songContext: r.songContext,
        status: r.status,
        isCloudRequest: true,
      };
    });
    const realIds = new Set(realReqs.map((r) => r.id));
    return [...realReqs, ...friendRequests.filter((r) => !realIds.has(r.id))];
  }, [cloudIncomingRequests, cloudProfileMap, friendRequests]);

  const mergedOutgoingRequestUsers = useMemo<LoungeUser[]>(() => {
    const realOut: LoungeUser[] = cloudOutgoingRequests.map((r) => {
      const liveProfile = cloudProfileMap.get(r.toUid);
      if (liveProfile) return publicProfileToLoungeUser(liveProfile, 'pending', 'outgoing');
      return {
        id: r.toUid,
        name: 'ListenHub Dinleyicisi',
        age: 24,
        city: 'Türkiye',
        avatarSeed: 'LH',
        avatarGradient: 'from-emerald-500 to-teal-700',
        platform: 'youtube_music',
        currentSecond: 0,
        topArtists: ['ListenHub'],
        bio: 'Bekleyen arkadaşlık isteği.',
        trustScore: 98,
        lastHeartbeatAgoSeconds: 15,
        isOnline: false,
        distanceKm: 2.0,
        friendStatus: 'pending',
        friendDirection: 'outgoing',
        isRealUser: true,
      };
    });
    const realIds = new Set(realOut.map((u) => u.id));
    const localPending = loungeUsers.filter(
      (u) => u.friendStatus === 'pending' && !realIds.has(u.id)
    );
    return [...realOut, ...localPending];
  }, [cloudOutgoingRequests, cloudProfileMap, loungeUsers]);

  const mergedConversations = useMemo<LoungeConversation[]>(() => {
    if (!firebaseUser) return conversations;
    const mappedCloud: LoungeConversation[] = cloudConversations.map((conv) => {
      const otherUid = conv.uidA === firebaseUser.uid ? conv.uidB : conv.uidA;
      const isSelected = activeChatUser?.id === otherUid;
      return cloudConversationToLoungeConversation(
        conv,
        firebaseUser.uid,
        cloudProfileMap,
        cloudFriendUidSet,
        isSelected ? activeCloudMessages : []
      );
    });
    const cloudUserIds = new Set(mappedCloud.map((c) => c.user.id));
    return [...mappedCloud, ...conversations.filter((c) => !cloudUserIds.has(c.user.id))];
  }, [
    firebaseUser,
    cloudConversations,
    cloudProfileMap,
    cloudFriendUidSet,
    activeChatUser?.id,
    activeCloudMessages,
    conversations,
  ]);

  const combinedLoungeUsers = useMemo(() => {
    const onlineCloud = discoverableCloudUsers.filter((u) => u.isOnline);
    const mergedReal = [...onlineCloud, ...realLiveListeners];
    if (mergedReal.length === 0) return loungeUsers;
    const seen = new Set<string>();
    const dedupedReal: LoungeUser[] = [];
    for (const u of mergedReal) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        dedupedReal.push(u);
      }
    }
    const filteredSimulated = loungeUsers.filter((u) => !seen.has(u.id));
    return [...dedupedReal, ...filteredSimulated];
  }, [discoverableCloudUsers, realLiveListeners, loungeUsers]);

  // Keep open MiniProfileDrawer friendStatus in sync with real-time Firestore state
  const resolvedDrawerUser = useMemo(() => {
    if (!selectedDrawerUser) return null;
    if (selectedDrawerUser.isRealUser) {
      const fresh = discoverableCloudUsers.find((u) => u.id === selectedDrawerUser.id);
      if (fresh) return fresh;
      const friendMatch = mergedFriendsList.find((u) => u.id === selectedDrawerUser.id);
      if (friendMatch) return friendMatch;
    }
    return selectedDrawerUser;
  }, [selectedDrawerUser, discoverableCloudUsers, mergedFriendsList]);

  const totalUnread =
    mergedConversations.reduce((acc, curr) => acc + curr.unreadCount, 0) +
    cloudIncomingRequests.length;
  const isLight = effectiveTheme === 'light';

  if (!authSession) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        onGoogleContinue={handleAuthGoogleContinue}
        isGoogleLoading={isGoogleLoading}
      />
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isLight ? 'bg-[#F5F4F8] text-[#14121E]' : 'bg-[#0A090F] text-[#F4F3F8]'
      } flex flex-col font-sans selection:bg-purple-500 selection:text-white relative overflow-x-clip`}
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

      {/* Desktop Left Sidebar (>= 1024px) */}
      <DesktopSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        unreadCount={totalUnread}
        liveListenersCount={
          privacyMode === 'friends_only'
            ? mergedFriendsList.length + 1
            : combinedLoungeUsers.length
        }
        isPlaying={isPlaying}
        privacyMode={privacyMode}
        onChangePrivacyMode={(mode) => {
          setPrivacyMode(mode);
        }}
        userProfile={currentUserProfile}
        themeMode={effectiveTheme}
        onToggleTheme={handleToggleTheme}
      />

      <div
        className={`w-full flex-1 flex flex-col lg:pl-72 ${
          isLight ? 'bg-[#F5F4F8]/95 shadow-sm' : 'bg-[#0A090F]/90'
        } relative z-10 transition-all duration-300`}
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
          userProfile={currentUserProfile}
          themeMode={effectiveTheme}
          onToggleTheme={handleToggleTheme}
          liveListenersCount={privacyMode === 'friends_only' ? mergedFriendsList.length + 1 : combinedLoungeUsers.length}
        />

        <main className="flex-1 flex flex-col transition-all duration-300 pb-36 lg:pb-28">
          <div className={activeTab === 'lounge' ? 'flex-1 flex flex-col' : 'hidden'}>
            <LiveLoungeTab
              currentSong={currentSong}
              mySecond={mySecond}
              users={combinedLoungeUsers}
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
              conversations={mergedConversations}
              activeChatUser={activeChatUser}
              onSelectConversation={(conv) => {
                setActiveChatUser(conv.user);
                if (
                  conv.isCloudConversation &&
                  conv.unreadCount > 0 &&
                  conv.cloudPairId &&
                  conv.cloudUidA &&
                  firebaseUser
                ) {
                  void markCloudConversationRead(conv.cloudPairId, conv.cloudUidA, firebaseUser.uid).catch(() => {});
                }
              }}
              onBackToList={() => setActiveChatUser(null)}
              onSendMessage={handleSendMessage}
              onSendSongMessage={handleSendSongMessage}
              onPlayMoment={handlePlayMoment}
              onPlaySong={(song) => handleSelectSong(song, true)}
              onStartChatWithUser={(user, text) => handleSendFrequency(user, text)}
              onOpenUserProfile={(user) => setSelectedDrawerUser(user)}
              recentListeners={combinedLoungeUsers}
              discoverableCloudUsers={discoverableCloudUsers}
              friendsList={mergedFriendsList}
              incomingRequests={mergedIncomingRequests}
              outgoingRequests={mergedOutgoingRequestUsers.map((u) => ({
                id: `out-${u.id}`,
                fromUser: u,
                toUser: u,
                direction: 'outgoing' as const,
                timestamp: 'Bekliyor',
                status: 'pending' as const,
                isCloudRequest: Boolean(u.isRealUser),
              }))}
              onToggleFriend={handleToggleFriend}
              onAcceptFriendRequest={handleAcceptFriendRequest}
              onDeclineFriendRequest={handleDeclineFriendRequest}
              onCancelSentRequest={handleCancelSentRequest}
              isCloudAuthenticated={Boolean(firebaseUser)}
              isAuthLoading={isGoogleLoading}
              onGoogleSignIn={handleSocialGoogleSignIn}
              currentSong={currentSong}
              currentSecond={mySecond}
              allSongs={activeQueue.length > 0 ? activeQueue : SAMPLE_SONGS}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab
              userProfile={{ ...currentUserProfile, friendsCount: mergedFriendsList.length }}
              friendsList={mergedFriendsList}
              friendRequests={mergedIncomingRequests}
              pendingSentUsers={mergedOutgoingRequestUsers}
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
              onLoadPopularCollection={handleLoadPopularCollection}
              onLogout={handleFullLogout}
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

              {/* 5-Second Progress Bar (Right-to-Left / shrinking smoothly) */}
              <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500/15 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 origin-left"
                  style={{
                    animation: 'toastProgress 5s linear forwards',
                  }}
                />
              </div>

              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* User Avatar with pulsing compatibility ring */}
                <div
                  onClick={() => {
                    triggerHaptic(15);
                    lastToastTimestampRef.current = Date.now();
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
                    lastToastTimestampRef.current = Date.now();
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
                    lastToastTimestampRef.current = Date.now();
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
                    lastToastTimestampRef.current = Date.now();
                    if (toastHideTimerRef.current) {
                      clearTimeout(toastHideTimerRef.current);
                      toastHideTimerRef.current = null;
                    }
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
          <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-[80] pointer-events-none bg-white/95 dark:bg-[#14121E]/95 backdrop-blur-xl border border-[#E4E2EC] dark:border-white/10 text-zinc-900 dark:text-zinc-100 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[90vw]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        {silentSyncNotice && !toastMessage && (
          <div className="fixed bottom-36 right-4 z-[75] pointer-events-none bg-white/95 dark:bg-[#14121E]/95 backdrop-blur-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 px-3.5 py-2 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span>{silentSyncNotice}</span>
          </div>
        )}

        <BottomNav
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          unreadCount={totalUnread}
          liveCount={privacyMode === 'friends_only' ? mergedFriendsList.length + 1 : combinedLoungeUsers.length}
          currentSong={currentSong}
          isPlaying={isPlaying}
          currentSecond={mySecond}
          isAudioLoading={isAudioLoading}
          onTogglePlay={handleTogglePlay}
          onNextSong={handleNextSong}
          onOpenNowPlaying={() => setShowNowPlayingModal(true)}
          onSeekSecond={handleSeekSecond}
        />

        <DesktopPlayerBar
          currentSong={currentSong}
          isPlaying={isPlaying}
          isAudioLoading={isAudioLoading}
          currentSecond={mySecond}
          isFavorite={favoriteSongs.some(
            (s) =>
              s.id === currentSong.id ||
              (s.title.toLowerCase() === currentSong.title.toLowerCase() &&
                s.artist.toLowerCase() === currentSong.artist.toLowerCase())
          )}
          onTogglePlay={handleTogglePlay}
          onNextSong={handleNextSong}
          onPrevSong={handlePrevSong}
          onSeekSecond={handleSeekSecond}
          onToggleFavorite={handleToggleFavoriteSong}
          onOpenNowPlaying={() => setShowNowPlayingModal(true)}
        />
      </div>

      <MiniProfileDrawer
        user={resolvedDrawerUser}
        song={currentSong}
        onClose={() => setSelectedDrawerUser(null)}
        onSendFrequency={handleSendFrequency}
        onToggleFriend={handleToggleFriend}
        onAcceptIncomingRequest={(user) => {
          const targetUid = user.uid || user.id;
          const matchingReq = cloudIncomingRequests.find((r) => r.fromUid === targetUid);
          if (matchingReq) {
            handleAcceptFriendRequest(matchingReq.pairId);
          } else {
            const localReq = friendRequests.find((r) => r.fromUser.id === user.id);
            if (localReq) {
              handleAcceptFriendRequest(localReq.id);
            }
          }
        }}
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
          setToastMessage('ListenHub ana ekranınıza kuruldu.');
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
        listeners={combinedLoungeUsers}
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
        isAudioLoading={isAudioLoading}
      />

      <LiveRoomListenersModal
        isOpen={showRoomListenersModal}
        onClose={() => setShowRoomListenersModal(false)}
        song={currentSong}
        listeners={combinedLoungeUsers}
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
        onToggleConnection={(conn) => {
          setIsYouTubeConnected(conn);
          if (conn) {
            savePersistentYouTubeAccount({
              name: youtubeAccount.name,
              email: youtubeAccount.email,
              handle: youtubeAccount.handle,
              avatar: userAvatarUrl || undefined,
              authMode: isGoogleAuthenticated ? 'oauth' : 'channel_link',
            });
          } else {
            clearPersistentYouTubeAccount();
          }
        }}
        account={youtubeAccount}
        onUpdateAccount={(acc) => {
          setYoutubeAccount(acc);
          savePersistentYouTubeAccount({
            name: acc.name,
            email: acc.email,
            handle: acc.handle,
          });
        }}
        isTasteSynced={isTasteSynced}
        onSyncTaste={handleSyncTaste}
        onStartPersonalRadio={handleStartPersonalRadio}
        syncedPlaylistsCount={syncedPlaylists.length}
        syncedPlaylists={syncedPlaylists}
        onImportPlaylist={handleImportPlaylistUrl}
        onPersistentChannelConnect={handlePersistentChannelConnect}
        isGoogleAuthenticated={isGoogleAuthenticated}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        googleUser={googleUser}
        isGoogleLoading={isGoogleLoading}
      />

      <OnboardingModal
        isOpen={showOnboardingModal}
        initialName={authSession?.name}
        onComplete={handleOnboardingComplete}
        onSkipAsGuest={handleOnboardingSkip}
      />
    </div>
  );
}
