import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserPlaylist, Song, SubscribedChannelDetail } from '../types';
import { isMusicArtistOrChannel, cleanNonMusicArtists } from './artistFilterService';

export const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/youtube.readonly',
];

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'consent select_account',
});

// In-memory token cache (Do NOT store in localStorage per security requirements)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

export interface GoogleAuthResult {
  user: User | null;
  accessToken: string;
  errorCode?: string;
  userFacingError?: string;
}

/**
 * Translates Firebase Auth and Google YouTube Data API v3 errors into clear, actionable Turkish explanations for the user.
 */
export function formatGoogleApiErrorForUser(
  contextLabel: string,
  status?: number,
  errorPayload?: any,
  rawError?: any
): string {
  const apiReason =
    errorPayload?.error?.errors?.[0]?.reason ||
    errorPayload?.error?.status ||
    rawError?.code ||
    '';
  const apiMessage =
    errorPayload?.error?.message ||
    rawError?.message ||
    'Bilinmeyen bağlantı hatası';

  if (rawError?.code === 'auth/popup-closed-by-user' || rawError?.code === 'auth/cancelled-popup-request') {
    return `${contextLabel}: Google oturum penceresi işlem tamamlanmadan kapatıldı. Eğer "Hata 403: access_denied" gördüyseniz Google Cloud Audience sayfasından e-postanızı Test Kullanıcısı olarak ekleyin veya uygulamayı yayınlayın.`;
  }
  if (rawError?.code === 'auth/popup-blocked') {
    return `${contextLabel}: Tarayıcınız açılır pencereyi (popup) engelledi. Lütfen adres çubuğundan açılır pencerelere izin verin.`;
  }
  if (rawError?.code === 'auth/unauthorized-domain') {
    return `${contextLabel}: Bu alan adı Firebase Authentication yetkili alan adları listesinde bulunmuyor.`;
  }

  if (status === 401 || apiReason === 'authError' || apiReason === 'invalidCredentials') {
    return `${contextLabel} (HTTP 401): Oturum anahtarınızın (Access Token) süresi dolmuş veya geçersiz. Lütfen "Google OAuth ile Çek" butonuna tıklayarak yeniden giriş yapın.`;
  }

  if (status === 403) {
    if (
      apiReason === 'accessNotConfigured' ||
      apiReason === 'SERVICE_DISABLED' ||
      apiMessage.includes('YouTube Data API v3 has not been used') ||
      apiMessage.includes('blocked')
    ) {
      return `${contextLabel} (HTTP 403 - API Devre Dışı): Google Cloud projenizde "YouTube Data API v3" henüz etkinleştirilmemiş. Google Cloud Console'da tek tıkla "ETKİNLEŞTİR" butonuna basarak aktifleştirebilir veya hemen aşağıdaki çalma listesi linki kutusundan listelerinizi anında aktarabilirsiniz.`;
    }
    if (apiReason === 'insufficientPermissions' || apiReason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT') {
      return `${contextLabel} (HTTP 403 - Eksik İzin): Google girişinde YouTube okuma izni (youtube.readonly) onaylanmadı. Lütfen yeniden giriş yapıp izin kutucuğunu işaretleyin.`;
    }
    if (apiReason === 'quotaExceeded' || apiReason === 'dailyLimitExceeded') {
      return `${contextLabel} (HTTP 403 - Kota Sınırı): Günlük YouTube Data API kotası doldu. Direkt çalma listesi linki kutusunu kullanarak kotadan bağımsız aktarabilirsiniz.`;
    }
    if (apiReason === 'subscriptionForbidden' || apiReason === 'playlistOperationUnsupported') {
      return `${contextLabel} (HTTP 403 - Gizlilik Kısıtlaması): YouTube Music hesabınızın abonelikleri veya beğenilenler listesi gizli olarak ayarlanmış.`;
    }
    return `${contextLabel} (HTTP 403): Erişim reddedildi (${apiReason || apiMessage}).`;
  }

  if (status === 404 || apiReason === 'playlistNotFound' || apiReason === 'channelNotFound') {
    return `${contextLabel} (HTTP 404): Bu Google hesabına bağlı aktif bir YouTube kanalı veya çalma listesi bulunamadı. Lütfen YouTube Music'te kanalınızın oluşturulduğundan emin olun.`;
  }

  return `${contextLabel}${status ? ` (HTTP ${status})` : ''}: ${apiMessage}`;
}

export const signInWithGoogle = async (
  includeYouTubeScope = true
): Promise<GoogleAuthResult> => {
  try {
    isSigningIn = true;
    const freshProvider = new GoogleAuthProvider();
    freshProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    freshProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
    if (includeYouTubeScope) {
      freshProvider.addScope('https://www.googleapis.com/auth/youtube.readonly');
      freshProvider.setCustomParameters({
        prompt: 'consent select_account',
      });
    } else {
      freshProvider.setCustomParameters({
        prompt: 'select_account',
      });
    }

    const result = await signInWithPopup(auth, freshProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;

    if (!cachedAccessToken && includeYouTubeScope) {
      const msg =
        'Google girişi başarılı oldu ancak YouTube erişim anahtarı (Access Token) alınamadı. Lütfen izin ekranında YouTube erişimini onaylayın.';
      console.info('[Harmoniq Auth Diagnostic] Missing accessToken in credential result:', {
        uid: result.user?.uid,
        email: result.user?.email,
      });
      return {
        user: result.user,
        accessToken: '',
        errorCode: 'auth/missing-access-token',
        userFacingError: msg,
      };
    }

    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    const code = error?.code || 'auth/unknown';
    const userFacingError = formatGoogleApiErrorForUser(
      'Google OAuth Girişi',
      undefined,
      undefined,
      error
    );
    console.info('[Harmoniq Auth Diagnostic] signInWithGoogle caught exception:', {
      timestamp: new Date().toISOString(),
      code,
      message: error?.message,
      userFacingError,
    });
    return { user: null, accessToken: '', errorCode: code, userFacingError };
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setManualAccessToken = (token: string) => {
  cachedAccessToken = token.trim() || null;
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error: any) {
    console.info('[Harmoniq Auth Diagnostic] logoutGoogle exception:', {
      timestamp: new Date().toISOString(),
      message: error?.message,
    });
  }
};

/**
 * Parses ISO 8601 duration strings from YouTube contentDetails (e.g. PT3M45S, PT45S).
 */
export function parseISO8601Duration(isoDuration?: string): number {
  if (!isoDuration) return 210;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 210;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Accurately determines if a YouTube video item is a genuine musical track
 * vs a YouTube Short, podcast, gaming clip, tutorial, news, or general video.
 */
export function isMusicVideoItem(
  item: any,
  rawTitle: string,
  durationSec: number
): { isMusic: boolean; reason: string } {
  const lowerTitle = rawTitle.toLowerCase();

  // 1. YouTube Shorts check: duration < 55 seconds, or #shorts / shorts tag in title
  if (
    (durationSec > 0 && durationSec < 55) ||
    lowerTitle.includes('#shorts') ||
    lowerTitle.includes('#short') ||
    lowerTitle.includes('shorts') ||
    lowerTitle.includes('tiktok') ||
    lowerTitle.includes('reels')
  ) {
    return { isMusic: false, reason: 'YouTube Short / Kısa Video (Filtrelendi)' };
  }

  // 2. Extremely long video check (Podcasts, live stream recordings, gameplay > 20 mins / 1200s)
  if (durationSec > 1200) {
    const isMusicLongForm =
      lowerTitle.includes('dj set') ||
      lowerTitle.includes('full album') ||
      lowerTitle.includes('mix') ||
      lowerTitle.includes('soundtrack') ||
      lowerTitle.includes('konser') ||
      lowerTitle.includes('live concert');
    if (!isMusicLongForm) {
      return { isMusic: false, reason: 'Uzun Video / Podcast / Canlı Yayın (Filtrelendi)' };
    }
  }

  const snippet = item.snippet || {};
  const categoryId = snippet.categoryId;
  const channelTitle = (
    snippet.videoOwnerChannelTitle ||
    snippet.channelTitle ||
    ''
  ).toLowerCase();

  // 3. YouTube Category ID 10 = Music (Official)
  if (categoryId === '10') {
    return { isMusic: true, reason: 'YouTube Music Kategorisi (10)' };
  }

  // 4. Topic Channel or VEVO
  if (
    channelTitle.endsWith(' - topic') ||
    channelTitle.endsWith(' vevo') ||
    channelTitle.includes('records')
  ) {
    return { isMusic: true, reason: 'Resmi Müzik / Topic Kanalı' };
  }

  // 5. Strong music title patterns (Artist - Song, Official Audio, Official Video, Lyric Video, prod., feat.)
  const musicIndicators = [
    'official audio',
    'official music video',
    'official video',
    'lyric video',
    'lyrics',
    'prod.',
    'feat.',
    'ft.',
    'remix',
    'akustik',
    'acoustic',
    'şarkı',
    'albüm',
    'single',
    'ep',
    'klip',
    'visualizer',
    'canlı performans',
    'live at',
  ];
  if (musicIndicators.some((ind) => lowerTitle.includes(ind))) {
    return { isMusic: true, reason: 'Müzik Video / Parça İmzası' };
  }

  // 6. Explicit Non-Music Video Categories in YouTube API
  // 20 = Gaming, 28 = Tech, 25 = News, 26 = Howto, 27 = Education, 17 = Sports, 23 = Comedy, 2 = Autos, 24 = Entertainment
  const nonMusicCategoryIds = ['20', '28', '25', '26', '27', '17', '23', '2', '15', '29', '19', '24'];
  if (categoryId && nonMusicCategoryIds.includes(categoryId)) {
    return { isMusic: false, reason: 'Müzik Dışı YouTube Kategorisi' };
  }

  // 7. Non-music title keywords
  const nonMusicKeywords = [
    'gameplay',
    'walkthrough',
    'oyun',
    'bölüm',
    'review',
    'inceleme',
    'vlog',
    'podcast',
    'haber',
    'haberleri',
    'dizi',
    'fragman',
    'trailer',
    'tepki',
    'reaction',
    'eğitim',
    'ders',
    'kodlama',
    'software',
    'unboxing',
    'kutu açılımı',
  ];
  if (nonMusicKeywords.some((kw) => lowerTitle.includes(kw))) {
    return { isMusic: false, reason: 'Müzik Dışı İçerik Başlığı' };
  }

  // 8. If title follows "Artist - Song" standard audio format and reasonable song duration (55-720s)
  if (rawTitle.includes(' - ') && durationSec >= 55 && durationSec <= 720) {
    return { isMusic: true, reason: 'Standart Şarkı Formatı' };
  }

  // Default: if categoryId was specified and not 10, reject; otherwise if duration is 55-720s keep as song
  if (categoryId && categoryId !== '10') {
    return { isMusic: false, reason: 'Müzik Dışı Video' };
  }

  return { isMusic: durationSec >= 55 && durationSec <= 720, reason: 'Süre Kriteri' };
}

/**
 * Helper to parse a YouTube API playlistItem or video item into a clean Song object.
 * Automatically filters out non-music videos, podcasts, and YouTube Shorts.
 */
function parseYouTubeItemToSong(
  item: any,
  idx: number,
  prefix: string,
  albumName: string,
  defaultThumbnail?: string,
  filterNonMusic: boolean = true
): Song | null {
  try {
    const snippet = item.snippet || {};
    const rawTitle = snippet.title || '';
    if (
      !rawTitle ||
      rawTitle === 'Private video' ||
      rawTitle === 'Deleted video' ||
      rawTitle === '[Private video]' ||
      rawTitle === '[Deleted video]'
    ) {
      return null;
    }

    const isoDuration = item.contentDetails?.duration;
    const durationSeconds = parseISO8601Duration(isoDuration);

    // Apply strict YouTube Music filter: drop Shorts and non-music videos
    if (filterNonMusic) {
      const musicCheck = isMusicVideoItem(item, rawTitle, durationSeconds);
      if (!musicCheck.isMusic) {
        return null;
      }
    }

    const cleanChannel = (ch?: string) =>
      (ch || '')
        .replace(/ - Topic$/i, '')
        .replace(/ Official$/i, '')
        .replace(/ VEVO$/i, '')
        .trim();

    const parts = rawTitle.split(/\s*[-–—:]\s*/);
    const ownerChannel =
      cleanChannel(snippet.videoOwnerChannelTitle) ||
      cleanChannel(snippet.channelTitle);

    const artist =
      parts.length >= 2
        ? parts[0].trim()
        : ownerChannel || 'YouTube Music';

    const songTitle =
      parts.length >= 2 ? parts.slice(1).join(' - ').trim() : rawTitle;

    const videoId =
      item.contentDetails?.videoId ||
      snippet.resourceId?.videoId ||
      (typeof item.id === 'string' ? item.id : undefined);

    const thumbnail =
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      defaultThumbnail ||
      (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined);

    return {
      id: `${prefix}-${idx}-${videoId || Date.now()}`,
      title: songTitle
        .replace(
          /\s*[\(\[](official\s*music\s*video|official\s*video|official\s*audio|4k|hd|remastered|lyrics|lyric\s*video|klip|video|audio|canlı|live|visualizer)[\)\]]/gi,
          ''
        )
        .trim(),
      artist,
      album: albumName,
      genre: 'YouTube Music',
      rawMediaTitle: rawTitle,
      coverGradient: 'from-zinc-800 to-zinc-950',
      coverUrl: thumbnail,
      durationSeconds: durationSeconds || 215,
      bpm: 118,
      keyNote: 'Am',
      catalogNumber: `YTM-${videoId || idx}`,
      releaseYear: new Date().getFullYear(),
      soundType: 'rock' as const,
      youtubeVideoId: typeof videoId === 'string' ? videoId : undefined,
      timelineMarkers: [
        { second: 20, label: 'Giriş', emoji: '⚡' },
        { second: 65, label: 'Nakarat', emoji: '🔥' },
        { second: 130, label: 'Solo', emoji: '✨' },
      ],
    };
  } catch (err: any) {
    console.info('[Harmoniq Sync Diagnostic] parseYouTubeItemToSong error:', {
      idx,
      prefix,
      message: err?.message,
    });
    return null;
  }
}

/**
 * Fetches all items of a specific playlist ID using YouTube Data API v3 with full pagination.
 */
async function fetchAllPlaylistTracksWithToken(
  playlistId: string,
  playlistTitle: string,
  defaultThumbnail: string,
  accessToken: string,
  maxPages = 10,
  onErrorNotice?: (msg: string) => void
): Promise<Song[]> {
  const tracks: Song[] = [];
  let pageToken = '';
  let page = 0;

  try {
    while (page < maxPages) {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
        playlistId
      )}&maxResults=50${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const userMsg = formatGoogleApiErrorForUser(
          `"${playlistTitle}" çalma listesi şarkıları çekilirken hata oluştu`,
          res.status,
          errData
        );
        console.info('[Harmoniq Sync Diagnostic] playlistItems API failed:', {
          timestamp: new Date().toISOString(),
          playlistId,
          playlistTitle,
          status: res.status,
          error: errData,
          userMsg,
        });
        if (onErrorNotice) onErrorNotice(userMsg);
        break;
      }

      const data = await res.json();
      const items = data.items || [];

      for (const pi of items) {
        const song = parseYouTubeItemToSong(
          pi,
          tracks.length,
          `yt-track-${playlistId}`,
          playlistTitle,
          defaultThumbnail
        );
        if (song) {
          tracks.push(song);
        }
      }

      if (data.nextPageToken) {
        pageToken = data.nextPageToken;
        page++;
      } else {
        break;
      }
    }
  } catch (error: any) {
    const userMsg = formatGoogleApiErrorForUser(
      `"${playlistTitle}" şarkı listesi bağlantısı`,
      undefined,
      undefined,
      error
    );
    console.info('[Harmoniq Sync Diagnostic] Exception in fetchAllPlaylistTracksWithToken:', {
      timestamp: new Date().toISOString(),
      playlistId,
      playlistTitle,
      message: error?.message,
    });
    if (onErrorNotice) onErrorNotice(userMsg);
  }

  return tracks;
}

/**
 * Fetches real YouTube/YouTube Music playlists for the authenticated user
 * using the official YouTube Data API v3 with full pagination.
 */
export async function fetchUserYouTubePlaylists(
  accessToken: string,
  onErrorNotice?: (msg: string) => void
): Promise<UserPlaylist[]> {
  try {
    const allItems: any[] = [];
    let pageToken = '';
    let page = 0;

    while (page < 4) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50${
          pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
        }`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const userMsg = formatGoogleApiErrorForUser(
          'Çalma listeleriniz çekilemedi',
          res.status,
          errData
        );
        console.info('[Harmoniq Sync Diagnostic] YouTube Playlists API error:', {
          timestamp: new Date().toISOString(),
          endpoint: 'youtube/v3/playlists?mine=true',
          status: res.status,
          errorDetails: errData,
          userMsg,
        });
        if (onErrorNotice) onErrorNotice(userMsg);
        break;
      }

      const data = await res.json();
      if (Array.isArray(data.items)) {
        allItems.push(...data.items);
      }
      if (data.nextPageToken) {
        pageToken = data.nextPageToken;
        page++;
      } else {
        break;
      }
    }

    const parsedPlaylists: UserPlaylist[] = [];

    for (const item of allItems) {
      const snippet = item.snippet || {};
      const contentDetails = item.contentDetails || {};
      const playlistId = item.id;
      const title = snippet.title || 'İsimsiz Çalma Listesi';
      const description = snippet.description || 'YouTube Music Çalma Listesi';
      const thumbnail =
        snippet.thumbnails?.maxres?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';

      const itemCount = contentDetails.itemCount || 0;

      // Fetch ALL tracks for this playlist via paginated playlistItems
      let tracks: Song[] = [];
      try {
        tracks = await fetchAllPlaylistTracksWithToken(
          playlistId,
          title,
          thumbnail,
          accessToken,
          12,
          onErrorNotice
        );
      } catch (trackErr: any) {
        const msg = `"${title}" listesinin parçaları alınırken hata oluştu: ${trackErr?.message || 'Bilinmeyen hata'}`;
        console.info('[Harmoniq Sync Diagnostic] Playlist tracks fetch exception:', {
          playlistId,
          title,
          error: trackErr?.message,
        });
        if (onErrorNotice) onErrorNotice(msg);
      }

      // If playlist is public/unlisted and OAuth playlistItems returned fewer than expected, try backend InnerTube resolver
      if (tracks.length === 0 && itemCount > 0) {
        try {
          const fallbackRes = await fetch(
            `/api/youtube-playlist?list=${encodeURIComponent(playlistId)}`
          );
          if (fallbackRes.ok) {
            const fbData = await fallbackRes.json();
            if (fbData.playlist?.tracks?.length > 0) {
              tracks = fbData.playlist.tracks;
            }
          }
        } catch (fbErr: any) {
          console.info('[Harmoniq Sync Diagnostic] Fallback playlist resolver exception:', {
            playlistId,
            message: fbErr?.message,
          });
        }
      }

      const finalCount = tracks.length || itemCount;
      parsedPlaylists.push({
        id: `yt-pl-${playlistId}`,
        title,
        description,
        coverUrl: tracks[0]?.coverUrl || thumbnail,
        trackCount: finalCount,
        duration: `${Math.max(1, finalCount) * 3} dk`,
        genre: 'YouTube Music',
        source: 'youtube_music',
        isFavorite: true,
        updatedAt: 'YouTube Music ile senkronize',
        tracks,
      });
    }

    return parsedPlaylists;
  } catch (error: any) {
    const userMsg = formatGoogleApiErrorForUser(
      'YouTube çalma listeleri senkronizasyonu başarısız oldu',
      undefined,
      undefined,
      error
    );
    console.info('[Harmoniq Sync Diagnostic] Fatal error in fetchUserYouTubePlaylists:', {
      timestamp: new Date().toISOString(),
      message: error?.message,
      stack: error?.stack,
    });
    if (onErrorNotice) onErrorNotice(userMsg);
    return [];
  }
}

/**
 * Fetches the user's authentic liked music and videos from YouTube / YouTube Music.
 * Uses multiple official endpoints (myRating=like, channels relatedPlaylists.likes, and LL playlist)
 * with pagination so no liked songs are missed.
 */
export async function fetchUserLikedSongs(
  accessToken: string,
  onErrorNotice?: (msg: string) => void
): Promise<Song[]> {
  const collectedSongs: Song[] = [];
  const seenVideoIds = new Set<string>();

  const addParsedSongs = (items: any[], albumLabel: string) => {
    for (const item of items) {
      const song = parseYouTubeItemToSong(
        item,
        collectedSongs.length,
        'yt-liked',
        albumLabel
      );
      if (song) {
        const key = song.youtubeVideoId || `${song.artist}-${song.title}`.toLowerCase();
        if (!seenVideoIds.has(key)) {
          seenVideoIds.add(key);
          collectedSongs.push(song);
        }
      }
    }
  };

  try {
    // Strategy 1: videos?myRating=like (paginated up to 3 pages = 150 liked tracks)
    let pageToken = '';
    for (let page = 0; page < 3; page++) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?myRating=like&part=snippet,contentDetails&maxResults=50${
          pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
        }`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const userMsg = formatGoogleApiErrorForUser(
          'Beğendiğiniz müzikler (myRating=like) çekilemedi',
          res.status,
          errData
        );
        console.info('[Harmoniq Sync Diagnostic] videos?myRating=like failed:', {
          timestamp: new Date().toISOString(),
          status: res.status,
          errorDetails: errData,
          userMsg,
        });
        if (page === 0 && onErrorNotice) onErrorNotice(userMsg);
        break;
      }

      const data = await res.json();
      addParsedSongs(data.items || [], 'Beğenilen Müziklerim');
      if (data.nextPageToken) {
        pageToken = data.nextPageToken;
      } else {
        break;
      }
    }

    // Strategy 2: playlistItems with playlistId=LL (or channel's relatedPlaylists.likes)
    if (collectedSongs.length === 0) {
      let likesPlaylistId = 'LL';
      try {
        const chRes = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          }
        );
        if (chRes.ok) {
          const chData = await chRes.json();
          const relatedLikes =
            chData.items?.[0]?.contentDetails?.relatedPlaylists?.likes;
          if (relatedLikes) {
            likesPlaylistId = relatedLikes;
          }
        } else {
          const errData = await chRes.json().catch(() => ({}));
          console.info('[Harmoniq Sync Diagnostic] channels?mine=true status:', {
            status: chRes.status,
            errorDetails: errData,
          });
        }
      } catch (chErr: any) {
        console.info('[Harmoniq Sync Diagnostic] channels?mine=true exception:', {
          message: chErr?.message,
        });
      }

      const likedPlaylistTracks = await fetchAllPlaylistTracksWithToken(
        likesPlaylistId,
        'Beğenilen Müziklerim',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        accessToken,
        4
      );
      for (const track of likedPlaylistTracks) {
        const key = track.youtubeVideoId || `${track.artist}-${track.title}`.toLowerCase();
        if (!seenVideoIds.has(key)) {
          seenVideoIds.add(key);
          collectedSongs.push(track);
        }
      }
    }

    return collectedSongs;
  } catch (err: any) {
    const userMsg = formatGoogleApiErrorForUser(
      'Beğendiğiniz şarkılar çekilirken hata oluştu',
      undefined,
      undefined,
      err
    );
    console.info('[Harmoniq Sync Diagnostic] Fatal error in fetchUserLikedSongs:', {
      timestamp: new Date().toISOString(),
      message: err?.message,
      stack: err?.stack,
    });
    if (onErrorNotice) onErrorNotice(userMsg);
    return collectedSongs;
  }
}

const MUSIC_WIKI_KEYWORDS = [
  'music',
  'musician',
  'sing',
  'song',
  'band',
  'rock',
  'pop',
  'hip_hop',
  'rap',
  'jazz',
  'blues',
  'metal',
  'electronic',
  'edm',
  'techno',
  'house_music',
  'indie',
  'folk',
  'classical',
  'orchestra',
  'rhythm_and_blues',
  'soul',
  'reggae',
  'country_music',
  'punk',
  'disco',
  'ambient',
  'soundtrack',
  'vocal',
  'acoustic',
  'concert',
  'record_label',
  'musical_theatre',
];

export function isMusicTopicCategory(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return MUSIC_WIKI_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Fetches the user's authentic subscribed channels from YouTube and categorizes them:
 * Distinguishes genuine YouTube Music artists from regular YouTube channels (gaming, vlog, tech, news).
 */
export async function fetchUserSubscribedArtists(
  accessToken: string,
  knownLibraryArtists: Set<string> = new Set(),
  onErrorNotice?: (msg: string) => void
): Promise<{
  musicArtists: string[];
  allSubscribedChannels: SubscribedChannelDetail[];
}> {
  try {
    const rawChannels: {
      channelId: string;
      rawTitle: string;
      cleanTitle: string;
      thumbnailUrl?: string;
    }[] = [];
    let pageToken = '';

    for (let page = 0; page < 3; page++) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50${
          pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
        }`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const userMsg = formatGoogleApiErrorForUser(
          'Takip ettiğiniz sanatçılar (subscriptions) çekilemedi',
          res.status,
          errData
        );
        console.info('[Harmoniq Sync Diagnostic] Subscriptions API error:', {
          timestamp: new Date().toISOString(),
          status: res.status,
          errorDetails: errData,
          userMsg,
        });
        if (page === 0 && onErrorNotice) onErrorNotice(userMsg);
        break;
      }

      const data = await res.json();
      const items = data.items || [];

      for (const item of items) {
        const rawTitle = item.snippet?.title || '';
        const channelId = item.snippet?.resourceId?.channelId || '';
        const cleanTitle = rawTitle
          .replace(/ - Topic$/i, '')
          .replace(/ Official$/i, '')
          .replace(/ VEVO$/i, '')
          .trim();

        if (cleanTitle && cleanTitle !== 'YouTube' && cleanTitle !== 'YouTube Music') {
          rawChannels.push({
            channelId,
            rawTitle,
            cleanTitle,
            thumbnailUrl: item.snippet?.thumbnails?.default?.url || item.snippet?.thumbnails?.medium?.url,
          });
        }
      }

      if (data.nextPageToken) {
        pageToken = data.nextPageToken;
      } else {
        break;
      }
    }

    if (rawChannels.length === 0) {
      return { musicArtists: [], allSubscribedChannels: [] };
    }

    // Now query YouTube Data API channels endpoint for topicDetails (Google Knowledge Graph categories)
    const channelTopicMap = new Map<string, string[]>();
    const channelIdsWithValidId = rawChannels.map((c) => c.channelId).filter(Boolean);

    for (let i = 0; i < channelIdsWithValidId.length; i += 50) {
      const batchIds = channelIdsWithValidId.slice(i, i + 50);
      try {
        const chRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=topicDetails,snippet&id=${encodeURIComponent(
            batchIds.join(',')
          )}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          }
        );
        if (chRes.ok) {
          const chData = await chRes.json();
          for (const chItem of chData.items || []) {
            const topics: string[] = chItem.topicDetails?.topicCategories || [];
            channelTopicMap.set(chItem.id, topics);
          }
        }
      } catch (chErr: any) {
        console.info('[Harmoniq Sync Diagnostic] Channel topicDetails query skipped:', chErr?.message);
      }
    }

    const musicArtists: string[] = [];
    const allSubscribedChannels: SubscribedChannelDetail[] = [];

    const nonMusicKeywords = [
      'gaming', 'gameplay', 'oyun', 'oyunları', 'tech', 'teknoloji', 'podcast',
      'haber', 'haberleri', 'vlog', 'vlogs', 'review', 'inceleme', 'tutorial',
      'ders', 'kodlama', 'software', 'film', 'cinema', 'sinema', 'komedi',
      'comedy', 'caps', 'dizi', 'fragman', 'trailer', 'fitness', 'spor', 'akademi'
    ];

    const musicKeywords = [
      'records', 'music', 'müzik', 'orkestra', 'orchestra', 'sound', 'band',
      'official audio', 'official music', 'album', 'single', 'şarkı', 'yapım'
    ];

    for (const ch of rawChannels) {
      const lowerRaw = ch.rawTitle.toLowerCase();
      const lowerClean = ch.cleanTitle.toLowerCase();
      const topics = channelTopicMap.get(ch.channelId) || [];

      // Multi-layer validation via isMusicArtistOrChannel
      const customCheck = isMusicArtistOrChannel(ch, []);

      let isMusic = false;
      let reason = customCheck.reason;

      // Negative check takes ultimate precedence: if blacklisted or negative keywords found, reject immediately
      if (!customCheck.isMusic) {
        isMusic = false;
        reason = customCheck.reason;
      }
      // 1. Matches songs in user's library
      else if (knownLibraryArtists.has(lowerClean)) {
        isMusic = true;
        reason = 'Kütüphanenizdeki Parçalarla Eşleşti';
      }
      // 2. YouTube Music Topic Channel (Official YouTube Music discography)
      else if (lowerRaw.endsWith(' - topic') || lowerRaw.endsWith(' (topic)')) {
        isMusic = true;
        reason = 'YouTube Music Resmi Sanatçı Kanalı';
      }
      // 3. VEVO Channel
      else if (lowerRaw.endsWith('vevo') || lowerRaw.endsWith(' vevo')) {
        isMusic = true;
        reason = 'VEVO Resmi Sanatçı';
      }
      // 4. Topic details from Google Knowledge Graph
      else if (topics.length > 0) {
        if (topics.some(isMusicTopicCategory)) {
          isMusic = true;
          reason = 'YouTube Music Konu Kategorisi';
        } else {
          isMusic = false;
          reason = 'Genel YouTube İçerik Kanalı (Müzik Dışı)';
        }
      }
      // 5. Fallback on isMusicArtistOrChannel result
      else {
        isMusic = customCheck.isMusic;
        reason = customCheck.reason;
      }

      if (isMusic) {
        musicArtists.push(ch.cleanTitle);
      }

      allSubscribedChannels.push({
        channelId: ch.channelId,
        name: ch.cleanTitle,
        rawTitle: ch.rawTitle,
        isMusicArtist: isMusic,
        reason,
        thumbnailUrl: ch.thumbnailUrl,
      });
    }

    return {
      musicArtists: Array.from(new Set(musicArtists)),
      allSubscribedChannels,
    };
  } catch (err: any) {
    const userMsg = formatGoogleApiErrorForUser(
      'Abone olunan sanatçılar çekilirken hata oluştu',
      undefined,
      undefined,
      err
    );
    console.info('[Harmoniq Sync Diagnostic] Fatal error in fetchUserSubscribedArtists:', {
      timestamp: new Date().toISOString(),
      message: err?.message,
      stack: err?.stack,
    });
    if (onErrorNotice) onErrorNotice(userMsg);
    return { musicArtists: [], allSubscribedChannels: [] };
  }
}

/**
 * Fetches all of the user's authentic YouTube Music data in a single call:
 * Playlists, Liked Songs (Favoriler), and Subscribed Artists (Beğendiğim Sanatçılar).
 * Automatically separates authentic YouTube Music artists from regular YouTube channels,
 * and strips non-music videos and YouTube Shorts.
 */
export async function fetchAllUserYouTubeMusicData(accessToken: string): Promise<{
  playlists: UserPlaylist[];
  favoriteSongs: Song[];
  favoriteArtists: string[];
  allSubscribedChannels: SubscribedChannelDetail[];
  errors: string[];
}> {
  const errors: string[] = [];
  const recordError = (msg: string) => {
    if (msg && !errors.includes(msg)) {
      errors.push(msg);
    }
  };

  try {
    const [playlists, likedSongs] = await Promise.all([
      fetchUserYouTubePlaylists(accessToken, recordError),
      fetchUserLikedSongs(accessToken, recordError),
    ]);

    // Build known artist set from real tracks (liked songs & playlists)
    const knownArtists = new Set<string>();
    for (const pl of playlists) {
      for (const t of pl.tracks || []) {
        if (t.artist && t.artist !== 'YouTube Music' && t.artist !== 'Bilinmeyen Sanatçı') {
          knownArtists.add(t.artist.trim().toLowerCase());
        }
      }
    }
    for (const s of likedSongs) {
      if (s.artist && s.artist !== 'YouTube Music' && s.artist !== 'Bilinmeyen Sanatçı') {
        knownArtists.add(s.artist.trim().toLowerCase());
      }
    }

    const { musicArtists, allSubscribedChannels } = await fetchUserSubscribedArtists(
      accessToken,
      knownArtists,
      recordError
    );

    // If the user's liked songs list (LL) is empty or restricted, also include tracks from their personal playlists
    let finalFavoriteSongs = [...likedSongs];
    if (finalFavoriteSongs.length === 0 && playlists.length > 0) {
      const seen = new Set<string>();
      for (const pl of playlists) {
        for (const t of pl.tracks || []) {
          const key = t.youtubeVideoId || `${t.artist}-${t.title}`.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            finalFavoriteSongs.push(t);
          }
        }
      }
    }

    // Aggregate pure music artists from subscriptions, liked songs, and playlists
    const playlistArtists = playlists
      .flatMap((p) => (p.tracks || []).map((t) => t.artist))
      .filter(Boolean);
    const songArtists = finalFavoriteSongs.map((s) => s.artist).filter(Boolean);

    const rawUniqueArtists = Array.from(
      new Set([...musicArtists, ...songArtists, ...playlistArtists])
    ).filter(
      (a) =>
        a &&
        a !== 'YouTube Music' &&
        a !== 'Bilinmeyen Sanatçı' &&
        a !== 'YouTube'
    );

    // Apply strict multi-layer filter to strip Marques Brownlee, tech review & vlog channels
    const allUniqueArtists = cleanNonMusicArtists(rawUniqueArtists, finalFavoriteSongs);

    console.info('[Harmoniq Sync Diagnostic] fetchAllUserYouTubeMusicData completed:', {
      timestamp: new Date().toISOString(),
      playlistsCount: playlists.length,
      favoriteSongsCount: finalFavoriteSongs.length,
      favoriteArtistsCount: allUniqueArtists.length,
      allSubscribedChannelsCount: allSubscribedChannels.length,
      errorsCount: errors.length,
      errors,
    });

    return {
      playlists,
      favoriteSongs: finalFavoriteSongs,
      favoriteArtists: allUniqueArtists,
      allSubscribedChannels,
      errors,
    };
  } catch (err: any) {
    const fatalMsg = formatGoogleApiErrorForUser(
      'YouTube Music tüm kütüphane senkronizasyonu',
      undefined,
      undefined,
      err
    );
    recordError(fatalMsg);
    console.info('[Harmoniq Sync Diagnostic] Fatal exception in fetchAllUserYouTubeMusicData:', {
      timestamp: new Date().toISOString(),
      message: err?.message,
      stack: err?.stack,
    });
    return {
      playlists: [],
      favoriteSongs: [],
      favoriteArtists: [],
      allSubscribedChannels: [],
      errors,
    };
  }
}
