/**
 * Real Synchronized & Plain Lyrics Service powered by LRCLIB (https://lrclib.net)
 * - Free, CORS-enabled, requires no API key
 * - Caches results in memory + localStorage (capped) to keep playback snappy
 * - Never fabricates or hallucinates fake lyrics
 */

export interface SyncedLyricLine {
  second: number;
  text: string;
}

export interface LyricsResult {
  status: 'synced' | 'plain' | 'not_found';
  syncedLines: SyncedLyricLine[];
  plainLines: string[];
  sourceTrackName?: string;
  sourceArtistName?: string;
}

interface LrcLibApiItem {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

const LYRICS_CACHE_STORAGE_KEY = 'listenhub_lyrics_cache_v1';
const MAX_CACHED_LYRICS = 60;

const memoryCache = new Map<string, LyricsResult>();
const inflightRequests = new Map<string, Promise<LyricsResult>>();

/**
 * Normalize song title/artist by stripping noisy YouTube/streaming suffixes
 * (e.g. "(Official Music Video)", "[Lyrics]", "(Remastered 2011)", etc.)
 */
function sanitizeQueryPart(raw: string): string {
  return (raw || '')
    .replace(/\((?:official|music|lyric|lyrics|audio|video|hd|hq|4k|remaster(?:ed)?|live|acoustic|explicit|clean|feat\.?|ft\.?)[^)]*\)/gi, '')
    .replace(/\[(?:official|music|lyric|lyrics|audio|video|hd|hq|4k|remaster(?:ed)?|live|acoustic|explicit|clean|feat\.?|ft\.?)[^\]]*\]/gi, '')
    .replace(/\s*[-–|]\s*(?:official\s*(?:music\s*)?video|official\s*audio|lyric\s*video|lyrics).*$/i, '')
    .replace(/\s+(?:feat\.?|ft\.?)\s+.+$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse standard .lrc timestamp format:
 *   [mm:ss.xx] Line text
 *   [mm:ss.xxx] Line text
 *   [00:12.00][01:02.50] Repeated chorus line
 */
export function parseLrc(lrcText: string): SyncedLyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const results: SyncedLyricLine[] = [];
  const lines = lrcText.split(/\r?\n/);
  const timestampRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    timestampRegex.lastIndex = 0;

    while ((match = timestampRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fracRaw = match[3] || '0';
      const fracSeconds =
        fracRaw.length === 3
          ? parseInt(fracRaw, 10) / 1000
          : fracRaw.length === 2
          ? parseInt(fracRaw, 10) / 100
          : parseInt(fracRaw, 10) / 10;

      if (!Number.isNaN(minutes) && !Number.isNaN(seconds)) {
        timestamps.push(minutes * 60 + seconds + fracSeconds);
      }
    }

    if (timestamps.length === 0) continue;

    const text = trimmed.replace(timestampRegex, '').trim();
    if (!text) continue;

    for (const sec of timestamps) {
      results.push({ second: sec, text });
    }
  }

  return results.sort((a, b) => a.second - b.second);
}

function parsePlainLyrics(plainText: string): string[] {
  if (!plainText || typeof plainText !== 'string') return [];
  return plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function loadPersistentCache(): Record<string, LyricsResult> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LYRICS_CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, LyricsResult>;
    }
  } catch {
    // ignore malformed cache
  }
  return {};
}

function saveToPersistentCache(cacheKey: string, value: LyricsResult): void {
  if (typeof window === 'undefined') return;
  try {
    const store = loadPersistentCache();
    store[cacheKey] = value;
    const keys = Object.keys(store);
    if (keys.length > MAX_CACHED_LYRICS) {
      const excess = keys.length - MAX_CACHED_LYRICS;
      for (let i = 0; i < excess; i++) {
        delete store[keys[i]];
      }
    }
    localStorage.setItem(LYRICS_CACHE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage quota errors
  }
}

function buildResultFromItem(item: LrcLibApiItem | null | undefined): LyricsResult | null {
  if (!item) return null;

  if (item.syncedLyrics && item.syncedLyrics.trim().length > 0) {
    const parsed = parseLrc(item.syncedLyrics);
    if (parsed.length > 0) {
      return {
        status: 'synced',
        syncedLines: parsed,
        plainLines: item.plainLyrics ? parsePlainLyrics(item.plainLyrics) : parsed.map((l) => l.text),
        sourceTrackName: item.trackName,
        sourceArtistName: item.artistName,
      };
    }
  }

  if (item.plainLyrics && item.plainLyrics.trim().length > 0) {
    const plain = parsePlainLyrics(item.plainLyrics);
    if (plain.length > 0) {
      return {
        status: 'plain',
        syncedLines: [],
        plainLines: plain,
        sourceTrackName: item.trackName,
        sourceArtistName: item.artistName,
      };
    }
  }

  return null;
}

function pickBestSearchMatch(
  items: LrcLibApiItem[],
  targetArtist: string,
  targetTitle: string
): LrcLibApiItem | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  const normArtist = targetArtist.toLowerCase().trim();
  const normTitle = targetTitle.toLowerCase().trim();

  let bestItem: LrcLibApiItem | null = null;
  let bestScore = -1;

  for (const item of items) {
    const hasSynced = Boolean(item.syncedLyrics && item.syncedLyrics.trim().length > 0);
    const hasPlain = Boolean(item.plainLyrics && item.plainLyrics.trim().length > 0);
    if (!hasSynced && !hasPlain) continue;

    const itemTitle = (item.trackName || '').toLowerCase().trim();
    const itemArtist = (item.artistName || '').toLowerCase().trim();

    let score = hasSynced ? 50 : 20;
    if (itemTitle === normTitle) score += 40;
    else if (normTitle && (itemTitle.includes(normTitle) || normTitle.includes(itemTitle))) score += 22;

    if (itemArtist === normArtist) score += 40;
    else if (normArtist && (itemArtist.includes(normArtist) || normArtist.includes(itemArtist))) score += 22;

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestItem;
}

export function getGoogleLyricsSearchUrl(artist: string, title: string): string {
  const query = `${artist || ''} ${title || ''} sözleri`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export async function fetchSongLyrics(song: {
  id: string;
  title: string;
  artist: string;
}): Promise<LyricsResult> {
  const cleanTitle = sanitizeQueryPart(song.title);
  const cleanArtist = sanitizeQueryPart(song.artist);
  const cacheKey = `${song.id}::${cleanArtist.toLowerCase()}::${cleanTitle.toLowerCase()}`;

  const memHit = memoryCache.get(cacheKey);
  if (memHit) return memHit;

  const persistent = loadPersistentCache();
  if (persistent[cacheKey]) {
    memoryCache.set(cacheKey, persistent[cacheKey]);
    return persistent[cacheKey];
  }

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) return inflight;

  const requestPromise = (async (): Promise<LyricsResult> => {
    const notFound: LyricsResult = {
      status: 'not_found',
      syncedLines: [],
      plainLines: [],
    };

    if (!cleanTitle && !cleanArtist) {
      return notFound;
    }

    try {
      // Step 1: Direct exact match via LRCLIB /api/get
      if (cleanArtist && cleanTitle) {
        const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
          cleanArtist
        )}&track_name=${encodeURIComponent(cleanTitle)}`;
        const getResp = await fetch(getUrl, {
          headers: { Accept: 'application/json' },
        });
        if (getResp.ok) {
          const data = (await getResp.json()) as LrcLibApiItem;
          const parsed = buildResultFromItem(data);
          if (parsed) {
            memoryCache.set(cacheKey, parsed);
            saveToPersistentCache(cacheKey, parsed);
            return parsed;
          }
        }
      }

      // Step 2: Fuzzy search fallback via LRCLIB /api/search
      const searchQuery = `${cleanArtist} ${cleanTitle}`.trim();
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`;
      const searchResp = await fetch(searchUrl, {
        headers: { Accept: 'application/json' },
      });

      if (searchResp.ok) {
        const list = (await searchResp.json()) as LrcLibApiItem[];
        const best = pickBestSearchMatch(list, cleanArtist, cleanTitle);
        const parsed = buildResultFromItem(best);
        if (parsed) {
          memoryCache.set(cacheKey, parsed);
          saveToPersistentCache(cacheKey, parsed);
          return parsed;
        }
      }
    } catch {
      // Network/CORS error — fall through cleanly to honest empty state
    }

    memoryCache.set(cacheKey, notFound);
    saveToPersistentCache(cacheKey, notFound);
    return notFound;
  })().finally(() => {
    inflightRequests.delete(cacheKey);
  });

  inflightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}
