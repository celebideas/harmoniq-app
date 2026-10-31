export type PlatformType = 'youtube_music' | 'spotify' | 'apple_music' | 'deezer';

export type RoomScope = 'track' | 'artist' | 'genre';

export type IntentType = 'music_discovery' | 'concert_buddy' | 'romantic' | 'jam_band';

export type PrivacyMode = 'public' | 'friends_only' | 'private';

export type FriendStatus = 'none' | 'pending' | 'friends';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  city: string;
  avatarSeed: string;
  avatarGradient: string;
  avatarUrl?: string; // Custom uploaded or preset profile picture
  bio: string;
  email?: string;
  currentSong: Song;
  songProgressSeconds: number;
  isListeningNow: boolean;
  lastActiveMinutesAgo: number;
  isSpotifyVerified: boolean;
  isYouTubeConnected?: boolean;
  youtubeAccount?: {
    email: string;
    handle: string;
    name: string;
  };
  intent: IntentType;
  topArtists: string[];
  topGenres: string[];
  compatibilityScore: number;
  sharedArtists: string[];
  sharedGenres: string[];
  trustScore: number;
  isOnline: boolean;
  distanceKm: number;
  privacyMode: PrivacyMode;
  syncedPlaylists?: UserPlaylist[];
  personalTaste?: PersonalMusicTaste;
  isTasteSynced?: boolean;
  friendsCount?: number;
  allowExplicit?: boolean;
}

export interface SubscribedChannelDetail {
  channelId: string;
  name: string;
  rawTitle: string;
  isMusicArtist: boolean;
  reason: string;
  thumbnailUrl?: string;
}

export interface UserPlaylist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  trackCount: number;
  duration: string;
  genre: string;
  source: 'youtube_music' | 'spotify' | 'custom';
  tracks: Song[];
  isFavorite?: boolean;
  updatedAt?: string;
}

export interface PersonalMusicTaste {
  syncedAt: string;
  accountName: string;
  accountHandle: string;
  totalPlaylistsCount: number;
  totalTracksAnalyzed: number;
  topArtists: string[];
  topGenres: string[];
  tasteAffinityTags: string[];
  listeningStats: {
    favoriteDecade: string;
    avgBpm: number;
    vibeDescription: string;
    weeklyMinutes: number;
  };
  feedSettings: {
    useForRoomMatching: boolean;
    feedEndlessRadio: boolean;
    showPlaylistsInProfile: boolean;
  };
}

export interface TimelineMarker {
  second: number;
  label: string;
  emoji: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  rawMediaTitle: string; // e.g. "Duman - Kırmış Kalbini (Official Video) 4K"
  coverGradient: string;
  coverUrl?: string; // Official Album Art
  durationSeconds: number;
  bpm: number;
  keyNote: string;
  catalogNumber: string;
  releaseYear: number;
  soundType: 'indie' | 'synthwave' | 'anatolian' | 'lofi' | 'rock' | 'grunge';
  timelineMarkers: TimelineMarker[];
  lyrics?: { second: number; text: string }[];
  youtubeVideoId?: string;
  audioUrl?: string;
  isExplicit?: boolean;
}

export interface SongPrediction {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  previewUrl?: string;
  isExplicit?: boolean;
  durationSeconds?: number;
  genre?: string;
  source?: 'apple_music' | 'youtube' | 'preset' | 'artist';
  youtubeVideoId?: string;
  isArtistProfile?: boolean;
  artistBio?: string;
  topTracks?: string[];
}

export interface LoungeUser {
  id: string;
  name: string;
  age: number;
  city: string;
  avatarSeed: string;
  avatarGradient: string;
  avatarUrl?: string;
  platform: PlatformType;
  currentSecond: number;
  statusBubble?: string;
  topArtists: string[];
  bio: string;
  trustScore: number;
  lastHeartbeatAgoSeconds: number;
  isOnline: boolean;
  distanceKm: number;
  privacyMode?: PrivacyMode;
  friendStatus?: FriendStatus;
  statusLikesCount?: number;
  hasLikedStatus?: boolean;
  compatibilityScore?: number;
  sharedWithUserArtists?: string[];
  currentSong?: Song;
}

export interface FriendRequest {
  id: string;
  fromUser: LoungeUser;
  timestamp: string;
  songContext?: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  xPercent: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isIcebreaker?: boolean;
  sharedTimestampSecond?: number;
  sharedSong?: Song;
}

export interface LoungeConversation {
  matchId: string;
  user: LoungeUser;
  matchedTrack: Song;
  matchedSecond: number;
  matchedPlatform: PlatformType;
  contextBanner: string; // e.g. "İkiniz de YouTube Music'te Duman - Kırmış Kalbini dinlerken (01:42'de) buluştunuz"
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface ComplaintSolution {
  id: string;
  problemTitle: string;
  makroProblem: string;
  harmoniqSolution: string;
  category: 'ban' | 'bots' | 'intent' | 'chat' | 'matching' | 'paywall';
  badgeText: string;
}

