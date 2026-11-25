/**
 * Real-Time Listening History & Analytics Service
 * Persists genuine playback pulses and scrobbles into localStorage (`listenhub_play_history`)
 * and notifies subscribers live so Profile Weekly Insights & Musical Aura update in real time.
 */

import { Song } from '../types';

export const PLAY_HISTORY_STORAGE_KEY = 'listenhub_play_history';
const HISTORY_UPDATED_EVENT = 'listenhub:play-history-updated';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface TrackPlayRecord {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre: string;
  coverUrl?: string;
  coverGradient?: string;
  durationSeconds: number;
  audioUrl?: string;
  youtubeVideoId?: string;
  playedSeconds: number;
  playCount: number;
  lastPlayedAt: number;
}

export interface ArtistPlayRecord {
  name: string;
  playedSeconds: number;
  playCount: number;
  lastPlayedAt: number;
  sampleTrackId?: string;
}

export interface GenrePlayRecord {
  genre: string;
  playedSeconds: number;
  playCount: number;
}

export interface PlayPulseEvent {
  trackId: string;
  title: string;
  artist: string;
  genre: string;
  seconds: number;
  isScrobble?: boolean;
  timestamp: number;
}

export interface ListeningHistoryStore {
  totalPlayedSeconds: number;
  totalScrobbles: number;
  tracks: Record<string, TrackPlayRecord>;
  artists: Record<string, ArtistPlayRecord>;
  genres: Record<string, GenrePlayRecord>;
  events: PlayPulseEvent[];
  updatedAt: number;
}

const GENERIC_GENRES = new Set([
  '',
  'youtube music',
  'favoriler',
  'genel',
  'audio',
  'müzik',
  'music',
  'bilinmeyen',
]);

export function resolveSongGenre(song: Song): string {
  const raw = (song.genre || '').trim();
  if (raw && !GENERIC_GENRES.has(raw.toLowerCase())) {
    return raw;
  }

  // Gentle inference from known artist/soundType when metadata omits genre
  const artistLower = (song.artist || '').toLowerCase();
  if (
    artistLower.includes('duman') ||
    artistLower.includes('mor ve ötesi') ||
    artistLower.includes('teoman') ||
    artistLower.includes('kaan tangöze') ||
    artistLower.includes('adamlar') ||
    artistLower.includes('manga') ||
    artistLower.includes('athena') ||
    artistLower.includes('şebnem ferah')
  ) {
    return 'Türkçe Rock';
  }
  if (
    artistLower.includes('jakuzi') ||
    artistLower.includes('she past away') ||
    artistLower.includes('molchat doma') ||
    artistLower.includes('depeche mode') ||
    artistLower.includes('the weeknd') ||
    artistLower.includes('kavinsky')
  ) {
    return 'Synthwave & Darkwave';
  }
  if (
    artistLower.includes('arctic monkeys') ||
    artistLower.includes('tame impala') ||
    artistLower.includes('radiohead') ||
    artistLower.includes('the neighbourhood') ||
    artistLower.includes('cigarettes after sex') ||
    artistLower.includes('büyük ev ablukada') ||
    artistLower.includes('yüzyüzeyken')
  ) {
    return 'Alternatif & Indie';
  }
  if (
    artistLower.includes('altın gün') ||
    artistLower.includes('barış manço') ||
    artistLower.includes('cem karaca') ||
    artistLower.includes('erkin koray')
  ) {
    return 'Anadolu Rock';
  }

  switch (song.soundType) {
    case 'synthwave':
      return 'Synthwave & Elektronik';
    case 'indie':
      return 'Alternatif & Indie';
    case 'lofi':
      return 'Akustik & Lo-Fi';
    case 'anatolian':
      return 'Anadolu Rock';
    case 'rock':
    case 'grunge':
      return 'Rock';
    default:
      return 'Alternatif & Pop';
  }
}

function createEmptyStore(): ListeningHistoryStore {
  return {
    totalPlayedSeconds: 0,
    totalScrobbles: 0,
    tracks: {},
    artists: {},
    genres: {},
    events: [],
    updatedAt: Date.now(),
  };
}

function buildTrackKey(song: Song): string {
  const title = (song.title || '').trim().toLowerCase();
  const artist = (song.artist || '').trim().toLowerCase();
  if (title && artist) return `${artist}::${title}`;
  return song.id || `track-${Date.now()}`;
}

export function getListeningHistory(): ListeningHistoryStore {
  if (typeof window === 'undefined') return createEmptyStore();
  try {
    const raw = localStorage.getItem(PLAY_HISTORY_STORAGE_KEY);
    if (!raw) return createEmptyStore();
    const parsed = JSON.parse(raw) as Partial<ListeningHistoryStore>;
    return {
      totalPlayedSeconds: typeof parsed.totalPlayedSeconds === 'number' ? parsed.totalPlayedSeconds : 0,
      totalScrobbles: typeof parsed.totalScrobbles === 'number' ? parsed.totalScrobbles : 0,
      tracks: parsed.tracks && typeof parsed.tracks === 'object' ? parsed.tracks : {},
      artists: parsed.artists && typeof parsed.artists === 'object' ? parsed.artists : {},
      genres: parsed.genres && typeof parsed.genres === 'object' ? parsed.genres : {},
      events: Array.isArray(parsed.events) ? parsed.events : [],
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return createEmptyStore();
  }
}

function saveListeningHistory(store: ListeningHistoryStore): void {
  if (typeof window === 'undefined') return;
  try {
    // Prune events older than 7 days and cap at 600 entries to stay lightweight
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const prunedEvents = store.events.filter((ev) => ev.timestamp >= cutoff).slice(-600);
    const toPersist: ListeningHistoryStore = {
      ...store,
      events: prunedEvents,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PLAY_HISTORY_STORAGE_KEY, JSON.stringify(toPersist));
    window.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Record incremental listening seconds (called every ~5s during active playback)
 */
export function recordListeningPulse(song: Song, deltaSeconds: number): void {
  if (!song || !song.title || deltaSeconds <= 0) return;

  const safeDelta = Math.min(30, Math.round(deltaSeconds));
  const store = getListeningHistory();
  const now = Date.now();
  const trackKey = buildTrackKey(song);
  const artistName = (song.artist || 'Bilinmeyen Sanatçı').trim();
  const artistKey = artistName.toLowerCase();
  const genreName = resolveSongGenre(song);
  const genreKey = genreName.toLowerCase();

  store.totalPlayedSeconds += safeDelta;

  const existingTrack = store.tracks[trackKey];
  store.tracks[trackKey] = {
    id: song.id,
    title: song.title,
    artist: artistName,
    album: song.album,
    genre: genreName,
    coverUrl: song.coverUrl || existingTrack?.coverUrl,
    coverGradient: song.coverGradient || existingTrack?.coverGradient,
    durationSeconds: song.durationSeconds || existingTrack?.durationSeconds || 210,
    audioUrl: song.audioUrl || existingTrack?.audioUrl,
    youtubeVideoId: song.youtubeVideoId || existingTrack?.youtubeVideoId,
    playedSeconds: (existingTrack?.playedSeconds || 0) + safeDelta,
    playCount: existingTrack?.playCount || 0,
    lastPlayedAt: now,
  };

  const existingArtist = store.artists[artistKey];
  store.artists[artistKey] = {
    name: existingArtist?.name || artistName,
    playedSeconds: (existingArtist?.playedSeconds || 0) + safeDelta,
    playCount: existingArtist?.playCount || 0,
    lastPlayedAt: now,
    sampleTrackId: existingArtist?.sampleTrackId || trackKey,
  };

  const existingGenre = store.genres[genreKey];
  store.genres[genreKey] = {
    genre: existingGenre?.genre || genreName,
    playedSeconds: (existingGenre?.playedSeconds || 0) + safeDelta,
    playCount: existingGenre?.playCount || 0,
  };

  store.events.push({
    trackId: trackKey,
    title: song.title,
    artist: artistName,
    genre: genreName,
    seconds: safeDelta,
    isScrobble: false,
    timestamp: now,
  });

  saveListeningHistory(store);
}

/**
 * Record a full track play/scrobble once a song has been listened to >= 10 seconds
 */
export function recordTrackScrobble(song: Song): void {
  if (!song || !song.title) return;

  const store = getListeningHistory();
  const now = Date.now();
  const trackKey = buildTrackKey(song);
  const artistName = (song.artist || 'Bilinmeyen Sanatçı').trim();
  const artistKey = artistName.toLowerCase();
  const genreName = resolveSongGenre(song);
  const genreKey = genreName.toLowerCase();

  store.totalScrobbles += 1;

  const existingTrack = store.tracks[trackKey];
  store.tracks[trackKey] = {
    id: song.id,
    title: song.title,
    artist: artistName,
    album: song.album,
    genre: genreName,
    coverUrl: song.coverUrl || existingTrack?.coverUrl,
    coverGradient: song.coverGradient || existingTrack?.coverGradient,
    durationSeconds: song.durationSeconds || existingTrack?.durationSeconds || 210,
    audioUrl: song.audioUrl || existingTrack?.audioUrl,
    youtubeVideoId: song.youtubeVideoId || existingTrack?.youtubeVideoId,
    playedSeconds: existingTrack?.playedSeconds || 10,
    playCount: (existingTrack?.playCount || 0) + 1,
    lastPlayedAt: now,
  };

  const existingArtist = store.artists[artistKey];
  store.artists[artistKey] = {
    name: existingArtist?.name || artistName,
    playedSeconds: existingArtist?.playedSeconds || 10,
    playCount: (existingArtist?.playCount || 0) + 1,
    lastPlayedAt: now,
    sampleTrackId: trackKey,
  };

  const existingGenre = store.genres[genreKey];
  store.genres[genreKey] = {
    genre: existingGenre?.genre || genreName,
    playedSeconds: existingGenre?.playedSeconds || 10,
    playCount: (existingGenre?.playCount || 0) + 1,
  };

  store.events.push({
    trackId: trackKey,
    title: song.title,
    artist: artistName,
    genre: genreName,
    seconds: 0,
    isScrobble: true,
    timestamp: now,
  });

  saveListeningHistory(store);
}

export function clearListeningHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PLAY_HISTORY_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT));
  } catch {
    // ignore
  }
}

export function subscribeListeningHistory(callback: (history: ListeningHistoryStore) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback(getListeningHistory());
  const storageHandler = (e: StorageEvent) => {
    if (e.key === PLAY_HISTORY_STORAGE_KEY) {
      callback(getListeningHistory());
    }
  };
  window.addEventListener(HISTORY_UPDATED_EVENT, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(HISTORY_UPDATED_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

/**
 * Compute authentic 7-day weekly summary from real listenhub_play_history
 */
export function computeWeeklyHistoryStats(history: ListeningHistoryStore) {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const recentEvents = history.events.filter((e) => e.timestamp >= cutoff);

  let weeklySeconds = 0;
  let weeklyScrobbles = 0;
  const artistMap = new Map<string, { name: string; seconds: number; plays: number; sampleTrack?: TrackPlayRecord }>();
  const genreMap = new Map<string, { genre: string; seconds: number; plays: number }>();
  const trackMap = new Map<string, { record: TrackPlayRecord; seconds: number; plays: number }>();

  for (const ev of recentEvents) {
    weeklySeconds += ev.seconds;
    if (ev.isScrobble) weeklyScrobbles += 1;

    const aKey = ev.artist.toLowerCase();
    const curA = artistMap.get(aKey) || {
      name: ev.artist,
      seconds: 0,
      plays: 0,
      sampleTrack: history.tracks[ev.trackId],
    };
    curA.seconds += ev.seconds;
    if (ev.isScrobble) curA.plays += 1;
    if (!curA.sampleTrack && history.tracks[ev.trackId]) {
      curA.sampleTrack = history.tracks[ev.trackId];
    }
    artistMap.set(aKey, curA);

    const gKey = ev.genre.toLowerCase();
    const curG = genreMap.get(gKey) || { genre: ev.genre, seconds: 0, plays: 0 };
    curG.seconds += ev.seconds;
    if (ev.isScrobble) curG.plays += 1;
    genreMap.set(gKey, curG);

    const trackRec = history.tracks[ev.trackId];
    if (trackRec) {
      const curT = trackMap.get(ev.trackId) || { record: trackRec, seconds: 0, plays: 0 };
      curT.seconds += ev.seconds;
      if (ev.isScrobble) curT.plays += 1;
      trackMap.set(ev.trackId, curT);
    }
  }

  // Fallback to aggregate history totals if events array was trimmed but aggregate exists
  if (weeklySeconds === 0 && history.totalPlayedSeconds > 0) {
    weeklySeconds = history.totalPlayedSeconds;
    weeklyScrobbles = history.totalScrobbles;

    Object.values(history.tracks).forEach((t) => {
      const key = `${t.artist.toLowerCase()}::${t.title.toLowerCase()}`;
      trackMap.set(key, { record: t, seconds: t.playedSeconds, plays: t.playCount });
    });
    Object.values(history.artists).forEach((a) => {
      artistMap.set(a.name.toLowerCase(), {
        name: a.name,
        seconds: a.playedSeconds,
        plays: a.playCount,
        sampleTrack: a.sampleTrackId ? history.tracks[a.sampleTrackId] : undefined,
      });
    });
    Object.values(history.genres).forEach((g) => {
      genreMap.set(g.genre.toLowerCase(), {
        genre: g.genre,
        seconds: g.playedSeconds,
        plays: g.playCount,
      });
    });
  }

  const topTracks = Array.from(trackMap.values()).sort(
    (a, b) => b.plays - a.plays || b.seconds - a.seconds
  );

  const topArtists = Array.from(artistMap.values()).sort(
    (a, b) => b.seconds - a.seconds || b.plays - a.plays
  );

  const topGenres = Array.from(genreMap.values()).sort(
    (a, b) => b.seconds - a.seconds || b.plays - a.plays
  );

  return {
    weeklySeconds,
    weeklyScrobbles,
    topTracks,
    topArtists,
    topGenres,
  };
}
