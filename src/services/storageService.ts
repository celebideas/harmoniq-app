/**
 * LocalStorage Quota Protection & Compact Schema Service
 * Prevents 5MB LocalStorage overflow (QuotaExceededError) when syncing
 * hundreds of tracks/playlists from YouTube Music.
 */

import { Song, UserPlaylist, SubscribedChannelDetail } from '../types';

export const STORAGE_KEYS = {
  PLAYLISTS: 'harmoniq_user_playlists',
  FAVORITE_SONGS: 'harmoniq_user_favorite_songs',
  FAVORITE_ARTISTS: 'harmoniq_user_favorite_artists',
  ACCOUNT: 'harmoniq_user_account',
  AVATAR: 'harmoniq_user_avatar',
  BIO: 'harmoniq_user_bio',
  CITY: 'harmoniq_user_city',
  SUBSCRIBED_CHANNELS: 'harmoniq_user_subscribed_channels',
} as const;

/**
 * Compact Song Schema: keeps only essential fields needed for playback,
 * UI rendering and offline queue, removing bulky debug strings and raw payloads.
 */
export function compactSong(song: Song): Song {
  return {
    id: song.id,
    title: song.title.slice(0, 100),
    artist: song.artist.slice(0, 80),
    album: (song.album || song.title).slice(0, 80),
    genre: (song.genre || 'Indie').slice(0, 40),
    rawMediaTitle: song.rawMediaTitle || `${song.artist} - ${song.title}`,
    catalogNumber: song.catalogNumber || 'HRM-001',
    releaseYear: song.releaseYear || 2024,
    coverUrl: song.coverUrl,
    coverGradient: song.coverGradient || 'from-indigo-600 to-purple-600',
    durationSeconds: song.durationSeconds || 215,
    youtubeVideoId: song.youtubeVideoId,
    audioUrl: song.audioUrl,
    bpm: song.bpm || 110,
    keyNote: song.keyNote || 'Am',
    soundType: song.soundType || 'indie',
    timelineMarkers: song.timelineMarkers && song.timelineMarkers.length > 0 ? song.timelineMarkers.slice(0, 6) : [],
    lyrics: song.lyrics ? song.lyrics.slice(0, 100) : undefined,
  };
}

/**
 * Compact Playlist Schema: compacts all tracks and bounds count to prevent memory leaks.
 */
export function compactPlaylist(playlist: UserPlaylist): UserPlaylist {
  const compactedTracks = (playlist.tracks || []).slice(0, 100).map(compactSong);
  return {
    id: playlist.id,
    title: playlist.title.slice(0, 100),
    description: playlist.description || 'Harmoniq listesi',
    genre: playlist.genre || 'Karışık',
    source: playlist.source || 'youtube_music',
    coverUrl: playlist.coverUrl,
    trackCount: playlist.trackCount || compactedTracks.length,
    duration: playlist.duration || '42 dk',
    tracks: compactedTracks,
    isFavorite: playlist.isFavorite,
    updatedAt: playlist.updatedAt,
  };
}

/**
 * Compact Channel Schema
 */
export function compactChannel(channel: SubscribedChannelDetail): SubscribedChannelDetail {
  return {
    channelId: channel.channelId,
    name: channel.name.slice(0, 80),
    rawTitle: channel.rawTitle ? channel.rawTitle.slice(0, 80) : channel.name.slice(0, 80),
    isMusicArtist: channel.isMusicArtist,
    reason: channel.reason ? channel.reason.slice(0, 60) : '',
    thumbnailUrl: channel.thumbnailUrl,
  };
}

/**
 * Purge non-critical cached data if storage quota is running low or exceeded
 */
function emergencyPurgeStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    // 1. Remove bulky channel metadata first (can be re-queried)
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIBED_CHANNELS);

    // 2. Trim stored songs if excessive (keep latest 150 items)
    const rawSongs = localStorage.getItem(STORAGE_KEYS.FAVORITE_SONGS);
    if (rawSongs) {
      const parsed: Song[] = JSON.parse(rawSongs);
      if (parsed.length > 150) {
        localStorage.setItem(STORAGE_KEYS.FAVORITE_SONGS, JSON.stringify(parsed.slice(0, 150).map(compactSong)));
      }
    }

    // 3. Trim playlists track lists if needed
    const rawPlaylists = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    if (rawPlaylists) {
      const parsed: UserPlaylist[] = JSON.parse(rawPlaylists);
      const trimmed = parsed.slice(0, 20).map(compactPlaylist);
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(trimmed));
    }
  } catch (err) {
    console.warn('[Harmoniq Storage] Emergency purge notice:', err);
  }
}

/**
 * Safe LocalStorage setter with QuotaExceededError recovery & schema compression
 */
export function safeLocalStorageSet(key: string, data: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    let payload = data;

    // Apply smart schema compression based on key
    if (key === STORAGE_KEYS.FAVORITE_SONGS && Array.isArray(data)) {
      payload = data.slice(0, 300).map(compactSong);
    } else if (key === STORAGE_KEYS.PLAYLISTS && Array.isArray(data)) {
      payload = data.slice(0, 30).map(compactPlaylist);
    } else if (key === STORAGE_KEYS.SUBSCRIBED_CHANNELS && Array.isArray(data)) {
      payload = data.slice(0, 150).map(compactChannel);
    } else if (key === STORAGE_KEYS.FAVORITE_ARTISTS && Array.isArray(data)) {
      payload = data.slice(0, 200);
    }

    const serialized = JSON.stringify(payload);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014;

    if (isQuotaError) {
      console.warn('[Harmoniq Storage] LocalStorage quota exceeded, executing emergency purge...');
      emergencyPurgeStorage();

      // Retry once with minimal payload
      try {
        let minimalPayload = data;
        if (Array.isArray(data)) {
          minimalPayload = data.slice(0, 50).map((item) => (typeof item === 'object' && item.title ? compactSong(item) : item));
        }
        localStorage.setItem(key, JSON.stringify(minimalPayload));
        return true;
      } catch (retryErr) {
        console.error('[Harmoniq Storage] Storage write failed after quota purge:', retryErr);
        return false;
      }
    }

    console.warn('[Harmoniq Storage] Unexpected localStorage write error:', err);
    return false;
  }
}

/**
 * Safe LocalStorage getter with JSON parsing and fallback
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Harmoniq Storage] Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}
