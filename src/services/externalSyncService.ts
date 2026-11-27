import { Song } from '../types';
import { soundEngine } from './soundEngine';

export type ExternalPlaybackSource =
  | 'spotify_api'
  | 'chrome_extension'
  | 'android_bridge';

export interface ExternalPlaybackState {
  source: ExternalPlaybackSource;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  durationSec: number;
  currentSecond: number;
  isPlaying: boolean;
  updatedAt: number;
}

export interface ExternalSyncChannelStatus {
  spotifyConnected: boolean;
  spotifyDisplayName?: string;
  spotifyLastSyncAt: number | null;
  chromeExtensionConnected: boolean;
  chromeExtensionLastPingAt: number | null;
  androidBridgeAvailable: boolean;
  androidBridgeLive: boolean;
  androidBridgeLastSyncAt: number | null;
  activeSource: ExternalPlaybackSource | null;
  externalPlaybackActive: boolean;
}

export interface ExternalPlaybackSnapshot {
  active: boolean;
  state: ExternalPlaybackState | null;
  channels: ExternalSyncChannelStatus;
}

declare global {
  interface Window {
    ListenHubNative?: {
      onPlaybackUpdate: (state: Partial<ExternalPlaybackState>) => void;
    };
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

const EXTENSION_ACTIVE_TTL_MS = 180_000; // 3 minutes freshness after ping/playback
const ANDROID_ACTIVE_TTL_MS = 180_000;

function sanitizeText(val: unknown, maxLen = 180): string {
  if (typeof val !== 'string') return '';
  return val.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function sanitizeImageUrl(val: unknown): string | undefined {
  if (typeof val !== 'string' || !val.trim()) return undefined;
  try {
    const parsed = new URL(val.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // ignore invalid URLs
  }
  return undefined;
}

function sanitizePositiveNumber(val: unknown, fallback = 0): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

function normalizeTrackSignature(source: ExternalPlaybackSource, title: string, artist: string): string {
  return `${source}::${title.toLowerCase().trim()}::${artist.toLowerCase().trim()}`;
}

function slugifyId(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function getExternalSourceLabel(source: ExternalPlaybackSource | null): string {
  switch (source) {
    case 'spotify_api':
      return "Spotify'dan Canlı Senkron";
    case 'chrome_extension':
      return "YouTube'dan Canlı Senkron (Eklenti)";
    case 'android_bridge':
      return "Android'den Canlı Senkron";
    default:
      return '';
  }
}

export function externalStateToSong(
  state: ExternalPlaybackState,
  existingSong?: Song | null
): Song {
  const cleanTitle = state.title || 'Bilinmeyen Parça';
  const cleanArtist = state.artist || 'Bilinmeyen Sanatçı';
  const sameAsExisting =
    existingSong &&
    existingSong.title.toLowerCase().trim() === cleanTitle.toLowerCase().trim() &&
    existingSong.artist.toLowerCase().trim() === cleanArtist.toLowerCase().trim();

  const stableSlug = slugifyId(`${cleanArtist}-${cleanTitle}`) || 'external-track';
  const durationSeconds =
    state.durationSec > 5
      ? state.durationSec
      : sameAsExisting && existingSong?.durationSeconds
      ? existingSong.durationSeconds
      : 210;

  const sourceGradient =
    state.source === 'spotify_api'
      ? 'from-emerald-900 to-neutral-950'
      : state.source === 'chrome_extension'
      ? 'from-rose-900 to-neutral-950'
      : 'from-indigo-900 to-neutral-950';

  const sourceGenre =
    state.source === 'spotify_api'
      ? 'Spotify Canlı Senkron'
      : state.source === 'chrome_extension'
      ? 'YouTube Canlı Senkron'
      : 'Android Canlı Senkron';

  return {
    id: sameAsExisting && existingSong ? existingSong.id : `ext-${state.source}-${stableSlug}`,
    title: cleanTitle,
    artist: cleanArtist,
    album: state.album || (sameAsExisting ? existingSong?.album : undefined) || 'Canlı Senkron',
    genre: sameAsExisting && existingSong?.genre ? existingSong.genre : sourceGenre,
    rawMediaTitle: `${cleanArtist} - ${cleanTitle}`,
    coverGradient: sameAsExisting && existingSong?.coverGradient ? existingSong.coverGradient : sourceGradient,
    coverUrl: state.coverUrl || (sameAsExisting ? existingSong?.coverUrl : undefined),
    durationSeconds,
    bpm: sameAsExisting && existingSong?.bpm ? existingSong.bpm : 116,
    keyNote: sameAsExisting && existingSong?.keyNote ? existingSong.keyNote : 'A',
    catalogNumber: `EXT-${state.source.toUpperCase()}`,
    releaseYear: new Date().getFullYear(),
    soundType: sameAsExisting && existingSong?.soundType ? existingSong.soundType : 'rock',
    audioUrl: sameAsExisting ? existingSong?.audioUrl : undefined,
    youtubeVideoId: sameAsExisting ? existingSong?.youtubeVideoId : undefined,
    timelineMarkers:
      sameAsExisting && existingSong?.timelineMarkers?.length
        ? existingSong.timelineMarkers
        : [
            { second: Math.min(15, Math.floor(durationSeconds * 0.1)), label: 'Giriş', emoji: '⚡' },
            { second: Math.min(60, Math.floor(durationSeconds * 0.35)), label: 'Nakarat', emoji: '🔥' },
            { second: Math.min(120, Math.floor(durationSeconds * 0.65)), label: 'Vokal', emoji: '✨' },
          ],
  };
}

class ExternalSyncService {
  private externalPlaybackActive = false;
  private currentState: ExternalPlaybackState | null = null;
  private suppressedTrackSignature: string | null = null;

  private spotifyConnected = false;
  private spotifyDisplayName: string | undefined = undefined;
  private spotifyLastSyncAt: number | null = null;

  private chromeExtensionConnected = false;
  private chromeExtensionLastPingAt: number | null = null;

  private androidBridgeLive = false;
  private androidBridgeLastSyncAt: number | null = null;

  private stateSubscribers = new Set<(snapshot: ExternalPlaybackSnapshot) => void>();
  private initialized = false;

  constructor() {
    this.initBridges();
  }

  private detectAndroidNativeEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const cap = window.Capacitor;
      if (cap?.isNativePlatform?.() && cap.getPlatform?.() === 'android') {
        return true;
      }
      const ua = navigator.userAgent || '';
      if (/; wv\)/i.test(ua) && /Android/i.test(ua)) {
        return true;
      }
    } catch {
      // ignore detection error
    }
    return false;
  }

  private initBridges() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // 1. Register Global Android Native Bridge (Capacitor / NotificationListenerService)
    window.ListenHubNative = {
      onPlaybackUpdate: (rawState: Partial<ExternalPlaybackState>) => {
        if (!rawState || typeof rawState !== 'object') return;
        const title = sanitizeText(rawState.title);
        if (!title) return;
        const artist = sanitizeText(rawState.artist) || 'Bilinmeyen Sanatçı';
        this.pushExternalState({
          source: 'android_bridge',
          title,
          artist,
          album: sanitizeText(rawState.album) || undefined,
          coverUrl: sanitizeImageUrl(rawState.coverUrl),
          durationSec: sanitizePositiveNumber(rawState.durationSec, 210),
          currentSecond: sanitizePositiveNumber(rawState.currentSecond, 0),
          isPlaying: Boolean(rawState.isPlaying),
          updatedAt: sanitizePositiveNumber(rawState.updatedAt, Date.now()) || Date.now(),
        });
      },
    };

    // 2. Listen for Chrome Extension window.postMessage broadcasts
    window.addEventListener('message', (event: MessageEvent) => {
      // Extension content scripts execute in the same window context
      if (event.source !== window) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'LISTENHUB_EXT_PING') {
        this.markChromeExtensionConnected();
        return;
      }

      if (data.type === 'LISTENHUB_EXT_PLAYBACK') {
        const payload = (data.payload && typeof data.payload === 'object' ? data.payload : data) as Record<
          string,
          unknown
        >;
        this.markChromeExtensionConnected(false);

        const title = sanitizeText(payload.title);
        if (!title) {
          this.notify();
          return;
        }
        const artist = sanitizeText(payload.artist) || 'YouTube Music';
        this.pushExternalState({
          source: 'chrome_extension',
          title,
          artist,
          album: sanitizeText(payload.album) || undefined,
          coverUrl: sanitizeImageUrl(payload.coverUrl),
          durationSec: sanitizePositiveNumber(payload.durationSec, 210),
          currentSecond: sanitizePositiveNumber(payload.currentSecond, 0),
          isPlaying: Boolean(payload.isPlaying),
          updatedAt: sanitizePositiveNumber(payload.updatedAt, Date.now()) || Date.now(),
        });
      }
    });
  }

  public markChromeExtensionConnected(shouldNotify = true): void {
    const wasConnected = this.chromeExtensionConnected;
    this.chromeExtensionConnected = true;
    this.chromeExtensionLastPingAt = Date.now();
    if (shouldNotify && !wasConnected) {
      this.notify();
    } else if (shouldNotify) {
      this.notify();
    }
  }

  public setSpotifyConnectionStatus(connected: boolean, displayName?: string): void {
    this.spotifyConnected = connected;
    this.spotifyDisplayName = connected ? displayName : undefined;
    if (!connected && this.currentState?.source === 'spotify_api') {
      this.externalPlaybackActive = false;
      this.currentState = null;
      this.suppressedTrackSignature = null;
    }
    this.notify();
  }

  /**
   * Central ingestion point for Spotify API, Chrome Extension, and Android NotificationListenerService.
   * Enforces Double-Audio Conflict Protection by silently pausing ListenHub's internal soundEngine.
   */
  public pushExternalState(rawState: ExternalPlaybackState): void {
    const title = sanitizeText(rawState.title);
    if (!title) return;
    const artist = sanitizeText(rawState.artist) || 'Bilinmeyen Sanatçı';
    const durationSec = sanitizePositiveNumber(rawState.durationSec, 210) || 210;
    const currentSecond = Math.min(durationSec, sanitizePositiveNumber(rawState.currentSecond, 0));
    const now = Date.now();

    const sanitized: ExternalPlaybackState = {
      source: rawState.source,
      title,
      artist,
      album: sanitizeText(rawState.album) || undefined,
      coverUrl: sanitizeImageUrl(rawState.coverUrl),
      durationSec,
      currentSecond,
      isPlaying: Boolean(rawState.isPlaying),
      updatedAt: sanitizePositiveNumber(rawState.updatedAt, now) || now,
    };

    // Update source connectivity timestamps
    if (sanitized.source === 'spotify_api') {
      this.spotifyConnected = true;
      this.spotifyLastSyncAt = now;
    } else if (sanitized.source === 'chrome_extension') {
      this.chromeExtensionConnected = true;
      this.chromeExtensionLastPingAt = now;
    } else if (sanitized.source === 'android_bridge') {
      this.androidBridgeLive = true;
      this.androidBridgeLastSyncAt = now;
    }

    const incomingSig = normalizeTrackSignature(sanitized.source, sanitized.title, sanitized.artist);

    // If user manually took over ListenHub internal playback, do NOT hijack back on repeated polls of the same track
    if (this.suppressedTrackSignature) {
      if (this.suppressedTrackSignature === incomingSig) {
        this.notify();
        return;
      }
      // External source switched to a genuinely new track (and is playing) -> resume external sync!
      if (!sanitized.isPlaying) {
        this.notify();
        return;
      }
      this.suppressedTrackSignature = null;
    }

    // Ignore idle/paused initial poll if we weren't already tracking this source
    if (!this.externalPlaybackActive && !sanitized.isPlaying) {
      this.notify();
      return;
    }

    // CRITICAL DOUBLE-AUDIO CONFLICT LOCK:
    // Silently pause ListenHub's internal audio engine whenever external playback is active
    if (soundEngine.getIsPlaying()) {
      soundEngine.pause();
    }

    this.externalPlaybackActive = true;
    this.currentState = sanitized;
    this.notify();
  }

  /**
   * Called when external source reports nothing is playing (e.g., Spotify 204 No Content).
   */
  public notifyExternalIdle(source: ExternalPlaybackSource): void {
    if (source === 'spotify_api') {
      this.spotifyLastSyncAt = Date.now();
    }
    if (this.currentState?.source === source && this.externalPlaybackActive) {
      this.currentState = {
        ...this.currentState,
        isPlaying: false,
        updatedAt: Date.now(),
      };
      this.notify();
    }
  }

  /**
   * Cleanly releases external follow mode when the user manually plays a track inside ListenHub.
   * Suppresses re-hijacking on the currently polled external track until the external player starts a new song.
   */
  public releaseExternalControl(): void {
    if (!this.externalPlaybackActive && !this.currentState) return;
    if (this.currentState) {
      this.suppressedTrackSignature = normalizeTrackSignature(
        this.currentState.source,
        this.currentState.title,
        this.currentState.artist
      );
    }
    this.externalPlaybackActive = false;
    this.currentState = null;
    this.notify();
  }

  public isExternalPlaybackActive(): boolean {
    return this.externalPlaybackActive;
  }

  public getCurrentExternalState(): ExternalPlaybackState | null {
    return this.currentState;
  }

  public getChannelStatus(): ExternalSyncChannelStatus {
    const now = Date.now();
    const extFresh =
      this.chromeExtensionConnected &&
      this.chromeExtensionLastPingAt !== null &&
      now - this.chromeExtensionLastPingAt < EXTENSION_ACTIVE_TTL_MS;

    const androidFresh =
      this.androidBridgeLive &&
      this.androidBridgeLastSyncAt !== null &&
      now - this.androidBridgeLastSyncAt < ANDROID_ACTIVE_TTL_MS;

    return {
      spotifyConnected: this.spotifyConnected,
      spotifyDisplayName: this.spotifyDisplayName,
      spotifyLastSyncAt: this.spotifyLastSyncAt,
      chromeExtensionConnected: extFresh || this.chromeExtensionConnected,
      chromeExtensionLastPingAt: this.chromeExtensionLastPingAt,
      androidBridgeAvailable: this.detectAndroidNativeEnvironment() || androidFresh,
      androidBridgeLive: androidFresh,
      androidBridgeLastSyncAt: this.androidBridgeLastSyncAt,
      activeSource: this.externalPlaybackActive && this.currentState ? this.currentState.source : null,
      externalPlaybackActive: this.externalPlaybackActive,
    };
  }

  public getSnapshot(): ExternalPlaybackSnapshot {
    return {
      active: this.externalPlaybackActive,
      state: this.currentState,
      channels: this.getChannelStatus(),
    };
  }

  public subscribe(listener: (snapshot: ExternalPlaybackSnapshot) => void): () => void {
    this.stateSubscribers.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.stateSubscribers.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.stateSubscribers.forEach((cb) => {
      try {
        cb(snapshot);
      } catch {
        // ignore subscriber errors
      }
    });
  }
}

export const externalSyncService = new ExternalSyncService();
