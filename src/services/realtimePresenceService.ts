import { LoungeUser, Song } from '../types';

export interface PresencePayload {
  userId: string;
  name: string;
  avatarUrl?: string;
  avatarGradient: string;
  avatarSeed: string;
  city: string;
  currentSongId: string;
  currentSongTitle: string;
  currentSecond: number;
  trustScore: number;
  statusBubble?: string;
  statusNote?: string;
  lastSeen: number;
  isRealUser: true;
}

export type CoListenEventType = 'play' | 'pause' | 'seek' | 'songChange' | 'leave';

export interface CoListenSyncEvent {
  type: CoListenEventType;
  sessionId: string;
  senderTabId: string;
  senderId: string;
  partnerId: string;
  song?: Song;
  second?: number;
  isPlaying?: boolean;
  timestamp: number;
}

const PRESENCE_TTL_MS = 45000; // 45 seconds timeout
const CHANNEL_NAME = 'harmoniq_live_presence';

/**
 * Local multi-tab real-time heartbeat channel (BroadcastChannel).
 * Cross-device real-time presence for authenticated users is handled via Firestore /publicProfiles
 * inside socialFirestoreService.ts to respect strict Firestore security rules.
 */
class RealtimePresenceService {
  private tabId: string = `tab_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<string, PresencePayload> = new Map();
  private subscribers: Set<(realUsers: LoungeUser[]) => void> = new Set();
  private coListenSubscribers: Set<(event: CoListenSyncEvent) => void> = new Set();
  private broadcastIntervalId: ReturnType<typeof setInterval> | null = null;
  private pruneIntervalId: ReturnType<typeof setInterval> | null = null;
  private currentPayload: PresencePayload | null = null;
  private currentSongFilter: string = '';
  private currentUserId: string = '';

  constructor() {
    this.initBroadcastChannel();
    this.startPruneCycle();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (!event.data) return;
          if (event.data.type === 'presence_heartbeat') {
            this.handleIncomingPresence(event.data.payload);
          } else if (event.data.type === 'co_listen_event' && event.data.payload) {
            const syncEvent = event.data.payload as CoListenSyncEvent;
            if (syncEvent.senderTabId === this.tabId) return;
            this.coListenSubscribers.forEach((cb) => {
              try {
                cb(syncEvent);
              } catch {
                // ignore subscriber errors
              }
            });
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported or blocked:', e);
      }
    }
  }

  private handleIncomingPresence(payload: PresencePayload) {
    if (!payload || !payload.userId || payload.userId === this.currentUserId) return;
    this.listeners.set(payload.userId, {
      ...payload,
      lastSeen: payload.lastSeen || Date.now(),
      isRealUser: true,
    });
    this.notifySubscribers();
  }

  private startPruneCycle() {
    if (typeof window === 'undefined') return;
    this.pruneIntervalId = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, user] of this.listeners.entries()) {
        if (now - user.lastSeen > PRESENCE_TTL_MS) {
          this.listeners.delete(id);
          changed = true;
        }
      }
      if (changed) {
        this.notifySubscribers();
      }
    }, 5000);
  }

  public updateLocalUserPresence(payload: {
    userId: string;
    name: string;
    avatarUrl?: string;
    avatarGradient: string;
    avatarSeed: string;
    city: string;
    currentSong: Song;
    currentSecond: number;
    trustScore: number;
    statusBubble?: string;
    statusNote?: string;
  }) {
    this.currentUserId = payload.userId;
    this.currentSongFilter = payload.currentSong.id;

    this.currentPayload = {
      userId: payload.userId,
      name: payload.name,
      avatarUrl: payload.avatarUrl,
      avatarGradient: payload.avatarGradient,
      avatarSeed: payload.avatarSeed,
      city: payload.city,
      currentSongId: payload.currentSong.id,
      currentSongTitle: payload.currentSong.title,
      currentSecond: payload.currentSecond,
      trustScore: payload.trustScore || 99,
      statusBubble: payload.statusBubble || payload.statusNote,
      statusNote: payload.statusNote || payload.statusBubble,
      lastSeen: Date.now(),
      isRealUser: true,
    };

    this.broadcastPulse();
  }

  public broadcastPulse() {
    if (!this.currentPayload) return;
    this.currentPayload.lastSeen = Date.now();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'presence_heartbeat',
          payload: this.currentPayload,
        });
      } catch {
        // ignore channel closed errors
      }
    }
  }

  public startHeartbeatCycle() {
    if (this.broadcastIntervalId) return;
    this.broadcastIntervalId = setInterval(() => {
      this.broadcastPulse();
    }, 10000);
  }

  public stopHeartbeatCycle() {
    if (this.broadcastIntervalId) {
      clearInterval(this.broadcastIntervalId);
      this.broadcastIntervalId = null;
    }
  }

  public subscribeToRealListeners(
    songId: string,
    callback: (realUsers: LoungeUser[]) => void
  ): () => void {
    this.currentSongFilter = songId;
    this.subscribers.add(callback);
    callback(this.getActiveRealUsers(songId));

    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getActiveRealUsers(songId?: string): LoungeUser[] {
    const filterId = songId || this.currentSongFilter;
    const now = Date.now();
    const result: LoungeUser[] = [];

    for (const user of this.listeners.values()) {
      if (user.userId === this.currentUserId) continue;
      if (now - user.lastSeen > PRESENCE_TTL_MS) continue;

      if (filterId && user.currentSongId && user.currentSongId !== filterId) {
        continue;
      }

      result.push({
        id: `tab_${user.userId}`,
        name: user.name,
        age: 23,
        city: user.city || 'İstanbul, Kadıköy',
        avatarSeed: user.avatarSeed || user.name.slice(0, 2).toUpperCase(),
        avatarGradient: user.avatarGradient || 'from-emerald-500 to-teal-700',
        avatarUrl: user.avatarUrl,
        platform: 'youtube_music',
        currentSecond: user.currentSecond,
        statusBubble: user.statusBubble || 'Canlı frekansta dinliyor',
        topArtists: [user.currentSongTitle],
        bio: 'Gerçek zamanlı ListenHub dinleyicisi.',
        trustScore: Math.max(90, user.trustScore || 99),
        lastHeartbeatAgoSeconds: Math.floor((now - user.lastSeen) / 1000),
        isOnline: true,
        distanceKm: 0.8,
        friendStatus: 'none',
        compatibilityScore: 98,
        isRealUser: true,
      });
    }

    return result;
  }

  public broadcastCoListenEvent(
    event: Omit<CoListenSyncEvent, 'senderTabId' | 'timestamp'>
  ) {
    if (!this.broadcastChannel) return;
    const payload: CoListenSyncEvent = {
      ...event,
      senderTabId: this.tabId,
      timestamp: Date.now(),
    };
    try {
      this.broadcastChannel.postMessage({
        type: 'co_listen_event',
        payload,
      });
    } catch {
      // ignore channel closed errors
    }
  }

  public subscribeToCoListenEvents(
    callback: (event: CoListenSyncEvent) => void
  ): () => void {
    this.coListenSubscribers.add(callback);
    return () => {
      this.coListenSubscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    const active = this.getActiveRealUsers(this.currentSongFilter);
    this.subscribers.forEach((cb) => {
      try {
        cb(active);
      } catch {
        // ignore listener callback errors
      }
    });
  }

  public destroy() {
    this.stopHeartbeatCycle();
    if (this.pruneIntervalId) clearInterval(this.pruneIntervalId);
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // ignore
      }
    }
  }
}

export const realtimePresence = new RealtimePresenceService();
