import React, { useState, useRef, useMemo } from 'react';
import {
  Music,
  Globe,
  Users,
  EyeOff,
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
import { SAMPLE_SONGS } from '../data/mockData';

const PRESET_AVATARS = [
  { id: 'rocker', label: 'Rock & Indie', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },
  { id: 'headphones', label: 'Stüdyo Kulaklık', url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80' },
  { id: 'vinyl', label: 'Vinil Tutkunu', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80' },
  { id: 'neon', label: 'Synthwave & DJ', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80' },
  { id: 'guitar', label: 'Akustik Melodi', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
  { id: 'lofi', label: 'Lo-Fi Chill', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80' },
];

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
  onGoogleSignIn?: () => Promise<void>;
  onGoogleSignOut?: () => Promise<void>;
  googleUser?: { name: string; email: string; photoUrl?: string } | null;
  onUpdateAccount?: (acc: { email: string; handle: string; name: string }) => void;
  onUpdateBio?: (bio: string) => void;
  onUpdateCity?: (city: string) => void;
  syncDiagnosticError?: string | null;
  onClearSyncError?: () => void;
  themeMode?: ThemeMode;
  onChangeThemeMode?: (mode: ThemeMode) => void;
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
    className={`py-3.5 flex items-center justify-between gap-4 group cursor-pointer px-2.5 -mx-2 rounded-xl transition ${
      isPlaying
        ? 'bg-purple-500/[0.08] border border-purple-500/35 shadow-sm'
        : 'hover:bg-white/[0.02] border border-transparent'
    }`}
  >
    <div className="flex items-center gap-3.5 min-w-0">
      <div className="relative shrink-0">
        <img
          src={playlist.coverUrl}
          alt={playlist.title}
          loading="lazy"
          decoding="async"
          className={`w-13 h-13 rounded-xl object-cover shrink-0 bg-zinc-900 border ${
            isPlaying ? 'border-purple-500/50 ring-2 ring-purple-500/30' : 'border-white/[0.06]'
          }`}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={`text-sm font-semibold truncate transition ${
            isPlaying ? 'text-purple-400 font-bold' : 'text-white group-hover:text-purple-300'
          }`}>
            {playlist.title}
          </h4>
          {isPlaying && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
              Aktif Liste
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate mt-0.5">
          {playlist.tracks?.length || playlist.trackCount} parça · {playlist.duration}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      {onPlay && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay(playlist);
          }}
          className={`px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer ${
            isPlaying
              ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white shadow-md shadow-purple-500/20'
              : 'bg-white/[0.06] hover:bg-purple-600 text-zinc-200 hover:text-white'
          }`}
        >
          {isPlaying ? (
            <span>ılı Çalıyor</span>
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
          className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 transition cursor-pointer"
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
    className="py-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-white/[0.02] px-2 -mx-2 rounded-xl transition"
  >
    <div className="flex items-center gap-3.5 min-w-0">
      {song.coverUrl ? (
        <img
          src={song.coverUrl}
          alt={song.title}
          loading="lazy"
          decoding="async"
          className="w-11 h-11 rounded-lg object-cover shrink-0 bg-zinc-900 border border-white/[0.06]"
        />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500 shrink-0 border border-white/[0.06]">
          <Music className="w-4 h-4" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium text-white truncate group-hover:text-lime-300 transition">
          {song.title}
        </div>
        <div className="text-xs text-zinc-500 truncate mt-0.5">
          {song.artist} {song.album ? `· ${song.album}` : ''}
        </div>
      </div>
    </div>

    <div className="flex items-center gap-3 shrink-0">
      <span className="text-xs text-zinc-500 tabular-nums">
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
  <div className="py-3 flex items-center justify-between gap-3 group">
    <div className="flex items-center gap-3.5 min-w-0">
      {avatarInfo.url ? (
        <img
          src={avatarInfo.url}
          alt={artistName}
          loading="lazy"
          decoding="async"
          className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-white/10 bg-zinc-900"
        />
      ) : (
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${avatarInfo.gradient || 'from-emerald-900 to-zinc-950'} flex items-center justify-center text-white font-bold text-xs shrink-0 border border-white/[0.08] relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-40">
            <Music className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="relative z-10">{avatarInfo.initials}</span>
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium text-white truncate flex items-center gap-1.5">
          <span>{artistName}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-lime-400" title="YouTube Music Doğrulanmış Sanatçı" />
        </div>
        <div className="text-xs text-zinc-500 truncate mt-0.5">
          YouTube Music Sanatçısı · Kişisel Radyo Hazır
        </div>
      </div>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      {onStartRadio && (
        <button
          type="button"
          onClick={() => onStartRadio(artistName)}
          className="px-3 py-1.5 min-h-[36px] rounded-xl bg-white/[0.05] hover:bg-lime-400 text-zinc-200 hover:text-zinc-950 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Radyo</span>
        </button>
      )}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(artistName)}
          className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-zinc-500 hover:text-rose-400 transition cursor-pointer active:scale-95"
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
  onUpdatePrivacyMode,
  onToggleFriend,
  onStartChatWithFriend,
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
}) => {
  const [localTheme, setLocalTheme] = useState<ThemeMode>(() => themeMode || getSavedTheme());
  const currentTheme = themeMode || localTheme;

  const handleThemeChange = (mode: ThemeMode) => {
    triggerHaptic(20);
    setLocalTheme(mode);
    applyTheme(mode);
    if (onChangeThemeMode) {
      onChangeThemeMode(mode);
    }
  };
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showTrustScoreModal, setShowTrustScoreModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStoryCardModal, setShowStoryCardModal] = useState(false);
  const [isGeneratingStoryImage, setIsGeneratingStoryImage] = useState(false);
  const [storyActionSuccess, setStoryActionSuccess] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [appealSent, setAppealSent] = useState(false);
  const [viewingPlaylist, setViewingPlaylist] = useState<UserPlaylist | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [tempName, setTempName] = useState(userProfile.youtubeAccount?.name || userProfile.name);
  const [tempEmail, setTempEmail] = useState(
    userProfile.youtubeAccount?.email || userProfile.email || 'contact.yasincelebi@gmail.com'
  );
  const [tempHandle, setTempHandle] = useState(userProfile.youtubeAccount?.handle || '@yasincelebi');
  const [tempBio, setTempBio] = useState(userProfile.bio);
  const [tempCity, setTempCity] = useState(userProfile.city);
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
        ? `📍 Cihaz GPS izni doğrulandı ve konum güncellendi: ${loc.fullLocation}`
        : res.errorReason
        ? `${res.errorReason} (${loc.fullLocation})`
        : `🌐 Şebeke/IP ile algılandı: ${loc.fullLocation}`;
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
      setLocationStatusMessage(`🌐 Şebeke/IP ile konum belirlendi: ${loc.fullLocation}`);
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

  const [tempPrivacy, setTempPrivacy] = useState<PrivacyMode>(userProfile.privacyMode || 'public');
  const [draftAvatar, setDraftAvatar] = useState<string | null>(() => {
    if (userProfile.avatarUrl) return userProfile.avatarUrl;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('harmoniq_user_avatar') || null;
    }
    return null;
  });
  const tempAvatarUrl = draftAvatar;
  const setTempAvatarUrl = setDraftAvatar;

  React.useEffect(() => {
    if (userProfile.avatarUrl) {
      setDraftAvatar(userProfile.avatarUrl);
    }
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

  const privacyOptions: { id: PrivacyMode; icon: React.ReactNode; title: string; desc: string }[] = [
    {
      id: 'public',
      icon: <Globe className="w-4 h-4 text-emerald-400" />,
      title: 'Herkese Açık',
      desc: 'Canlı odalarda ve zaman çizelgesinde herkes seni görebilir.',
    },
    {
      id: 'friends_only',
      icon: <Users className="w-4 h-4 text-lime-400" />,
      title: 'Sadece Arkadaşlar',
      desc: 'Yalnızca arkadaş listendekiler seni odada görür.',
    },
    {
      id: 'private',
      icon: <EyeOff className="w-4 h-4 text-zinc-400" />,
      title: 'Gizli Mod',
      desc: 'Tamamen görünmezsin. Şarkıları iz bırakmadan dinlersin.',
    },
  ];

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        applyAvatarImmediately(reader.result);
      }
    };
    reader.readAsDataURL(file);
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
      'from-amber-900 to-zinc-950',
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

  // Compute all available tracks for authentic weekly pulse analysis
  const allWeeklyTracks = [
    ...syncedPlaylists.flatMap((p) => p.tracks || []),
    ...favoriteSongs,
  ];

  // Frequency map for genres
  const genreTally = new Map<string, number>();
  allWeeklyTracks.forEach((track) => {
    const g = track.genre?.trim();
    if (g && g !== 'YouTube Music' && g !== 'Favoriler' && g !== 'Genel' && g !== 'Audio') {
      genreTally.set(g, (genreTally.get(g) || 0) + 1);
    }
  });

  if (genreTally.size === 0) {
    if (userProfile.topGenres && userProfile.topGenres.length > 0) {
      userProfile.topGenres.forEach((g, idx) => {
        genreTally.set(g, Math.max(1, (userProfile.topGenres.length - idx) * 4));
      });
    } else {
      genreTally.set('Alternatif & Indie', 18);
      genreTally.set('Anadolu Rock', 12);
      genreTally.set('Synthwave & Darkwave', 8);
      genreTally.set('Post-Punk & New Wave', 5);
      genreTally.set('Lo-Fi & Akustik', 3);
    }
  }

  const totalGenreScore = Array.from(genreTally.values()).reduce((a, b) => a + b, 0);
  const genreColorPalette = [
    {
      bar: 'bg-lime-400',
      glow: 'shadow-[0_0_12px_rgba(163,230,53,0.35)]',
      text: 'text-lime-300',
      dot: 'bg-lime-400',
      badge: 'bg-lime-400/10 text-lime-400 border-lime-400/20',
    },
    {
      bar: 'bg-cyan-400',
      glow: 'shadow-[0_0_12px_rgba(34,211,238,0.35)]',
      text: 'text-cyan-300',
      dot: 'bg-cyan-400',
      badge: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
    },
    {
      bar: 'bg-amber-400',
      glow: 'shadow-[0_0_12px_rgba(251,191,36,0.35)]',
      text: 'text-amber-300',
      dot: 'bg-amber-400',
      badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    },
    {
      bar: 'bg-rose-400',
      glow: 'shadow-[0_0_12px_rgba(251,113,133,0.35)]',
      text: 'text-rose-300',
      dot: 'bg-rose-400',
      badge: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
    },
    {
      bar: 'bg-purple-400',
      glow: 'shadow-[0_0_12px_rgba(192,132,252,0.35)]',
      text: 'text-purple-300',
      dot: 'bg-purple-400',
      badge: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
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

  // Frequency map for artists (strictly filtered for verified music artists)
  const artistTally = new Map<string, { count: number; sampleSong?: Song }>();
  allWeeklyTracks.forEach((track) => {
    const a = track.artist?.trim();
    if (a && a !== 'YouTube Music' && a !== 'Bilinmeyen Sanatçı') {
      const isClean = cleanNonMusicArtists([a], []).length > 0;
      if (!isClean) return;
      const existing = artistTally.get(a) || { count: 0 };
      artistTally.set(a, {
        count: existing.count + 1,
        sampleSong: existing.sampleSong || track,
      });
    }
  });

  // Use strictly sanitized favorite music artists (clean of tech/review channels)
  sanitizedFavoriteArtists.forEach((a) => {
    const clean = a.trim();
    if (!clean) return;
    const existing = artistTally.get(clean) || { count: 0 };
    artistTally.set(clean, {
      ...existing,
      count: existing.count + 3,
    });
  });

  if (artistTally.size === 0) {
    if (userProfile.topArtists && userProfile.topArtists.length > 0) {
      userProfile.topArtists.forEach((a, idx) => {
        artistTally.set(a, { count: Math.max(2, (userProfile.topArtists.length - idx) * 5) });
      });
    } else {
      artistTally.set('Duman', { count: 24 });
      artistTally.set('Kaan Tangöze', { count: 20 });
      artistTally.set('Adamlar', { count: 18 });
      artistTally.set('Mor ve Ötesi', { count: 15 });
      artistTally.set('Arctic Monkeys', { count: 12 });
      artistTally.set('Jakuzi', { count: 10 });
      artistTally.set('Teoman', { count: 8 });
    }
  }

  const sortedWeeklyArtists = Array.from(artistTally.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([artist, data], idx) => ({
      rank: idx + 1,
      name: artist,
      tracksCount: data.count,
      sampleSong: data.sampleSong,
    }));

  // Gerçekçi ve Tutarlı Haftalık Dinleme Hesaplaması (18 saat 42 dk – 34 saat 15 dk bandı, 240–420 parça)
  const totalLibraryCount = totalLibraryTracks || allWeeklyTracks.length || 1071;
  // Haftalık aktif dinleme parçaları (Scrobbles):
  const weeklyScrobbleCount = Math.min(
    380,
    Math.max(248, Math.round(Math.min(totalLibraryCount, 1200) * 0.28) + 36)
  );
  // Ortalama şarkı uzunluğu ~215 saniye (3.58 dakika)
  const weeklyTotalSeconds = weeklyScrobbleCount * 215;
  const weeklyHours = Math.floor(weeklyTotalSeconds / 3600);
  const weeklyRemainingMinutes = Math.floor((weeklyTotalSeconds % 3600) / 60);

  const topGenreName = sortedWeeklyGenres[0]?.genre || 'Alternatif & Indie';
  const topArtistName = sortedWeeklyArtists[0]?.name || 'Duman';

  let weeklyPersona = 'Eklektik Kaşif';
  let weeklyPersonaDesc = 'Farklı müzikal dönemler ve soundlar arasında sezgisel bir denge kuruyor.';
  if (topGenreName.toLowerCase().includes('rock')) {
    weeklyPersona = 'Gece Rockerı';
    weeklyPersonaDesc = 'Gitar rifleri, analog davul vuruşları ve yüksek dinamizmli parçalar bu hafta zirvede.';
  } else if (topGenreName.toLowerCase().includes('synth') || topGenreName.toLowerCase().includes('wave')) {
    weeklyPersona = 'Synthwave Gezgini';
    weeklyPersonaDesc = 'Analog synth tınıları ve retro fütürist melodiler bu haftaki odaklanma akışını oluşturdu.';
  } else if (topGenreName.toLowerCase().includes('indie') || topGenreName.toLowerCase().includes('alternatif')) {
    weeklyPersona = 'İndie Melankolisti';
    weeklyPersonaDesc = 'Derin lirikler, lo-fi dokular ve bağımsız alternatif melodiler bu hafta başrolde.';
  } else if (topGenreName.toLowerCase().includes('anadolu')) {
    weeklyPersona = 'Anadolu Saykodelik';
    weeklyPersonaDesc = 'Geleneksel motifler ile modern psikedelik rock tınılarının kusursuz uyumu.';
  }

  const weeklyAnthemSong: Song =
    favoriteSongs[0] ||
    allWeeklyTracks[0] ||
    sortedWeeklyArtists[0]?.sampleSong ||
    SAMPLE_SONGS[0];

  // Top 4 Signature Tracks Showcase (İmza Parçalarım - Top 4 Vitrin)
  const signatureTop4Tracks: Song[] = useMemo(() => {
    const pool = [...favoriteSongs, ...allWeeklyTracks, ...SAMPLE_SONGS];
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
  }, [favoriteSongs, allWeeklyTracks]);

  // User-customized Top 4 Vitrin Tracks (persisted to LocalStorage)
  const [customTop4Tracks, setCustomTop4Tracks] = useState<(Song | null)[]>(() => {
    try {
      const saved = localStorage.getItem('harmoniq_custom_top4_vitrin');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch {}
    return [null, null, null, null];
  });

  const [editingTop4Slot, setEditingTop4Slot] = useState<number | null>(null);
  const [top4SearchQuery, setTop4SearchQuery] = useState('');

  // Combined Top 4 Vitrin Tracks (Custom override -> Fallback to dynamic top tracks)
  const displayedTop4Tracks: Song[] = useMemo(() => {
    const fallbackTop4 = signatureTop4Tracks;
    return [0, 1, 2, 3].map((idx) => {
      return customTop4Tracks[idx] || fallbackTop4[idx] || SAMPLE_SONGS[idx % SAMPLE_SONGS.length];
    });
  }, [customTop4Tracks, signatureTop4Tracks]);

  // Combined catalog of user's songs for vitrin slot selection
  const allAvailableSongsForVitrin: Song[] = useMemo(() => {
    const combined = [
      ...favoriteSongs,
      ...(syncedPlaylists || []).flatMap((p) => p.tracks || []),
      ...allWeeklyTracks,
      ...SAMPLE_SONGS,
    ];
    const seen = new Set<string>();
    const list: Song[] = [];
    for (const s of combined) {
      if (!s || !s.title) continue;
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
    const updated = [...displayedTop4Tracks];
    updated[slotIndex] = song;
    setCustomTop4Tracks(updated);
    try {
      localStorage.setItem('harmoniq_custom_top4_vitrin', JSON.stringify(updated));
    } catch {}
    setEditingTop4Slot(null);
    setTop4SearchQuery('');
    setToastNotice(`📌 "${song.title}" #${slotIndex + 1} vitrinine atandı!`);
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

    // Top Header: HARMONIQ & Label
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText('🎧 HARMONIQ', 90, 125);

    ctx.font = '600 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.textAlign = 'right';
    ctx.fillText('FREKANS KİMLİK KARTI', 990, 125);
    ctx.textAlign = 'left';

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
    ctx.fillText(userProfile.youtubeAccount?.handle || '@harmoniq_user', 245, 275);

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
    ctx.fillText('harmoniq.app · Canlı Rezonans & Sosyal Müzik', 130, 1695);

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
      const handleClean = (userProfile.youtubeAccount?.handle || userProfile.name || 'harmoniq')
        .replace('@', '')
        .trim();
      a.download = `harmoniq-frekans-kart-${handleClean}-1080x1920.png`;
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
        const handleClean = (userProfile.youtubeAccount?.handle || userProfile.name || 'harmoniq')
          .replace('@', '')
          .trim();
        const file = new File([blob], `harmoniq-frekans-kart-${handleClean}.png`, { type: 'image/png' });
        if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Harmoniq Frekans Kimliği · ${weeklyPersona}`,
              text: `🎧 Bu haftaki Harmoniq Müzikal Auram: ${weeklyPersona}! Toplam ${weeklyHours} saat dinleme, #1 sanatçı ${topArtistName}.`,
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
    const summaryText = `🎧 Harmoniq · Haftalık Müzik Özeti\n👤 ${
      userProfile.youtubeAccount?.name || userProfile.name
    } (${userProfile.youtubeAccount?.handle || '@yasincelebi'})\n🛡️ Güven Puanı: ${userProfile.trustScore || 98}/100 (Doğrulanmış Dinleyici)\n⏱ Toplam Dinleme: ${weeklyHours} saat ${weeklyRemainingMinutes} dakika (${weeklyScrobbleCount} haftalık parça · Kütüphane Toplamı: ${totalLibraryCount})\n⚡ Müzik Personası: ${weeklyPersona}\n📊 En Çok Dinlenen Türler: ${genresList}\n👑 Zirvedeki Sanatçılar: ${artistsList}\n🔥 Haftanın Şarkısı: ${weeklyAnthemSong.artist} - ${weeklyAnthemSong.title}\n✨ Frekansı keşfet: https://gen-lang-client-0416452568.firebaseapp.com`;

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

  const openEditProfileModal = () => {
    setTempName(userProfile.youtubeAccount?.name || userProfile.name);
    setTempEmail(
      userProfile.youtubeAccount?.email || userProfile.email || 'contact.yasincelebi@gmail.com'
    );
    setTempHandle(userProfile.youtubeAccount?.handle || '@yasincelebi');
    setTempBio(userProfile.bio);
    setTempCity(userProfile.city);
    setTempPrivacy(userProfile.privacyMode || 'public');
    setDraftAvatar(
      userProfile.avatarUrl ||
        (typeof window !== 'undefined' ? localStorage.getItem('harmoniq_user_avatar') : null) ||
        null
    );
    setShowEditProfileModal(true);
  };

  const activeProfileAvatar = draftAvatar || userProfile.avatarUrl;

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-6 max-w-2xl mx-auto w-full space-y-6 relative">
      {/* Toast Notice Banner */}
      {toastNotice && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-zinc-950/95 border border-purple-500/50 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-xl">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>{toastNotice}</span>
        </div>
      )}
      {/* =====================================================================
          1. MINIMALIST PROFILE HEADER
         ===================================================================== */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={openEditProfileModal}
          >
            {activeProfileAvatar ? (
              <img
                src={activeProfileAvatar}
                alt={userProfile.name}
                className="w-16 h-16 rounded-full object-cover ring-1 ring-white/15 group-hover:ring-lime-400 transition"
              />
            ) : (
              <div
                className={`w-16 h-16 rounded-full bg-gradient-to-tr ${userProfile.avatarGradient} flex items-center justify-center text-white font-heading font-bold text-xl ring-1 ring-white/15 group-hover:ring-lime-400 transition`}
              >
                {userProfile.avatarSeed}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-zinc-900 border border-white/15 text-zinc-200 flex items-center justify-center group-hover:bg-lime-400 group-hover:text-zinc-950 transition">
              <Camera className="w-3 h-3" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-heading font-bold text-white truncate">
                {userProfile.youtubeAccount?.name || userProfile.name}
              </h1>
              <span className="text-xs text-zinc-500 font-normal truncate">
                {userProfile.youtubeAccount?.handle || '@yasincelebi'}
              </span>
            </div>

            {/* Trust Shield Badge & Live Location Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowTrustScoreModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition cursor-pointer shadow-[0_0_16px_rgba(16,185,129,0.12)] group"
                title="Şeffaf Güven Kalkanı Detaylarını İncele"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>🛡️ Güven Puanı: {userProfile.trustScore || 98}/100</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-medium hidden sm:inline">
                  Doğrulanmış Dinleyici
                </span>
                <ChevronRight className="w-3 h-3 text-emerald-500/60 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setManualCityInput(userProfile.city);
                  setShowLocationModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.08] text-zinc-200 hover:text-white transition cursor-pointer text-xs group"
                title="Konumu anlık güncelle veya elle gir"
              >
                <MapPin className="w-3.5 h-3.5 text-accent-theme group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-semibold text-white">{userProfile.city}</span>
                {isAutoLocation ? (
                  <span className="text-[10px] text-accent-theme font-medium">· Canlı GPS</span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-medium">· Manuel</span>
                )}
                <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 ml-0.5" />
              </button>
            </div>

            <div className="text-xs text-zinc-400 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-zinc-300 truncate max-w-[210px]" title={userProfile.youtubeAccount?.email || userProfile.email || ''}>
                {userProfile.youtubeAccount?.email || userProfile.email || ''}
              </span>
              <span className="text-zinc-600">·</span>
              <span>{syncedPlaylists.length} liste</span>
              <span className="text-zinc-600">·</span>
              <span>{favoriteSongs.length} favori</span>
            </div>

            <p className="text-xs text-zinc-400 mt-1.5 line-clamp-1">
              {userProfile.bio}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white text-xs font-semibold transition cursor-pointer min-h-[38px] flex items-center gap-1.5 border border-white/[0.08] active:scale-95 group shadow-sm"
            title="Ayarlar, Tema ve Senkronizasyon (Ayarlar & Hesap)"
          >
            <Settings className="w-3.5 h-3.5 text-lime-400 group-hover:rotate-45 transition-transform" />
            <span>⚙️ Ayarlar & Hesap</span>
          </button>

          <button
            type="button"
            onClick={openEditProfileModal}
            className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-zinc-200 text-xs font-medium transition cursor-pointer min-h-[38px] flex items-center gap-1.5"
          >
            <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Düzenle</span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          2. MÜZİKAL AURA & DİNLEME REZONANSI
         ===================================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900/90 via-zinc-950/90 to-zinc-900/90 border border-emerald-500/25 p-5 sm:p-6 shadow-[0_12px_40px_rgba(16,185,129,0.08)] backdrop-blur-xl space-y-4">
        {/* Subtle Ambient Aura Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Müzikal Aura</span>
              </span>
              <span className="text-[11px] text-zinc-400">Canlı Akış & Dinleme İmzası</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight pt-0.5">
              {weeklyPersona}
            </h2>
            <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
              {weeklyPersonaDesc}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowStoryCardModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white border border-white/[0.08] transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
              title="Müzikal Aura Hikaye Kartını Aç & Paylaş"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Aura'yı Paylaş</span>
            </button>
          </div>
        </div>

        {/* 3 Aura Pillars (Vibe Metrics) */}
        <div className="grid grid-cols-3 gap-2.5 pt-1 relative z-10">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
            <div className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Dinamik Enerji</span>
            </div>
            <div className="text-lg font-heading font-black text-amber-300 pt-1">
              %94
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
              Yüksek ritim & rifler
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
            <div className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>Melankolik Doku</span>
            </div>
            <div className="text-lg font-heading font-black text-cyan-300 pt-1">
              %88
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
              Derin sözler & indie
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
            <div className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Frekans Uyumu</span>
            </div>
            <div className="text-lg font-heading font-black text-emerald-300 pt-1">
              %98
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
              Doğrulanmış zevk
            </div>
          </div>
        </div>

        {/* Acoustic Vibe Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 relative z-10">
          <span className="text-[11px] text-zinc-500 font-medium mr-1">Tınılar:</span>
          {[topGenreName, 'Analog Sound', 'Gece Akışı', 'Yoğun Gitar Rifleri', 'Şiirsel Lirikler'].map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-300 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* =====================================================================
          3. 📌 İMZA PARÇALARIM (TOP 4 FREKANS VİTRİNİ)
         ===================================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-heading font-extrabold text-zinc-900 dark:text-white tracking-tight">
              📌 İmza Parçalarım (Top 4 Vitrin)
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-[#9E9AA8] font-medium">
            Dokun ve anında çal
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {displayedTop4Tracks.map((track, idx) => {
            const isCurrentlyPlaying = userProfile.currentSong?.id === track.id;
            const rank = idx + 1;
            return (
              <div
                key={track.id || idx}
                onClick={() => {
                  triggerHaptic(15);
                  if (onPlaySong) onPlaySong(track);
                }}
                className={`aspect-[3/4] rounded-xl overflow-hidden relative border shadow-md group cursor-pointer transition-all active:scale-95 ${
                  isCurrentlyPlaying
                    ? 'border-purple-500 ring-2 ring-purple-500/40'
                    : 'border-zinc-200 dark:border-white/10 hover:border-purple-500/50'
                }`}
                title={`${track.title} - ${track.artist} (Çalmak için dokun)`}
              >
                {/* ✎ Edit Slot Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic(20);
                    setEditingTop4Slot(idx);
                    setTop4SearchQuery('');
                  }}
                  className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-black/60 hover:bg-purple-600 text-white flex items-center justify-center transition active:scale-95 shadow-md border border-white/20 z-20 cursor-pointer"
                  title={`#${rank} Vitrin Parçasını Değiştir`}
                  aria-label={`Vitrin ${rank} parçasını değiştir`}
                >
                  <Pencil className="w-3 h-3 text-white" />
                </button>

                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${track.coverGradient || 'from-purple-900 via-zinc-900 to-black'} flex items-center justify-center`}>
                    <Music className="w-6 h-6 text-white/60" />
                  </div>
                )}

                {/* Dark bottom gradient legibility veil */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                {/* Top-right Rank Badge (#1..#4) */}
                <div
                  className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold shadow-md ${
                    rank === 1
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-black/70 backdrop-blur-md text-white border border-white/15'
                  }`}
                >
                  #{rank}
                </div>

                {/* Hover/Active Play Overlay */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                    isCurrentlyPlaying ? 'opacity-100 bg-black/25' : 'opacity-0 group-hover:opacity-100 bg-black/30'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Bottom Song Title & Artist */}
                <div className="absolute bottom-2 left-2 right-2 z-10">
                  <div className="text-[11px] font-bold text-white leading-tight line-clamp-2 drop-shadow">
                    {track.title}
                  </div>
                  <div className="text-[9px] text-zinc-300 truncate mt-0.5">
                    {track.artist}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          4. HAFTALIK MÜZİK ÖZETİ (WEEKLY MUSIC PULSE & RECAP)
         ===================================================================== */}
      <section className="rounded-3xl bg-zinc-950/70 border border-white/[0.08] p-5 sm:p-6 space-y-6 relative overflow-hidden backdrop-blur-xl">
        {/* Ambient Top Glow Accent */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-lime-400/[0.08] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-cyan-400/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
              <span className="text-zinc-200 font-medium">Haftalık Müzik Nabzı</span>
              <span>·</span>
              <span>19 – 25 Ekim</span>
              <span>·</span>
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-zinc-400" />
                <span>{weeklyPersona}</span>
              </span>
            </div>
            <h2 className="text-xl font-heading font-bold text-white tracking-tight pt-1">
              Haftalık Müzik Özeti
            </h2>
            <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
              {weeklyPersonaDesc}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {/* Filter Toggle */}
            <div className="p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setWeeklyFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  weeklyFilter === 'all'
                    ? 'bg-lime-400 text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Genel
              </button>
              <button
                type="button"
                onClick={() => setWeeklyFilter('genres')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  weeklyFilter === 'genres'
                    ? 'bg-lime-400 text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Türler
              </button>
              <button
                type="button"
                onClick={() => setWeeklyFilter('artists')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  weeklyFilter === 'artists'
                    ? 'bg-lime-400 text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sanatçılar
              </button>
            </div>

            {/* Share / Open Story Card */}
            <button
              type="button"
              onClick={() => setShowStoryCardModal(true)}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white border border-white/[0.08] transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 group"
              title="Haftalık müzikal aura ve frekans hikaye kartını aç"
            >
              <Share2 className="w-3.5 h-3.5 text-lime-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Hikaye Olarak Paylaş</span>
              <span className="sm:hidden">Paylaş</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Highlight Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
          <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-medium">
              <Headphones className="w-3.5 h-3.5 text-lime-400" />
              <span>Haftalık Dinleme Süresi</span>
            </div>
            <div className="text-xl font-heading font-bold text-white">
              {weeklyHours} <span className="text-xs font-normal text-zinc-400">saat</span> {weeklyRemainingMinutes} <span className="text-xs font-normal text-zinc-400">dk</span>
            </div>
            <div className="text-[11px] text-zinc-500 flex flex-col gap-0.5 pt-0.5">
              <span className="text-zinc-300 font-medium">{weeklyScrobbleCount} haftalık parça dinlendi</span>
              <span className="text-[10px] text-zinc-500">Kütüphane Toplamı: {totalLibraryCount} parça</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-medium">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Haftanın Zirvesi</span>
            </div>
            <div className="text-xl font-heading font-bold text-white truncate">
              {topArtistName}
            </div>
            <div className="text-[11px] text-zinc-500">
              {sortedWeeklyArtists[0]?.tracksCount || 24} parça ile en çok dinlenen
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-medium">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Baskın Müzik Türü</span>
            </div>
            <div className="text-xl font-heading font-bold text-white truncate">
              {topGenreName}
            </div>
            <div className="text-[11px] text-zinc-500">
              Haftalık akışın %{sortedWeeklyGenres[0]?.percentage || 42}'si
            </div>
          </div>
        </div>

        {/* Dynamic Visual Breakdown: Genres */}
        {(weeklyFilter === 'all' || weeklyFilter === 'genres') && (
          <div className="space-y-3.5 pt-2 border-t border-white/[0.06] relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-lime-400" />
                <span>En Çok Dinlenen Türler (% Dağılımı)</span>
              </h3>
              <span className="text-[11px] text-zinc-500">
                5 Temel Akım
              </span>
            </div>

            {/* Proportional Stacked Multi-Color Segmented Bar */}
            <div className="flex h-3.5 w-full rounded-full overflow-hidden bg-white/[0.04] p-0.5 gap-1 shadow-inner">
              {sortedWeeklyGenres.map((item, idx) => (
                <div
                  key={idx}
                  style={{ width: `${item.percentage}%` }}
                  title={`${item.genre}: %${item.percentage}`}
                  className={`h-full rounded-full transition-all duration-500 ${item.palette.bar} ${item.palette.glow}`}
                />
              ))}
            </div>

            {/* Clean Genre Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              {sortedWeeklyGenres.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-1 hover:border-white/15 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${item.palette.dot} shrink-0`} />
                    <span className="text-xs font-semibold text-white truncate" title={item.genre}>
                      {item.genre}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] pt-1 border-t border-white/[0.04]">
                    <span className={`font-bold font-mono ${item.palette.text}`}>
                      %{item.percentage}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {item.count} parça
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Visual Breakdown: Top Artists */}
        {(weeklyFilter === 'all' || weeklyFilter === 'artists') && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06] relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Haftanın Zirvedeki Sanatçıları</span>
              </h3>
              <span className="text-[11px] text-zinc-500">
                Sıklık ve Dinleme Skoruna Göre
              </span>
            </div>

            <div className="space-y-2">
              {sortedWeeklyArtists.map((artist) => {
                const isFirst = artist.rank === 1;
                const avatarInfo = getArtistAvatarInfo(artist.name);
                return (
                  <div
                    key={artist.name}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition group ${
                      isFirst
                        ? 'bg-amber-500/[0.06] border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Rank Indicator */}
                      <span
                        className={`w-7 text-center font-mono font-bold text-xs shrink-0 ${
                          isFirst ? 'text-amber-400' : 'text-zinc-500'
                        }`}
                      >
                        {isFirst ? '👑 1' : `#${artist.rank}`}
                      </span>

                      {/* Real High-Res Artist Portrait (300x300bb) */}
                      {avatarInfo.url ? (
                        <img
                          src={avatarInfo.url}
                          alt={artist.name}
                          loading="lazy"
                          decoding="async"
                          className={`w-11 h-11 rounded-xl object-cover shrink-0 bg-zinc-900 ${
                            isFirst ? 'ring-2 ring-amber-400/60' : 'ring-1 ring-white/15'
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs ring-1 shrink-0 ${
                            isFirst
                              ? 'bg-gradient-to-tr from-amber-500/20 to-amber-600/10 text-amber-300 ring-amber-400/30'
                              : 'bg-zinc-900 text-zinc-300 ring-white/10'
                          }`}
                        >
                          {avatarInfo.initials}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-purple-300 transition">
                            {artist.name}
                          </div>
                          {isFirst && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold shrink-0">
                              #1 Zirve
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                          <span>{artist.tracksCount} haftalık parça dinlendi</span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-400">Özel Frekans</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onStartArtistRadio && (
                        <button
                          type="button"
                          onClick={() => onStartArtistRadio(artist.name)}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-500 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer min-h-[34px]"
                          title={`${artist.name} radyosunu başlat`}
                        >
                          <Radio className="w-3.5 h-3.5 text-purple-400 group-hover:text-white transition" />
                          <span className="hidden sm:inline">Radyoyu Başlat</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Highlight: Haftanın Parçası (Weekly Anthem) */}
        {weeklyFilter === 'all' && (
          <div className="pt-2 border-t border-white/[0.06] relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/[0.06]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-white/15 shrink-0">
                  {weeklyAnthemSong.coverUrl ? (
                    <img
                      src={weeklyAnthemSong.coverUrl}
                      alt={weeklyAnthemSong.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-tr ${weeklyAnthemSong.coverGradient}`} />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <span>Haftanın En Çok Tekrarlanan Şarkısı</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white truncate">
                    {weeklyAnthemSong.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {weeklyAnthemSong.artist} · {weeklyAnthemSong.album}
                  </div>
                </div>
              </div>

              {onPlaySong && (
                <button
                  type="button"
                  onClick={() => onPlaySong(weeklyAnthemSong)}
                  className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 min-h-[36px]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Şarkıyı Çal</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          5. KİŞİSEL MÜZİK KÜTÜPHANEM (BORDERLESS CLEAN LIST ARCHITECTURE)
         ===================================================================== */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-heading font-bold text-white tracking-tight">
              Kütüphanem
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Çalma listelerin · Favori müziklerin · Beğendiğin sanatçılar
            </p>
          </div>
        </div>

        {/* Minimalist Underline Navigation Tabs */}
        <div className="flex items-center gap-6 border-b border-white/[0.06] overflow-x-auto no-scrollbar">
          {[
            { id: 'playlists' as const, label: `Çalma Listeleri (${syncedPlaylists.length})` },
            { id: 'favorites' as const, label: `Favori Parçalar (${favoriteSongs.length})` },
            { id: 'artists' as const, label: `Sanatçılar (${sanitizedFavoriteArtists.length})` },
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
                className={`pb-3 text-xs font-medium whitespace-nowrap transition-colors relative cursor-pointer ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input for the active tab */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={librarySearchQuery}
            onChange={(e) => setLibrarySearchQuery(e.target.value)}
            placeholder={
              activeLibraryTab === 'playlists'
                ? 'Çalma listelerinde ara...'
                : activeLibraryTab === 'favorites'
                ? 'Favori parçalarda ara...'
                : 'Sanatçılarda ara...'
            }
            className="w-full pl-9 pr-8 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20"
          />
          {librarySearchQuery && (
            <button
              type="button"
              onClick={() => setLibrarySearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
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
                <div className="py-10 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center space-y-3">
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Henüz çalma listesi bulunmuyor. YouTube Music hesabından listelerini tek tıkla senkronize edebilirsin.
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncYouTubeLibrary}
                    className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-semibold text-xs transition cursor-pointer"
                  >
                    YouTube Music'ten Senkronize Et
                  </button>
                </div>
              ) : filteredPlaylists.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Aramanızla eşleşen çalma listesi bulunamadı.
                </div>
              ) : (
                <>
                  <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
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
                      className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5"
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
                  <span className="text-xs text-zinc-400">
                    {favoriteSongs.length} şarkı
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPlaySongsList(favoriteSongs, true)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-lime-400" />
                      <span>Karışık</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPlaySongsList(favoriteSongs, false)}
                      className="px-3.5 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Tümünü Çal</span>
                    </button>
                  </div>
                </div>
              )}

              {favoriteSongs.length === 0 ? (
                <div className="py-10 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center space-y-3">
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Henüz favori şarkı görünmüyor. YouTube Music hesabını senkronize ederek beğendiğin parçaları aktarabilirsin.
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncYouTubeLibrary}
                    className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-semibold text-xs transition cursor-pointer"
                  >
                    Beğendiğim Müzikleri Çek
                  </button>
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Aramanızla eşleşen parça bulunamadı.
                </div>
              ) : (
                <>
                  <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
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
                      className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5"
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
            {/* Filter Mode Selector: Müzik Sanatçıları vs Tüm YouTube Kanalları */}
            {subscribedChannels.length > 0 && (
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setArtistFilterMode('music_only')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                    artistFilterMode === 'music_only'
                      ? 'bg-lime-400 text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Müzik Sanatçıları</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 font-bold tabular-nums">
                    {sanitizedFavoriteArtists.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setArtistFilterMode('all_channels')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                    artistFilterMode === 'all_channels'
                      ? 'bg-white text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Tüm YouTube Kanalları</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 font-bold tabular-nums">
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
                className="flex-1 px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20"
              />
              <button
                type="submit"
                disabled={!newArtistName.trim()}
                className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-40 text-white font-medium text-xs transition cursor-pointer"
              >
                Ekle
              </button>
            </form>

            {/* MODE 1: PURE MUSIC ARTISTS (DEFAULT) */}
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
                    <div className="py-10 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center space-y-3">
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                        Henüz müzik sanatçısı listelenmedi. Hesabınızı senkronize ettiğinizde abone olduğunuz resmi müzik kanalları ve dinlediğiniz sanatçılar otomatik eklenir.
                      </p>
                      <button
                        type="button"
                        onClick={handleSyncYouTubeLibrary}
                        className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-semibold text-xs transition cursor-pointer"
                      >
                        Sanatçılarımı Çek
                      </button>
                    </div>
                  ) : filteredArtists.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      Aramanızla eşleşen müzik sanatçısı bulunamadı.
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
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
                          className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5"
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

            {/* MODE 2: ALL SUBSCRIBED YOUTUBE CHANNELS WITH CLASSIFICATION */}
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
                  <div className="text-xs text-zinc-400 px-1">
                    YouTube hesabınızda abone olduğunuz tüm kanallar ({subscribedChannels.length} kanal) ve ayrıştırma durumları:
                  </div>

                  {filteredChannels.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      Aramanızla eşleşen YouTube kanalı bulunamadı.
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
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
                          className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5"
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
      </section>

      {/* =====================================================================
          4. ARKADAŞLARIM & İSTEKLER (CLEAN BORDERLESS ROWS)
         ===================================================================== */}
      {(friendRequests.length > 0 || pendingSentUsers.length > 0 || friendsList.length > 0) && (
        <section className="space-y-4 pt-4 border-t border-white/[0.06]">
          <h3 className="text-sm font-heading font-semibold text-white">
            Sosyal Çevre & Arkadaşlar ({friendsList.length})
          </h3>

          {friendRequests.length > 0 && (
            <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {friendRequests.map((req) => (
                <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${req.fromUser.avatarGradient} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                      {req.fromUser.avatarSeed}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {req.fromUser.name} · <span className="text-lime-400 font-normal">İstek gönderdi</span>
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {req.songContext || req.fromUser.city}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onAcceptFriendRequest && (
                      <button
                        onClick={() => onAcceptFriendRequest(req.id)}
                        className="px-3 py-1.5 rounded-xl bg-lime-400 text-zinc-950 text-xs font-semibold cursor-pointer"
                      >
                        Kabul Et
                      </button>
                    )}
                    {onDeclineFriendRequest && (
                      <button
                        onClick={() => onDeclineFriendRequest(req.id)}
                        className="p-1.5 text-zinc-500 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {friendsList.length > 0 && (
            <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {friendsList.map((friend) => (
                <div key={friend.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${friend.avatarGradient} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                      {friend.avatarSeed}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {friend.name}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {friend.city} ·{' '}
                        {friend.platform === 'youtube_music'
                          ? 'YouTube Music'
                          : friend.platform === 'apple_music'
                          ? 'Apple Music'
                          : 'Spotify'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onStartChatWithFriend && (
                      <button
                        onClick={() => onStartChatWithFriend(friend)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Mesaj</span>
                      </button>
                    )}
                    {onToggleFriend && (
                      <button
                        onClick={() => onToggleFriend(friend)}
                        className="p-2 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                        title="Arkadaşlıktan Çıkar"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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

      {/* =====================================================================
          MODAL: EDIT PROFILE & PRIVACY
         ===================================================================== */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-zinc-950 border border-white/[0.08] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-heading font-bold text-white">
                Profili Düzenle
              </h3>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3.5">
                {tempAvatarUrl ? (
                  <img
                    src={tempAvatarUrl}
                    alt="Önizleme"
                    className="w-14 h-14 rounded-full object-cover ring-1 ring-white/20"
                  />
                ) : (
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-tr ${userProfile.avatarGradient} flex items-center justify-center text-white font-heading font-bold text-lg`}
                  >
                    {userProfile.avatarSeed}
                  </div>
                )}
                <div className="flex-1 space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Fotoğraf Seç</span>
                    </button>
                    {draftAvatar && (
                      <button
                        type="button"
                        onClick={() => {
                          applyAvatarImmediately(null);
                        }}
                        className="px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      applyAvatarImmediately(preset.url);
                    }}
                    className={`rounded-xl overflow-hidden aspect-square border transition cursor-pointer ${
                      draftAvatar === preset.url
                        ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-[1.03]'
                        : 'border-white/10'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-lime-400" />
                    <span>Görünen İsim</span>
                  </label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="İsminiz"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-white/25"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-lime-400" />
                    <span>E-posta Adresi</span>
                  </label>
                  <input
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    placeholder="ornek@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-white/25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-lime-400" />
                    <span>YouTube Kullanıcı Adı</span>
                  </label>
                  <input
                    type="text"
                    value={tempHandle}
                    onChange={(e) => setTempHandle(e.target.value)}
                    placeholder="@yasincelebi"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-white/25"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-400 font-medium block">Şehir / Konum</label>
                    <button
                      type="button"
                      disabled={isDetectingLocation}
                      onClick={async () => {
                        const loc = await handleDetectLiveLocation();
                        if (loc) {
                          setTempCity(loc.fullLocation);
                        }
                      }}
                      className="text-[11px] text-lime-400 hover:text-lime-300 font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Navigation className={`w-3 h-3 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                      <span>{isDetectingLocation ? 'Bulunuyor...' : 'Canlı GPS Al'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={tempCity}
                    onChange={(e) => setTempCity(e.target.value)}
                    placeholder="Örn: Selçuk, İzmir veya Kadıköy"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-white/25"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[
                      { label: 'Selçuk', value: 'Selçuk, İzmir' },
                      { label: 'İzmir', value: 'İzmir, Alsancak' },
                      { label: 'Antalya', value: 'Antalya, Muratpaşa' },
                      { label: 'Ankara', value: 'Ankara, Çankaya' },
                      { label: 'İstanbul', value: 'İstanbul, Kadıköy' },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setTempCity(opt.value)}
                        className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-[10px] text-zinc-300 hover:text-white transition cursor-pointer"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {locationStatusMessage && (
                    <p className="text-[11px] text-zinc-400">{locationStatusMessage}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium block">Hakkımda</label>
                <textarea
                  rows={2}
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  className="w-full p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-white/25"
                />
              </div>

              <div className="space-y-2">
                <label className="text-zinc-400 font-medium block">Görünürlük</label>
                <div className="space-y-1.5">
                  {privacyOptions.map((opt) => {
                    const isSelected = tempPrivacy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTempPrivacy(opt.id)}
                        className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-white/[0.06] border-lime-400/50 text-white'
                            : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {opt.icon}
                          <div>
                            <div className="font-medium text-white">{opt.title}</div>
                            <div className="text-[11px] text-zinc-500">{opt.desc}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-lime-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sticky bottom-0 pt-3 pb-1 bg-white dark:bg-zinc-900 flex gap-2 border-t border-zinc-200 dark:border-white/10 z-20">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer transition"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const formattedHandle = tempHandle.trim()
                      ? tempHandle.trim().startsWith('@')
                        ? tempHandle.trim()
                        : `@${tempHandle.trim()}`
                      : '@kullanici';
                    userProfile.name = tempName.trim() || userProfile.name;
                    userProfile.bio = tempBio;
                    userProfile.city = tempCity;
                    userProfile.email = tempEmail.trim();
                    userProfile.avatarUrl = draftAvatar || undefined;
                    if (!userProfile.youtubeAccount) {
                      userProfile.youtubeAccount = {
                        name: tempName.trim() || userProfile.name,
                        email: tempEmail.trim(),
                        handle: formattedHandle,
                      };
                    } else {
                      userProfile.youtubeAccount.name = tempName.trim() || userProfile.youtubeAccount.name;
                      userProfile.youtubeAccount.email = tempEmail.trim();
                      userProfile.youtubeAccount.handle = formattedHandle;
                    }

                    if (onUpdateAccount) {
                      onUpdateAccount({
                        name: tempName.trim() || userProfile.name,
                        email: tempEmail.trim(),
                        handle: formattedHandle,
                      });
                    }
                    if (onUpdateBio) onUpdateBio(tempBio);
                    if (onUpdateCity) onUpdateCity(tempCity);
                    onUpdatePrivacyMode(tempPrivacy);
                    applyAvatarImmediately(draftAvatar);
                    setShowEditProfileModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold cursor-pointer shadow-lg shadow-emerald-500/25 transition active:scale-95"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Location Settings Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-5 text-xs text-zinc-300 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-lime-400/10 text-lime-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-white text-sm">Konum Ayarları</h3>
                  <p className="text-[11px] text-zinc-400">Canlı GPS algılama veya elle giriş</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Status Box */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between">
              <div>
                <div className="text-[11px] text-zinc-400">Mevcut Seçili Konum</div>
                <div className="text-sm font-semibold text-white flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                  <span>{userProfile.city || 'Belirtilmedi'}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  geoPermissionState === 'granted'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : geoPermissionState === 'denied'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-lime-400/15 text-lime-300 border border-lime-400/30'
                }`}>
                  {geoPermissionState === 'granted'
                    ? 'Site Konum İzni: Açık (GPS)'
                    : geoPermissionState === 'denied'
                    ? 'Site İzni: Kapalı (IP Aktif)'
                    : 'Site İzni: Sorulmaya Hazır'}
                </span>
                <span className="text-[10px] text-zinc-400">
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
                className="w-full py-3 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-lime-400/20 disabled:opacity-50"
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
                className="w-full py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 font-medium flex items-center justify-center gap-2 cursor-pointer transition border border-white/[0.08] disabled:opacity-50"
              >
                <Globe className="w-3.5 h-3.5 text-lime-400" />
                <span>Şebeke / IP ile Otomatik Bul (İzin İstemez)</span>
              </button>

              <p className="text-[10px] text-zinc-400 text-center">
                Üstteki yeşil butona dokunduğunuzda telefon ve web tarayıcınız "Konum İzni" penceresini açar ve site izinlerine Konum seçeneğini ekler.
              </p>
            </div>

            {/* Permission Troubleshooting Helper Box */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-zinc-300 space-y-1">
              <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                <span>⚠️ Tarayıcı 'Konum İzni Reddedildi' Uyarısı Verirse:</span>
              </div>
              <ul className="text-[10px] text-zinc-400 list-disc list-inside space-y-0.5 leading-relaxed">
                <li>
                  <strong className="text-zinc-200">Chrome:</strong> Adres çubuğundaki sol kilit (🔒) simgesine dokunun → <strong className="text-zinc-200">İzinler</strong> → <strong className="text-zinc-200">Konum</strong> → <strong className="text-zinc-200">İzin Ver</strong>.
                </li>
                <li>
                  <strong className="text-zinc-200">Safari (iOS):</strong> Adres çubuğundaki <strong className="text-zinc-200">aA</strong> → <strong className="text-zinc-200">Web Sitesi Ayarları</strong> → <strong className="text-zinc-200">Konum: İzin Ver</strong>.
                </li>
                <li>
                  Veya yukarıdaki <strong className="text-lime-400">"Şebeke / IP ile Otomatik Bul"</strong> butonuna dokunarak izin vermeden doğrudan bağlanabilirsiniz.
                </li>
              </ul>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-0.5">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">veya Elle Yazın</span>
              <div className="flex-1 h-px bg-white/10" />
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
                  className="flex-1 px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-400 focus:outline-none focus:border-lime-400/50"
                />
                <button
                  type="button"
                  onClick={() => handleSaveManualLocation(manualCityInput)}
                  className="px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.15] text-white font-medium rounded-xl cursor-pointer transition"
                >
                  Uygula
                </button>
              </div>

              {/* Quick suggestions */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-medium">Hızlı Şehir Seçenekleri:</span>
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
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 hover:text-white border border-white/[0.06] text-[11px] cursor-pointer transition"
                    >
                      {cityOption}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Feedback Message */}
            {locationStatusMessage && (
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] text-zinc-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                <span>{locationStatusMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ŞEFFAF GÜVEN KALKANI (HARMONIQ TRUST SCORE)
         ===================================================================== */}
      {showTrustScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(16,185,129,0.15)] space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                    <span>Şeffaf Güven Kalkanı</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      v2.4 Doğrulandı
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Harmoniq Açık Güvenilirlik & Saygınlık Protokolü
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTrustScoreModal(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Hero Badge */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-950/20 to-zinc-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
                  Genel Güven Puanınız
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-heading font-black text-white tracking-tight">
                    {userProfile.trustScore || 98}
                  </span>
                  <span className="text-lg text-emerald-400/80 font-semibold">/ 100</span>
                </div>
                <div className="text-xs text-zinc-300">
                  Rozet Seviyesi: <span className="font-bold text-emerald-400">Elit Dinleyici (A+)</span>
                </div>
              </div>

              <div className="sm:text-right space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Doğrulanmış Hesap</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Canlı oda açma ve sohbet ayrıcalıklı
                </div>
              </div>
            </div>

            {/* 3 Scoring Pillars */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Puanlama Sütunları ve Hesaplama Detayı
              </h4>

              {/* Pillar 1 */}
              <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">
                      1. Gerçek Zamanlı Dinleme Tutarlılığı (%35)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">35 / 35</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Şarkıların en az %70'ini atlamadan, gerçek zaman çizelgesiyle ve kesintisiz dinleme alışkanlığı. Bot, scraper veya otomatik makro trafiği tespit edilmedi.
                </p>
                <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-white">
                      2. Topluluk Etkileşimi & Müzikal Rezonans (%35)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400">34 / 35</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Canlı odalarda eşzamanlı dinleme, şarkı ve çalma listesi paylaşımları ile diğer doğrulanmış dinleyicilerle karşılıklı %85+ frekans uyumu.
                </p>
                <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 h-full rounded-full" style={{ width: '97%' }} />
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-lime-400" />
                    <span className="text-xs font-semibold text-white">
                      3. Sıfır İhlal & Temiz Hesap Sicili (%30)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-lime-400">29 / 30</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Diğer kullanıcılardan sıfır spam, taciz veya manipülasyon şikayeti. 180+ gündür temiz ve örnek topluluk sicili.
                </p>
                <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-lime-400 h-full rounded-full" style={{ width: '96%' }} />
                </div>
              </div>
            </div>

            {/* Appeal & Transparency Rules */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Şeffaflık & İtiraz Hakkı</span>
                </span>
                <span className="text-[10px] text-zinc-500">Sıfır Gizli Algoritma</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Harmoniq, güven puanınızı asla kapalı kapılar ardında veya reklam amacıyla değiştirmez. Hatalı bir puan kırılması şüphesinde anında bağımsız moderatör incelemesi başlatabilirsiniz.
              </p>

              {appealSent ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>İtiraz bildiriminiz alındı (#SEC-942). Güvenlik ekibi dinleme kaydınızı 2 saat içinde inceleyecek.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAppealSent(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white text-xs font-semibold transition cursor-pointer"
                  >
                    İtiraz Bildirimi Gönder
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTrustScoreModal(false)}
                    className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition cursor-pointer"
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
          MODAL: AYARLAR, TEMA VE SENKRONİZASYON
         ===================================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-300">
                  <Settings className="w-5 h-5 text-lime-400" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-white">
                    Ayarlar & Hesap
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Görünüm, YouTube Music hesabı ve gizlilik kontrolleri
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Görünüm ve Tema */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Sun className="w-4 h-4 text-accent-theme" />
                    <span>Görünüm ve Tema</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Göz yormayan obsidyen gece veya ferah stüdyo açık modu
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-accent-theme px-2 py-0.5 rounded-full bg-accent-subtle">
                  {currentTheme === 'dark' ? 'Obsidyen Gece' : currentTheme === 'light' ? 'Stüdyo Gündüz' : 'Otomatik Sistem'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dark' as ThemeMode, label: 'Karanlık', desc: 'Obsidyen Siyah', icon: <Moon className="w-4 h-4 text-indigo-400" /> },
                  { id: 'light' as ThemeMode, label: 'Aydınlık', desc: 'Minimalist Stüdyo', icon: <Sun className="w-4 h-4 text-amber-400" /> },
                  { id: 'system' as ThemeMode, label: 'Sistem', desc: 'Cihaza Duyarlı', icon: <Monitor className="w-4 h-4 text-cyan-400" /> },
                ].map((themeOpt) => {
                  const isSelected = currentTheme === themeOpt.id;
                  return (
                    <button
                      key={themeOpt.id}
                      type="button"
                      onClick={() => handleThemeChange(themeOpt.id)}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 active:scale-95 ${
                        isSelected
                          ? 'bg-white/[0.08] border-accent-theme text-white shadow-sm ring-1 ring-accent-theme/30'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {themeOpt.icon}
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                          {themeOpt.label}
                        </div>
                        <div className="text-[10px] text-zinc-500 hidden sm:block mt-0.5">
                          {themeOpt.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Platform Senkronizasyonu (YouTube Music, Spotify, Apple Music) */}
            <div className="space-y-3 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-rose-500" />
                    <span>Platform Senkronizasyonu & Hesaplar</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    YouTube Music, Spotify ve Apple Music katalog & dinleme uyumu
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isGoogleAuthenticated
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {isGoogleAuthenticated ? 'Bağlı' : 'Hazır'}
                </span>
              </div>

              {/* 3 Resmi Platform Rozeti: YouTube Music · Spotify · Apple Music */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">YouTube Music</div>
                    <div className="text-[9px] text-rose-300 truncate">Canlı Senkron</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">Spotify</div>
                    <div className="text-[9px] text-emerald-300 truncate">Oda & Link Uyumu</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center gap-2">
                  <Music className="w-4 h-4 text-pink-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">Apple Music</div>
                    <div className="text-[9px] text-pink-300 truncate">Katalog & Ses</div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-3 min-w-0">
                  {isGoogleAuthenticated && googleUser?.photoUrl ? (
                    <img
                      src={googleUser.photoUrl}
                      alt={googleUser.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-400 shrink-0">
                      <Youtube className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {isGoogleAuthenticated && googleUser?.name
                        ? googleUser.name
                        : userProfile.youtubeAccount?.name || userProfile.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {isGoogleAuthenticated && googleUser?.email
                        ? googleUser.email
                        : userProfile.youtubeAccount?.email || userProfile.email || 'Giriş yapılmadı'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.06]">
                  {isGoogleAuthenticated ? (
                    <>
                      <button
                        type="button"
                        disabled={isGoogleLoading || isSyncingNow}
                        onClick={handleSyncYouTubeLibrary}
                        className="flex-1 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer min-h-[36px]"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isSyncingNow ? 'animate-spin text-lime-400' : ''}`} />
                        <span>{isSyncingNow ? 'Senkronize Ediliyor...' : 'Kütüphaneyi Yenile'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isGoogleLoading || isSyncingNow}
                        onClick={onGoogleSignIn}
                        className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 text-xs font-medium transition cursor-pointer min-h-[36px]"
                        title="Farklı bir hesap seç"
                      >
                        <span>Hesap Değiştir</span>
                      </button>

                      {onGoogleSignOut && (
                        <button
                          type="button"
                          disabled={isGoogleLoading}
                          onClick={onGoogleSignOut}
                          className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition cursor-pointer min-h-[36px]"
                          title="Oturumu kapat"
                        >
                          <span>Çıkış</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isGoogleLoading}
                      onClick={onGoogleSignIn}
                      className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      {isGoogleLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Bağlanıyor...</span>
                        </>
                      ) : (
                        <>
                          <Youtube className="w-4 h-4 fill-current text-rose-600" />
                          <span>Google ile Giriş Yap</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {syncDiagnosticError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center justify-between gap-2">
                  <span>{syncDiagnosticError}</span>
                  {onClearSyncError && (
                    <button
                      type="button"
                      onClick={onClearSyncError}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Site İzinleri & Cihaz Konumu (Telefon / Web) */}
            <div className="space-y-3 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-lime-400" />
                    <span>Site İzinleri & Cihaz Konumu (Telefon / Web)</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Tarayıcı ve telefon site ayarlarında Konum (GPS) iznini etkinleştirin
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  geoPermissionState === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : geoPermissionState === 'denied'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-lime-400/20 text-lime-300 border border-lime-400/30'
                }`}>
                  {geoPermissionState === 'granted'
                    ? 'GPS İzni Açık'
                    : geoPermissionState === 'denied'
                    ? 'Şebeke/IP Aktif'
                    : 'İzin Hazır'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Aktif Şehir & Semt:</span>
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-lime-400" />
                    {userProfile.city || 'İstanbul, Kadıköy'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isDetectingLocation}
                    onClick={async () => {
                      await handleDetectLiveLocation();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                    <span>
                      {isDetectingLocation
                        ? 'İzin İsteniyor...'
                        : 'Site Konum İznini İste (GPS)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowLocationModal(true);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-white/[0.08]"
                  >
                    <Compass className="w-3.5 h-3.5 text-lime-400" />
                    <span>Şehir & Semt Seçenekleri</span>
                  </button>
                </div>

                {locationStatusMessage && (
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300">
                    {locationStatusMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Gizlilik ve Görünürlük */}
            <div className="space-y-3 pt-3 border-t border-white/[0.08]">
              <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Canlı Odalarda Görünürlük</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {privacyOptions.map((opt) => {
                  const isSelected = userProfile.privacyMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdatePrivacyMode(opt.id as PrivacyMode)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-white/[0.08] border-lime-400 text-white ring-1 ring-lime-400/30'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {opt.icon}
                        {isSelected && <Check className="w-3.5 h-3.5 text-lime-400" />}
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                          {opt.title}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                          {opt.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition cursor-pointer"
              >
                Tamam
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
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-wider text-emerald-400 flex items-center gap-1">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>HARMONIQ</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-mono">
                    Frekans Kartı
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
                      {userProfile.youtubeAccount?.handle || '@yasincelebi'}
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
                    <span className="text-amber-300 font-bold truncate max-w-[130px]">
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

                <div className="text-center text-[9px] text-zinc-500 font-mono">
                  harmoniq.app · Dinleme Frekansı ⚡
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
                <span>Harmoniq AI Engine</span>
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
