import { externalSyncService } from './externalSyncService';

const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const SPOTIFY_PROFILE_URL = 'https://api.spotify.com/v1/me';

const CLIENT_ID_STORAGE_KEY = 'listenhub_spotify_client_id';
const TOKEN_STORAGE_KEY = 'listenhub_spotify_pkce_tokens_v1';
const PKCE_SESSION_KEY = 'listenhub_spotify_pkce_pending';

const VISIBLE_POLL_MS = 4000;
const HIDDEN_POLL_MS = 12000;

export interface SpotifyTokenBundle {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  clientId: string;
  displayName?: string;
}

interface PendingPkceState {
  verifier: string;
  state: string;
  redirectUri: string;
  clientId: string;
  createdAt: number;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateRandomToken(byteLength = 48): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function computePkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function getSpotifyRedirectUri(): string {
  if (typeof window === 'undefined') return '/auth/spotify/callback';
  return `${window.location.origin}/auth/spotify/callback`;
}

export function getConfiguredSpotifyClientId(): string {
  const envId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID || '').trim();
  if (envId) return envId;
  if (typeof window === 'undefined') return '';
  try {
    return (localStorage.getItem(CLIENT_ID_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveCustomSpotifyClientId(clientId: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = clientId.trim();
  try {
    if (trimmed) {
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function hasEnvSpotifyClientId(): boolean {
  return Boolean((import.meta.env.VITE_SPOTIFY_CLIENT_ID || '').trim());
}

class SpotifySyncService {
  private tokens: SpotifyTokenBundle | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private isPolling = false;
  private isVisibilityBound = false;
  private isMessageBound = false;
  private pendingAuthResolve: ((ok: boolean) => void) | null = null;
  private pendingAuthReject: ((err: Error) => void) | null = null;
  private inFlightRefresh: Promise<string | null> | null = null;

  constructor() {
    this.restoreTokens();
    this.bindPopupMessageListener();
    this.handleUrlCallbackFallback();
    if (this.tokens) {
      externalSyncService.setSpotifyConnectionStatus(true, this.tokens.displayName);
      this.startPolling();
    }
  }

  private restoreTokens(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SpotifyTokenBundle;
      if (parsed && parsed.accessToken && parsed.clientId) {
        this.tokens = parsed;
      }
    } catch {
      this.tokens = null;
    }
  }

  private persistTokens(bundle: SpotifyTokenBundle | null): void {
    this.tokens = bundle;
    if (typeof window === 'undefined') return;
    try {
      if (bundle) {
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(bundle));
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  private savePendingPkce(pending: PendingPkceState): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(PKCE_SESSION_KEY, JSON.stringify(pending));
    } catch {
      // ignore storage errors
    }
  }

  private loadPendingPkce(): PendingPkceState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(PKCE_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PendingPkceState;
      if (!parsed?.verifier || !parsed?.state || !parsed?.clientId) return null;
      // Reject PKCE state older than 15 minutes
      if (Date.now() - (parsed.createdAt || 0) > 15 * 60 * 1000) {
        sessionStorage.removeItem(PKCE_SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private clearPendingPkce(): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(PKCE_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  private bindPopupMessageListener(): void {
    if (this.isMessageBound || typeof window === 'undefined') return;
    this.isMessageBound = true;

    window.addEventListener('message', (event: MessageEvent) => {
      // Strict origin validation for OAuth callback popup
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'LISTENHUB_SPOTIFY_AUTH_CALLBACK') return;

      const code = typeof data.code === 'string' ? data.code : '';
      const state = typeof data.state === 'string' ? data.state : '';
      const error = typeof data.error === 'string' ? data.error : '';

      if (error) {
        this.clearPendingPkce();
        this.pendingAuthReject?.(new Error(`Spotify yetkilendirme iptal edildi (${error}).`));
        this.pendingAuthResolve = null;
        this.pendingAuthReject = null;
        return;
      }

      if (code && state) {
        this.completePkceExchange(code, state)
          .then((ok) => {
            this.pendingAuthResolve?.(ok);
            this.pendingAuthResolve = null;
            this.pendingAuthReject = null;
          })
          .catch((err: Error) => {
            this.pendingAuthReject?.(err);
            this.pendingAuthResolve = null;
            this.pendingAuthReject = null;
          });
      }
    });
  }

  private handleUrlCallbackFallback(): void {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('spotify_code');
    const state = params.get('spotify_state');
    if (!code || !state) return;

    // Clean query params immediately without reloading
    params.delete('spotify_code');
    params.delete('spotify_state');
    const cleanQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);

    void this.completePkceExchange(code, state).catch(() => {
      // ignore stale redirect params
    });
  }

  public isConnected(): boolean {
    return Boolean(this.tokens?.accessToken);
  }

  public getDisplayName(): string | undefined {
    return this.tokens?.displayName;
  }

  /**
   * Starts Spotify OAuth 2.0 PKCE in an iframe-safe popup window pointing directly to Spotify's authorize URL.
   */
  public async connect(explicitClientId?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const clientId = (explicitClientId || getConfiguredSpotifyClientId()).trim();
    if (!clientId) {
      throw new Error('Önce Spotify Client ID bilgisini girmelisin.');
    }

    if (explicitClientId && explicitClientId.trim()) {
      saveCustomSpotifyClientId(explicitClientId.trim());
    }

    const verifier = generateRandomToken(48);
    const challenge = await computePkceChallenge(verifier);
    const state = generateRandomToken(24);
    const redirectUri = getSpotifyRedirectUri();

    this.savePendingPkce({
      verifier,
      state,
      redirectUri,
      clientId,
      createdAt: Date.now(),
    });

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SPOTIFY_SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
      show_dialog: 'true',
    });

    const authUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`;

    return new Promise<boolean>((resolve, reject) => {
      this.pendingAuthResolve = resolve;
      this.pendingAuthReject = reject;

      // Open OAuth provider URL directly (required for AI Studio iframe preview)
      const popup = window.open(
        authUrl,
        'listenhub_spotify_oauth',
        'width=520,height=720,noopener=no'
      );

      if (!popup) {
        this.pendingAuthResolve = null;
        this.pendingAuthReject = null;
        reject(new Error('Açılır pencere engellendi. Spotify bağlantısı için pop-up izni ver.'));
        return;
      }

      const closeWatcher = window.setInterval(() => {
        if (!this.pendingAuthResolve) {
          window.clearInterval(closeWatcher);
          return;
        }
        if (popup.closed) {
          window.clearInterval(closeWatcher);
          // Give postMessage a brief grace tick before rejecting as closed
          window.setTimeout(() => {
            if (this.pendingAuthReject) {
              this.pendingAuthReject(new Error('Spotify bağlantı penceresi kapatıldı.'));
              this.pendingAuthResolve = null;
              this.pendingAuthReject = null;
            }
          }, 450);
        }
      }, 500);
    });
  }

  private async completePkceExchange(code: string, returnedState: string): Promise<boolean> {
    const pending = this.loadPendingPkce();
    this.clearPendingPkce();

    if (!pending || pending.state !== returnedState) {
      throw new Error('OAuth güvenlik doğrulaması eşleşmedi. Lütfen tekrar dene.');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: pending.redirectUri,
      client_id: pending.clientId,
      code_verifier: pending.verifier,
    });

    const res = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error('Spotify erişim anahtarı alınamadı. Redirect URI ve Client ID ayarlarını kontrol et.');
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) {
      throw new Error('Spotify yanıtı geçersiz.');
    }

    const expiresAt = Date.now() + Math.max(60, data.expires_in || 3600) * 1000;
    let displayName: string | undefined;

    try {
      const profileRes = await fetch(SPOTIFY_PROFILE_URL, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (profileRes.ok) {
        const profile = (await profileRes.json()) as { display_name?: string; id?: string };
        displayName = profile.display_name || profile.id || undefined;
      }
    } catch {
      // profile display name is optional
    }

    this.persistTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      clientId: pending.clientId,
      displayName,
    });

    externalSyncService.setSpotifyConnectionStatus(true, displayName);
    this.startPolling();
    return true;
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.tokens?.refreshToken || !this.tokens?.clientId) {
      return null;
    }

    if (this.inFlightRefresh) {
      return this.inFlightRefresh;
    }

    const currentTokens = this.tokens;
    this.inFlightRefresh = (async () => {
      try {
        const body = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: currentTokens.refreshToken!,
          client_id: currentTokens.clientId,
        });

        const res = await fetch(SPOTIFY_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (!res.ok) {
          if (res.status === 400 || res.status === 401) {
            this.disconnect();
          }
          return null;
        }

        const data = (await res.json()) as {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
        };

        if (!data.access_token) return null;

        const updated: SpotifyTokenBundle = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || currentTokens.refreshToken,
          expiresAt: Date.now() + Math.max(60, data.expires_in || 3600) * 1000,
          clientId: currentTokens.clientId,
          displayName: currentTokens.displayName,
        };

        this.persistTokens(updated);
        externalSyncService.setSpotifyConnectionStatus(true, updated.displayName);
        return updated.accessToken;
      } catch {
        return null;
      } finally {
        this.inFlightRefresh = null;
      }
    })();

    return this.inFlightRefresh;
  }

  private async getValidAccessToken(): Promise<string | null> {
    if (!this.tokens) return null;
    // Refresh proactively 60 seconds before expiry
    if (Date.now() >= this.tokens.expiresAt - 60_000) {
      return this.refreshAccessToken();
    }
    return this.tokens.accessToken;
  }

  private bindVisibilityListener(): void {
    if (this.isVisibilityBound || typeof document === 'undefined') return;
    this.isVisibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (!this.isPolling) return;
      if (this.pollTimer) {
        clearTimeout(this.pollTimer);
        this.pollTimer = null;
      }
      if (document.visibilityState === 'visible') {
        void this.pollOnceAndSchedule();
      } else {
        this.scheduleNextPoll(HIDDEN_POLL_MS);
      }
    });
  }

  private getCurrentPollInterval(): number {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return HIDDEN_POLL_MS;
    }
    return VISIBLE_POLL_MS;
  }

  private scheduleNextPoll(delayMs?: number): void {
    if (!this.isPolling) return;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    const wait = typeof delayMs === 'number' ? delayMs : this.getCurrentPollInterval();
    this.pollTimer = setTimeout(() => {
      void this.pollOnceAndSchedule();
    }, wait);
  }

  public startPolling(): void {
    if (!this.tokens) return;
    this.bindVisibilityListener();
    if (this.isPolling) return;
    this.isPolling = true;
    void this.pollOnceAndSchedule();
  }

  public stopPolling(): void {
    this.isPolling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public disconnect(): void {
    this.stopPolling();
    this.persistTokens(null);
    this.clearPendingPkce();
    externalSyncService.setSpotifyConnectionStatus(false);
  }

  private async pollOnceAndSchedule(): Promise<void> {
    if (!this.isPolling || !this.tokens) return;

    let nextDelay = this.getCurrentPollInterval();

    try {
      let token = await this.getValidAccessToken();
      if (!token) {
        this.stopPolling();
        return;
      }

      let res = await fetch(SPOTIFY_CURRENTLY_PLAYING_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Retry once after token refresh on 401
      if (res.status === 401) {
        token = await this.refreshAccessToken();
        if (!token) {
          this.stopPolling();
          return;
        }
        res = await fetch(SPOTIFY_CURRENTLY_PLAYING_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (res.status === 429) {
        const retryAfterSec = Number(res.headers.get('Retry-After') || '10');
        nextDelay = Math.max(5000, (Number.isFinite(retryAfterSec) ? retryAfterSec : 10) * 1000);
      } else if (res.status === 204) {
        externalSyncService.notifyExternalIdle('spotify_api');
      } else if (res.ok) {
        const payload = (await res.json()) as {
          is_playing?: boolean;
          progress_ms?: number;
          item?: {
            type?: string;
            name?: string;
            duration_ms?: number;
            artists?: Array<{ name?: string }>;
            album?: {
              name?: string;
              images?: Array<{ url?: string }>;
            };
          } | null;
        };

        const track = payload?.item;
        if (track && track.name) {
          const artistNames = (track.artists || [])
            .map((a) => a?.name)
            .filter(Boolean)
            .join(', ');

          externalSyncService.pushExternalState({
            source: 'spotify_api',
            title: track.name,
            artist: artistNames || 'Spotify',
            album: track.album?.name || undefined,
            coverUrl: track.album?.images?.[0]?.url || undefined,
            durationSec: Math.max(1, Math.round((track.duration_ms || 210000) / 1000)),
            currentSecond: Math.max(0, Math.floor((payload.progress_ms || 0) / 1000)),
            isPlaying: Boolean(payload.is_playing),
            updatedAt: Date.now(),
          });
        } else {
          externalSyncService.notifyExternalIdle('spotify_api');
        }
      }
    } catch {
      // Transient network error: retry gracefully on next cycle
    }

    this.scheduleNextPoll(nextDelay);
  }
}

export const spotifySyncService = new SpotifySyncService();
