import React, { useState, useRef, useMemo } from 'react';
import {
  Music,
  Globe,
  Users,
  UserMinus,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Clock,
  X,
  Camera,
  Upload,
  Trash2,
  Play,
  ListMusic,
  Library,
  Radio,
  Disc3,
  Loader2,
  AlertCircle,
  Link2,
  Plus,
  Heart,
  Search,
  Shuffle,
  Mic,
  Check,
  ChevronRight,
  Youtube,
  ExternalLink,
  Mail,
  AtSign,
  User as UserIcon,
  BarChart3,
  Flame,
  Trophy,
  Share2,
  Headphones,
  Activity,
  Calendar,
  ChevronDown,
  MapPin,
  Navigation,
  Compass,
  Sun,
  Moon,
  Monitor,
  Shield,
  ShieldCheck,
  Settings,
  Zap,
  CheckCircle2,
  Download,
  LogOut,
  Copy,
  Pencil,
} from 'lucide-react';
import {
  detectLiveLocation,
  detectLocationByIP,
  setManualLocation,
  getSavedLocation,
  checkGeolocationPermissionState,
  requestNativeGpsLocation,
  GeolocationPermissionStatus,
  UserLocation,
} from '../services/locationService';
import {
  ThemeMode,
  getSavedTheme,
  applyTheme,
  triggerHaptic,
} from '../services/themeService';
import {
  UserProfile,
  IntentType,
  PrivacyMode,
  LoungeUser,
  FriendRequest,
  UserPlaylist,
  Song,
  SubscribedChannelDetail,
} from '../types';
import { cleanNonMusicArtists, getArtistArtwork, purgeNonMusicFromLocalStorage } from '../services/artistFilterService';
import {
  getListeningHistory,
  subscribeListeningHistory,
  computeWeeklyHistoryStats,
  resolveSongGenre,
  ListeningHistoryStore,
} from '../services/listeningHistoryService';
import { SAMPLE_SONGS } from '../data/mockData';

interface Props {
  userProfile: UserProfile;
  friendsList: LoungeUser[];
  friendRequests?: FriendRequest[];
  pendingSentUsers?: LoungeUser[];
  onAcceptFriendRequest?: (requestId: string) => void;
  onDeclineFriendRequest?: (requestId: string) => void;
  onCancelSentRequest?: (userId: string) => void;
  onUpdateIntent: (intent: IntentType) => void;
  onUpdatePrivacyMode: (mode: PrivacyMode) => void;
  onOpenSongPicker?: () => void;
  onToggleFriend?: (friend: LoungeUser) => void;
  onStartChatWithFriend?: (friend: LoungeUser) => void;
  appVersion?: string;
  isCheckingUpdates?: boolean;
  onCheckForUpdates?: () => void;
  onOpenYouTubeConnect?: () => void;
  allowExplicit?: boolean;
  onToggleExplicit?: (val: boolean) => void;
  onUpdateAvatar?: (url: string | null) => void;
  syncedPlaylists?: UserPlaylist[];
  onPlayPlaylist?: (playlist: UserPlaylist, shuffle?: boolean) => void;
  onStartPersonalRadio?: () => void;
  onSyncTaste?: () => Promise<void> | void;
  onImportPlaylist?: (urlOrId: string) => Promise<boolean>;
  onDeletePlaylist?: (playlistId: string) => void;
  favoriteSongs?: Song[];
  onToggleFavoriteSong?: (song: Song) => void;
  favoriteArtists?: string[];
  subscribedChannels?: SubscribedChannelDetail[];
  onToggleFavoriteArtist?: (artistName: string) => void;
  onAddFavoriteArtist?: (artistName: string) => void;
  onPlaySong?: (song: Song) => void;
  onPlaySongsList?: (songs: Song[], shuffle?: boolean) => void;
  onStartArtistRadio?: (artistName: string) => void;
  isGoogleAuthenticated?: boolean;
  hasActiveYouTubeToken?: boolean;
  isGoogleLoading?: boolean;
  onGoogleSignIn?: () => Promise<{ errorCode?: string; success?: boolean } | void>;
  onGoogleSignOut?: () => Promise<void>;
  googleUser?: { name: string; email: string; photoUrl?: string } | null;
  onUpdateAccount?: (acc: { email: string; handle: string; name: string }) => void;
  onUpdateBio?: (bio: string) => void;
  onUpdateCity?: (city: string) => void;
  syncDiagnosticError?: string | null;
  onClearSyncError?: () => void;
  themeMode?: ThemeMode;
  onChangeThemeMode?: (mode: ThemeMode) => void;
  onLoadPopularCollection?: () => void;
  onLogout?: () => void;
  shouldOpenSettings?: boolean;
  onConsumeOpenSettings?: () => void;
  onPickSongForSignatureSlot?: (slotIndex: number) => void;
  signatureVitrinVersion?: number;
}

const PlaylistRowItem = React.memo<{
  playlist: UserPlaylist;
  isPlaying?: boolean;
  onView: (pl: UserPlaylist) => void;
  onPlay?: (pl: UserPlaylist) => void;
  onDelete?: (id: string) => void;
}>(({ playlist, isPlaying = false, onView, onPlay, onDelete }) => (
  <div
    onClick={() => onView(playlist)}
    className={`p-3 flex items-center justify-between gap-3 group cursor-pointer rounded-2xl transition border ${
      isPlaying
        ? 'bg-[#111113]/[0.05] dark:bg-white/[0.06] border-[#111113]/25 dark:border-white/25 shadow-sm'
        : 'bg-white dark:bg-[#141418] border-[#E6E4DF] dark:border-white/[0.08] hover:border-[#111113]/25 dark:hover:border-white/25 hover:bg-[#FAF9F6] dark:hover:bg-[#1C1C22] shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none'
    }`}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="relative shrink-0">
        <img
          src={playlist.coverUrl}
          alt={playlist.title}
          loading="lazy"
          decoding="async"
          className={`w-12 h-12 rounded-xl object-cover shrink-0 bg-[#F1EFEA] dark:bg-[#1C1C22] border ${
            isPlaying ? 'border-[#111113]/30 dark:border-white/30 ring-2 ring-[#111113]/15 dark:ring-white/20' : 'border-[#E6E4DF] dark:border-white/[0.08]'
          }`}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h4
            className={`text-sm font-semibold truncate transition ${
              isPlaying
                ? 'text-[#111113] dark:text-[#F5F5F7] font-bold'
                : 'text-[#111113] dark:text-[#F5F5F7] group-hover:text-[#111113] dark:group-hover:text-[#F5F5F7]'
            }`}
          >
            {playlist.title}
          </h4>
          {isPlaying && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-[#16A34A] dark:text-[#22C55E] border border-emerald-500/30 text-[10px] font-bold shrink-0">
              Aktif
            </span>
          )}
        </div>
        <p className="text-xs text-[#63636B] dark:text-[#8E8E98] truncate mt-0.5 font-mono tabular-nums">
          {playlist.tracks?.length || playlist.trackCount} parça · {playlist.duration}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-1.5 shrink-0">
      {onPlay && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay(playlist);
          }}
          className={`px-3 py-2 min-h-[38px] rounded-xl font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer ${
            isPlaying
              ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] shadow-sm'
              : 'bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#111113] dark:hover:bg-white dark:hover:text-[#0B0B0D] text-[#111113] dark:text-[#F5F5F7] hover:text-white'
          }`}
        >
          {isPlaying ? (
            <span>ılı</span>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>Çal</span>
            </>
          )}
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(playlist.id);
          }}
          className="p-2 rounded-xl text-[#63636B] dark:text-[#8E8E98] hover:text-rose-500 transition cursor-pointer"
          title="Listeyi Kaldır"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
));

const FavoriteSongRowItem = React.memo<{
  song: Song;
  formattedDuration: string;
  onPlay?: (song: Song) => void;
  onToggleFavorite?: (song: Song) => void;
}>(({ song, formattedDuration, onPlay, onToggleFavorite }) => (
  <div
    onClick={() => onPlay && onPlay(song)}
    className="p-2.5 flex items-center justify-between gap-3 group cursor-pointer rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] hover:border-[#111113]/25 dark:hover:border-white/25 hover:bg-[#FAF9F6] dark:hover:bg-[#1C1C22] shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none transition"
  >
    <div className="flex items-center gap-3 min-w-0">
      {song.coverUrl ? (
        <img
          src={song.coverUrl}
          alt={song.title}
          loading="lazy"
          decoding="async"
          className="w-11 h-11 rounded-xl object-cover shrink-0 bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08]"
        />
      ) : (
        <div className="w-11 h-11 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] flex items-center justify-center text-[#63636B] dark:text-[#8E8E98] shrink-0 border border-[#E6E4DF] dark:border-white/[0.08]">
          <Music className="w-4 h-4" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#111113] dark:text-[#F5F5F7] truncate group-hover:text-[#111113] dark:group-hover:text-[#F5F5F7] transition">
          {song.title}
        </div>
        <div className="text-xs text-[#63636B] dark:text-[#8E8E98] truncate mt-0.5">
          {song.artist} {song.album ? `· ${song.album}` : ''}
        </div>
      </div>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      <span className="font-mono text-xs text-[#63636B] dark:text-[#8E8E98] tabular-nums">
        {formattedDuration}
      </span>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(song);
          }}
          className="p-2 text-rose-500 hover:text-rose-400 transition cursor-pointer"
          title="Favorilerden Çıkar"
        >
          <Heart className="w-4 h-4 fill-current" />
        </button>
      )}
    </div>
  </div>
));

const FavoriteArtistRowItem = React.memo<{
  artistName: string;
  avatarInfo: { url?: string; gradient?: string; initials?: string };
  onStartRadio?: (name: string) => void;
  onToggleFavorite?: (name: string) => void;
}>(({ artistName, avatarInfo, onStartRadio, onToggleFavorite }) => (
  <div className="p-2.5 flex items-center justify-between gap-3 group rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] hover:border-[#111113]/25 dark:hover:border-white/25 shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none transition">
    <div className="flex items-center gap-3 min-w-0">
      {avatarInfo.url ? (
        <img
          src={avatarInfo.url}
          alt={artistName}
          loading="lazy"
          decoding="async"
          className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-[#E6E4DF] dark:ring-white/10 bg-[#F1EFEA] dark:bg-[#1C1C22]"
        />
      ) : (
        <div
          className={`avatar-circle w-11 h-11 rounded-xl bg-gradient-to-tr ${avatarInfo.gradient || 'from-zinc-700 to-zinc-900'} flex items-center justify-center text-white font-bold text-xs shrink-0 border border-white/15 relative overflow-hidden`}
        >
          <span className="relative z-10">{avatarInfo.initials}</span>
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#111113] dark:text-[#F5F5F7] truncate flex items-center gap-1.5">
          <span className="truncate">{artistName}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#22C55E] shrink-0" title="Doğrulanmış Sanatçı" />
        </div>
        <div className="text-xs text-[#63636B] dark:text-[#8E8E98] truncate mt-0.5">
          Kişisel Radyo Hazır
        </div>
      </div>
    </div>

    <div className="flex items-center gap-1.5 shrink-0">
      {onStartRadio && (
        <button
          type="button"
          onClick={() => onStartRadio(artistName)}
          className="px-3 py-1.5 min-h-[36px] rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#111113] dark:hover:bg-white dark:hover:text-[#0B0B0D] text-[#111113] dark:text-[#F5F5F7] hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Radyo</span>
        </button>
      )}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(artistName)}
          className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#63636B] dark:text-[#8E8E98] hover:text-rose-500 transition cursor-pointer active:scale-95"
          title="Kaldır"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
));

const SubscribedChannelRowItem = React.memo<{
  channel: SubscribedChannelDetail;
  isAlreadyInFavorites: boolean;
  onStartRadio?: (name: string) => void;
  onToggleFavorite?: (name: string) => void;
  onAddFavorite?: (name: string) => void;
}>(({ channel, isAlreadyInFavorites, onStartRadio, onToggleFavorite, onAddFavorite }) => (
  <div className="py-3 flex items-center justify-between gap-3 group">
    <div className="flex items-center gap-3.5 min-w-0">
      {channel.thumbnailUrl ? (
        <img
          src={channel.thumbnailUrl}
          alt={channel.name}
          loading="lazy"
          decoding="async"
          className="w-10 h-10 rounded-full object-cover shrink-0 bg-zinc-900 border border-white/[0.08]"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {channel.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {channel.name}
        </div>
        <div className="text-xs text-zinc-500 truncate mt-0.5">
          {channel.isMusicArtist ? 'Müzik Sanatçısı' : 'Kanal'} · {channel.reason}
        </div>
      </div>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      {channel.isMusicArtist && onStartRadio && (
        <button
          type="button"
          onClick={() => onStartRadio(channel.name)}
          className="px-3 py-1.5 min-h-[36px] rounded-xl bg-white/[0.05] hover:bg-lime-400 text-zinc-200 hover:text-zinc-950 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Radyo</span>
        </button>
      )}

      {isAlreadyInFavorites ? (
        <button
          type="button"
          onClick={() => onToggleFavorite && onToggleFavorite(channel.name)}
          className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition cursor-pointer active:scale-95"
          title="Sanatçılarımdan Kaldır"
        >
          Listede Ekli
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onAddFavorite && onAddFavorite(channel.name)}
          className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition cursor-pointer active:scale-95"
          title="Sanatçılarıma Ekle"
        >
          + Ekle
        </button>
      )}
    </div>
  </div>
));

export const ProfileTab: React.FC<Props> = ({
  userProfile,
  friendsList,
  friendRequests = [],
  pendingSentUsers = [],
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onCancelSentRequest,
  onToggleFriend,
  onStartChatWithFriend,
  onOpenSongPicker,
  onOpenYouTubeConnect,
  onUpdateAvatar,
  syncedPlaylists = [],
  onPlayPlaylist,
  onStartPersonalRadio,
  onSyncTaste,
  onImportPlaylist,
  onDeletePlaylist,
  favoriteSongs = [],
  onToggleFavoriteSong,
  favoriteArtists = [],
  subscribedChannels = [],
  onToggleFavoriteArtist,
  onAddFavoriteArtist,
  onPlaySong,
  onPlaySongsList,
  onStartArtistRadio,
  isGoogleAuthenticated = false,
  hasActiveYouTubeToken = false,
  isGoogleLoading = false,
  onGoogleSignIn,
  onGoogleSignOut,
  googleUser = null,
  onUpdateAccount,
  onUpdateBio,
  onUpdateCity,
  syncDiagnosticError = null,
  onClearSyncError,
  themeMode,
  onChangeThemeMode,
  onLoadPopularCollection,
  onLogout,
  shouldOpenSettings = false,
  onConsumeOpenSettings,
  onPickSongForSignatureSlot,
  signatureVitrinVersion = 0,
}) => {
  const [localTheme, setLocalTheme] = useState<ThemeMode>(() => themeMode || getSavedTheme());
  const currentTheme = themeMode || localTheme;
  const isLightTheme =
    currentTheme === 'light' ||
    (currentTheme === 'system' &&
      typeof window !== 'undefined' &&
      !window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleThemeChange = (mode: ThemeMode) => {
    triggerHaptic(20);
    setLocalTheme(mode);
    applyTheme(mode);
    if (onChangeThemeMode) {
      onChangeThemeMode(mode);
    }
  };
  const [profileSection, setProfileSection] = useState<'library' | 'insights'>('library');
  const [showTrustScoreModal, setShowTrustScoreModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'account'>('profile');
  const [showStoryCardModal, setShowStoryCardModal] = useState(false);
  const [isGeneratingStoryImage, setIsGeneratingStoryImage] = useState(false);
  const [storyActionSuccess, setStoryActionSuccess] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [appealSent, setAppealSent] = useState(false);
  const [viewingPlaylist, setViewingPlaylist] = useState<UserPlaylist | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [tempName, setTempName] = useState(userProfile.youtubeAccount?.name || userProfile.name);
  const [tempEmail, setTempEmail] = useState(
    userProfile.youtubeAccount?.email || userProfile.email || ''
  );
  const [tempHandle, setTempHandle] = useState(
    userProfile.youtubeAccount?.handle ||
      (userProfile.name ? `@${userProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '@muziksever')
  );
  const [tempBio, setTempBio] = useState(userProfile.bio);
  const [tempCity, setTempCity] = useState(userProfile.city);

  const handleLoadPopularCollection = () => {
    triggerHaptic(25);
    if (onLoadPopularCollection) {
      onLoadPopularCollection();
      return;
    }
    const samplePls: UserPlaylist[] = [
      {
        id: 'pl-turkce-rock-klasikler',
        title: 'Türkçe Rock & Grunge Frekansları',
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
        title: 'Gece Yarısı Indie & Darkwave',
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
        title: 'Kadıköy Akustik & Lo-Fi Odası',
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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('harmoniq_user_playlists', JSON.stringify(samplePls));
      localStorage.setItem('harmoniq_user_favorite_songs', JSON.stringify(SAMPLE_SONGS.slice(0, 4)));
    }
    setToastNotice('Popüler Rock & Indie koleksiyonu kütüphanene eklendi.');
    setTimeout(() => setToastNotice(null), 3500);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);
  const [isAutoLocation, setIsAutoLocation] = useState(() => getSavedLocation().isAuto);
  const [manualCityInput, setManualCityInput] = useState(userProfile.city);
  const [geoPermissionState, setGeoPermissionState] = useState<GeolocationPermissionStatus>('prompt');

  React.useEffect(() => {
    checkGeolocationPermissionState().then((state) => {
      setGeoPermissionState(state);
    });
  }, [showLocationModal, showSettingsModal]);

  const handleDetectLiveLocation = async (): Promise<UserLocation | null> => {
    setIsDetectingLocation(true);
    setLocationStatusMessage(null);
    try {
      const res = await requestNativeGpsLocation();
      const loc = res.location;
      setGeoPermissionState(res.permissionState);
      setIsAutoLocation(true);
      setTempCity(loc.fullLocation);
      setManualCityInput(loc.fullLocation);
      if (onUpdateCity) {
        onUpdateCity(loc.fullLocation);
      }
      const label = res.gpsGranted
        ? `Cihaz GPS izni doğrulandı ve konum güncellendi: ${loc.fullLocation}`
        : res.errorReason
        ? `${res.errorReason} (${loc.fullLocation})`
        : `Şebeke/IP ile algılandı: ${loc.fullLocation}`;
      setLocationStatusMessage(label);
      setTimeout(() => setLocationStatusMessage(null), 6000);
      return loc;
    } catch (err: any) {
      setLocationStatusMessage(err?.message || 'Konum alınamadı.');
      return null;
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleDetectIpLocation = async (): Promise<UserLocation | null> => {
    setIsDetectingLocation(true);
    setLocationStatusMessage(null);
    try {
      const loc = await detectLocationByIP();
      setIsAutoLocation(true);
      setTempCity(loc.fullLocation);
      setManualCityInput(loc.fullLocation);
      if (onUpdateCity) {
        onUpdateCity(loc.fullLocation);
      }
      setLocationStatusMessage(`Şebeke/IP ile konum belirlendi: ${loc.fullLocation}`);
      setTimeout(() => setLocationStatusMessage(null), 4500);
      return loc;
    } catch {
      setLocationStatusMessage('Şebeke konumu tespit edilemedi.');
      return null;
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSaveManualLocation = (cityToSave: string) => {
    const loc = setManualLocation(cityToSave);
    setIsAutoLocation(false);
    setTempCity(loc.fullLocation);
    setManualCityInput(loc.fullLocation);
    if (onUpdateCity) {
      onUpdateCity(loc.fullLocation);
    }
    setShowLocationModal(false);
  };

  const [draftAvatar, setDraftAvatar] = useState<string | null>(() => {
    if (userProfile.avatarUrl) return userProfile.avatarUrl;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('harmoniq_user_avatar') || null;
    }
    return null;
  });
  const tempAvatarUrl = draftAvatar;

  React.useEffect(() => {
    setDraftAvatar(userProfile.avatarUrl || null);
  }, [userProfile.avatarUrl]);

  const applyAvatarImmediately = (newUrl: string | null) => {
    setDraftAvatar(newUrl);
    userProfile.avatarUrl = newUrl || undefined;
    if (typeof window !== 'undefined') {
      if (newUrl) {
        localStorage.setItem('harmoniq_user_avatar', newUrl);
      } else {
        localStorage.removeItem('harmoniq_user_avatar');
      }
    }
    if (onUpdateAvatar) {
      onUpdateAvatar(newUrl);
    }
  };

  const [activeLibraryTab, setActiveLibraryTab] = useState<'playlists' | 'favorites' | 'artists'>('playlists');
  const [visiblePlaylistsLimit, setVisiblePlaylistsLimit] = useState<number>(15);
  const [visibleFavoritesLimit, setVisibleFavoritesLimit] = useState<number>(15);
  const [visibleArtistsLimit, setVisibleArtistsLimit] = useState<number>(15);
  const [visibleChannelsLimit, setVisibleChannelsLimit] = useState<number>(15);
  const [artistFilterMode, setArtistFilterMode] = useState<'music_only' | 'all_channels'>('music_only');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [playlistModalSearch, setPlaylistModalSearch] = useState('');
  const [newArtistName, setNewArtistName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatic 256x256 center-cropped canvas compression before saving avatar to localStorage
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!rawDataUrl) return;
      const img = new Image();
      img.onload = () => {
        try {
          const targetSize = 256;
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            applyAvatarImmediately(rawDataUrl);
            return;
          }
          const minSide = Math.min(img.width, img.height);
          const sx = Math.max(0, (img.width - minSide) / 2);
          const sy = Math.max(0, (img.height - minSide) / 2);
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          applyAvatarImmediately(compressed);
        } catch {
          applyAvatarImmediately(rawDataUrl);
        }
      };
      img.onerror = () => {
        applyAvatarImmediately(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSyncYouTubeLibrary = async () => {
    setIsSyncingNow(true);
    if (onClearSyncError) onClearSyncError();
    try {
      if (hasActiveYouTubeToken && onSyncTaste) {
        await onSyncTaste();
      } else if (onGoogleSignIn) {
        await onGoogleSignIn();
      } else if (onSyncTaste) {
        await onSyncTaste();
      }
    } catch (err: any) {
      console.error('Senkronizasyon hatası:', err);
    } finally {
      setIsSyncingNow(false);
    }
  };

  const totalLibraryTracks =
    syncedPlaylists.reduce((acc, p) => acc + (p.tracks?.length || p.trackCount || 0), 0) +
    favoriteSongs.length;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const [copiedWeeklySummary, setCopiedWeeklySummary] = useState(false);
  const [weeklyFilter, setWeeklyFilter] = useState<'all' | 'genres' | 'artists'>('all');

  const [activePlayingPlaylistId, setActivePlayingPlaylistId] = useState<string | null>(null);
  const [artistPortraitMap, setArtistPortraitMap] = useState<Record<string, string>>({});

  // Sanitize favorite artists to strictly filter out non-music YouTube channels (e.g. Marques Brownlee, tech reviewers)
  const sanitizedFavoriteArtists = useMemo(() => {
    purgeNonMusicFromLocalStorage(favoriteSongs);
    return cleanNonMusicArtists(favoriteArtists, favoriteSongs);
  }, [favoriteArtists, favoriteSongs]);

  const getArtistAvatarInfo = (artistName: string) => {
    const lower = artistName.trim().toLowerCase();
    if (artistPortraitMap[lower]) {
      return { url: artistPortraitMap[lower] };
    }
    const matchedChannel = subscribedChannels.find(
      (c) => c.name.toLowerCase() === lower || c.rawTitle.toLowerCase() === lower
    );
    if (matchedChannel?.thumbnailUrl) {
      return { url: matchedChannel.thumbnailUrl };
    }
    const matchedSong = favoriteSongs.find((s) => s.artist.toLowerCase() === lower);
    if (matchedSong?.coverUrl) {
      return { url: matchedSong.coverUrl };
    }
    const matchedSample = SAMPLE_SONGS.find((s) => s.artist.toLowerCase() === lower);
    if (matchedSample?.coverUrl) {
      return { url: matchedSample.coverUrl };
    }
    for (const pl of syncedPlaylists) {
      const track = pl.tracks?.find((t) => t.artist.toLowerCase() === lower);
      if (track?.coverUrl) {
        return { url: track.coverUrl };
      }
    }
    const gradients = [
      'from-emerald-900 to-zinc-950',
      'from-indigo-900 to-zinc-950',
      'from-cyan-900 to-zinc-950',
      'from-zinc-700 to-zinc-950',
      'from-rose-900 to-zinc-950',
      'from-purple-900 to-zinc-950',
    ];
    let sum = 0;
    for (let i = 0; i < artistName.length; i++) {
      sum += artistName.charCodeAt(i);
    }
    const grad = gradients[sum % gradients.length];
    const words = artistName.split(/\s+/).filter(Boolean);
    const initials =
      words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : artistName.substring(0, 2).toUpperCase();
    return { gradient: grad, initials };
  };

  // Live Real-Time Listening History subscribed to listenhub_play_history
  const [playHistory, setPlayHistory] = useState<ListeningHistoryStore>(() => getListeningHistory());

  React.useEffect(() => {
    return subscribeListeningHistory(setPlayHistory);
  }, []);

  const liveWeeklyHistory = useMemo(
    () => computeWeeklyHistoryStats(playHistory),
    [playHistory]
  );

  // Authentic library tracks synced by user (YouTube Music / custom playlists / favorites)
  const allWeeklyTracks = [
    ...syncedPlaylists.flatMap((p) => p.tracks || []),
    ...favoriteSongs,
  ];

  const hasHistoryPlays =
    liveWeeklyHistory.weeklySeconds > 0 || liveWeeklyHistory.weeklyScrobbles > 0;
  const hasSyncedLibraryData =
    allWeeklyTracks.length > 0 || sanitizedFavoriteArtists.length > 0;
  const hasRealListeningData = hasHistoryPlays || hasSyncedLibraryData;

  // Genre breakdown strictly from REAL play history first, then genuine synced library (zero fake defaults)
  const genreTally = new Map<string, number>();
  if (liveWeeklyHistory.topGenres.length > 0) {
    liveWeeklyHistory.topGenres.forEach((g) => {
      const weight = Math.max(1, g.plays || Math.ceil(g.seconds / 15));
      genreTally.set(g.genre, (genreTally.get(g.genre) || 0) + weight);
    });
  }
  if (allWeeklyTracks.length > 0) {
    allWeeklyTracks.forEach((track) => {
      const resolvedGenre = resolveSongGenre(track);
      if (resolvedGenre) {
        genreTally.set(resolvedGenre, (genreTally.get(resolvedGenre) || 0) + 1);
      }
    });
  }

  const totalGenreScore = Array.from(genreTally.values()).reduce((a, b) => a + b, 0);
  const genreColorPalette = [
    {
      bar: 'bg-lime-400',
      glow: 'shadow-[0_0_12px_rgba(163,230,53,0.35)]',
      text: 'text-lime-500 dark:text-lime-300',
      dot: 'bg-lime-400',
      badge: 'bg-lime-400/10 text-lime-500 dark:text-lime-400 border-lime-400/20',
    },
    {
      bar: 'bg-cyan-400',
      glow: 'shadow-[0_0_12px_rgba(34,211,238,0.35)]',
      text: 'text-cyan-500 dark:text-cyan-300',
      dot: 'bg-cyan-400',
      badge: 'bg-cyan-400/10 text-cyan-500 dark:text-cyan-400 border-cyan-400/20',
    },
    {
      bar: 'bg-zinc-400',
      glow: 'shadow-[0_0_12px_rgba(251,191,36,0.35)]',
      text: 'text-[#111113] dark:text-[#F5F5F7]',
      dot: 'bg-zinc-400',
      badge: 'bg-zinc-500/10 text-[#111113] dark:text-zinc-300 border-zinc-500/20',
    },
    {
      bar: 'bg-rose-400',
      glow: 'shadow-[0_0_12px_rgba(251,113,133,0.35)]',
      text: 'text-rose-500 dark:text-rose-300',
      dot: 'bg-rose-400',
      badge: 'bg-rose-400/10 text-rose-500 dark:text-rose-400 border-rose-400/20',
    },
    {
      bar: 'bg-purple-400',
      glow: 'shadow-[0_0_12px_rgba(192,132,252,0.35)]',
      text: 'text-purple-500 dark:text-purple-300',
      dot: 'bg-purple-400',
      badge: 'bg-purple-400/10 text-purple-500 dark:text-purple-400 border-purple-400/20',
    },
  ];

  const sortedWeeklyGenres = Array.from(genreTally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count], idx) => {
      const percentage = Math.max(4, Math.round((count / (totalGenreScore || 1)) * 100));
      return {
        genre,
        count,
        percentage,
        palette: genreColorPalette[idx % genreColorPalette.length],
      };
    });

  // Top Artists strictly from REAL play history first, then genuine synced library (zero fake Duman 24 fallback)
  const artistTally = new Map<string, { count: number; playedSeconds: number; sampleSong?: Song }>();
  liveWeeklyHistory.topArtists.forEach((a) => {
    const cleanName = a.name.trim();
    if (!cleanName || cleanName === 'Bilinmeyen Sanatçı') return;
    const sampleRec = a.sampleTrack;
    const sampleSong: Song | undefined = sampleRec
      ? {
          id: sampleRec.id,
          title: sampleRec.title,
          artist: sampleRec.artist,
          album: sampleRec.album || 'Single',
          genre: sampleRec.genre,
          rawMediaTitle: `${sampleRec.artist} - ${sampleRec.title}`,
          coverUrl: sampleRec.coverUrl,
          coverGradient: sampleRec.coverGradient || 'from-purple-600 to-fuchsia-600',
          durationSeconds: sampleRec.durationSeconds || 210,
          bpm: 118,
          keyNote: 'Am',
          catalogNumber: 'LH-LIVE',
          timelineMarkers: [],
          audioUrl: sampleRec.audioUrl,
          youtubeVideoId: sampleRec.youtubeVideoId,
          releaseYear: new Date().getFullYear(),
          soundType: 'indie',
        }
      : undefined;
    artistTally.set(cleanName, {
      count: Math.max(1, a.plays || Math.ceil(a.seconds / 15)),
      playedSeconds: a.seconds,
      sampleSong,
    });
  });

  allWeeklyTracks.forEach((track) => {
    const a = track.artist?.trim();
    if (a && a !== 'YouTube Music' && a !== 'Bilinmeyen Sanatçı') {
      const isClean = cleanNonMusicArtists([a], []).length > 0;
      if (!isClean) return;
      const existing = artistTally.get(a) || { count: 0, playedSeconds: 0 };
      artistTally.set(a, {
        count: existing.count + 1,
        playedSeconds: existing.playedSeconds,
        sampleSong: existing.sampleSong || track,
      });
    }
  });

  sanitizedFavoriteArtists.forEach((a) => {
    const clean = a.trim();
    if (!clean) return;
    const existing = artistTally.get(clean) || { count: 0, playedSeconds: 0 };
    artistTally.set(clean, {
      ...existing,
      count: existing.count + 2,
    });
  });

  const sortedWeeklyArtists = Array.from(artistTally.entries())
    .sort((a, b) => b[1].playedSeconds - a[1].playedSeconds || b[1].count - a[1].count)
    .slice(0, 5)
    .map(([artist, data], idx) => ({
      rank: idx + 1,
      name: artist,
      tracksCount: data.count,
      playedSeconds: data.playedSeconds,
      sampleSong: data.sampleSong,
    }));

  // 100% Authentic Weekly Duration & Scrobble Counters (zero synthetic 22 saat / 1071 fallback)
  const totalLibraryCount = totalLibraryTracks;
  const weeklyScrobbleCount = liveWeeklyHistory.weeklyScrobbles;
  const weeklyTotalSeconds = liveWeeklyHistory.weeklySeconds;
  const weeklyHours = Math.floor(weeklyTotalSeconds / 3600);
  const weeklyRemainingMinutes = Math.floor((weeklyTotalSeconds % 3600) / 60);
  const weeklyRemainingSeconds = Math.floor(weeklyTotalSeconds % 60);

  const topGenreName = sortedWeeklyGenres[0]?.genre || 'Henüz belirlenmedi';
  const topArtistName = sortedWeeklyArtists[0]?.name || 'Henüz yok';

  let weeklyPersona = 'Yeni Frekans Kaşifi';
  let weeklyPersonaDesc = 'Dinlediğin her parça ile müzikal auran canlı olarak şekilleniyor.';
  if (hasRealListeningData) {
    weeklyPersona = 'Eklektik Kaşif';
    weeklyPersonaDesc = 'Farklı müzikal dönemler ve soundlar arasında sezgisel bir denge kuruyor.';
    const lowerTop = topGenreName.toLowerCase();
    if (lowerTop.includes('anadolu')) {
      weeklyPersona = 'Anadolu Saykodelik';
      weeklyPersonaDesc = 'Geleneksel motifler ile modern psikedelik rock tınılarının kusursuz uyumu.';
    } else if (lowerTop.includes('rock') || lowerTop.includes('grunge')) {
      weeklyPersona = 'Gece Rockerı';
      weeklyPersonaDesc = 'Gitar rifleri, analog davul vuruşları ve yüksek dinamizmli parçalar bu hafta zirvede.';
    } else if (lowerTop.includes('synth') || lowerTop.includes('wave') || lowerTop.includes('elektronik')) {
      weeklyPersona = 'Synthwave Gezgini';
      weeklyPersonaDesc = 'Analog synth tınıları ve retro fütürist melodiler bu haftaki odaklanma akışını oluşturdu.';
    } else if (lowerTop.includes('indie') || lowerTop.includes('alternatif')) {
      weeklyPersona = 'İndie Melankolisti';
      weeklyPersonaDesc = 'Derin lirikler, lo-fi dokular ve bağımsız alternatif melodiler bu hafta başrolde.';
    } else if (lowerTop.includes('akustik') || lowerTop.includes('lo-fi')) {
      weeklyPersona = 'Akustik Gece Yolcusu';
      weeklyPersonaDesc = 'Sakin analog tınılar, sıcak vokaller ve odaklanma ritimleri bu haftanın imzası.';
    }
  }

  const topPlayedRecord = liveWeeklyHistory.topTracks[0]?.record;
  const topPlayedSong: Song | undefined = topPlayedRecord
    ? {
        id: topPlayedRecord.id,
        title: topPlayedRecord.title,
        artist: topPlayedRecord.artist,
        album: topPlayedRecord.album || 'Single',
        genre: topPlayedRecord.genre,
        rawMediaTitle: `${topPlayedRecord.artist} - ${topPlayedRecord.title}`,
        coverUrl: topPlayedRecord.coverUrl,
        coverGradient: topPlayedRecord.coverGradient || 'from-purple-600 to-pink-600',
        durationSeconds: topPlayedRecord.durationSeconds || 210,
        bpm: 118,
        keyNote: 'Am',
        catalogNumber: 'LH-LIVE',
        timelineMarkers: [],
        audioUrl: topPlayedRecord.audioUrl,
        youtubeVideoId: topPlayedRecord.youtubeVideoId,
        releaseYear: new Date().getFullYear(),
        soundType: 'indie',
      }
    : undefined;

  const weeklyAnthemSong: Song | undefined =
    topPlayedSong ||
    favoriteSongs[0] ||
    allWeeklyTracks[0] ||
    sortedWeeklyArtists[0]?.sampleSong;

  const isDefaultTemplateSongId = (id?: string) =>
    id === 'song-duman' ||
    id === 'song-morveotesi' ||
    id === 'song-arctic' ||
    id === 'song-jakuzi' ||
    id === 'song-teoman' ||
    id === 'song-shepastaway';

  // Top 4 Signature Tracks Showcase (100% real user history & connected library — ZERO SAMPLE_SONGS fallback)
  const signatureTop4Tracks: Song[] = useMemo(() => {
    const historySongs: Song[] = liveWeeklyHistory.topTracks
      .map(({ record }) => ({
        id: record.id,
        title: record.title,
        artist: record.artist,
        album: record.album || 'Single',
        genre: record.genre,
        rawMediaTitle: `${record.artist} - ${record.title}`,
        coverUrl: record.coverUrl,
        coverGradient: record.coverGradient || 'from-zinc-700 to-zinc-900',
        durationSeconds: record.durationSeconds || 210,
        bpm: 118,
        keyNote: 'Am',
        catalogNumber: 'LH-LIVE',
        timelineMarkers: [],
        audioUrl: record.audioUrl,
        youtubeVideoId: record.youtubeVideoId,
        releaseYear: new Date().getFullYear(),
        soundType: 'indie' as const,
      }))
      .filter((t) => !isDefaultTemplateSongId(t.id));

    const realFavorites = favoriteSongs.filter((t) => t && !isDefaultTemplateSongId(t.id));
    const realWeekly = allWeeklyTracks.filter((t) => t && !isDefaultTemplateSongId(t.id));
    const pool = [...historySongs, ...realFavorites, ...realWeekly];
    const seen = new Set<string>();
    const top4: Song[] = [];
    for (const track of pool) {
      if (!track || !track.title) continue;
      const key = `${track.title.toLowerCase()}::${(track.artist || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        top4.push(track);
      }
      if (top4.length >= 4) break;
    }
    return top4;
  }, [liveWeeklyHistory.topTracks, favoriteSongs, allWeeklyTracks]);

  // User-customized Top 4 Vitrin Tracks (persisted to LocalStorage)
  const [customTop4Tracks, setCustomTop4Tracks] = useState<(Song | null)[]>(() => {
    try {
      const saved = localStorage.getItem('harmoniq_custom_top4_vitrin');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) {
          return parsed.map((item) =>
            item && !isDefaultTemplateSongId(item.id) ? item : null
          );
        }
      }
    } catch {}
    return [null, null, null, null];
  });

  // Sync customTop4Tracks whenever updated via global SongPickerModal
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('harmoniq_custom_top4_vitrin');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setCustomTop4Tracks(parsed);
          return;
        }
      }
      setCustomTop4Tracks([null, null, null, null]);
    } catch {}
  }, [signatureVitrinVersion]);

  const [editingTop4Slot, setEditingTop4Slot] = useState<number | null>(null);
  const [top4SearchQuery, setTop4SearchQuery] = useState('');

  // Combined Top 4 Vitrin Tracks: Custom pinned -> Real history/library -> Empty slot (null)
  const displayedTop4Tracks: (Song | null)[] = useMemo(() => {
    const usedKeys = new Set<string>();
    const result: (Song | null)[] = [null, null, null, null];

    for (let i = 0; i < 4; i++) {
      const pinned = customTop4Tracks[i];
      if (pinned && pinned.title) {
        result[i] = pinned;
        usedKeys.add(`${pinned.title.toLowerCase()}::${(pinned.artist || '').toLowerCase()}`);
      }
    }

    let fallbackCursor = 0;
    for (let i = 0; i < 4; i++) {
      if (result[i]) continue;
      while (fallbackCursor < signatureTop4Tracks.length) {
        const candidate = signatureTop4Tracks[fallbackCursor++];
        const key = `${candidate.title.toLowerCase()}::${(candidate.artist || '').toLowerCase()}`;
        if (!usedKeys.has(key)) {
          result[i] = candidate;
          usedKeys.add(key);
          break;
        }
      }
    }

    return result;
  }, [customTop4Tracks, signatureTop4Tracks]);

  // Combined catalog of user's real songs for fallback vitrin modal
  const allAvailableSongsForVitrin: Song[] = useMemo(() => {
    const combined = [
      ...favoriteSongs,
      ...(syncedPlaylists || []).flatMap((p) => p.tracks || []),
      ...allWeeklyTracks,
    ];
    const seen = new Set<string>();
    const list: Song[] = [];
    for (const s of combined) {
      if (!s || !s.title || isDefaultTemplateSongId(s.id)) continue;
      const key = `${s.title.toLowerCase()}::${(s.artist || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(s);
      }
    }
    return list;
  }, [favoriteSongs, syncedPlaylists, allWeeklyTracks]);

  const handleAssignSongToTop4Slot = (song: Song, slotIndex: number) => {
    triggerHaptic(20);
    const updated = [...customTop4Tracks];
    updated[slotIndex] = song;
    setCustomTop4Tracks(updated);
    try {
      localStorage.setItem('harmoniq_custom_top4_vitrin', JSON.stringify(updated));
    } catch {}
    setEditingTop4Slot(null);
    setTop4SearchQuery('');
    setToastNotice(`"${song.title}" #${slotIndex + 1} vitrinine atandı.`);
    setTimeout(() => setToastNotice(null), 3000);
  };

  // Fetch high-res 300x300bb portraits for Top Weekly Artists & Library Artists
  React.useEffect(() => {
    let cancelled = false;
    const candidates = [
      ...sortedWeeklyArtists.map((a) => a.name),
      ...sanitizedFavoriteArtists.slice(0, 12),
    ];
    const missing = candidates.filter(
      (name) => name && !artistPortraitMap[name.trim().toLowerCase()]
    );
    if (missing.length === 0) return;

    (async () => {
      for (const artistName of missing) {
        if (cancelled) break;
        const art = await getArtistArtwork(artistName, subscribedChannels);
        if (art && !cancelled) {
          setArtistPortraitMap((prev) => ({
            ...prev,
            [artistName.trim().toLowerCase()]: art,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sortedWeeklyArtists, sanitizedFavoriteArtists, subscribedChannels]);

  // CORS-safe image loader for HTML5 canvas export without tainted canvas errors
  const loadSafeImage = (url?: string): Promise<HTMLImageElement | null> => {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          resolve(null);
        }
      }, 2500);

      img.onload = () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(img);
        }
      };
      img.onerror = () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(null);
        }
      };
      img.src = url;
    });
  };

  // High-Resolution 1080x1920 Instagram Story Canvas Renderer
  const renderStoryCanvas = async (includeExternalImages: boolean = true): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Load images safely in parallel
    let avatarImg: HTMLImageElement | null = null;
    let artistImg: HTMLImageElement | null = null;
    let top4Imgs: (HTMLImageElement | null)[] = [null, null, null, null];

    if (includeExternalImages) {
      try {
        const topArtistImgUrl =
          artistPortraitMap[topArtistName.toLowerCase()] ||
          sortedWeeklyArtists[0]?.sampleSong?.coverUrl;

        [avatarImg, artistImg, ...top4Imgs] = await Promise.all([
          loadSafeImage(userProfile.avatarUrl || googleUser?.photoUrl),
          loadSafeImage(topArtistImgUrl),
          ...displayedTop4Tracks.map((t) => loadSafeImage(t.coverUrl)),
        ]);
      } catch {
        // Fallback gracefully without external images
      }
    }

    // Helper: Rounded Rectangle with optional clip or stroke
    const fillRoundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fillStyle: string | CanvasGradient,
      strokeStyle?: string
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
      if (strokeStyle) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    };

    // 1. Dark Gradient Mesh Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#04130e');
    bgGrad.addColorStop(0.35, '#090a0f');
    bgGrad.addColorStop(0.7, '#070913');
    bgGrad.addColorStop(1, '#0e0b1f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Glowing Ambient Orbs
    const orb1 = ctx.createRadialGradient(880, 260, 20, 880, 260, 520);
    orb1.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    orb1.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = orb1;
    ctx.fillRect(360, 0, 720, 780);

    const orb2 = ctx.createRadialGradient(200, 1680, 20, 200, 1680, 600);
    orb2.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    orb2.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 1080, 800, 840);

    // Outer subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, 980, 1820);

    // Top Header: LISTENHUB • FREKANS KİMLİK KARTI
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText('🎧 LISTENHUB • FREKANS KİMLİK KARTI', 90, 125);

    // User Profile Box
    fillRoundRect(90, 165, 900, 165, 28, 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.08)');

    // User Avatar Drawing (with real image or stylish initial gradient)
    if (avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(175, 247, 48, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, 127, 199, 96, 96);
      ctx.restore();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(175, 247, 48, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const avatarGrad = ctx.createLinearGradient(130, 205, 230, 305);
      avatarGrad.addColorStop(0, '#10b981');
      avatarGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = avatarGrad;
      ctx.beginPath();
      ctx.arc(175, 247, 48, 0, Math.PI * 2);
      ctx.fill();

      const initials = (userProfile.youtubeAccount?.name || userProfile.name || 'YC')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#052e16';
      ctx.textAlign = 'center';
      ctx.fillText(initials, 175, 260);
      ctx.textAlign = 'left';
    }

    // User Name & Handle
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(userProfile.youtubeAccount?.name || userProfile.name, 245, 235);

    ctx.font = '500 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(userProfile.youtubeAccount?.handle || '@listenhub_user', 245, 275);

    // Trust Shield Badge
    fillRoundRect(245, 288, 380, 32, 16, 'rgba(16, 185, 129, 0.16)', 'rgba(16, 185, 129, 0.35)');
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`🛡️ Güven Puanı: %${userProfile.trustScore || 98} · Doğrulanmış Dinleyici`, 260, 310);

    // 2. MÜZİKAL AURA HERO BANNER
    fillRoundRect(90, 360, 900, 330, 32, 'rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.28)');

    // Aura Tag
    fillRoundRect(130, 395, 210, 36, 18, 'rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0.5)');
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.fillText('✨ MÜZİKAL AURA', 148, 420);

    // Persona Title
    ctx.font = '900 58px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(weeklyPersona, 130, 505);

    // Persona Description
    ctx.font = '400 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    const words = weeklyPersonaDesc.split(' ');
    let line = '';
    let y = 560;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 820 && i > 0) {
        ctx.fillText(line, 130, y);
        line = words[i] + ' ';
        y += 36;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 130, y);

    // 3. 📌 İMZA PARÇALARIM (TOP 4 VİTRİN)
    fillRoundRect(90, 715, 900, 320, 28, 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.07)');
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('📌 İmza Parçalarım (Top 4 Vitrin)', 130, 755);

    // 4 Vitrin Kartı Çizimi
    const vitrinY = 780;
    const cardW = 195;
    const cardH = 225;
    const gap = 25;
    const startX = 120;

    displayedTop4Tracks.forEach((t, i) => {
      const cx = startX + i * (cardW + gap);
      const img = top4Imgs[i];

      fillRoundRect(cx, vitrinY, cardW, cardH, 18, 'rgba(0, 0, 0, 0.4)', 'rgba(255, 255, 255, 0.12)');

      // Draw Album Cover if loaded, or stylized gradient
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx + 16, vitrinY);
        ctx.arcTo(cx + cardW, vitrinY, cx + cardW, vitrinY + 140, 16);
        ctx.arcTo(cx + cardW, vitrinY + 140, cx, vitrinY + 140, 0);
        ctx.arcTo(cx, vitrinY + 140, cx, vitrinY, 0);
        ctx.arcTo(cx, vitrinY, cx + cardW, vitrinY, 16);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, cx, vitrinY, cardW, 140);
        ctx.restore();
      } else {
        const coverGrad = ctx.createLinearGradient(cx, vitrinY, cx + cardW, vitrinY + 140);
        coverGrad.addColorStop(0, i === 0 ? '#b45309' : i === 1 ? '#4338ca' : i === 2 ? '#047857' : '#831843');
        coverGrad.addColorStop(1, '#090a0f');
        fillRoundRect(cx, vitrinY, cardW, 140, 16, coverGrad);
        ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.textAlign = 'center';
        ctx.fillText('♪', cx + cardW / 2, vitrinY + 85);
        ctx.textAlign = 'left';
      }

      // Rank Badge (#1..#4)
      fillRoundRect(cx + 8, vitrinY + 8, 38, 26, 8, i === 0 ? '#f59e0b' : 'rgba(0, 0, 0, 0.75)');
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = i === 0 ? '#000000' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`#${i + 1}`, cx + 27, vitrinY + 26);
      ctx.textAlign = 'left';

      // Title & Artist
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      const maxTitleW = cardW - 20;
      let tName = t.title || 'Şarkı';
      if (ctx.measureText(tName).width > maxTitleW) {
        while (tName.length > 3 && ctx.measureText(tName + '...').width > maxTitleW) {
          tName = tName.slice(0, -1);
        }
        tName += '...';
      }
      ctx.fillText(tName, cx + 10, vitrinY + 172);

      ctx.font = '400 15px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      let aName = t.artist || 'Sanatçı';
      if (ctx.measureText(aName).width > maxTitleW) {
        aName = aName.slice(0, 12) + '...';
      }
      ctx.fillText(aName, cx + 10, vitrinY + 200);
    });

    // 4. KEY WRAPPED METRICS
    // Box 1: Listening Time
    fillRoundRect(90, 1060, 900, 130, 24, 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.08)');
    ctx.font = '500 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('🎧 HAFTALIK DİNLEME SÜRESİ', 130, 1100);
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#a3e635';
    ctx.fillText(`${weeklyHours} saat ${weeklyRemainingMinutes} dakika`, 130, 1155);
    ctx.font = '400 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'right';
    ctx.fillText(`${weeklyScrobbleCount} parça dinlendi`, 950, 1155);
    ctx.textAlign = 'left';

    // Box 2: #1 Artist
    fillRoundRect(90, 1215, 900, 130, 24, 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.08)');
    ctx.font = '500 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('👑 1 NUMARALI SANATÇI', 130, 1255);
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(topArtistName, 130, 1310);
    ctx.font = '400 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'right';
    ctx.fillText(`${sortedWeeklyArtists[0]?.tracksCount || 24} parça tekrarlandı`, 950, 1310);
    ctx.textAlign = 'left';

    // Box 3: Dominant Genre
    fillRoundRect(90, 1370, 900, 130, 24, 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.08)');
    ctx.font = '500 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('📊 BASKIN MÜZİK TÜRÜ', 130, 1410);
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(topGenreName, 130, 1465);
    ctx.font = '400 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'right';
    ctx.fillText(`Haftalık akışın %${sortedWeeklyGenres[0]?.percentage || 42}'si`, 950, 1465);
    ctx.textAlign = 'left';

    // 5. WAVEFORM SOUNDBAR
    const barStartX = 90;
    const barStartY = 1530;
    const totalBars = 36;
    for (let i = 0; i < totalBars; i++) {
      const heightMultiplier = Math.sin((i / totalBars) * Math.PI * 3) * 0.5 + 0.5;
      const bHeight = 15 + heightMultiplier * 55;
      const bx = barStartX + i * 25;
      const by = barStartY + (70 - bHeight) / 2;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(255, 255, 255, 0.25)';
      fillRoundRect(bx, by, 12, bHeight, 6, ctx.fillStyle);
    }

    // 6. FOOTER BRANDING & REZONANS
    fillRoundRect(90, 1630, 900, 160, 28, 'rgba(0, 0, 0, 0.55)', 'rgba(255, 255, 255, 0.1)');
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('listenhub.app • Dinleme Frekansı', 130, 1695);

    ctx.font = '500 20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText('Dinleme zevkini doğrula, frekansını keşfet.', 130, 1740);

    ctx.textAlign = 'right';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText('Senkronize Dinle ⚡', 950, 1715);
    ctx.textAlign = 'left';

    return canvas;
  };

  const handleDownloadStoryCard = async () => {
    setIsGeneratingStoryImage(true);
    setStoryActionSuccess(null);
    try {
      let canvas: HTMLCanvasElement;
      let dataUrl: string = '';

      try {
        // Attempt high-res render with CORS-loaded album covers
        canvas = await renderStoryCanvas(true);
        dataUrl = canvas.toDataURL('image/png');
      } catch (corsErr) {
        console.warn('Canvas tainted by external image CORS, switching to guaranteed vector render:', corsErr);
        // Guaranteed fallback: renders pure vectors and gradients without external images, completely immune to CORS
        canvas = await renderStoryCanvas(false);
        dataUrl = canvas.toDataURL('image/png');
      }

      const a = document.createElement('a');
      a.download = 'listenhub-aura-karti.png';
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStoryActionSuccess('Görsel başarıyla galerinize / cihazınıza indirildi! (1080x1920 PNG)');
      setTimeout(() => setStoryActionSuccess(null), 4000);
    } catch (e: any) {
      console.error('Failed to download story image:', e);
      setStoryActionSuccess('İndirme sırasında bir sorun oluştu, lütfen tekrar deneyin.');
    } finally {
      setIsGeneratingStoryImage(false);
    }
  };

  const handleShareStoryCard = async () => {
    setIsGeneratingStoryImage(true);
    try {
      let canvas: HTMLCanvasElement;
      try {
        canvas = await renderStoryCanvas(true);
      } catch {
        canvas = await renderStoryCanvas(false);
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleCopyWeeklySummary();
          setIsGeneratingStoryImage(false);
          return;
        }
        const file = new File([blob], 'listenhub-aura-karti.png', { type: 'image/png' });
        if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `ListenHub Frekans Kimliği · ${weeklyPersona}`,
              text: `🎧 Bu haftaki ListenHub Müzikal Auram: ${weeklyPersona}! Toplam ${weeklyHours} saat dinleme, #1 sanatçı ${topArtistName}.`,
              files: [file],
            });
          } catch {
            // Share cancelled or not supported
          }
        } else {
          handleDownloadStoryCard();
        }
        setIsGeneratingStoryImage(false);
      }, 'image/png');
    } catch {
      handleDownloadStoryCard();
    }
  };

  const handleCopyWeeklySummary = () => {
    const genresList = sortedWeeklyGenres.map((g) => `${g.genre} (%${g.percentage})`).join(', ');
    const artistsList = sortedWeeklyArtists.map((a) => `#${a.rank} ${a.name}`).join(' · ');
    const anthemLine = weeklyAnthemSong
      ? `\nHaftanın Şarkısı: ${weeklyAnthemSong.artist} - ${weeklyAnthemSong.title}`
      : '';
    const summaryText = `ListenHub · Haftalık Müzik Özeti\n${
      userProfile.youtubeAccount?.name || userProfile.name
    } (${userProfile.youtubeAccount?.handle || '@muziksever'})\nGüven Puanı: ${userProfile.trustScore || 98}/100 (Doğrulanmış Dinleyici)\nToplam Dinleme: ${weeklyHours} saat ${weeklyRemainingMinutes} dakika (${weeklyScrobbleCount} haftalık parça · Kütüphane Toplamı: ${totalLibraryCount})\nMüzik Personası: ${weeklyPersona}\nEn Çok Dinlenen Türler: ${genresList}\nZirvedeki Sanatçılar: ${artistsList}${anthemLine}\nFrekansı keşfet: https://listenhub.app`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(summaryText);
      setCopiedWeeklySummary(true);
      setStoryActionSuccess('Özet metni panoya kopyalandı!');
      setTimeout(() => {
        setCopiedWeeklySummary(false);
        setStoryActionSuccess(null);
      }, 3000);
    }
  };

  const openSettingsModal = (initialTab: 'profile' | 'account' = 'profile') => {
    setTempName(userProfile.youtubeAccount?.name || userProfile.name);
    setTempEmail(
      userProfile.youtubeAccount?.email || userProfile.email || ''
    );
    setTempHandle(
      userProfile.youtubeAccount?.handle ||
        (userProfile.name ? `@${userProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '@muziksever')
    );
    setTempBio(userProfile.bio);
    setTempCity(userProfile.city);
    setDraftAvatar(
      userProfile.avatarUrl ||
        (typeof window !== 'undefined' ? localStorage.getItem('harmoniq_user_avatar') : null) ||
        null
    );
    setSettingsTab(initialTab);
    setShowSettingsModal(true);
  };

  React.useEffect(() => {
    if (shouldOpenSettings) {
      openSettingsModal('profile');
      onConsumeOpenSettings?.();
    }
  }, [shouldOpenSettings]);

  const handleSaveSettingsChanges = () => {
    const formattedHandle = tempHandle.trim()
      ? tempHandle.trim().startsWith('@')
        ? tempHandle.trim()
        : `@${tempHandle.trim()}`
      : '@muziksever';
    const nextName = tempName.trim() || userProfile.name;
    const nextEmail = tempEmail.trim();

    userProfile.name = nextName;
    userProfile.bio = tempBio;
    userProfile.city = tempCity;
    userProfile.email = nextEmail;
    userProfile.avatarUrl = draftAvatar || undefined;
    if (!userProfile.youtubeAccount) {
      userProfile.youtubeAccount = {
        name: nextName,
        email: nextEmail,
        handle: formattedHandle,
      };
    } else {
      userProfile.youtubeAccount.name = nextName;
      userProfile.youtubeAccount.email = nextEmail;
      userProfile.youtubeAccount.handle = formattedHandle;
    }

    if (onUpdateAccount) {
      onUpdateAccount({
        name: nextName,
        email: nextEmail,
        handle: formattedHandle,
      });
    }
    if (onUpdateBio) onUpdateBio(tempBio);
    if (onUpdateCity) onUpdateCity(tempCity);
    applyAvatarImmediately(draftAvatar);
    setShowSettingsModal(false);
    setToastNotice('Değişiklikler kaydedildi.');
    setTimeout(() => setToastNotice(null), 2800);
  };

  const activeProfileAvatar = draftAvatar || userProfile.avatarUrl;
  const connectedEmail = userProfile.youtubeAccount?.email || userProfile.email;
  const isLibraryCompletelyEmpty =
    syncedPlaylists.length === 0 &&
    favoriteSongs.length === 0 &&
    sanitizedFavoriteArtists.length === 0 &&
    subscribedChannels.length === 0;

  const STUDIO_GENRE_BARS = [
    { bar: 'bg-[#111113] dark:bg-white', dot: 'bg-[#111113] dark:bg-white' },
    { bar: 'bg-[#16A34A] dark:bg-[#22C55E]', dot: 'bg-[#16A34A] dark:bg-[#22C55E]' },
    { bar: 'bg-[#52525B] dark:bg-zinc-400', dot: 'bg-[#52525B] dark:bg-zinc-400' },
    { bar: 'bg-[#8E8E98] dark:bg-zinc-500', dot: 'bg-[#8E8E98] dark:bg-zinc-500' },
    { bar: 'bg-[#B4B4BC] dark:bg-zinc-600', dot: 'bg-[#B4B4BC] dark:bg-zinc-600' },
  ];

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-5 max-w-4xl lg:max-w-6xl mx-auto w-full relative">
      {/* Toast Notice Banner */}
      {toastNotice && (
        <div className="fixed bottom-36 lg:bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.12] text-[#111113] dark:text-[#F5F5F7] text-xs font-medium shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#22C55E] shrink-0" strokeWidth={1.75} />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Adaptive Dual-Layout: Single column on mobile (<1024px), 12-col split on desktop (>=1024px) */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
        {/* ===================================================================
            LEFT 5 COLS ON DESKTOP: PROFILE CARD + WEEKLY LISTENING SUMMARY
           =================================================================== */}
        <div className="lg:col-span-5 space-y-5 min-w-0">
          {/* 1. EDITORIAL STUDIO PROFILE CARD */}
          <section className="rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] p-5 shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none">
            <div className="flex items-start gap-4 min-w-0">
              {/* Left: Uploadable Avatar Circle (Empty dashed state when no photo) */}
              <button
                type="button"
                onClick={() => openSettingsModal('profile')}
                className="relative group cursor-pointer shrink-0 rounded-full focus:outline-none"
                title="Profil fotoğrafını güncelle"
                aria-label="Profil fotoğrafını güncelle"
              >
                {activeProfileAvatar ? (
                  <img
                    src={activeProfileAvatar}
                    alt={userProfile.name}
                    className="w-[72px] h-[72px] rounded-full object-cover border border-[#E6E4DF] dark:border-white/[0.12] group-hover:opacity-90 transition"
                  />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-[#8E8E98]/50 dark:border-white/20 bg-[#F1EFEA]/70 dark:bg-[#1C1C22]/70 flex items-center justify-center text-[#63636B] dark:text-[#8E8E98] group-hover:border-[#111113]/45 dark:group-hover:border-white/45 transition">
                    <UserIcon className="w-6 h-6 opacity-50" strokeWidth={1.5} />
                  </div>
                )}
                <span className="studio-btn-primary absolute -bottom-0.5 -right-0.5 h-6 px-1.5 rounded-full bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] border-2 border-white dark:border-[#141418] flex items-center justify-center gap-0.5 shadow-sm">
                  <Camera className="w-3 h-3" strokeWidth={2} />
                  <Plus className="w-2.5 h-2.5" strokeWidth={2.5} />
                </span>
              </button>

              {/* Middle: Bold Name, @handle · City, Trust Score Emerald Badge */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <h1 className="text-lg font-bold text-[#111113] dark:text-[#F5F5F7] tracking-tight truncate leading-snug">
                  {userProfile.youtubeAccount?.name || userProfile.name}
                </h1>

                <div className="flex items-center flex-wrap gap-1.5 font-mono text-xs text-[#63636B] dark:text-[#8E8E98]">
                  <span className="truncate max-w-[140px]">
                    {userProfile.youtubeAccount?.handle || '@muziksever'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setManualCityInput(userProfile.city);
                      setShowLocationModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-[#111113] dark:text-[#F5F5F7] hover:underline underline-offset-2 cursor-pointer"
                    title="Şehri güncelle"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7] shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{userProfile.city}</span>
                  </button>
                </div>

                <div className="pt-1 flex items-center flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTrustScoreModal(true)}
                    className="inline-flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/20 text-[#16A34A] dark:text-[#22C55E] font-mono text-xs font-medium px-2.5 py-1 rounded-lg tabular-nums transition cursor-pointer active:scale-95"
                    title="Şeffaf Güven Kalkanı Detaylarını İncele"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                    <span>Güven Puanı · {userProfile.trustScore || 99}/100</span>
                  </button>
                </div>

                {userProfile.bio && (
                  <p className="text-xs text-[#63636B] dark:text-[#8E8E98] pt-1 line-clamp-2 leading-relaxed">
                    {userProfile.bio}
                  </p>
                )}
              </div>

              {/* Top-right: Single Settings Icon Button */}
              <button
                type="button"
                onClick={() => openSettingsModal('profile')}
                className="w-10 h-10 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E6E4DF] dark:hover:bg-white/[0.1] text-[#111113] dark:text-[#F5F5F7] flex items-center justify-center transition cursor-pointer shrink-0 active:scale-95"
                title="Profil, Tema ve Müzik Servisi Ayarları"
                aria-label="Ayarlar"
              >
                <Settings className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>
          </section>

          {/* MOBILE-ONLY SEGMENTED SWITCHER (Hidden on desktop where both columns show together) */}
          <div className="lg:hidden grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E2DFD9] dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setProfileSection('library');
              }}
              className={`min-h-[42px] py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap border ${
                profileSection === 'library'
                  ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] border-[#111113]/15 dark:border-white/15'
                  : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border-transparent'
              }`}
            >
              Kütüphanem
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setProfileSection('insights');
              }}
              className={`min-h-[42px] py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap border ${
                profileSection === 'insights'
                  ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] border-[#111113]/15 dark:border-white/15'
                  : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border-transparent'
              }`}
            >
              Haftalık Özet
            </button>
          </div>

          {/* 2. HAFTALIK DİNLEME ÖZETİ — REAL LISTENING ANALYTICS */}
          <div className={profileSection === 'insights' ? 'block' : 'hidden lg:block'}>
            <section className="rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] p-5 space-y-5 shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none">
              {!hasRealListeningData ? (
                <div className="py-7 px-3 text-center flex flex-col items-center justify-center space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E2DFD9] dark:border-white/[0.08] flex items-center justify-center text-[#111113] dark:text-[#F5F5F7]">
                    <Headphones className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-[#63636B] dark:text-[#8E8E98]">
                      Haftalık Dinleme Özeti
                    </div>
                    <h2 className="text-base font-bold text-[#111113] dark:text-[#F5F5F7]">
                      Henüz dinleme verisi yok
                    </h2>
                    <p className="text-xs text-[#63636B] dark:text-[#8E8E98] leading-relaxed">
                      İlk parçanı açtığında gerçek dinleme süren ve tür dağılımın burada oluşmaya başlayacak.
                    </p>
                  </div>
                  {onOpenSongPicker && (
                    <button
                      type="button"
                      onClick={() => onOpenSongPicker()}
                      className="studio-btn-primary px-4 py-2.5 min-h-[42px] rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] shadow-sm text-xs font-semibold transition active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>İlk Parçayı Başlat</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Header + Prominent Mono Listening Duration */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-mono text-[11px] uppercase tracking-wider text-[#63636B] dark:text-[#8E8E98]">
                        Haftalık Dinleme Özeti
                      </div>
                      <div className="font-mono text-3xl font-semibold tracking-tight text-[#111113] dark:text-[#F5F5F7] tabular-nums">
                        {weeklyHours > 0
                          ? `${weeklyHours}s ${weeklyRemainingMinutes}dk`
                          : weeklyRemainingMinutes > 0
                          ? `${weeklyRemainingMinutes}dk ${weeklyRemainingSeconds}sn`
                          : weeklyTotalSeconds > 0
                          ? `${weeklyTotalSeconds}sn`
                          : '0dk'}
                      </div>
                      <p className="text-xs text-[#63636B] dark:text-[#8E8E98] tabular-nums">
                        {weeklyScrobbleCount > 0
                          ? `${weeklyScrobbleCount} parça · ${weeklyPersona}`
                          : weeklyPersona}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowStoryCardModal(true)}
                      className="px-3 py-2 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E6E4DF] dark:hover:bg-white/[0.1] text-[#111113] dark:text-[#F5F5F7] transition flex items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0 active:scale-95"
                      title="Dinleme özetini kart olarak paylaş"
                    >
                      <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Paylaş</span>
                    </button>
                  </div>

                  {/* Clean Warm Filter Segmented Control */}
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] text-xs">
                    {[
                      { id: 'all' as const, label: 'Genel' },
                      { id: 'genres' as const, label: 'Türler' },
                      { id: 'artists' as const, label: 'Sanatçılar' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setWeeklyFilter(tab.id)}
                        className={`py-1.5 rounded-lg font-semibold transition cursor-pointer border ${
                          weeklyFilter === tab.id
                            ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] border-[#111113]/15 dark:border-white/15'
                            : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border-transparent'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Compact Secondary Metrics */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#FAF9F6] dark:bg-[#1C1C22]/70 border border-[#E8E6E1] dark:border-white/[0.06] space-y-0.5">
                      <div className="text-[11px] text-[#63636B] dark:text-[#8E8E98]">
                        Zirvedeki Sanatçı
                      </div>
                      <div className="text-sm font-bold text-[#141416] dark:text-[#F5F5F7] truncate">
                        {topArtistName}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAF9F6] dark:bg-[#1C1C22]/70 border border-[#E8E6E1] dark:border-white/[0.06] space-y-0.5">
                      <div className="text-[11px] text-[#63636B] dark:text-[#8E8E98]">
                        Baskın Tür
                      </div>
                      <div className="text-sm font-bold text-[#141416] dark:text-[#F5F5F7] truncate">
                        {topGenreName}
                      </div>
                    </div>
                  </div>

                  {/* Calm Studio Genre Distribution Bar */}
                  {(weeklyFilter === 'all' || weeklyFilter === 'genres') && sortedWeeklyGenres.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-[#E8E6E1] dark:border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-[#141416] dark:text-[#F5F5F7]">
                          Tür Dağılımı
                        </h3>
                        <span className="font-mono text-[11px] text-[#63636B] dark:text-[#8E8E98] tabular-nums">
                          {sortedWeeklyGenres.length} tür
                        </span>
                      </div>

                      <div className="flex h-2 w-full rounded-full overflow-hidden bg-[#F1EFEA] dark:bg-white/[0.08] gap-0.5">
                        {sortedWeeklyGenres.map((item, idx) => {
                          const tone = STUDIO_GENRE_BARS[idx % STUDIO_GENRE_BARS.length];
                          return (
                            <div
                              key={idx}
                              style={{ width: `${item.percentage}%` }}
                              title={`${item.genre}: %${item.percentage}`}
                              className={`h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 ${tone.bar}`}
                            />
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sortedWeeklyGenres.map((item, idx) => {
                          const tone = STUDIO_GENRE_BARS[idx % STUDIO_GENRE_BARS.length];
                          return (
                            <div
                              key={idx}
                              className="px-3 py-2 rounded-xl bg-[#FAF9F6] dark:bg-[#1C1C22]/60 border border-[#E6E4DF] dark:border-white/[0.06] flex items-center justify-between gap-2.5"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`w-2 h-2 rounded-full ${tone.dot} shrink-0`} />
                                <span className="text-xs font-medium text-[#111113] dark:text-[#F5F5F7] leading-snug break-words">
                                  {item.genre}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] font-semibold text-[#63636B] dark:text-[#8E8E98] tabular-nums shrink-0">
                                %{item.percentage}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Top Artists List */}
                  {(weeklyFilter === 'all' || weeklyFilter === 'artists') && sortedWeeklyArtists.length > 0 && (
                    <div className="space-y-2.5 pt-3 border-t border-[#E8E6E1] dark:border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-[#141416] dark:text-[#F5F5F7]">
                          Zirvedeki Sanatçılar
                        </h3>
                        <span className="text-[11px] text-[#63636B] dark:text-[#8E8E98]">
                          Gerçek veri
                        </span>
                      </div>

                      <div className="space-y-2">
                        {sortedWeeklyArtists.map((artist) => {
                          const isFirst = artist.rank === 1;
                          const avatarInfo = getArtistAvatarInfo(artist.name);
                          return (
                            <div
                              key={artist.name}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F6] dark:bg-[#1C1C22]/60 border border-[#E8E6E1] dark:border-white/[0.06] transition group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-6 text-center font-mono text-xs font-semibold tabular-nums shrink-0 ${
                                    isFirst
                                      ? 'text-[#141416] dark:text-[#F5F5F7]'
                                      : 'text-[#63636B] dark:text-[#8E8E98]'
                                  }`}
                                >
                                  #{artist.rank}
                                </span>

                                {avatarInfo.url ? (
                                  <img
                                    src={avatarInfo.url}
                                    alt={artist.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-10 h-10 rounded-lg object-cover shrink-0 bg-zinc-900 border border-[#E8E6E1] dark:border-white/[0.08]"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-semibold text-xs shrink-0 bg-[#F1EFEA] dark:bg-white/[0.08] text-[#141416] dark:text-[#F5F5F7]">
                                    {avatarInfo.initials}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-semibold text-[#141416] dark:text-[#F5F5F7] truncate">
                                    {artist.name}
                                  </div>
                                  <div className="font-mono text-[11px] text-[#63636B] dark:text-[#8E8E98] tabular-nums">
                                    {artist.playedSeconds > 0
                                      ? `${Math.max(1, Math.round(artist.playedSeconds / 60))} dk dinlendi`
                                      : `${artist.tracksCount} parça`}
                                  </div>
                                </div>
                              </div>

                              {onStartArtistRadio && (
                                <button
                                  type="button"
                                  onClick={() => onStartArtistRadio(artist.name)}
                                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#141418] hover:bg-[#F1EFEA] dark:hover:bg-white/[0.1] border border-[#E8E6E1] dark:border-white/[0.08] text-[#141416] dark:text-[#F5F5F7] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer min-h-[34px] shrink-0"
                                  title={`${artist.name} radyosunu başlat`}
                                >
                                  <Radio className="w-3.5 h-3.5" strokeWidth={1.75} />
                                  <span className="hidden sm:inline">Radyo</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Highlight: Weekly Anthem */}
                  {weeklyFilter === 'all' && weeklyAnthemSong && (
                    <div className="pt-3 border-t border-[#E8E6E1] dark:border-white/[0.06]">
                      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FAF9F6] dark:bg-[#1C1C22]/60 border border-[#E8E6E1] dark:border-white/[0.06]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-zinc-900 border border-[#E8E6E1] dark:border-white/[0.08] shrink-0">
                            {weeklyAnthemSong.coverUrl ? (
                              <img
                                src={weeklyAnthemSong.coverUrl}
                                alt={weeklyAnthemSong.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-tr ${weeklyAnthemSong.coverGradient}`} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-mono text-[10px] uppercase tracking-wider text-[#63636B] dark:text-[#8E8E98]">
                              Haftanın Parçası
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-[#141416] dark:text-[#F5F5F7] truncate">
                              {weeklyAnthemSong.title}
                            </div>
                            <div className="text-[11px] text-[#63636B] dark:text-[#8E8E98] truncate">
                              {weeklyAnthemSong.artist}
                            </div>
                          </div>
                        </div>

                        {onPlaySong && (
                          <button
                            type="button"
                            onClick={() => onPlaySong(weeklyAnthemSong)}
                            className="studio-btn-primary px-3.5 py-2 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] shadow-sm font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 min-h-[36px] active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Çal</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>

        {/* ===================================================================
            RIGHT 7 COLS ON DESKTOP: İMZA 4 PARÇAM + KÜTÜPHANEM
           =================================================================== */}
        <div className={`lg:col-span-7 space-y-6 min-w-0 ${profileSection === 'library' ? 'block' : 'hidden lg:block'}`}>
          {/* 3. İMZA 4 PARÇAM (4-COLUMN VERTICAL SHOWCASE — ZERO MOBILE OVERFLOW) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-[#141416] dark:text-[#F5F5F7] tracking-tight">
                İmza 4 Parçam
              </h2>
              <span className="text-[11px] text-[#63636B] dark:text-[#8E8E98]">
                Çalmak için dokun
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {displayedTop4Tracks.map((track, idx) => {
                const rank = idx + 1;
                if (!track) {
                  return (
                    <button
                      key={`empty-slot-${idx}`}
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        if (onPickSongForSignatureSlot) {
                          onPickSongForSignatureSlot(idx);
                        } else {
                          setEditingTop4Slot(idx);
                          setTop4SearchQuery('');
                        }
                      }}
                      className="aspect-[3/4] rounded-xl border-2 border-dashed border-[#8E8E98]/45 dark:border-white/20 hover:border-[#111113]/40 dark:hover:border-white/40 bg-[#FAF9F6] dark:bg-[#141418]/70 hover:bg-[#F1EFEA] dark:hover:bg-[#1C1C22] flex flex-col items-center justify-center gap-1.5 p-2 text-center cursor-pointer active:scale-[0.96] transition-all group"
                      title={`#${rank} İmza Parçanı Ekle`}
                      aria-label={`#${rank} imza parçası ekle`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#111113]/[0.08] dark:bg-white/[0.10] border border-[#111113]/15 dark:border-white/15 flex items-center justify-center text-[#111113] dark:text-[#F5F5F7] group-hover:scale-105 transition-transform">
                        <Plus className="w-4 h-4" strokeWidth={2} />
                      </div>
                      <span className="text-[10.5px] font-semibold text-[#63636B] dark:text-[#8E8E98] group-hover:text-[#111113] dark:group-hover:text-[#F5F5F7] leading-tight">
                        Parça Ekle
                      </span>
                    </button>
                  );
                }

                const isCurrentlyPlaying = userProfile.currentSong?.id === track.id;
                return (
                  <div
                    key={track.id || idx}
                    onClick={() => {
                      triggerHaptic(15);
                      if (onPlaySong) onPlaySong(track);
                    }}
                    className={`keep-white-on-media aspect-[3/4] rounded-xl overflow-hidden relative border group cursor-pointer transition-all active:scale-95 ${
                      isCurrentlyPlaying
                        ? 'border-[#16A34A] dark:border-[#22C55E] ring-1 ring-[#16A34A]/40 dark:ring-[#22C55E]/40'
                        : 'border-[#E8E6E1] dark:border-white/[0.08]'
                    }`}
                    title={`${track.title} - ${track.artist} (Çalmak için dokun)`}
                  >
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1C1C22] flex items-center justify-center">
                        <Music className="w-5 h-5 text-white/50" strokeWidth={1.75} />
                      </div>
                    )}

                    {/* Clean bottom dark gradient scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                    {/* Subtle Edit Slot Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic(20);
                        if (onPickSongForSignatureSlot) {
                          onPickSongForSignatureSlot(idx);
                        } else {
                          setEditingTop4Slot(idx);
                          setTop4SearchQuery('');
                        }
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition active:scale-95 border border-white/15 z-20 cursor-pointer"
                      title={`#${rank} İmza Parçasını Değiştir`}
                      aria-label={`İmza parça ${rank} değiştir`}
                    >
                      <Pencil className="w-3 h-3 text-white" strokeWidth={1.75} />
                    </button>

                    {/* Single-line white title at bottom */}
                    <div className="absolute bottom-2 left-2 right-2 z-10">
                      <div className="text-[11px] font-semibold text-white truncate leading-tight">
                        {track.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. KÜTÜPHANEM */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#141416] dark:text-[#F5F5F7] tracking-tight">
                  Kütüphanem
                </h2>
                <p className="text-xs text-[#63636B] dark:text-[#8E8E98] mt-0.5">
                  Listelerin · Favori parçaların · Sanatçıların
                </p>
              </div>
            </div>

            {isLibraryCompletelyEmpty ? (
              <div className="py-9 px-5 sm:px-8 rounded-2xl bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] text-center space-y-4 shadow-[0_4px_20px_rgba(17,17,19,0.04)] dark:shadow-none">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E2DFD9] dark:border-white/[0.08] flex items-center justify-center text-[#111113] dark:text-[#F5F5F7]">
                  <Library className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[#111113] dark:text-[#F5F5F7] tracking-tight">
                    Müzik Kütüphaneni Bağla
                  </h3>
                  <p className="text-xs text-[#63636B] dark:text-[#8E8E98] max-w-md mx-auto leading-relaxed">
                    YouTube Music veya Spotify çalma listelerini bağlayıp kütüphaneni eşle ya da örnek koleksiyonla hemen keşfet.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(true)}
                    className="w-full sm:w-auto min-h-[42px] px-4 py-2.5 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E6E4DF] dark:hover:bg-white/[0.1] border border-[#E2DFD9] dark:border-white/[0.08] text-[#111113] dark:text-[#F5F5F7] font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Link2 className="w-4 h-4" strokeWidth={1.75} />
                    <span>Kütüphaneni Bağla</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadPopularCollection}
                    className="studio-btn-primary w-full sm:w-auto min-h-[42px] px-4 py-2.5 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] shadow-sm font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Music className="w-4 h-4" strokeWidth={1.75} />
                    <span>Örnek Koleksiyonu Yükle</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Clean Studio Segmented Control (Listeler | Favoriler | Sanatçılar) */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] border border-[#E2DFD9] dark:border-white/[0.06]">
                  {[
                    { id: 'playlists' as const, label: 'Listeler', count: syncedPlaylists.length },
                    { id: 'favorites' as const, label: 'Favoriler', count: favoriteSongs.length },
                    { id: 'artists' as const, label: 'Sanatçılar', count: sanitizedFavoriteArtists.length },
                  ].map((tab) => {
                    const isActive = activeLibraryTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveLibraryTab(tab.id);
                          setLibrarySearchQuery('');
                        }}
                        className={`px-2.5 py-2 text-xs font-semibold rounded-lg min-h-[38px] whitespace-nowrap transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                          isActive
                            ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] border-[#111113]/15 dark:border-white/15'
                            : 'text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] border-transparent'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className="font-mono text-[11px] opacity-75 tabular-nums">
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Input for the active tab */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#63636B] dark:text-[#8E8E98] absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
                  <input
                    type="text"
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    placeholder={
                      activeLibraryTab === 'playlists'
                        ? 'Listelerde ara...'
                        : activeLibraryTab === 'favorites'
                        ? 'Favori parçalarda ara...'
                        : 'Sanatçılarda ara...'
                    }
                    className="w-full pl-10 pr-8 py-2.5 min-h-[42px] bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] rounded-xl text-xs text-[#111113] dark:text-[#F5F5F7] placeholder:text-[#63636B] dark:placeholder:text-[#8E8E98] focus:outline-none focus:border-[#111113]/30 dark:border-white/30 transition"
                  />
                  {librarySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLibrarySearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#63636B] hover:text-[#111113] dark:text-[#8E8E98] dark:hover:text-[#F5F5F7] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </div>

                {/* ==================== SUB-TAB 1: ÇALMA LİSTELERİ ==================== */}
                {activeLibraryTab === 'playlists' && (() => {
                  const filteredPlaylists = syncedPlaylists.filter((p) =>
                    librarySearchQuery
                      ? p.title.toLowerCase().includes(librarySearchQuery.toLowerCase())
                      : true
                  );
                  const visiblePlaylists = filteredPlaylists.slice(0, visiblePlaylistsLimit);
                  const hasMorePlaylists = filteredPlaylists.length > visiblePlaylistsLimit;
                  const remainingPlaylists = filteredPlaylists.length - visiblePlaylistsLimit;

                  return (
                    <div className="space-y-4">
                      {syncedPlaylists.length === 0 ? (
                        <div className="py-8 px-4 rounded-2xl bg-[#FAF9F6] dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.08] text-center space-y-2.5">
                          <p className="text-xs text-[#63636B] dark:text-[#8E8E98]">
                            Henüz çalma listen yok. Hesap bağlantılarını Ayarlar & Hesap üzerinden yönetebilirsin.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowSettingsModal(true)}
                            className="studio-btn-primary px-3.5 py-2 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] text-xs font-semibold transition cursor-pointer"
                          >
                            Ayarlar & Hesap'ı Aç
                          </button>
                        </div>
                      ) : filteredPlaylists.length === 0 ? (
                        <div className="py-8 text-center text-xs text-zinc-500">
                          Aramanızla eşleşen çalma listesi bulunamadı.
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {visiblePlaylists.map((playlist) => {
                              const isPlayingThisPlaylist =
                                activePlayingPlaylistId === playlist.id ||
                                Boolean(
                                  userProfile.currentSong &&
                                    playlist.tracks?.some((t) => t.id === userProfile.currentSong?.id)
                                );
                              return (
                                <PlaylistRowItem
                                  key={playlist.id}
                                  playlist={playlist}
                                  isPlaying={isPlayingThisPlaylist}
                                  onView={(pl) => {
                                    setViewingPlaylist(pl);
                                    setPlaylistModalSearch('');
                                  }}
                                  onPlay={
                                    onPlayPlaylist
                                      ? (pl) => {
                                          setActivePlayingPlaylistId(pl.id);
                                          onPlayPlaylist(pl, false);
                                        }
                                      : undefined
                                  }
                                  onDelete={onDeletePlaylist}
                                />
                              );
                            })}
                          </div>

                          {hasMorePlaylists && (
                            <button
                              type="button"
                              onClick={() => setVisiblePlaylistsLimit((prev) => prev + 15)}
                              className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200/80 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.06] text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>Daha Fazla Liste Göster (+{Math.min(15, remainingPlaylists)})</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* ==================== SUB-TAB 2: FAVORİ PARÇALAR ==================== */}
                {activeLibraryTab === 'favorites' && (() => {
                  const filteredSongs = favoriteSongs.filter((song) =>
                    librarySearchQuery
                      ? song.title.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
                        song.artist.toLowerCase().includes(librarySearchQuery.toLowerCase())
                      : true
                  );
                  const visibleSongs = filteredSongs.slice(0, visibleFavoritesLimit);
                  const hasMoreSongs = filteredSongs.length > visibleFavoritesLimit;
                  const remainingSongs = filteredSongs.length - visibleFavoritesLimit;

                  return (
                    <div className="space-y-4">
                      {favoriteSongs.length > 0 && onPlaySongsList && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {favoriteSongs.length} şarkı
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onPlaySongsList(favoriteSongs, true)}
                              className="px-3 py-1.5 min-h-[36px] rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E6E4DF] dark:hover:bg-white/[0.1] text-[#111113] dark:text-[#F5F5F7] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Shuffle className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" />
                              <span>Karışık</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onPlaySongsList(favoriteSongs, false)}
                              className="studio-btn-primary px-3.5 py-1.5 min-h-[36px] rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Tümünü Çal</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {favoriteSongs.length === 0 ? (
                        <div className="py-8 px-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.06] text-center space-y-2">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Henüz favori parçan yok. Dinlerken kalp ikonuna dokunarak anında ekleyebilirsin.
                          </p>
                        </div>
                      ) : filteredSongs.length === 0 ? (
                        <div className="py-8 text-center text-xs text-zinc-500">
                          Aramanızla eşleşen parça bulunamadı.
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {visibleSongs.map((song, idx) => (
                              <FavoriteSongRowItem
                                key={song.id || idx}
                                song={song}
                                formattedDuration={formatDuration(song.durationSeconds)}
                                onPlay={onPlaySong}
                                onToggleFavorite={onToggleFavoriteSong}
                              />
                            ))}
                          </div>

                          {hasMoreSongs && (
                            <button
                              type="button"
                              onClick={() => setVisibleFavoritesLimit((prev) => prev + 15)}
                              className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200/80 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.06] text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>Daha Fazla Parça Göster (+{Math.min(15, remainingSongs)})</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* ==================== SUB-TAB 3: SANATÇILAR ==================== */}
                {activeLibraryTab === 'artists' && (
                  <div className="space-y-4">
                    {subscribedChannels.length > 0 && (
                      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => setArtistFilterMode('music_only')}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                            artistFilterMode === 'music_only'
                              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          <span>Müzik Sanatçıları</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/15 font-bold tabular-nums">
                            {sanitizedFavoriteArtists.length}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setArtistFilterMode('all_channels')}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                            artistFilterMode === 'all_channels'
                              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          <span>Tüm YouTube Kanalları</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/15 font-bold tabular-nums">
                            {subscribedChannels.length}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Quick Add Custom Artist */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newArtistName.trim() && onAddFavoriteArtist) {
                          onAddFavoriteArtist(newArtistName.trim());
                          setNewArtistName('');
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={newArtistName}
                        onChange={(e) => setNewArtistName(e.target.value)}
                        placeholder="Özel sanatçı ekle (örn: Daft Punk, Duman)..."
                        className="flex-1 px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08] rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
                      />
                      <button
                        type="submit"
                        disabled={!newArtistName.trim()}
                        className="px-4 py-2.5 min-h-[42px] rounded-xl bg-zinc-900 dark:bg-white/[0.1] hover:bg-purple-600 disabled:opacity-40 text-white font-semibold text-xs transition cursor-pointer"
                      >
                        Ekle
                      </button>
                    </form>

                    {artistFilterMode === 'music_only' && (() => {
                      const filteredArtists = sanitizedFavoriteArtists.filter((a: string) =>
                        librarySearchQuery ? a.toLowerCase().includes(librarySearchQuery.toLowerCase()) : true
                      );
                      const visibleArtists = filteredArtists.slice(0, visibleArtistsLimit);
                      const hasMoreArtists = filteredArtists.length > visibleArtistsLimit;
                      const remainingArtists = filteredArtists.length - visibleArtistsLimit;

                      return (
                        <>
                          {sanitizedFavoriteArtists.length === 0 ? (
                            <div className="py-8 px-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.06] text-center">
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                                Yukarıdan sevdiğin sanatçıları hemen ekleyebilir veya Ayarlar & Hesap üzerinden hesabını senkronize edebilirsin.
                              </p>
                            </div>
                          ) : filteredArtists.length === 0 ? (
                            <div className="py-8 text-center text-xs text-zinc-500">
                              Aramanızla eşleşen müzik sanatçısı bulunamadı.
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {visibleArtists.map((artistName: string, idx: number) => {
                                  const avatarInfo = getArtistAvatarInfo(artistName);
                                  return (
                                    <FavoriteArtistRowItem
                                      key={idx}
                                      artistName={artistName}
                                      avatarInfo={avatarInfo}
                                      onStartRadio={onStartArtistRadio}
                                      onToggleFavorite={onToggleFavoriteArtist}
                                    />
                                  );
                                })}
                              </div>

                              {hasMoreArtists && (
                                <button
                                  type="button"
                                  onClick={() => setVisibleArtistsLimit((prev) => prev + 15)}
                                  className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200/80 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.06] text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <span>Daha Fazla Sanatçı Göster (+{Math.min(15, remainingArtists)})</span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      );
                    })()}

                    {artistFilterMode === 'all_channels' && (() => {
                      const filteredChannels = subscribedChannels.filter((ch) =>
                        librarySearchQuery
                          ? ch.name.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
                            ch.rawTitle.toLowerCase().includes(librarySearchQuery.toLowerCase())
                          : true
                      );
                      const visibleChannels = filteredChannels.slice(0, visibleChannelsLimit);
                      const hasMoreChannels = filteredChannels.length > visibleChannelsLimit;
                      const remainingChannels = filteredChannels.length - visibleChannelsLimit;

                      return (
                        <div className="space-y-3">
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
                            YouTube hesabınızda abone olduğunuz tüm kanallar ({subscribedChannels.length} kanal):
                          </div>

                          {filteredChannels.length === 0 ? (
                            <div className="py-8 text-center text-xs text-zinc-500">
                              Aramanızla eşleşen YouTube kanalı bulunamadı.
                            </div>
                          ) : (
                            <>
                              <div className="divide-y divide-zinc-200 dark:divide-white/[0.06] border-y border-zinc-200 dark:border-white/[0.06]">
                                {visibleChannels.map((ch, idx) => {
                                  const isAlreadyInFavorites = favoriteArtists.some(
                                    (a) => a.toLowerCase() === ch.name.toLowerCase()
                                  );

                                  return (
                                    <SubscribedChannelRowItem
                                      key={ch.channelId || idx}
                                      channel={ch}
                                      isAlreadyInFavorites={isAlreadyInFavorites}
                                      onStartRadio={onStartArtistRadio}
                                      onToggleFavorite={onToggleFavoriteArtist}
                                      onAddFavorite={onAddFavoriteArtist}
                                    />
                                  );
                                })}
                              </div>

                              {hasMoreChannels && (
                                <button
                                  type="button"
                                  onClick={() => setVisibleChannelsLimit((prev) => prev + 15)}
                                  className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200/80 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.06] text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <span>Daha Fazla Kanal Göster (+{Math.min(15, remainingChannels)})</span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* =====================================================================
          MODAL: ÇALMA LİSTESİ DETAY & ŞARKILAR (SINIRSIZ SAYFALAMA)
         ===================================================================== */}
      {viewingPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[86vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={viewingPlaylist.coverUrl}
                  alt={viewingPlaylist.title}
                  className="w-14 h-14 rounded-2xl object-cover shrink-0 bg-zinc-900"
                />
                <div className="min-w-0">
                  <h3 className="text-base font-heading font-bold text-white truncate">
                    {viewingPlaylist.title}
                  </h3>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {viewingPlaylist.tracks.length} parça · {viewingPlaylist.duration}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingPlaylist(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={playlistModalSearch}
                onChange={(e) => setPlaylistModalSearch(e.target.value)}
                placeholder={`${viewingPlaylist.tracks.length} şarkı içinde ara...`}
                className="w-full pl-9 pr-8 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20"
              />
              {playlistModalSearch && (
                <button
                  type="button"
                  onClick={() => setPlaylistModalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="divide-y divide-white/[0.06] flex-1 overflow-y-auto no-scrollbar pr-1">
              {viewingPlaylist.tracks
                .filter((t) =>
                  playlistModalSearch
                    ? t.title.toLowerCase().includes(playlistModalSearch.toLowerCase()) ||
                      t.artist.toLowerCase().includes(playlistModalSearch.toLowerCase())
                    : true
                )
                .map((track, idx) => {
                  const isTrackFavorited = favoriteSongs.some(
                    (fs) =>
                      fs.title.toLowerCase() === track.title.toLowerCase() &&
                      fs.artist.toLowerCase() === track.artist.toLowerCase()
                  );
                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => onPlaySong && onPlaySong(track)}
                      className="py-2.5 flex items-center justify-between gap-3 group cursor-pointer hover:bg-white/[0.02] px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 text-xs text-zinc-500 tabular-nums shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-white truncate group-hover:text-lime-300 transition">
                            {track.title}
                          </div>
                          <div className="text-xs text-zinc-500 truncate">
                            {track.artist}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xs text-zinc-500 tabular-nums">
                          {formatDuration(track.durationSeconds)}
                        </span>
                        {onToggleFavoriteSong && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavoriteSong(track);
                            }}
                            className={`p-1.5 transition cursor-pointer ${
                              isTrackFavorited ? 'text-rose-500' : 'text-zinc-600 hover:text-rose-400'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isTrackFavorited ? 'fill-current' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
              {onPlayPlaylist && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const pl = viewingPlaylist;
                      setViewingPlaylist(null);
                      onPlayPlaylist(pl, true);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-lime-400" />
                    <span>Karışık Çal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const pl = viewingPlaylist;
                      setViewingPlaylist(null);
                      onPlayPlaylist(pl, false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Tümünü Çal</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* (Profili Düzenle bölümü artık merkezi Ayarlar & Hesap modalının içinde yer alıyor) */}

      {/* Quick Location Settings Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141418] border border-[#E6E4DF] dark:border-white/[0.1] rounded-2xl w-full max-w-md p-5 text-xs text-[#63636B] dark:text-[#8E8E98] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DF] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-[#111113] dark:text-[#F5F5F7] text-sm">Konum Ayarları</h3>
                  <p className="text-[11px] text-[#63636B] dark:text-[#8E8E98]">Canlı GPS algılama veya elle giriş</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="w-8 h-8 rounded-full bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E6E4DF] dark:hover:bg-white/[0.1] text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7] flex items-center justify-center cursor-pointer"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Status Box */}
            <div className="p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.07] flex items-center justify-between">
              <div>
                <div className="text-[11px] text-[#63636B] dark:text-[#8E8E98]">Mevcut Seçili Konum</div>
                <div className="text-sm font-semibold text-[#111113] dark:text-[#F5F5F7] flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
                  <span>{userProfile.city || 'Belirtilmedi'}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  geoPermissionState === 'granted'
                    ? 'bg-emerald-500/15 text-[#16A34A] dark:text-[#22C55E] border border-emerald-500/30'
                    : geoPermissionState === 'denied'
                    ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] border border-[#111113]/20 dark:border-white/20'
                    : 'bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] border border-[#111113]/20 dark:border-white/20'
                }`}>
                  {geoPermissionState === 'granted'
                    ? 'Site Konum İzni: Açık (GPS)'
                    : geoPermissionState === 'denied'
                    ? 'Site İzni: Kapalı (IP Aktif)'
                    : 'Site İzni: Sorulmaya Hazır'}
                </span>
                <span className="text-[10px] text-[#63636B] dark:text-[#8E8E98]">
                  {isAutoLocation ? 'Otomatik Konum' : 'Elle Ayarlandı'}
                </span>
              </div>
            </div>

            {/* Live GPS & Network IP Detection Zone */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isDetectingLocation}
                onClick={async () => {
                  await handleDetectLiveLocation();
                }}
                className="studio-btn-primary w-full py-3 px-4 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] font-semibold flex items-center justify-center gap-2 cursor-pointer transition shadow-sm disabled:opacity-50"
              >
                <Navigation className={`w-4 h-4 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                <span>
                  {isDetectingLocation
                    ? 'Tarayıcı / Telefon Konumu Algılanıyor...'
                    : geoPermissionState === 'granted'
                    ? 'Canlı GPS Konumumu Güncelle'
                    : 'Tarayıcı / Telefon Konum İznini İste (GPS)'}
                </span>
              </button>

              <button
                type="button"
                disabled={isDetectingLocation}
                onClick={async () => {
                  await handleDetectIpLocation();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E6E4DF] dark:hover:bg-white/[0.1] text-[#111113] dark:text-[#F5F5F7] font-medium flex items-center justify-center gap-2 cursor-pointer transition border border-[#E2DFD9] dark:border-white/[0.08] disabled:opacity-50"
              >
                <Globe className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" />
                <span>Şebeke / IP ile Otomatik Bul (İzin İstemez)</span>
              </button>

              <p className="text-[10px] text-[#63636B] dark:text-[#8E8E98] text-center">
                Üstteki butona dokunduğunuzda telefon ve web tarayıcınız "Konum İzni" penceresini açar ve site izinlerine Konum seçeneğini ekler.
              </p>
            </div>

            {/* Permission Troubleshooting Helper Box */}
            <div className="p-3 rounded-xl bg-[#111113]/[0.05] dark:bg-white/[0.06] border border-[#111113]/15 dark:border-white/15 text-[#63636B] dark:text-[#8E8E98] space-y-1">
              <div className="text-[11px] font-semibold text-[#111113] dark:text-[#F5F5F7] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Tarayıcı 'Konum İzni Reddedildi' Uyarısı Verirse:</span>
              </div>
              <ul className="text-[10px] text-[#63636B] dark:text-[#8E8E98] list-disc list-inside space-y-0.5 leading-relaxed">
                <li>
                  <strong className="text-[#111113] dark:text-[#F5F5F7]">Chrome:</strong> Adres çubuğundaki sol kilit simgesine dokunun → <strong className="text-[#111113] dark:text-[#F5F5F7]">İzinler</strong> → <strong className="text-[#111113] dark:text-[#F5F5F7]">Konum</strong> → <strong className="text-[#111113] dark:text-[#F5F5F7]">İzin Ver</strong>.
                </li>
                <li>
                  <strong className="text-[#111113] dark:text-[#F5F5F7]">Safari (iOS):</strong> Adres çubuğundaki <strong className="text-[#111113] dark:text-[#F5F5F7]">aA</strong> → <strong className="text-[#111113] dark:text-[#F5F5F7]">Web Sitesi Ayarları</strong> → <strong className="text-[#111113] dark:text-[#F5F5F7]">Konum: İzin Ver</strong>.
                </li>
                <li>
                  Veya yukarıdaki <strong className="text-[#111113] dark:text-[#F5F5F7]">"Şebeke / IP ile Otomatik Bul"</strong> butonuna dokunarak izin vermeden doğrudan bağlanabilirsiniz.
                </li>
              </ul>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-0.5">
              <div className="flex-1 h-px bg-[#E6E4DF] dark:bg-white/10" />
              <span className="text-[10px] text-[#63636B] dark:text-[#8E8E98] uppercase tracking-wider font-semibold">veya Elle Yazın</span>
              <div className="flex-1 h-px bg-[#E6E4DF] dark:bg-white/10" />
            </div>

            {/* Manual Form */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCityInput}
                  onChange={(e) => setManualCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveManualLocation(manualCityInput);
                    }
                  }}
                  placeholder="Örn: Kadıköy, İstanbul veya İzmir"
                  className="flex-1 px-3.5 py-2.5 bg-[#FAF9F6] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08] rounded-xl text-xs text-[#111113] dark:text-[#F5F5F7] placeholder:text-[#63636B] dark:placeholder:text-[#8E8E98] focus:outline-none focus:border-[#111113]/30 dark:border-white/30"
                />
                <button
                  type="button"
                  onClick={() => handleSaveManualLocation(manualCityInput)}
                  className="px-4 py-2.5 bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#111113] dark:hover:bg-white dark:hover:text-[#0B0B0D] text-[#111113] dark:text-[#F5F5F7] hover:text-white font-medium rounded-xl cursor-pointer transition"
                >
                  Uygula
                </button>
              </div>

              {/* Quick suggestions */}
              <div className="space-y-1">
                <span className="text-[10px] text-[#63636B] dark:text-[#8E8E98] font-medium">Hızlı Şehir Seçenekleri:</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    'Selçuk, İzmir',
                    'İzmir, Alsancak',
                    'Antalya, Muratpaşa',
                    'Ankara, Çankaya',
                    'İstanbul, Kadıköy',
                    'İstanbul, Beşiktaş',
                    'Bursa, Nilüfer',
                    'Eskişehir, Tepebaşı',
                  ].map((cityOption) => (
                    <button
                      key={cityOption}
                      type="button"
                      onClick={() => handleSaveManualLocation(cityOption)}
                      className="px-2.5 py-1 rounded-lg bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#111113]/[0.08] dark:bg-white/[0.10] text-[#111113] dark:text-[#F5F5F7] hover:text-[#111113] dark:hover:text-white border border-[#E2DFD9] dark:border-white/[0.06] text-[11px] cursor-pointer transition"
                    >
                      {cityOption}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Feedback Message */}
            {locationStatusMessage && (
              <div className="p-2.5 rounded-xl bg-[#FAF9F6] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.06] text-[11px] text-[#111113] dark:text-[#F5F5F7] flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7] shrink-0" />
                <span>{locationStatusMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ŞEFFAF GÜVEN KALKANI (LISTENHUB TRUST SCORE)
         ===================================================================== */}
      {showTrustScoreModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-backdrop-enter"
          onClick={() => setShowTrustScoreModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar border animate-modal-enter ${
              isLightTheme
                ? 'bg-white border-[#E6E4DF] text-[#111113]'
                : 'bg-[#141418] border-white/[0.08] text-[#F5F5F7]'
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between pb-3.5 border-b ${
                isLightTheme ? 'border-[#E6E4DF]' : 'border-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center ${
                    isLightTheme ? 'text-[#16A34A]' : 'text-[#22C55E]'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className={`text-base font-heading font-bold flex items-center gap-2 flex-wrap ${
                      isLightTheme ? 'text-[#111113]' : 'text-[#F5F5F7]'
                    }`}
                  >
                    <span>Şeffaf Güven Kalkanı</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        isLightTheme
                          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      v2.4 Doğrulandı
                    </span>
                  </h3>
                  <p className={`text-xs ${isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
                    ListenHub Açık Güvenilirlik &amp; Saygınlık Protokolü
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTrustScoreModal(false)}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isLightTheme
                    ? 'text-[#63636B] hover:text-[#111113] hover:bg-[#F1EFEA]'
                    : 'text-[#8E8E98] hover:text-[#F5F5F7] hover:bg-[#1C1C22]'
                }`}
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Hero Badge (Crisp Light & Dark Contrast) */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isLightTheme
                  ? 'bg-[#FAF9F6] border-[#E6E4DF]'
                  : 'bg-[#1C1C22] border-white/[0.08]'
              }`}
            >
              <div className="space-y-1">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isLightTheme ? 'text-[#111113]' : 'text-[#F5F5F7]'
                  }`}
                >
                  Genel Güven Puanınız
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-heading font-black tracking-tight tabular-nums ${
                      isLightTheme ? 'text-[#111113]' : 'text-[#F5F5F7]'
                    }`}
                  >
                    {userProfile.trustScore || 99}
                  </span>
                  <span
                    className={`text-lg font-semibold tabular-nums ${
                      isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'
                    }`}
                  >
                    / 100
                  </span>
                </div>
                <div className={`text-xs ${isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
                  Rozet Seviyesi:{' '}
                  <span
                    className={`font-bold ${
                      isLightTheme ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                  >
                    Elit Dinleyici (A+)
                  </span>
                </div>
              </div>

              <div className="sm:text-right space-y-1.5">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${
                    isLightTheme
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Doğrulanmış Hesap</span>
                </div>
                <div className={`text-[11px] ${isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
                  Canlı oda açma ve sohbet ayrıcalıklı
                </div>
              </div>
            </div>

            {/* 3 Scoring Pillars (Harmonized Warm Copper & Calm Emerald Only) */}
            <div className="space-y-3">
              <h4
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'
                }`}
              >
                Puanlama Sütunları ve Hesaplama Detayı
              </h4>

              {/* Pillar 1 */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2 ${
                  isLightTheme
                    ? 'bg-[#FAF9F6] border-[#E6E4DF]'
                    : 'bg-[#1C1C22] border-white/[0.07]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Headphones
                      className={`w-4 h-4 shrink-0 ${
                        isLightTheme ? 'text-[#16A34A]' : 'text-[#22C55E]'
                      }`}
                    />
                    <span
                      className={`text-xs font-semibold truncate ${
                        isLightTheme ? 'text-[#111113]' : 'text-[#F5F5F7]'
                      }`}
                    >
                      1. Gerçek Zamanlı Dinleme Tutarlılığı (%35)
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold shrink-0 ${
                      isLightTheme ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                  >
                    35 / 35
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-relaxed ${
                    isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'
                  }`}
                >
                  Şarkıların en az %70&apos;ini atlamadan, gerçek zaman çizelgesiyle ve kesintisiz
                  dinleme alışkanlığı. Bot, scraper veya otomatik makro trafiği tespit edilmedi.
                </p>
                <div
                  className={`w-full h-1.5 rounded-full overflow-hidden ${
                    isLightTheme ? 'bg-[#E6E4DF]' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`h-full rounded-full ${
                      isLightTheme ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
                    }`}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Pillar 2 */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2 ${
                  isLightTheme
                    ? 'bg-[#FAF9F6] border-[#E6E4DF]'
                    : 'bg-[#1C1C22] border-white/[0.07]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 shrink-0 text-[#111113] dark:text-[#F5F5F7]" />
                    <span
                      className={`text-xs font-semibold truncate ${
                        isLightTheme ? 'text-[#111113]' : 'text-[#F5F5F7]'
                      }`}
                    >
                      2. Topluluk Etkileşimi &amp; Müzikal Rezonans (%35)
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold shrink-0 ${
                      isLightTheme ? 'text-[#111113]' : 'text-[#F5F5F7]'
                    }`}
                  >
                    34 / 35
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-relaxed ${
                    isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'
                  }`}
                >
                  Canlı odalarda eşzamanlı dinleme, şarkı ve çalma listesi paylaşımları ile diğer
                  doğrulanmış dinleyicilerle karşılıklı %85+ frekans uyumu.
                </p>
                <div
                  className={`w-full h-1.5 rounded-full overflow-hidden ${
                    isLightTheme ? 'bg-[#E6E4DF]' : 'bg-white/10'
                  }`}
                >
                  <div
                    className="h-full rounded-full bg-[#111113] dark:bg-white"
                    style={{ width: '97%' }}
                  />
                </div>
              </div>

              {/* Pillar 3 */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2 ${
                  isLightTheme
                    ? 'bg-[#FAF9F6] border-[#E6E4DF]'
                    : 'bg-[#1C1C22] border-white/[0.07]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield
                      className={`w-4 h-4 shrink-0 ${
                        isLightTheme ? 'text-[#16A34A]' : 'text-[#22C55E]'
                      }`}
                    />
                    <span
                      className={`text-xs font-semibold truncate ${
                        isLightTheme ? 'text-[#111113]' : 'text-[#F5F5F7]'
                      }`}
                    >
                      3. Sıfır İhlal &amp; Temiz Hesap Sicili (%30)
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold shrink-0 ${
                      isLightTheme ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                  >
                    30 / 30
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-relaxed ${
                    isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'
                  }`}
                >
                  Diğer kullanıcılardan sıfır spam, taciz veya manipülasyon şikayeti. 180+ gündür
                  temiz ve örnek topluluk sicili.
                </p>
                <div
                  className={`w-full h-1.5 rounded-full overflow-hidden ${
                    isLightTheme ? 'bg-[#E6E4DF]' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`h-full rounded-full ${
                      isLightTheme ? 'bg-[#16A34A]' : 'bg-[#22C55E]'
                    }`}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Appeal & Transparency Rules */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isLightTheme
                  ? 'bg-[#FAF9F6] border-[#E6E4DF]'
                  : 'bg-[#1C1C22] border-white/[0.07]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold flex items-center gap-1.5 ${
                    isLightTheme ? 'text-[#111113]' : 'text-[#F5F5F7]'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" />
                  <span>Şeffaflık &amp; İtiraz Hakkı</span>
                </span>
                <span className={`text-[10px] ${isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
                  Sıfır Gizli Algoritma
                </span>
              </div>
              <p
                className={`text-[11px] leading-relaxed ${
                  isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'
                }`}
              >
                ListenHub, güven puanınızı asla kapalı kapılar ardında veya reklam amacıyla
                değiştirmez. Hatalı bir puan kırılması şüphesinde anında bağımsız moderatör
                incelemesi başlatabilirsiniz.
              </p>

              {appealSent ? (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    isLightTheme
                      ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-700'
                      : 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    İtiraz bildiriminiz alındı (#SEC-942). Güvenlik ekibi dinleme kaydınızı 2 saat
                    içinde inceleyecek.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAppealSent(true)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                      isLightTheme
                        ? 'bg-[#F1EFEA] hover:bg-[#E6E4DF] text-[#111113] border-[#E2DFD9]'
                        : 'bg-[#141418] hover:bg-[#24242C] text-[#F5F5F7] border-white/10'
                    }`}
                  >
                    İtiraz Bildirimi Gönder
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTrustScoreModal(false)}
                    className="studio-btn-primary py-2.5 px-5 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] font-semibold text-xs transition shadow-sm cursor-pointer"
                  >
                    Anladım
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MERKEZİ AYARLAR & HESAP (2 SEKMELİ — PROFİL BİLGİLERİ & HESAP)
         ===================================================================== */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-backdrop-enter"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className={`relative w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border animate-modal-enter ${
              isLightTheme
                ? 'bg-white border-[#E6E4DF] text-[#111113]'
                : 'bg-[#141418] border-white/[0.08] text-[#F5F5F7]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Modal Header + 2-Tab Switcher */}
            <div
              className={`px-6 pt-5 pb-4 border-b space-y-4 shrink-0 ${
                isLightTheme ? 'border-[#E6E4DF]' : 'border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#111113]/[0.08] dark:bg-white/[0.10] border border-[#111113]/15 dark:border-white/15 flex items-center justify-center text-[#111113] dark:text-[#F5F5F7]">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3
                      className={`text-base font-heading font-bold ${
                        isLightTheme ? 'text-[#111113]' : 'text-[#F5F5F7]'
                      }`}
                    >
                      Ayarlar &amp; Hesap
                    </h3>
                    <p className={`text-xs ${isLightTheme ? 'text-[#63636B]' : 'text-[#8E8E98]'}`}>
                      Profil bilgilerin, görünüm ve müzik servisleri
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className={`p-2 rounded-xl active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer ${
                    isLightTheme
                      ? 'text-[#63636B] hover:text-[#111113] hover:bg-[#F1EFEA]'
                      : 'text-[#8E8E98] hover:text-[#F5F5F7] hover:bg-[#1C1C22]'
                  }`}
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Clean 2-Tab Selector (Unambiguous Reactive Active Highlight & Crisp Light/Dark Inactive Contrast) */}
              <div
                role="tablist"
                aria-label="Ayarlar sekmeleri"
                className={`grid grid-cols-2 gap-1.5 p-1 rounded-2xl border ${
                  isLightTheme
                    ? 'bg-[#F1EFEA] border-[#E2DFD9]'
                    : 'bg-[#1C1C22] border-white/[0.07]'
                }`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={settingsTab === 'profile'}
                  onClick={() => setSettingsTab('profile')}
                  className={`py-2 px-3 rounded-xl text-xs transition-transform duration-100 ease-out active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 border outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111113]/30 dark:focus-visible:ring-white/30 ${
                    settingsTab === 'profile'
                      ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] font-semibold border-transparent shadow-sm'
                      : 'bg-transparent border-transparent font-medium text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Profil Bilgileri</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={settingsTab === 'account'}
                  onClick={() => setSettingsTab('account')}
                  className={`py-2 px-3 rounded-xl text-xs transition-transform duration-100 ease-out active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 border outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111113]/30 dark:focus-visible:ring-white/30 ${
                    settingsTab === 'account'
                      ? 'studio-btn-primary bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] font-semibold border-transparent shadow-sm'
                      : 'bg-transparent border-transparent font-medium text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>Hesap &amp; Müzik Servisleri</span>
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-5 text-xs">
              {settingsTab === 'profile' ? (
                <>
                  {/* Clean Uploadable Avatar Area (Zero Preset Stock Photos, Auto 256x256 Compression) */}
                  <div className="flex flex-col items-center text-center space-y-3 py-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="relative group cursor-pointer focus:outline-none"
                      title="Cihazından profil fotoğrafı yükle"
                    >
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#111113]/30 dark:border-white/30 p-1 group-hover:border-[#111113]/50 dark:group-hover:border-white/50 transition flex items-center justify-center bg-[#F1EFEA]/80 dark:bg-[#1C1C22]">
                        {tempAvatarUrl ? (
                          <img
                            src={tempAvatarUrl}
                            alt="Profil Fotoğrafı"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="avatar-circle w-full h-full rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white font-heading font-bold text-2xl">
                            {userProfile.avatarSeed || <UserIcon className="w-8 h-8" />}
                          </div>
                        )}
                      </div>
                      <span className="studio-btn-primary absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full bg-[#111113] dark:bg-white text-white dark:text-[#0B0B0D] border-2 border-white dark:border-[#141418] flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                        {tempAvatarUrl ? <Camera className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
                      </span>
                    </button>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E6E4DF] dark:hover:bg-white/[0.12] border border-[#E2DFD9] dark:border-white/[0.08] text-[#111113] dark:text-[#F5F5F7] font-semibold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" />
                        <span>Fotoğraf Yükle</span>
                      </button>

                      {draftAvatar && (
                        <button
                          type="button"
                          onClick={() => applyAvatarImmediately(null)}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-500 dark:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Kaldır</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Profile Fields: Name, @handle, Bio, City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[#63636B] dark:text-[#8E8E98] font-semibold flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" />
                        <span>Görünen İsim</span>
                      </label>
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="İsminiz"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08] rounded-xl text-xs text-[#111113] dark:text-[#F5F5F7] focus:outline-none focus:border-[#111113]/40 dark:focus:border-white/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[#63636B] dark:text-[#8E8E98] font-semibold flex items-center gap-1.5">
                        <AtSign className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" />
                        <span>Kullanıcı Adı</span>
                      </label>
                      <input
                        type="text"
                        value={tempHandle}
                        onChange={(e) => setTempHandle(e.target.value)}
                        placeholder="@kullaniciadi"
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08] rounded-xl text-xs text-[#111113] dark:text-[#F5F5F7] focus:outline-none focus:border-[#111113]/40 dark:focus:border-white/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#63636B] dark:text-[#8E8E98] font-semibold block">
                      Hakkımda (Bio)
                    </label>
                    <textarea
                      rows={3}
                      value={tempBio}
                      onChange={(e) => setTempBio(e.target.value)}
                      placeholder="Müzik zevkinden veya favori türlerinden kısaca bahset..."
                      className="w-full p-3 bg-[#FAF9F6] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08] rounded-xl text-xs text-[#111113] dark:text-[#F5F5F7] focus:outline-none focus:border-[#111113]/40 dark:focus:border-white/30 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[#63636B] dark:text-[#8E8E98] font-semibold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#111113] dark:text-[#F5F5F7]" />
                        <span>Şehir / Konum</span>
                      </label>
                      <button
                        type="button"
                        disabled={isDetectingLocation}
                        onClick={async () => {
                          const loc = await handleDetectLiveLocation();
                          if (loc) {
                            setTempCity(loc.fullLocation);
                          }
                        }}
                        className="text-[11px] text-[#111113] dark:text-[#F5F5F7] hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Navigation className={`w-3 h-3 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                        <span>{isDetectingLocation ? 'Bulunuyor...' : 'Canlı GPS Al'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={tempCity}
                      onChange={(e) => setTempCity(e.target.value)}
                      placeholder="Örn: İstanbul, Kadıköy"
                      className="w-full px-3.5 py-2.5 bg-[#FAF9F6] dark:bg-[#1C1C22] border border-[#E6E4DF] dark:border-white/[0.08] rounded-xl text-xs text-[#111113] dark:text-[#F5F5F7] focus:outline-none focus:border-[#111113]/40 dark:focus:border-white/30"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { label: 'İstanbul', value: 'İstanbul, Kadıköy' },
                        { label: 'İzmir', value: 'İzmir, Alsancak' },
                        { label: 'Ankara', value: 'Ankara, Çankaya' },
                        { label: 'Antalya', value: 'Antalya, Muratpaşa' },
                        { label: 'Eskişehir', value: 'Eskişehir, Tepebaşı' },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setTempCity(opt.value)}
                          className="px-2.5 py-1 rounded-lg bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#111113]/[0.08] dark:bg-white/[0.10] border border-[#E2DFD9] dark:border-white/[0.08] text-[11px] text-[#111113] dark:text-[#F5F5F7] transition cursor-pointer"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {locationStatusMessage && (
                      <p className="text-[11px] text-[#63636B] dark:text-[#8E8E98] pt-0.5">
                        {locationStatusMessage}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Section 1: Görünüm ve Tema */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-semibold text-[#111113] dark:text-[#F5F5F7] flex items-center gap-2">
                          <Sun className="w-4 h-4 text-[#111113] dark:text-[#F5F5F7]" />
                          <span>Görünüm ve Tema</span>
                        </h4>
                        <p className="text-[11px] text-[#63636B] dark:text-[#8E8E98]">
                          Obsidian Ink Gece veya Warm Paper Gündüz
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-[#111113] dark:text-[#F5F5F7] px-2 py-0.5 rounded-full bg-[#111113]/[0.08] dark:bg-white/[0.10]">
                        {currentTheme === 'dark' ? 'Karanlık' : currentTheme === 'light' ? 'Aydınlık' : 'Sistem'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'dark' as ThemeMode, label: 'Karanlık', desc: 'Obsidian Ink', icon: <Moon className="w-4 h-4 text-[#111113] dark:text-[#F5F5F7]" /> },
                        { id: 'light' as ThemeMode, label: 'Aydınlık', desc: 'Warm Paper', icon: <Sun className="w-4 h-4 text-[#111113] dark:text-[#F5F5F7]" /> },
                        { id: 'system' as ThemeMode, label: 'Sistem', desc: 'Cihaza Duyarlı', icon: <Monitor className="w-4 h-4 text-[#8E8E98]" /> },
                      ].map((themeOpt) => {
                        const isSelected = currentTheme === themeOpt.id;
                        return (
                          <button
                            key={themeOpt.id}
                            type="button"
                            onClick={() => handleThemeChange(themeOpt.id)}
                            className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 active:scale-95 ${
                              isSelected
                                ? 'bg-[#111113]/[0.08] dark:bg-white/[0.10] border-[#111113]/35 dark:border-white/35 text-[#111113] dark:text-[#F5F5F7] shadow-sm ring-1 ring-[#111113]/20 dark:ring-white/25'
                                : 'bg-[#FAF9F6] dark:bg-[#1C1C22] border-[#E6E4DF] dark:border-white/[0.06] text-[#63636B] dark:text-[#8E8E98] hover:text-[#111113] dark:hover:text-[#F5F5F7]'
                            }`}
                          >
                            {themeOpt.icon}
                            <div className="min-w-0">
                              <div className={`text-xs font-semibold ${isSelected ? 'text-[#111113] dark:text-[#F5F5F7]' : 'text-[#63636B] dark:text-[#8E8E98]'}`}>
                                {themeOpt.label}
                              </div>
                              <div className="text-[10px] text-[#63636B] dark:text-[#8E8E98] hidden sm:block mt-0.5">
                                {themeOpt.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 2: Müzik Servisleri (YouTube Music, Spotify, Apple Music) */}
                  <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                          <Youtube className="w-4 h-4 text-rose-500" />
                          <span>Müzik Servisleri & Google Hesabı</span>
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          YouTube Music, Spotify ve Apple Music bağlantıları
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isGoogleAuthenticated
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {isGoogleAuthenticated ? 'Bağlı' : 'Hazır'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2">
                        <Youtube className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">YouTube Music</div>
                          <div className="text-[9px] text-rose-600 dark:text-rose-300 truncate">Canlı Senkron</div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2">
                        <Disc3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">Spotify</div>
                          <div className="text-[9px] text-emerald-700 dark:text-emerald-300 truncate">Oda & Link</div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center gap-2">
                        <Music className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">Apple Music</div>
                          <div className="text-[9px] text-pink-700 dark:text-pink-300 truncate">Katalog</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.025] border border-zinc-200 dark:border-white/[0.06] space-y-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {isGoogleAuthenticated && googleUser?.photoUrl ? (
                          <img
                            src={googleUser.photoUrl}
                            alt={googleUser.name}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-300 dark:ring-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-200/80 dark:bg-white/[0.05] border border-zinc-300 dark:border-white/[0.08] flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
                            <Youtube className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {isGoogleAuthenticated && googleUser?.name
                              ? googleUser.name
                              : userProfile.youtubeAccount?.name || userProfile.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {isGoogleAuthenticated && googleUser?.email
                              ? googleUser.email
                              : userProfile.youtubeAccount?.email || userProfile.email || 'Google hesabı bağlanmadı'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200 dark:border-white/[0.06]">
                        {isGoogleAuthenticated ? (
                          <>
                            <button
                              type="button"
                              disabled={isGoogleLoading || isSyncingNow}
                              onClick={handleSyncYouTubeLibrary}
                              className="flex-1 py-2 px-3 rounded-xl bg-zinc-200/80 dark:bg-white/[0.06] hover:bg-zinc-300/70 dark:hover:bg-white/[0.12] text-zinc-900 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer min-h-[38px]"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin text-purple-500' : ''}`} />
                              <span>{isSyncingNow ? 'Senkronize Ediliyor...' : 'Kütüphaneyi Yenile'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isGoogleLoading || isSyncingNow}
                              onClick={onGoogleSignIn}
                              className="py-2 px-3 rounded-xl bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 text-xs font-medium transition cursor-pointer min-h-[38px]"
                            >
                              Hesap Değiştir
                            </button>

                            {onGoogleSignOut && (
                              <button
                                type="button"
                                disabled={isGoogleLoading}
                                onClick={onGoogleSignOut}
                                className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-medium transition cursor-pointer min-h-[38px]"
                              >
                                Bağlantıyı Kes
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={isGoogleLoading}
                            onClick={onGoogleSignIn}
                            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 dark:bg-white hover:opacity-90 text-white dark:text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer min-h-[40px]"
                          >
                            {isGoogleLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Bağlanıyor...</span>
                              </>
                            ) : (
                              <>
                                <Youtube className="w-4 h-4 fill-current text-rose-500" />
                                <span>Google & YouTube Music Bağla</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {syncDiagnosticError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-500 dark:text-rose-300 flex items-center justify-between gap-2">
                        <span>{syncDiagnosticError}</span>
                        {onClearSyncError && (
                          <button
                            type="button"
                            onClick={onClearSyncError}
                            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Account Sign-Out */}
                  {onLogout && (
                    <div className="pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(18);
                          setShowSettingsModal(false);
                          onLogout();
                        }}
                        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-rose-500/12 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sticky Bottom Footer: Değişiklikleri Kaydet */}
            <div className="sticky bottom-0 px-6 py-3.5 bg-white/95 dark:bg-[#141418]/95 backdrop-blur-xl border-t border-[#E6E4DF] dark:border-white/[0.08] flex items-center gap-2.5 shrink-0 z-20">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 min-h-[44px] py-2.5 rounded-xl bg-[#F1EFEA] dark:bg-[#1C1C22] hover:bg-[#E6E4DF] dark:hover:bg-white/[0.11] text-[#111113] dark:text-[#F5F5F7] font-semibold text-xs transition cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveSettingsChanges}
                className="studio-btn-primary flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-[#111113] dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-[#0B0B0D] font-bold text-xs shadow-sm transition active:scale-[0.98] cursor-pointer"
              >
                Değişiklikleri Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MÜZİKAL AURA & FREKANS KİMLİK KARTI (SHAREABLE STORY CARD)
         ===================================================================== */}
      {showStoryCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-zinc-950/95 border border-white/[0.12] rounded-3xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.85)] max-h-[94vh] overflow-y-auto no-scrollbar flex flex-col md:flex-row items-center gap-6">
            {/* Top Close Button (Mobile & Desktop) */}
            <button
              type="button"
              onClick={() => setShowStoryCardModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer z-20"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Column: 9:16 Vertical Story Card Preview */}
            <div className="shrink-0 w-full max-w-[280px] sm:max-w-[310px] aspect-[9/16] rounded-3xl overflow-hidden relative border border-white/20 p-5 flex flex-col justify-between text-white select-none shadow-[0_15px_45px_rgba(16,185,129,0.18)] bg-gradient-to-b from-[#04130e] via-[#090a0f] to-[#0e0b1f]">
              {/* Vibrant Ambient Glow Orbs */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/25 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/25 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-cyan-400/10 blur-2xl rounded-full pointer-events-none" />

              {/* Card Header */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black tracking-wider text-emerald-400 flex items-center gap-1 truncate">
                    <Headphones className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">LISTENHUB • FREKANS KİMLİK KARTI</span>
                  </span>
                </div>

                {/* User Block */}
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 text-zinc-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                    {(userProfile.youtubeAccount?.name || userProfile.name || 'YC')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {userProfile.youtubeAccount?.name || userProfile.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {userProfile.youtubeAccount?.handle || '@muziksever'}
                    </div>
                    <div className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-semibold text-emerald-400">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{userProfile.trustScore || 98}/100 Doğrulanmış</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Center: Aura Banner */}
              <div className="relative z-10 py-1 space-y-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Müzikal Aura</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight leading-snug">
                  {weeklyPersona}
                </h3>
                <p className="text-[10px] text-zinc-300/80 leading-relaxed line-clamp-2">
                  {weeklyPersonaDesc}
                </p>
              </div>

              {/* Card Bottom: Core Wrapped Metrics & Waveform */}
              <div className="relative z-10 space-y-2">
                <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">Dinleme Süresi</span>
                    <span className="text-lime-400 font-bold font-mono">
                      {weeklyHours}s {weeklyRemainingMinutes}d
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">#1 Sanatçı</span>
                    <span className="text-[#F5F5F7] font-bold truncate max-w-[130px]">
                      {topArtistName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">Baskın Tür</span>
                    <span className="text-cyan-300 font-bold truncate max-w-[130px]">
                      {topGenreName}
                    </span>
                  </div>
                </div>

                {/* Micro Soundwave Bar */}
                <div className="flex items-center justify-center gap-1 py-1">
                  {[12, 22, 34, 18, 28, 14, 30, 24, 16, 26, 32, 20, 15, 27].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}px` }}
                      className={`w-1 rounded-full ${
                        i % 2 === 0 ? 'bg-emerald-400/80' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-center text-[9px] text-zinc-400 font-mono">
                  listenhub.app • Dinleme Frekansı
                </div>
              </div>
            </div>

            {/* Right Column: Actions & Details */}
            <div className="flex-1 w-full flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Instagram Story / Spotify Wrapped Modu</span>
                </div>

                <h3 className="text-xl font-heading font-extrabold text-white">
                  Frekans Kimlik Kartı
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Haftalık dinleme süreniz, müzikal aura unvanınız, zirvedeki sanatçınız ve güven puanınızla oluşturulan 9:16 oranında yüksek çözünürlüklü hikaye kartı.
                </p>
              </div>

              {/* Status Message */}
              {storyActionSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{storyActionSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleDownloadStoryCard}
                  disabled={isGeneratingStoryImage}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-zinc-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.25)] active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingStoryImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>Kart Üretiliyor...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-zinc-950" />
                      <span>Görsel Olarak İndir (1080x1920 PNG)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShareStoryCard}
                  disabled={isGeneratingStoryImage}
                  className="w-full py-3 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white border border-white/[0.08] font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>Hikayede Paylaş / Menüyü Aç</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWeeklySummary}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] text-zinc-400 hover:text-zinc-200 border border-white/[0.05] font-medium text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Özet Metnini Kopyala</span>
                </button>
              </div>

              {/* Verified Listener Note */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{userProfile.trustScore || 98}/100 Güven Puanı Mühürlü</span>
                </span>
                <span>ListenHub Frekans Motoru</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TOP 4 VİTRİN ŞARKI SEÇİCİ MODAL
         ===================================================================== */}
      {editingTop4Slot !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setEditingTop4Slot(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#14121E] border border-zinc-200 dark:border-white/10 rounded-3xl p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/10">
              <div>
                <h3 className="text-base font-heading font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>📌 Vitrin #{editingTop4Slot + 1} İçin Parça Seç</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Kütüphanenden, favorilerinden veya haftalık parçalarından seç
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTop4Slot(null)}
                className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={top4SearchQuery}
                onChange={(e) => setTop4SearchQuery(e.target.value)}
                placeholder="Şarkı veya sanatçı adı ara..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                autoFocus
              />
            </div>

            {/* Song List */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 divide-y divide-zinc-100 dark:divide-white/5">
              {allAvailableSongsForVitrin
                .filter((s) => {
                  if (!top4SearchQuery.trim()) return true;
                  const q = top4SearchQuery.toLowerCase();
                  return (
                    s.title.toLowerCase().includes(q) ||
                    s.artist.toLowerCase().includes(q) ||
                    (s.album && s.album.toLowerCase().includes(q))
                  );
                })
                .map((song) => {
                  const isSelected = displayedTop4Tracks[editingTop4Slot]?.id === song.id;
                  return (
                    <div
                      key={song.id}
                      onClick={() => handleAssignSongToTop4Slot(song, editingTop4Slot)}
                      className={`pt-2 pb-2 px-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition ${
                        isSelected
                          ? 'bg-purple-500/15 border border-purple-500/40 text-purple-600 dark:text-purple-300'
                          : 'hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative">
                          {song.coverUrl ? (
                            <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${song.coverGradient || 'from-purple-900 to-black'} flex items-center justify-center`}>
                              <Music className="w-4 h-4 text-white/60" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{song.title}</div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{song.artist}</div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isSelected ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500 text-white">
                            Seçili
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-purple-500 dark:text-purple-400 hover:underline">
                            Ata +
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
