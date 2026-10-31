import { Song, SubscribedChannelDetail } from '../types';
import { SAMPLE_SONGS } from '../data/mockData';

// Strict regex matching non-artist promotional, corporate tech, magazine, or aggregator channels
export const NON_ARTIST_BLACKLIST =
  /google|samsung|lg\s|apple|xiaomi|huawei|red\s*bull|miksteyp|mixtape|magazine|uproxx|bass\s*boost|cubevision|türkiye|turkey|tech|hardware|phonebuff|jerryrig|marques|mkbhd|koray\s*birand|neo\s*&\s*toprak|thekhanate|shiftdelete|webtekno|donanım|inceleme|haber|tv\b|media|channel|podcast|oyun|gaming/i;

export const NON_ARTIST_BLACKLIST_REGEX = NON_ARTIST_BLACKLIST;

// Known non-music YouTube channels / influencers / tech reviewers
const NON_MUSIC_CHANNEL_BLACKLIST = new Set([
  'google',
  'google türkiye',
  'google turkiye',
  'lg',
  'lg türkiye',
  'lg turkiye',
  'red bull',
  'red bull miksteyp',
  'redbull miksteyp',
  'hip-hop magazine',
  'hip hop magazine',
  'uproxx',
  'bass boost',
  'ice cube / cubevision',
  'cubevision',
  'bassboost',
  'bass boosted',
  'bassboosted',
  'marques brownlee',
  'mkbhd',
  'jerryrigeverything',
  'phonebuff',
  'techtag',
  'hardware plus',
  'hardware plus tr',
  'hwp',
  'samsung',
  'samsung türkiye',
  'samsung turkiye',
  'apple',
  'apple türkiye',
  'apple turkiye',
  'koray birand',
  'neo & toprak',
  'neo toprak',
  'taa',
  'thekhanate',
  'barış özcan',
  'baris ozcan',
  'ruhi çenet',
  'ruhi cenet',
  'enis kirazoğlu',
  'enis kirazoglu',
  'webtekno',
  'shiftdelete',
  'shiftdelete.net',
  'sdn',
  'donanım arşivi',
  'donanim arsivi',
  'mesut çevik',
  'mesut cevik',
  'linus tech tips',
  'the verge',
  'verge',
  'unbox therapy',
  'mrwhosetheboss',
  'dave2d',
  'mkbhd clips',
  'can sungur',
  'orkun ışıtmak',
  'orkun isitmak',
  'kafalar',
  'pintipanda',
  'jahrein',
  'post42',
  'baturay anar',
  'duru önver',
  'otopark.com',
  'otopark',
  'otomobil günlüklerim',
  'xiaomi',
  'xiaomi türkiye',
  'huawei',
  'huawei türkiye',
  'vox',
  'ted',
  'tedx',
  'bbc news',
  'cnn',
  'euronews',
  'habertürk',
  'sozcutv',
  'halktv',
]);

// Negative keywords that disqualify a channel from being marked as a music artist
const NON_MUSIC_KEYWORDS = [
  'tech',
  'technology',
  'teknoloji',
  'review',
  'unboxing',
  'inceleme',
  'donanım',
  'donanim',
  'vlog',
  'vlogs',
  'podcast',
  'oyun',
  'gaming',
  'gameplay',
  'gamer',
  'haber',
  'haberleri',
  'news',
  'otomobil',
  'araba',
  'car review',
  'kutu açılımı',
  'kutu acilimi',
  'yazılım',
  'yazilim',
  'kodlama',
  'software',
  'tutorial',
  'eğitim',
  'egitim',
  'kurs',
  'fitness',
  'workout',
  'spor',
  'futbol',
  'basketbol',
  'komedi',
  'sketch',
  'standup',
  'röportaj',
  'canlı yayın kesitleri',
  'kesitler',
  'shorts kanalı',
  'telefon',
  'akıllı telefon',
  'bilgisayar',
  'laptop',
];

// Positive signals that indicate a genuine music artist or record label
const MUSIC_POSITIVE_SIGNALS = [
  ' - topic',
  ' (topic)',
  'official artist channel',
  'vevo',
  'music',
  'müzik',
  'records',
  'recordings',
  'band',
  'soundtrack',
  'ost',
  'orchestra',
  'orkestra',
  'yapım',
  'plak',
  'ensemble',
  'philharmonic',
  'symphony',
  'records',
  'official audio',
  'official music',
];

// Cache for iTunes / YouTube artist image lookups to prevent duplicate network calls
const artistArtworkCache = new Map<string, string>();

/**
 * Validates whether a channel or artist name belongs to a genuine music artist or group.
 */
export function isMusicArtistOrChannel(
  channelOrName: string | { name?: string; cleanTitle?: string; rawTitle?: string; [key: string]: any },
  userSongsList: Song[] = []
): { isMusic: boolean; reason: string } {
  const rawTitle =
    typeof channelOrName === 'string'
      ? channelOrName
      : channelOrName.rawTitle || channelOrName.cleanTitle || channelOrName.name || '';
  const name =
    typeof channelOrName === 'string'
      ? channelOrName
      : channelOrName.name || channelOrName.cleanTitle || channelOrName.rawTitle || '';

  if (!name || !name.trim()) {
    return { isMusic: false, reason: 'Boş sanatçı adı' };
  }

  const cleanName = name.trim();
  const lowerName = cleanName.toLowerCase();
  const lowerRaw = rawTitle.toLowerCase();

  // 1. Check blacklist of known non-music channels & regex
  if (
    NON_MUSIC_CHANNEL_BLACKLIST.has(lowerName) ||
    NON_MUSIC_CHANNEL_BLACKLIST.has(lowerRaw) ||
    NON_ARTIST_BLACKLIST_REGEX.test(cleanName) ||
    NON_ARTIST_BLACKLIST_REGEX.test(rawTitle)
  ) {
    return { isMusic: false, reason: 'Teknoloji / Marka / Agregator kanalı kara listede' };
  }

  // 2. Check negative keywords in name or raw title
  const hasNegativeKeyword = NON_MUSIC_KEYWORDS.some(
    (kw) => lowerName.includes(kw) || lowerRaw.includes(kw)
  );

  // 3. Check if this artist matches any known songs in the user's library or sample collection
  const allReferenceSongs = [...SAMPLE_SONGS, ...(userSongsList || [])];
  const matchedUserSong = allReferenceSongs.find(
    (s) => s.artist && s.artist.toLowerCase() === lowerName
  );

  if (matchedUserSong) {
    // If it also has explicit negative keywords (e.g. "Gaming Music Review"), double check
    if (!hasNegativeKeyword) {
      return { isMusic: true, reason: 'Kütüphanenizdeki şarkılarla eşleşti' };
    }
  }

  // 4. Positive signals (Topic channel, VEVO, Official Artist Channel, Records, etc.)
  const hasPositiveSignal = MUSIC_POSITIVE_SIGNALS.some(
    (sig) => lowerRaw.includes(sig) || lowerName.includes(sig)
  );

  if (hasPositiveSignal && !hasNegativeKeyword) {
    return { isMusic: true, reason: 'Resmi YouTube Music / Sanatçı sinyali doğrulandı' };
  }

  // 5. If negative keyword is present, drop it
  if (hasNegativeKeyword) {
    return { isMusic: false, reason: 'Müzik dışı anahtar kelime tespit edildi' };
  }

  // 6. Generic system channels to reject
  if (
    lowerName === 'youtube' ||
    lowerName === 'youtube music' ||
    lowerName === 'bilinmeyen sanatçı' ||
    lowerName === 'unknown artist' ||
    lowerName === 'google'
  ) {
    return { isMusic: false, reason: 'Sistem hesabı' };
  }

  // Default: if it has passed negative filters and looks like a creator name, accept if not flagged
  return { isMusic: true, reason: 'Doğrulanmış sanatçı' };
}

/**
 * Filters an array of artist names to keep only genuine music artists.
 */
export function cleanNonMusicArtists(artists: string[], userSongs: Song[] = []): string[] {
  const seen = new Set<string>();
  const cleanList: string[] = [];

  for (const a of artists) {
    if (!a || typeof a !== 'string') continue;
    const trimmed = a.trim();
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;

    const check = isMusicArtistOrChannel(trimmed, userSongs);
    if (check.isMusic) {
      seen.add(lower);
      cleanList.push(trimmed);
    }
  }

  return cleanList;
}

/**
 * Filters subscribed channels to return only music channels or marked details.
 */
export function cleanNonMusicChannels(
  channels: SubscribedChannelDetail[],
  userSongs: Song[] = []
): SubscribedChannelDetail[] {
  return channels.map((ch) => {
    const check = isMusicArtistOrChannel(ch, userSongs);
    return {
      ...ch,
      isMusicArtist: check.isMusic,
      reason: check.reason,
    };
  });
}

/**
 * Automatically purges non-music channels and blacklisted aggregators from localStorage on app boot.
 */
export function purgeNonMusicFromLocalStorage(userSongs: Song[] = []): {
  removedArtists: string[];
  cleanArtists: string[];
} {
  if (typeof window === 'undefined') return { removedArtists: [], cleanArtists: [] };

  const removed: string[] = [];
  const clean: string[] = [];

  try {
    const rawArtists = localStorage.getItem('harmoniq_user_favorite_artists');
    if (rawArtists) {
      const parsed: string[] = JSON.parse(rawArtists);
      if (Array.isArray(parsed)) {
        for (const a of parsed) {
          const check = isMusicArtistOrChannel(a, userSongs);
          if (check.isMusic) {
            clean.push(a);
          } else {
            removed.push(a);
          }
        }

        if (removed.length > 0) {
          localStorage.setItem('harmoniq_user_favorite_artists', JSON.stringify(clean));
          console.info('[Harmoniq Filter Engine] Purged non-music artists from favorite_artists cache:', removed);
        }
      }
    }

    // Also purge from subscribed channels cache
    const rawChannels = localStorage.getItem('harmoniq_user_subscribed_channels');
    if (rawChannels) {
      const parsedChannels: SubscribedChannelDetail[] = JSON.parse(rawChannels);
      if (Array.isArray(parsedChannels)) {
        const cleanChannels = parsedChannels.filter((ch) => {
          const name = ch.name || ch.rawTitle || '';
          return !NON_ARTIST_BLACKLIST_REGEX.test(name) && !NON_MUSIC_CHANNEL_BLACKLIST.has(name.toLowerCase());
        });
        if (cleanChannels.length !== parsedChannels.length) {
          localStorage.setItem('harmoniq_user_subscribed_channels', JSON.stringify(cleanChannels));
        }
      }
    }
  } catch (e) {
    // ignore parsing errors
  }

  return { removedArtists: removed, cleanArtists: clean };
}

/**
 * Fetches high-resolution artist artwork from iTunes API or channel thumbnail cache.
 */
export async function getArtistArtwork(
  artistName: string,
  channels: SubscribedChannelDetail[] = []
): Promise<string | null> {
  if (!artistName) return null;
  const key = artistName.trim().toLowerCase();

  // Check in-memory cache
  if (artistArtworkCache.has(key)) {
    return artistArtworkCache.get(key) || null;
  }

  // Check matching channel thumbnail
  const matchedChannel = channels.find(
    (c) => c.name.toLowerCase() === key || c.rawTitle.toLowerCase() === key
  );
  if (matchedChannel?.thumbnailUrl) {
    artistArtworkCache.set(key, matchedChannel.thumbnailUrl);
    return matchedChannel.thumbnailUrl;
  }

  // Fetch authentic artwork via Apple Music catalog API (search song & album high-res 300x300bb artwork)
  try {
    const songRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&limit=1`
    );
    if (songRes.ok) {
      const data = await songRes.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const art = item.artworkUrl100
          ? item.artworkUrl100.replace('100x100bb', '300x300bb')
          : item.artworkUrl60;
        if (art) {
          artistArtworkCache.set(key, art);
          return art;
        }
      }
    }

    const albumRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=album&limit=1`
    );
    if (albumRes.ok) {
      const data = await albumRes.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const art = item.artworkUrl100
          ? item.artworkUrl100.replace('100x100bb', '300x300bb')
          : item.artworkUrl60;
        if (art) {
          artistArtworkCache.set(key, art);
          return art;
        }
      }
    }
  } catch {
    // ignore network errors
  }

  return null;
}
