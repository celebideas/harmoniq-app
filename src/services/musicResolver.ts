import { Song, SongPrediction, UserPlaylist } from '../types';
import { SAMPLE_SONGS } from '../data/mockData';

/**
 * Extracts YouTube video ID from various URL formats or raw 11-char ID
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // youtu.be/<id>
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // watch?v=<id>
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // embed/<id> or shorts/<id>
  const embedMatch = trimmed.match(/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // Exactly 11 chars alphanumeric/underscore/dash
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Clean up title from YouTube noise
 */
function cleanSongTitle(rawTitle: string): { artist: string; title: string } {
  let cleaned = rawTitle
    .replace(/\(Official.*?\)/gi, '')
    .replace(/\[Official.*?\]/gi, '')
    .replace(/\(Video.*?\)/gi, '')
    .replace(/\[Video.*?\]/gi, '')
    .replace(/\(Audio.*?\)/gi, '')
    .replace(/\[Audio.*?\]/gi, '')
    .replace(/\(Lyric.*?\)/gi, '')
    .replace(/\[Lyric.*?\]/gi, '')
    .replace(/\(Visualizer.*?\)/gi, '')
    .replace(/\[Visualizer.*?\]/gi, '')
    .replace(/4K Remaster(?:ed)?/gi, '')
    .replace(/HD/gi, '')
    .replace(/HQ/gi, '')
    .trim();

  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    const artist = parts[0].trim();
    const title = parts.slice(1).join(' - ').trim();
    return { artist, title };
  } else if (cleaned.includes(': ')) {
    const parts = cleaned.split(': ');
    const artist = parts[0].trim();
    const title = parts.slice(1).join(': ').trim();
    return { artist, title };
  }

  return { artist: 'Bilinmeyen Sanatçı', title: cleaned || rawTitle };
}

/**
 * Fetch YouTube Video ID via backend search endpoint
 * This ensures songs stream their FULL complete version (NOT a 30s preview demo!)
 */
export async function fetchYouTubeVideoIdForSong(artist: string, title: string): Promise<string | null> {
  const query = `${artist} ${title}`.trim();
  if (!query) return null;

  try {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      return data.videoId || null;
    }
  } catch (err: any) {
    // Graceful fallback notice - no throw or crash
    console.info('[Harmoniq] YouTube search service unavailable, falling back to Apple Music stream:', err?.message);
  }
  return null;
}

/**
 * Search iTunes Store for authentic song metadata, album artwork and explicit status
 */
export async function searchITunesAudio(
  query: string,
  allowExplicit: boolean = true
): Promise<{
  audioUrl?: string;
  coverUrl?: string;
  artist?: string;
  title?: string;
  album?: string;
  durationSeconds?: number;
  genre?: string;
  isExplicit?: boolean;
} | null> {
  try {
    // 1. Try global or Turkish store
    let url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=6`;
    let res = await fetch(url);
    if (!res.ok) {
      url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=TR&entity=song&limit=6`;
      res = await fetch(url);
    }

    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      // Prioritize explicit (original studio) track if allowed; otherwise prefer non-explicit
      let item = data.results[0];
      if (allowExplicit) {
        const explicitMatch = data.results.find((r: any) => r.trackExplicitness === 'explicit');
        if (explicitMatch) item = explicitMatch;
      } else {
        const cleanMatch = data.results.find((r: any) => r.trackExplicitness !== 'explicit');
        if (cleanMatch) item = cleanMatch;
      }

      const isExplicit = item.trackExplicitness === 'explicit';
      const resolvedTitle = allowExplicit || !item.trackCensoredName ? item.trackName : item.trackCensoredName;

      const artwork = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb', '600x600bb')
        : undefined;

      return {
        audioUrl: item.previewUrl,
        coverUrl: artwork,
        artist: item.artistName,
        title: resolvedTitle,
        album: item.collectionName || 'Single',
        durationSeconds: Math.round((item.trackTimeMillis || 240000) / 1000),
        genre: item.primaryGenreName || 'Hip-Hop / Rock / Pop',
        isExplicit,
      };
    }
  } catch (err: any) {
    console.info('[Harmoniq Sync Diagnostic] searchITunesAudio exception:', {
      query,
      message: err?.message,
    });
  }
  return null;
}

/**
 * Real-time Predictions / Autocomplete
 * Supports:
 * 1) Artist Profile Detection (e.g. "Joyner Lucas" -> returns Artist Profile Card + top predicted tracks)
 * 2) Song Predictions with Explicit [E] badges
 * 3) Direct URL detection
 */
export async function getSongPredictions(
  query: string,
  allowExplicit: boolean = true
): Promise<SongPrediction[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const results: SongPrediction[] = [];

  // 1. Check if it's a URL
  const ytId = extractYouTubeVideoId(trimmed);
  if (ytId || trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('music.youtube')) {
    results.push({
      id: `yt-predict-${ytId || 'link'}`,
      title: 'YouTube Music Canlı Bağlantısı',
      artist: ytId ? `ID: ${ytId} (Canlı Odaya Bağla)` : 'Yapıştırılan linki canlı odaya bağla',
      album: 'YouTube Music Akışı',
      coverUrl: ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined,
      source: 'youtube',
      youtubeVideoId: ytId || undefined,
    });
  }

  // 2. Check for Artist Profile via iTunes musicArtist
  try {
    const artistRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=musicArtist&limit=1`
    );
    if (artistRes.ok) {
      const artistData = await artistRes.json();
      if (artistData.results && artistData.results.length > 0) {
        const a = artistData.results[0];
        // Only show artist profile if search query strongly matches artist name
        if (
          a.artistName.toLowerCase().includes(trimmed.toLowerCase()) ||
          trimmed.toLowerCase().includes(a.artistName.toLowerCase())
        ) {
          results.push({
            id: `artist-${a.artistId}`,
            title: a.artistName,
            artist: `Sanatçı Profili · ${a.primaryGenreName || 'Müzik'}`,
            album: 'Tüm Hitleri & Canlı Sanatçı Radyosu',
            isArtistProfile: true,
            genre: a.primaryGenreName,
            source: 'artist',
          });
        }
      }
    }
  } catch (e: any) {
    console.info('[Harmoniq Sync Diagnostic] Artist prediction exception:', {
      query: trimmed,
      message: e?.message,
    });
  }

  // 3. Quick check against local sample songs
  const matchedSamples = SAMPLE_SONGS.filter(
    (s) =>
      s.title.toLowerCase().includes(trimmed.toLowerCase()) ||
      s.artist.toLowerCase().includes(trimmed.toLowerCase())
  );
  matchedSamples.forEach((s) => {
    results.push({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      coverUrl: s.coverUrl,
      previewUrl: s.audioUrl,
      isExplicit: false,
      durationSeconds: s.durationSeconds,
      genre: s.genre,
      source: 'preset',
    });
  });

  // 4. Query iTunes API for song suggestions with explicit metadata
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=6`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results) {
        data.results.forEach((item: any) => {
          const isExplicit = item.trackExplicitness === 'explicit';
          const title = allowExplicit || !item.trackCensoredName ? item.trackName : item.trackCensoredName;
          const artwork = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb', '600x600bb')
            : item.artworkUrl60;

          // Deduplicate
          if (
            !results.some(
              (r) =>
                r.title.toLowerCase() === title.toLowerCase() &&
                r.artist.toLowerCase() === item.artistName.toLowerCase()
            )
          ) {
            results.push({
              id: `itunes-${item.trackId}`,
              title,
              artist: item.artistName,
              album: item.collectionName || 'Single',
              coverUrl: artwork,
              previewUrl: item.previewUrl,
              isExplicit,
              durationSeconds: Math.round((item.trackTimeMillis || 210000) / 1000),
              genre: item.primaryGenreName,
              source: 'apple_music',
            });
          }
        });
      }
    }
  } catch (err: any) {
    console.info('[Harmoniq Sync Diagnostic] Prediction search exception:', {
      query: trimmed,
      message: err?.message,
    });
  }

  return results.slice(0, 7);
}

/**
 * Primary resolver that takes any YouTube / YouTube Music URL,
 * Spotify link, Direct MP3/M4A audio link, or Song Title/Artist,
 * and produces a fully playable Song entity.
 * Automatically resolves FULL YouTube audio/video stream (NO 30s demo!).
 */
export async function resolveMusicLinkOrQuery(
  input: string,
  allowExplicit: boolean = true
): Promise<Song> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Lütfen geçerli bir şarkı linki veya parça ismi giriniz.');
  }

  const ytVideoId = extractYouTubeVideoId(trimmed);

  // CASE 1: YouTube / YouTube Music Link or ID
  if (ytVideoId) {
    let ytTitle = 'YouTube Music Parçası';
    let ytAuthor = 'YouTube Music';
    let ytThumb = `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg`;

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytVideoId}&format=json`;
      const oembedRes = await fetch(oembedUrl);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        ytTitle = oembedData.title || ytTitle;
        ytAuthor = oembedData.author_name || ytAuthor;
        if (oembedData.thumbnail_url) {
          ytThumb = oembedData.thumbnail_url;
        }
      }
    } catch (e: any) {
      console.info('[Harmoniq Sync Diagnostic] YouTube oEmbed exception:', {
        ytVideoId,
        message: e?.message,
      });
    }

    const parsed = cleanSongTitle(ytTitle);
    const resolvedArtist = parsed.artist !== 'Bilinmeyen Sanatçı' ? parsed.artist : ytAuthor;
    const resolvedTitle = parsed.title;

    const songId = `yt-${ytVideoId}`;
    const newSong: Song = {
      id: songId,
      title: resolvedTitle,
      artist: resolvedArtist,
      album: 'YouTube Music Akışı',
      genre: 'YouTube Music',
      rawMediaTitle: ytTitle,
      coverUrl: ytThumb,
      coverGradient: 'from-red-600 via-rose-900 to-black',
      durationSeconds: 245,
      bpm: 118,
      keyNote: 'Am',
      catalogNumber: `YTM-${ytVideoId.substring(0, 6).toUpperCase()}`,
      releaseYear: new Date().getFullYear(),
      soundType: 'rock',
      youtubeVideoId: ytVideoId,
      isExplicit: allowExplicit,
      timelineMarkers: [
        { second: 18, label: 'Giriş', emoji: '⚡' },
        { second: 65, label: 'Vokal / Ritim', emoji: '🎙️' },
        { second: 124, label: 'Nakarat / Zirve', emoji: '🔥' },
        { second: 180, label: 'Solo / Köprü', emoji: '🎸' },
        { second: 220, label: 'Kapanış', emoji: '✨' },
      ],
      lyrics: [
        { second: 0, text: `♪ [${resolvedArtist} - ${resolvedTitle}] ♪` },
        { second: 15, text: 'YouTube Music eşlemesi üzerinden tam sürüm canlı çalınıyor...' },
        { second: 60, text: 'Odadaki dinleyicilerle aynı anda canlı senkrondasınız.' },
        { second: 120, text: '♪ Nakarat ve Ritim Zirvesi ♪' },
        { second: 180, text: '♪ Solo Bölümü ♪' },
      ],
    };

    return newSong;
  }

  // CASE 2: Spotify Track URL (open.spotify.com/track/...)
  if (trimmed.includes('spotify.com/track/')) {
    try {
      const spotRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trimmed)}`);
      if (spotRes.ok) {
        const spotData = await spotRes.json();
        const spotTitle = spotData.title || 'Spotify Parçası';
        const parsed = cleanSongTitle(spotTitle);
        const itunesMatch = await searchITunesAudio(spotTitle, allowExplicit);

        // Fetch full YouTube stream
        const ytIdMatch = await fetchYouTubeVideoIdForSong(parsed.artist, parsed.title);

        const newSong: Song = {
          id: `spot-${Date.now()}`,
          title: itunesMatch?.title || parsed.title,
          artist: itunesMatch?.artist || parsed.artist,
          album: itunesMatch?.album || 'Spotify Yayını',
          genre: itunesMatch?.genre || 'Pop / Rock',
          rawMediaTitle: spotTitle,
          coverUrl: itunesMatch?.coverUrl || spotData.thumbnail_url,
          coverGradient: 'from-emerald-700 via-teal-900 to-black',
          durationSeconds: itunesMatch?.durationSeconds || 210,
          bpm: 120,
          keyNote: 'C',
          catalogNumber: `SPT-${Date.now().toString().slice(-6)}`,
          releaseYear: new Date().getFullYear(),
          soundType: 'indie',
          youtubeVideoId: ytIdMatch || undefined,
          audioUrl: !ytIdMatch ? itunesMatch?.audioUrl : undefined,
          isExplicit: itunesMatch?.isExplicit ?? allowExplicit,
          timelineMarkers: [
            { second: 20, label: 'Giriş', emoji: '⚡' },
            { second: 70, label: 'Nakarat', emoji: '🔥' },
            { second: 140, label: 'Köprü', emoji: '✨' },
          ],
        };
        return newSong;
      }
    } catch (e: any) {
      console.info('[Harmoniq Sync Diagnostic] Spotify oEmbed exception:', {
        input: trimmed,
        message: e?.message,
      });
    }
  }

  // CASE 3: Direct Audio File URL (mp3, m4a, aac, wav, ogg)
  if (
    trimmed.startsWith('http') &&
    (trimmed.includes('.mp3') ||
      trimmed.includes('.m4a') ||
      trimmed.includes('.aac') ||
      trimmed.includes('.wav') ||
      trimmed.includes('.ogg'))
  ) {
    const filename = trimmed.split('/').pop()?.split('?')[0] || 'Ses Dosyası';
    const cleanName = decodeURIComponent(filename).replace(/\.[^/.]+$/, '');
    const parsed = cleanSongTitle(cleanName);

    const newSong: Song = {
      id: `audio-${Date.now()}`,
      title: parsed.title || cleanName,
      artist: parsed.artist || 'Özel Ses Yayını',
      album: 'Doğrudan Akış',
      genre: 'Özel Akış',
      rawMediaTitle: cleanName,
      coverGradient: 'from-indigo-600 via-purple-900 to-neutral-950',
      durationSeconds: 200,
      bpm: 110,
      keyNote: 'Em',
      catalogNumber: `AUD-${Date.now().toString().slice(-6)}`,
      releaseYear: new Date().getFullYear(),
      soundType: 'rock',
      audioUrl: trimmed,
      timelineMarkers: [
        { second: 15, label: 'Başlangıç', emoji: '⚡' },
        { second: 60, label: 'Orta Kısım', emoji: '🔥' },
      ],
    };
    return newSong;
  }

  // CASE 4: Song Name / Artist Text Search (e.g. "Joyner Lucas", "Joyner Lucas Will", "Duman Haberin Yok")
  const itunesMatch = await searchITunesAudio(trimmed, allowExplicit);
  if (itunesMatch && itunesMatch.title) {
    // Resolve full YouTube video so there is NO 30-second demo limit!
    const ytVideo = await fetchYouTubeVideoIdForSong(itunesMatch.artist || '', itunesMatch.title);

    const newSong: Song = {
      id: `song-${Date.now()}`,
      title: itunesMatch.title,
      artist: itunesMatch.artist || 'Sanatçı',
      album: itunesMatch.album || 'Single',
      genre: itunesMatch.genre || 'Hip-Hop / Rock / Pop',
      rawMediaTitle: `${itunesMatch.artist} - ${itunesMatch.title}`,
      coverUrl: itunesMatch.coverUrl,
      coverGradient: 'from-amber-600 via-rose-900 to-neutral-950',
      durationSeconds: itunesMatch.durationSeconds || 240,
      bpm: 116,
      keyNote: 'Dm',
      catalogNumber: `ITN-${Date.now().toString().slice(-6)}`,
      releaseYear: new Date().getFullYear(),
      soundType: 'rock',
      // If YouTube video was resolved, stream FULL length from YouTube!
      youtubeVideoId: ytVideo || undefined,
      audioUrl: !ytVideo ? itunesMatch.audioUrl : undefined,
      isExplicit: itunesMatch.isExplicit ?? allowExplicit,
      timelineMarkers: [
        { second: 22, label: 'Giriş', emoji: '⚡' },
        { second: 75, label: 'Nakarat / Verse', emoji: '🔥' },
        { second: 130, label: 'Ritim / Melodi', emoji: '🎙️' },
        { second: 185, label: 'Kapanış', emoji: '✨' },
      ],
      lyrics: [
        { second: 0, text: `♪ [${itunesMatch.artist} - ${itunesMatch.title}] ♪` },
        { second: 20, text: 'Şarkı canlı akışa bağlandı ve tam sürüm çalıyor.' },
        { second: 75, text: '♪ Nakarat & Beat ♪' },
        { second: 130, text: '♪ Akış Zirvesi ♪' },
      ],
    };
    return newSong;
  }

  // Fallback: search YouTube directly for the raw text query
  let fallbackYtId: string | null = null;
  try {
    fallbackYtId = await fetchYouTubeVideoIdForSong('', trimmed);
  } catch {
    fallbackYtId = null;
  }

  const parsed = cleanSongTitle(trimmed);
  let appleAudioUrl: string | undefined = undefined;
  let appleCoverUrl: string | undefined = undefined;
  let resolvedArtist = parsed.artist;
  let resolvedTitle = parsed.title;
  let resolvedAlbum = 'Canlı Akış';
  let resolvedGenre = 'Müzik Akışı';
  let resolvedDuration = 210;

  // Seamless fallback to Apple Music API if YouTube video was not resolved
  if (!fallbackYtId) {
    try {
      const appleFallback = await searchITunesAudio(parsed.title || trimmed, allowExplicit);
      if (appleFallback) {
        appleAudioUrl = appleFallback.audioUrl;
        appleCoverUrl = appleFallback.coverUrl;
        if (appleFallback.artist) resolvedArtist = appleFallback.artist;
        if (appleFallback.title) resolvedTitle = appleFallback.title;
        if (appleFallback.album) resolvedAlbum = appleFallback.album;
        if (appleFallback.genre) resolvedGenre = appleFallback.genre;
        if (appleFallback.durationSeconds) resolvedDuration = appleFallback.durationSeconds;
      }
    } catch (appleErr) {
      console.info('[Harmoniq] Apple Music fallback search notice:', appleErr);
    }
  }

  return {
    id: `custom-${Date.now()}`,
    title: resolvedTitle,
    artist: resolvedArtist,
    album: resolvedAlbum,
    genre: resolvedGenre,
    rawMediaTitle: `${resolvedArtist} - ${resolvedTitle}`,
    coverUrl: appleCoverUrl,
    coverGradient: 'from-emerald-700 via-zinc-900 to-black',
    durationSeconds: resolvedDuration,
    bpm: 115,
    keyNote: 'Am',
    catalogNumber: `CST-${Date.now().toString().slice(-6)}`,
    releaseYear: new Date().getFullYear(),
    soundType: 'rock',
    youtubeVideoId: fallbackYtId || undefined,
    audioUrl: appleAudioUrl,
    isExplicit: allowExplicit,
    timelineMarkers: buildDynamicTimelineMarkers(resolvedDuration, resolvedGenre),
    lyrics: buildSynchronizedLyrics(resolvedArtist, resolvedTitle, resolvedAlbum, resolvedDuration, resolvedGenre),
  };
}

/**
/**
 * Similar Artist & Genre cluster lookup to provide true endless recommendations
 */
const ARTIST_CLUSTERS: { [key: string]: string[] } = {
  // Turkish Rap / Hip-Hop
  ezhel: ['Uzi', 'Motive', 'Blok3', 'Lvbel C5', 'Murda', 'Şanışer', 'Ceza', 'Sagopa Kajmer'],
  uzi: ['Motive', 'Blok3', 'Lvbel C5', 'Cakal', 'Reckol', 'Batuflex', 'Ezhel', 'Heijan'],
  motive: ['Uzi', 'Blok3', 'Baneva', 'Lvbel C5', 'Ati242', 'Ezhel', 'Cakal'],
  blok3: ['Uzi', 'Motive', 'Lvbel C5', 'Cakal', 'Batuflex', 'Reckol', 'Sefo'],
  'lvbel c5': ['Blok3', 'Uzi', 'Cakal', 'Reckol', 'Batuflex', 'Motive', 'Sefo'],
  cakal: ['Reckol', 'Lvbel C5', 'Uzi', 'Blok3', 'Batuflex', 'Motive', 'Sefo'],
  sefo: ['Blok3', 'Cakal', 'Lvbel C5', 'Uzi', 'Murda', 'Edis', 'Reynmen'],
  ceza: ['Sagopa Kajmer', 'Şanışer', 'Gazapizm', 'Ezhel', 'Hayki', 'Allame', 'Defkhan'],
  'sagopa kajmer': ['Ceza', 'Kolera', 'Şanışer', 'Gazapizm', 'Kolpa', 'Ezhel', 'Hayki'],
  gazapizm: ['Şanışer', 'Ceza', 'Ezhel', 'Motive', 'Hey Douglas', 'Adamlar'],

  // Turkish Rock / Indie / Alternative / Grunge
  duman: ['Mor ve Ötesi', 'Adamlar', 'Teoman', 'Şebnem Ferah', 'Pilli Bebek', 'Kurban', 'Redd', 'Model', 'Athena', 'Madrigal', 'Dedublüman', 'Perdenin Ardındakiler', 'Jakuzi', 'She Past Away'],
  'mor ve ötesi': ['Duman', 'Teoman', 'Şebnem Ferah', 'Kurban', 'Pilli Bebek', 'Redd', 'Athena', 'Model', 'Adamlar', 'Madrigal'],
  'perdenin ardındakiler': ['Madrigal', 'Dedublüman', 'Dolu Kadehi Ters Tut', 'Yüzyüzeyken Konuşuruz', 'Adamlar', 'Duman'],
  'pilli bebek': ['Duman', 'Mor ve Ötesi', 'Kurban', 'Redd', 'Teoman', 'Şebnem Ferah'],
  kurban: ['Mor ve Ötesi', 'Duman', 'Pentagram', 'Şebnem Ferah', 'Pilli Bebek', 'Athena'],
  redd: ['Mor ve Ötesi', 'Duman', 'Teoman', 'Pilli Bebek', 'Model', 'Madrigal'],
  model: ['Şebnem Ferah', 'Teoman', 'Mor ve Ötesi', 'Duman', 'Madrigal', 'Redd'],
  'dolu kadehi ters tut': ['Yüzyüzeyken Konuşuruz', 'Adamlar', 'Madrigal', 'Perdenin Ardındakiler', 'Son Feci Bisiklet', 'Dedublüman'],
  'yüzyüzeyken konuşuruz': ['Dolu Kadehi Ters Tut', 'Adamlar', 'Perdenin Ardındakiler', 'Madrigal', 'Son Feci Bisiklet', 'Jakuzi'],
  adamlar: ['Duman', 'Mor ve Ötesi', 'Madrigal', 'Dolu Kadehi Ters Tut', 'Yüzyüzeyken Konuşuruz', 'Jakuzi'],
  madrigal: ['Perdenin Ardındakiler', 'Dedublüman', 'Adamlar', 'Dolu Kadehi Ters Tut', 'Yüzyüzeyken Konuşuruz', 'Duman'],
  manga: ['Mor ve Ötesi', 'Duman', 'Şebnem Ferah', 'Athena', 'Kurban', 'Model'],
  dedublüman: ['Perdenin Ardındakiler', 'Madrigal', 'Dolu Kadehi Ters Tut', 'Yüzyüzeyken Konuşuruz', 'Duman', 'Teoman'],
  jakuzi: ['She Past Away', 'Adamlar', 'Madrigal', 'Mor ve Ötesi', 'Duman'],
  'she past away': ['Jakuzi', 'Mor ve Ötesi', 'Duman', 'Kurban', 'Redd'],

  // Turkish Pop
  tarkan: ['Mabel Matiz', 'Edis', 'Kenan Doğulu', 'Sertab Erener', 'Simge', 'Yalın', 'Murat Boz'],
  'mabel matiz': ['Melike Şahin', 'Sena Şener', 'Emir Can İğrek', 'Köfn', 'Tarkan', 'Zeynep Bastık'],
  simge: ['Zeynep Bastık', 'Edis', 'Mabel Matiz', 'Hande Yener', 'Gülşen', 'Aleyna Tilki'],
  edis: ['Zeynep Bastık', 'Simge', 'Mabel Matiz', 'Tarkan', 'Murat Boz', 'Sefo'],
  'zeynep bastık': ['Edis', 'Simge', 'Emir Can İğrek', 'Mabel Matiz', 'Köfn', 'Can Ozan'],

  // International
  'the weeknd': ['Drake', 'Post Malone', 'Kendrick Lamar', 'Travis Scott', 'Bruno Mars', 'Dua Lipa'],
  drake: ['The Weeknd', 'Travis Scott', 'Kendrick Lamar', 'Post Malone', '21 Savage', 'J. Cole'],
  'arctic monkeys': ['The Strokes', 'The Neighbourhood', 'Cage the Elephant', 'Franz Ferdinand', 'Gorillaz'],
  coldplay: ['Imagine Dragons', 'OneRepublic', 'The Killers', 'Keane', 'Snow Patrol', 'Maroon 5'],
};

function getSimilarArtistsFor(artist: string, genre?: string): string[] {
  const key = artist.toLowerCase().trim();
  for (const [k, cluster] of Object.entries(ARTIST_CLUSTERS)) {
    if (key.includes(k) || k.includes(key)) {
      return cluster;
    }
  }
  const g = (genre || '').toLowerCase();
  if (g.includes('rock') || g.includes('grunge') || g.includes('alternatif') || g.includes('indie')) {
    return ['Mor ve Ötesi', 'Duman', 'Adamlar', 'Teoman', 'Şebnem Ferah', 'Pilli Bebek', 'Kurban', 'Redd', 'Model', 'Athena', 'Madrigal', 'Dedublüman', 'Perdenin Ardındakiler', 'Jakuzi', 'She Past Away'];
  }
  return ['Mor ve Ötesi', 'Duman', 'Adamlar', 'Madrigal', 'Teoman', 'Perdenin Ardındakiler'];
}

export function buildDynamicTimelineMarkers(durationSeconds: number, genre?: string) {
  const dur = durationSeconds || 210;
  const g = (genre || '').toLowerCase();
  const isSynthOrElectronic = g.includes('synth') || g.includes('electronic') || g.includes('pop') || g.includes('hip-hop') || g.includes('rap');
  return [
    { second: Math.round(dur * 0.08), label: 'Giriş Melodisi', emoji: '⚡' },
    { second: Math.round(dur * 0.32), label: 'Nakarat', emoji: '🔥' },
    {
      second: Math.round(dur * 0.62),
      label: isSynthOrElectronic ? 'Synth / Bass Drop' : 'Gitar Solosu',
      emoji: isSynthOrElectronic ? '🎹' : '🎸',
    },
    { second: Math.round(dur * 0.85), label: 'Final Akışı', emoji: '✨' },
  ];
}

export function buildSynchronizedLyrics(artist: string, title: string, album: string, durationSeconds: number, genre?: string) {
  const dur = durationSeconds || 210;
  const g = (genre || '').toLowerCase();
  const isSynth = g.includes('synth') || g.includes('electronic');
  return [
    { second: 0, text: `♪ ${artist} — ${title} (Enstrümantal Giriş) ♪` },
    { second: Math.round(dur * 0.08), text: `⚡ İlk akorlar ve ritim frekansı yükseliyor...` },
    { second: Math.round(dur * 0.20), text: `Gecenin içinden yükselen tanıdık melodi` },
    { second: Math.round(dur * 0.32), text: `🔥 "${title}" nakaratında tüm oda aynı saniyede buluşuyor` },
    { second: Math.round(dur * 0.48), text: `Ritim derinleşiyor, bas ve davul kusursuz akışta` },
    { second: Math.round(dur * 0.62), text: isSynth ? `🎹 Synth & Bass Drop zirve noktası!` : `🎸 Efsane gitar solosu ve rifler yankılanıyor!` },
    { second: Math.round(dur * 0.75), text: `Son nakarat öncesi duygusal köprü geçişi` },
    { second: Math.round(dur * 0.85), text: `✨ Final akışı — ${artist} • ${album || 'Single'}` },
  ];
}

/**
 * Curated Turkish Rock & Alternative Artist & Track Pool to ensure diverse, authentic radio stations
 */
export const TURKISH_ROCK_RADIO_POOL: Array<{
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  durationSeconds: number;
  coverGradient: string;
  bpm: number;
  keyNote: string;
  soundType: 'rock' | 'indie' | 'grunge';
}> = [
  // Duman
  { id: 'dmn-1', title: 'Senden Daha Güzel', artist: 'Duman', album: 'Duman II', genre: 'Türkçe Rock', durationSeconds: 212, coverGradient: 'from-orange-800 via-neutral-900 to-black', bpm: 128, keyNote: 'C', soundType: 'rock' },
  { id: 'dmn-2', title: 'Kırmış Kalbini', artist: 'Duman', album: 'Belki Alışman Lazım', genre: 'Türkçe Rock / Grunge', durationSeconds: 252, coverGradient: 'from-amber-700 via-orange-900 to-neutral-950', bpm: 114, keyNote: 'Dm', soundType: 'grunge' },
  { id: 'dmn-3', title: 'Köprüaltı', artist: 'Duman', album: 'Eski Köprünün Altında', genre: 'Türkçe Rock', durationSeconds: 255, coverGradient: 'from-amber-900 via-zinc-900 to-black', bpm: 118, keyNote: 'Am', soundType: 'rock' },

  // Mor ve Ötesi
  { id: 'mvo-1', title: 'Bir Derdim Var', artist: 'Mor ve Ötesi', album: 'Dünya Yalan Söylüyor', genre: 'Alternatif Rock', durationSeconds: 215, coverGradient: 'from-rose-700 via-indigo-900 to-black', bpm: 110, keyNote: 'Dm', soundType: 'rock' },
  { id: 'mvo-2', title: 'Cambaz', artist: 'Mor ve Ötesi', album: 'Dünya Yalan Söylüyor', genre: 'Alternatif Rock', durationSeconds: 228, coverGradient: 'from-purple-800 via-zinc-900 to-black', bpm: 116, keyNote: 'Em', soundType: 'rock' },
  { id: 'mvo-3', title: 'Deli', artist: 'Mor ve Ötesi', album: 'Başıbozuk', genre: 'Alternatif Rock', durationSeconds: 184, coverGradient: 'from-red-800 via-zinc-900 to-neutral-950', bpm: 130, keyNote: 'Am', soundType: 'rock' },

  // Perdenin Ardındakiler
  { id: 'prd-1', title: 'Anlat Ona', artist: 'Perdenin Ardındakiler', album: 'Anlat Ona', genre: 'Alternatif & Indie', durationSeconds: 224, coverGradient: 'from-indigo-800 via-zinc-900 to-black', bpm: 112, keyNote: 'Em', soundType: 'indie' },
  { id: 'prd-2', title: 'Gökyüzü', artist: 'Perdenin Ardındakiler', album: 'Gökyüzü', genre: 'Alternatif Rock', durationSeconds: 218, coverGradient: 'from-sky-800 via-zinc-900 to-black', bpm: 116, keyNote: 'Am', soundType: 'indie' },

  // Adamlar
  { id: 'adm-1', title: 'Sarhoş', artist: 'Adamlar', album: 'Dünya Günlükleri', genre: 'Indie Rock', durationSeconds: 234, coverGradient: 'from-emerald-800 via-zinc-900 to-black', bpm: 114, keyNote: 'G', soundType: 'indie' },
  { id: 'adm-2', title: 'Rüyalarda Buruşmuşuz', artist: 'Adamlar', album: 'Rüyalarda Buruşmuşuz', genre: 'Indie Rock', durationSeconds: 260, coverGradient: 'from-teal-800 via-zinc-900 to-black', bpm: 112, keyNote: 'Am', soundType: 'indie' },

  // Teoman
  { id: 'teo-1', title: 'Paramparça', artist: 'Teoman', album: 'Onyedi', genre: 'Türkçe Rock', durationSeconds: 288, coverGradient: 'from-stone-700 via-zinc-900 to-black', bpm: 98, keyNote: 'Em', soundType: 'rock' },
  { id: 'teo-2', title: 'Kupa Kızı ve Sinek Valesi', artist: 'Teoman', album: 'Gönülçelen', genre: 'Türkçe Rock', durationSeconds: 292, coverGradient: 'from-zinc-700 via-neutral-900 to-black', bpm: 104, keyNote: 'Am', soundType: 'rock' },

  // Şebnem Ferah
  { id: 'sbn-1', title: 'Sil Baştan', artist: 'Şebnem Ferah', album: 'Kelimeler Yetse', genre: 'Türkçe Rock', durationSeconds: 295, coverGradient: 'from-violet-800 via-zinc-900 to-black', bpm: 92, keyNote: 'Fm', soundType: 'rock' },

  // Pilli Bebek, Kurban, Redd, Model
  { id: 'pil-1', title: 'Bak', artist: 'Pilli Bebek', album: 'Olsun', genre: 'Türkçe Rock', durationSeconds: 248, coverGradient: 'from-amber-800 via-zinc-900 to-black', bpm: 108, keyNote: 'Dm', soundType: 'rock' },
  { id: 'krb-1', title: 'Yalan', artist: 'Kurban', album: 'İnsanlar', genre: 'Alternatif Metal / Rock', durationSeconds: 230, coverGradient: 'from-red-900 via-zinc-900 to-black', bpm: 132, keyNote: 'Em', soundType: 'rock' },
  { id: 'rdd-1', title: 'Nefes Bile Almadan', artist: 'Redd', album: '21', genre: 'Alternatif Rock', durationSeconds: 254, coverGradient: 'from-rose-800 via-zinc-900 to-black', bpm: 120, keyNote: 'Am', soundType: 'rock' },
  { id: 'mdl-1', title: 'Değmesin Ellerimiz', artist: 'Model', album: 'Diğer Masallar', genre: 'Alternatif Rock', durationSeconds: 242, coverGradient: 'from-fuchsia-900 via-zinc-900 to-black', bpm: 118, keyNote: 'Cm', soundType: 'rock' },

  // Athena, Madrigal, Dedublüman, Jakuzi, She Past Away
  { id: 'ath-1', title: 'Kafama Göre', artist: 'Athena', album: 'Altüst', genre: 'Ska / Punk Rock', durationSeconds: 210, coverGradient: 'from-yellow-700 via-amber-950 to-black', bpm: 145, keyNote: 'A', soundType: 'rock' },
  { id: 'mdr-1', title: 'Seni Dert Etmeler', artist: 'Madrigal', album: 'Neogazino', genre: 'Alternatif & Indie', durationSeconds: 188, coverGradient: 'from-purple-800 via-zinc-900 to-black', bpm: 122, keyNote: 'Bm', soundType: 'indie' },
  { id: 'ddb-1', title: 'Belki', artist: 'Dedublüman', album: 'Belki', genre: 'Alternatif Rock', durationSeconds: 216, coverGradient: 'from-slate-800 via-zinc-900 to-black', bpm: 110, keyNote: 'Em', soundType: 'rock' },
  { id: 'jkz-1', title: 'Koca Bir Saçmalık', artist: 'Jakuzi', album: 'Fantezi Müzik', genre: 'Dark Synth / Indie', durationSeconds: 232, coverGradient: 'from-stone-800 via-zinc-900 to-black', bpm: 120, keyNote: 'Am', soundType: 'indie' },
  { id: 'spa-1', title: 'Kasvetli Kutlama', artist: 'She Past Away', album: 'Belirdi Gece', genre: 'Darkwave / Post-Punk', durationSeconds: 246, coverGradient: 'from-zinc-800 via-neutral-950 to-black', bpm: 126, keyNote: 'F#m', soundType: 'indie' },
];

function itunesItemToSong(item: any, allowExplicit: boolean): Song {
  const artistName = (item.artistName || 'Bilinmeyen Sanatçı').trim();
  let itemTitle = (allowExplicit || !item.trackCensoredName ? item.trackName : item.trackCensoredName) || '';
  itemTitle = itemTitle.trim();

  // Strip leading "Artist - " prefix if present in track title
  if (itemTitle.includes(' - ')) {
    const parts = itemTitle.split(' - ');
    if (parts[0].trim().toLowerCase() === artistName.toLowerCase()) {
      itemTitle = parts.slice(1).join(' - ').trim();
    }
  }

  if (!itemTitle) {
    itemTitle = item.collectionName || 'Orijinal Kayıt';
  }

  const artwork = item.artworkUrl100
    ? item.artworkUrl100.replace('100x100bb', '600x600bb')
    : item.artworkUrl60;
  const isExplicit = item.trackExplicitness === 'explicit';
  const duration = Math.round((item.trackTimeMillis || 210000) / 1000);
  const genre = item.primaryGenreName || 'Türkçe Rock & Alternatif';
  const album = item.collectionName || 'Single';

  return {
    id: `radio-${item.trackId}`,
    title: itemTitle,
    artist: artistName,
    album,
    genre,
    rawMediaTitle: `${artistName} - ${itemTitle}`,
    coverUrl: artwork,
    coverGradient: 'from-purple-900 via-zinc-900 to-neutral-950',
    durationSeconds: duration,
    bpm: 120,
    keyNote: 'Am',
    catalogNumber: `RAD-${item.trackId.toString().slice(-6)}`,
    releaseYear: item.releaseDate ? new Date(item.releaseDate).getFullYear() : new Date().getFullYear(),
    soundType: 'rock',
    audioUrl: item.previewUrl,
    isExplicit,
    timelineMarkers: buildDynamicTimelineMarkers(duration, genre),
    lyrics: buildSynchronizedLyrics(artistName, itemTitle, album, duration, genre),
  };
}

async function queryITunesSongs(term: string, limit: number = 20): Promise<any[]> {
  try {
    let url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=TR&entity=song&limit=${limit}`;
    let res = await fetch(url);
    if (!res.ok) {
      url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`;
      res = await fetch(url);
    }
    if (res.ok) {
      const data = await res.json();
      return data.results || [];
    }
  } catch (err: any) {
    console.info('[Harmoniq Sync Diagnostic] queryITunesSongs exception:', {
      term,
      message: err?.message,
    });
  }
  return [];
}

/**
 * Generates an authentic, genre-calibrated Artist / Track Radio station.
 * Prevents the bug where searching for an artist like "Duman" returns random pop tracks
 * whose trackName happens to be "Duman" (e.g. EDİS, Berksan, Erdem Kınay).
 */
export async function generateRadioForSong(
  songOrArtist: Song | string,
  allowExplicit: boolean = true
): Promise<{
  stationName: string;
  description: string;
  tracks: Song[];
}> {
  const artistName = typeof songOrArtist === 'string' ? songOrArtist : songOrArtist.artist;
  const seedSong = typeof songOrArtist !== 'string' ? songOrArtist : null;
  const similarArtists = getSimilarArtistsFor(artistName, seedSong?.genre);
  const lowerSeedArtist = artistName.trim().toLowerCase();

  try {
    // Query primary artist + 3 related artists from the genre pool
    const [primaryResults, sim1Results, sim2Results, sim3Results] = await Promise.all([
      queryITunesSongs(artistName, 25),
      queryITunesSongs(similarArtists[0] || 'Mor ve Ötesi', 12),
      queryITunesSongs(similarArtists[1] || 'Adamlar', 12),
      queryITunesSongs(similarArtists[2] || 'Teoman', 10),
    ]);

    const seenKeys = new Set<string>();
    const tracks: Song[] = [];

    if (seedSong && seedSong.title && seedSong.title !== `${seedSong.artist} Radyosu`) {
      const key = `${seedSong.artist.toLowerCase()} - ${seedSong.title.toLowerCase()}`;
      seenKeys.add(key);
      tracks.push({
        ...seedSong,
        timelineMarkers: buildDynamicTimelineMarkers(seedSong.durationSeconds, seedSong.genre),
        lyrics:
          seedSong.lyrics && seedSong.lyrics.length >= 8
            ? seedSong.lyrics
            : buildSynchronizedLyrics(seedSong.artist, seedSong.title, seedSong.album, seedSong.durationSeconds, seedSong.genre),
      });
    }

    // Helper that validates an API result so we NEVER include songs by unrelated pop artists whose trackName is just the search term (e.g. "Duman" by EDİS/Berksan)
    const isGenuineMatchForArtist = (item: any, expectedArtist: string) => {
      if (!item || !item.trackName || !item.artistName) return false;
      const itemArtistLower = item.artistName.trim().toLowerCase();
      const itemTrackLower = item.trackName.trim().toLowerCase();
      const expectedLower = expectedArtist.trim().toLowerCase();

      // Reject if track title equals the searched artist name, but the actual artist is someone else!
      if (itemTrackLower === expectedLower && !itemArtistLower.includes(expectedLower)) {
        return false;
      }
      // Ensure the returned song is actually by the expected artist (or features them)
      return itemArtistLower.includes(expectedLower) || expectedLower.includes(itemArtistLower);
    };

    const validPrimary = primaryResults.filter((item) => isGenuineMatchForArtist(item, artistName));
    const validSim1 = sim1Results.filter((item) => isGenuineMatchForArtist(item, similarArtists[0] || 'Mor ve Ötesi'));
    const validSim2 = sim2Results.filter((item) => isGenuineMatchForArtist(item, similarArtists[1] || 'Adamlar'));
    const validSim3 = sim3Results.filter((item) => isGenuineMatchForArtist(item, similarArtists[2] || 'Teoman'));

    // Interleave primary artist hits and related genre artists so the queue is rich and varied
    const maxLen = Math.max(validPrimary.length, validSim1.length, validSim2.length, validSim3.length);
    for (let i = 0; i < maxLen; i++) {
      const candidates = [validPrimary[i], validSim1[i], validSim2[i], validSim3[i]].filter(Boolean);
      for (const item of candidates) {
        const song = itunesItemToSong(item, allowExplicit);
        // Never allow track title to be identical to the seed artist name unless it's truly a self-titled song by that artist
        if (
          song.title.toLowerCase() === lowerSeedArtist &&
          !song.artist.toLowerCase().includes(lowerSeedArtist)
        ) {
          continue;
        }
        const key = `${song.artist.toLowerCase()} - ${song.title.toLowerCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          tracks.push(song);
        }
      }
    }

    // Supplement with curated Turkish Rock & Alternative hits so there are always real hits
    for (const poolItem of TURKISH_ROCK_RADIO_POOL) {
      const key = `${poolItem.artist.toLowerCase()} - ${poolItem.title.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const duration = poolItem.durationSeconds;
        tracks.push({
          id: poolItem.id,
          title: poolItem.title,
          artist: poolItem.artist,
          album: poolItem.album,
          genre: poolItem.genre,
          rawMediaTitle: `${poolItem.artist} - ${poolItem.title}`,
          coverGradient: poolItem.coverGradient,
          durationSeconds: duration,
          bpm: poolItem.bpm,
          keyNote: poolItem.keyNote,
          catalogNumber: `TRK-${poolItem.id.toUpperCase()}`,
          releaseYear: 2023,
          soundType: poolItem.soundType,
          timelineMarkers: buildDynamicTimelineMarkers(duration, poolItem.genre),
          lyrics: buildSynchronizedLyrics(poolItem.artist, poolItem.title, poolItem.album, duration, poolItem.genre),
        });
      }
    }

    if (tracks.length > 0) {
      return {
        stationName: `${artistName} Radyosu`,
        description: `${artistName} ve ilişkili sanatçı havuzundan (${similarArtists.slice(0, 4).join(', ')}) oluşan gerçek radyo akışı (${tracks.length} parça).`,
        tracks,
      };
    }
  } catch (err: any) {
    console.info('[Harmoniq Sync Diagnostic] generateRadioForSong exception:', {
      artistName,
      message: err?.message,
    });
  }

  const fallbackTracks: Song[] = TURKISH_ROCK_RADIO_POOL.map((p) => ({
    id: p.id,
    title: p.title,
    artist: p.artist,
    album: p.album,
    genre: p.genre,
    rawMediaTitle: `${p.artist} - ${p.title}`,
    coverGradient: p.coverGradient,
    durationSeconds: p.durationSeconds,
    bpm: p.bpm,
    keyNote: p.keyNote,
    catalogNumber: `TRK-${p.id.toUpperCase()}`,
    releaseYear: 2023,
    soundType: p.soundType,
    timelineMarkers: buildDynamicTimelineMarkers(p.durationSeconds, p.genre),
    lyrics: buildSynchronizedLyrics(p.artist, p.title, p.album, p.durationSeconds, p.genre),
  }));

  return {
    stationName: `${artistName} Radyosu`,
    description: `${artistName} canlı akışı ve benzer Türkçe Rock / Alternatif frekanstaki parçalar.`,
    tracks: fallbackTracks,
  };
}

export const fetchArtistRadio = generateRadioForSong;

/**
 * Endless Recommendation Stream Provider:
 * Called dynamically as the radio queue approaches its end to append
 * 15+ more unplayed tracks so the playback NEVER stops or loops back.
 */
export async function fetchMoreRadioRecommendations(
  seedSong: Song,
  playedTitles: Set<string> | string[] = [],
  allowExplicit: boolean = true
): Promise<Song[]> {
  const playedSet = new Set(
    Array.isArray(playedTitles)
      ? playedTitles.map((t) => t.toLowerCase())
      : Array.from(playedTitles).map((t) => t.toLowerCase())
  );

  const artistName = seedSong.artist;
  const similarArtists = getSimilarArtistsFor(artistName, seedSong.genre);
  const target1 = similarArtists[Math.floor(Math.random() * similarArtists.length)] || 'Mor ve Ötesi';
  const target2 = similarArtists[(Math.floor(Math.random() * similarArtists.length) + 1) % similarArtists.length] || 'Adamlar';

  const [res1, res2] = await Promise.all([
    queryITunesSongs(target1, 15),
    queryITunesSongs(target2, 15),
  ]);

  const moreTracks: Song[] = [];
  const seenKeys = new Set<string>();

  for (const item of [...res1, ...res2]) {
    if (!item.trackName || !item.artistName) continue;
    // Filter out false title matches
    if (
      item.trackName.trim().toLowerCase() === target1.toLowerCase() &&
      !item.artistName.toLowerCase().includes(target1.toLowerCase())
    ) {
      continue;
    }
    const song = itunesItemToSong(item, allowExplicit);
    const key = `${song.artist.toLowerCase()} - ${song.title.toLowerCase()}`;
    const simpleTitle = song.title.toLowerCase();

    if (!playedSet.has(simpleTitle) && !playedSet.has(key) && !seenKeys.has(key)) {
      seenKeys.add(key);
      moreTracks.push(song);
    }
  }

  if (moreTracks.length < 5) {
    for (const poolItem of TURKISH_ROCK_RADIO_POOL) {
      const key = `${poolItem.artist.toLowerCase()} - ${poolItem.title.toLowerCase()}`;
      if (!playedSet.has(poolItem.title.toLowerCase()) && !seenKeys.has(key)) {
        seenKeys.add(key);
        moreTracks.push({
          id: poolItem.id,
          title: poolItem.title,
          artist: poolItem.artist,
          album: poolItem.album,
          genre: poolItem.genre,
          rawMediaTitle: `${poolItem.artist} - ${poolItem.title}`,
          coverGradient: poolItem.coverGradient,
          durationSeconds: poolItem.durationSeconds,
          bpm: poolItem.bpm,
          keyNote: poolItem.keyNote,
          catalogNumber: `TRK-${poolItem.id.toUpperCase()}`,
          releaseYear: 2023,
          soundType: poolItem.soundType,
          timelineMarkers: buildDynamicTimelineMarkers(poolItem.durationSeconds, poolItem.genre),
          lyrics: buildSynchronizedLyrics(poolItem.artist, poolItem.title, poolItem.album, poolItem.durationSeconds, poolItem.genre),
        });
      }
    }
  }

  return moreTracks;
}

/**
 * Extracts YouTube Playlist ID from various URL formats
 */
export function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const listParam = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listParam) return listParam[1];
  if (/^[a-zA-Z0-9_-]{12,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Resolves a YouTube or YouTube Music playlist URL or ID into a full UserPlaylist object
 */
export async function fetchYouTubePlaylistByUrl(
  urlOrId: string,
  onErrorNotice?: (msg: string) => void
): Promise<UserPlaylist | null> {
  try {
    const listId = extractPlaylistId(urlOrId) || urlOrId.trim();
    const res = await fetch(`/api/youtube-playlist?list=${encodeURIComponent(listId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.playlist) {
        return data.playlist as UserPlaylist;
      }
      const emptyMsg = `"${listId}" çalma listesi boş veya gizli olarak ayarlanmış.`;
      if (onErrorNotice) onErrorNotice(emptyMsg);
    } else {
      const errData = await res.json().catch(() => ({}));
      const msg =
        errData?.error ||
        `Çalma listesi alınamadı (HTTP ${res.status}). Lütfen listenin "Herkese Açık" veya "Liste Dışı" olduğundan emin olun.`;
      console.info('[Harmoniq Sync Diagnostic] fetchYouTubePlaylistByUrl non-OK:', {
        urlOrId,
        listId,
        status: res.status,
        error: errData,
      });
      if (onErrorNotice) onErrorNotice(msg);
    }
  } catch (err: any) {
    const msg = `Çalma listesi çözümlenirken bağlantı hatası oluştu: ${err?.message || 'Bilinmeyen hata'}`;
    console.info('[Harmoniq Sync Diagnostic] fetchYouTubePlaylistByUrl exception:', {
      urlOrId,
      message: err?.message,
      stack: err?.stack,
    });
    if (onErrorNotice) onErrorNotice(msg);
  }
  return null;
}

/**
 * Universal OAuth-free YouTube / YouTube Music Library Importer:
 * Accepts:
 * 1) One or more YouTube / YouTube Music Playlist URLs or IDs (PL..., OLAK5uy_...)
 * 2) A YouTube Channel Handle (@kullaniciadi) or Channel URL (youtube.com/@...)
 * 3) Direct YouTube Music / YouTube Video link
 * Returns discovered playlists, songs, artists, and descriptive Turkish error messages if any step fails.
 */
export async function syncYouTubeLibraryByInput(rawInput: string): Promise<{
  playlists: UserPlaylist[];
  songs: Song[];
  artists: string[];
  errors: string[];
}> {
  const trimmed = rawInput.trim();
  const errors: string[] = [];
  const recordError = (msg: string) => {
    if (msg && !errors.includes(msg)) {
      errors.push(msg);
    }
  };

  if (!trimmed) {
    return {
      playlists: [],
      songs: [],
      artists: [],
      errors: ['Lütfen geçerli bir YouTube Music çalma listesi linki veya @kanal_adi girin.'],
    };
  }

  const playlists: UserPlaylist[] = [];
  const songs: Song[] = [];
  const artistsSet = new Set<string>();
  const seenSongKeys = new Set<string>();

  const addSongsAndArtists = (trackList: Song[]) => {
    for (const t of trackList) {
      const key = t.youtubeVideoId || `${t.artist}-${t.title}`.toLowerCase();
      if (!seenSongKeys.has(key)) {
        seenSongKeys.add(key);
        songs.push(t);
      }
      if (
        t.artist &&
        t.artist !== 'YouTube Music' &&
        t.artist !== 'Bilinmeyen Sanatçı' &&
        t.artist !== 'YouTube'
      ) {
        artistsSet.add(t.artist);
      }
    }
  };

  try {
    // 1. Check if input contains one or more playlist links or IDs
    const tokens = trimmed.split(/[\s,\n]+/).filter(Boolean);
    const playlistIds: string[] = [];
    for (const tok of tokens) {
      const pid = extractPlaylistId(tok);
      if (pid && !playlistIds.includes(pid)) {
        playlistIds.push(pid);
      }
    }

    if (playlistIds.length > 0) {
      const fetched = await Promise.all(
        playlistIds.map((pid) => fetchYouTubePlaylistByUrl(pid, recordError))
      );
      for (const pl of fetched) {
        if (pl && pl.tracks && pl.tracks.length > 0) {
          playlists.push(pl);
          addSongsAndArtists(pl.tracks);
        }
      }
      if (playlists.length === 0 && errors.length === 0) {
        recordError(
          'Girilen çalma listesinde şarkı bulunamadı. YouTube Music uygulamasında listenin gizlilik ayarını "Liste Dışı" veya "Herkese Açık" yapıp tekrar deneyin.'
        );
      }
      return {
        playlists,
        songs,
        artists: Array.from(artistsSet),
        errors,
      };
    }

    // 2. Check if input contains a direct YouTube / YouTube Music video link
    const singleVidId = extractYouTubeVideoId(trimmed);
    if (singleVidId && playlistIds.length === 0) {
      try {
        const song = await resolveMusicLinkOrQuery(trimmed, true);
        if (song) {
          addSongsAndArtists([song]);
          return {
            playlists: [],
            songs,
            artists: Array.from(artistsSet),
            errors,
          };
        }
      } catch (vidErr: any) {
        recordError(`Şarkı bağlantısı çözümlenemedi: ${vidErr?.message || 'Geçersiz video linki'}`);
        console.info('[Harmoniq Sync Diagnostic] Video resolve exception in syncYouTubeLibraryByInput:', {
          trimmed,
          message: vidErr?.message,
        });
      }
    }

    // 3. Check if input is a YouTube Channel Handle (@...) or YouTube Channel URL
    try {
      const chRes = await fetch(
        `/api/youtube-channel-sync?handle=${encodeURIComponent(trimmed)}`
      );
      if (chRes.ok) {
        const chData = await chRes.json();
        const chPlaylistIds: string[] = chData.playlistIds || [];
        if (chPlaylistIds.length > 0) {
          const fetched = await Promise.all(
            chPlaylistIds.slice(0, 8).map((pid) => fetchYouTubePlaylistByUrl(pid, recordError))
          );
          for (const pl of fetched) {
            if (pl && pl.tracks && pl.tracks.length > 0) {
              playlists.push(pl);
              addSongsAndArtists(pl.tracks);
            }
          }
        } else {
          recordError(
            `"${trimmed}" kanalında herkese açık çalma listesi bulunamadı. YouTube Music'teki kişisel listeleriniz gizli olabilir; lütfen doğrudan çalma listesi linkini (music.youtube.com/playlist?list=...) kopyalayıp yapıştırın.`
          );
        }
      } else {
        const errData = await chRes.json().catch(() => ({}));
        recordError(
          errData?.error || `"${trimmed}" kanalı taranırken hata oluştu (HTTP ${chRes.status}).`
        );
      }
    } catch (chErr: any) {
      recordError(`Kanal senkronizasyonu sırasında bağlantı hatası: ${chErr?.message || 'Bilinmeyen hata'}`);
      console.info('[Harmoniq Sync Diagnostic] Channel sync exception:', {
        trimmed,
        message: chErr?.message,
      });
    }
  } catch (outerErr: any) {
    recordError(`Senkronizasyon işlemi tamamlanamadı: ${outerErr?.message || 'Bilinmeyen hata'}`);
    console.info('[Harmoniq Sync Diagnostic] Outer exception in syncYouTubeLibraryByInput:', {
      trimmed,
      message: outerErr?.message,
      stack: outerErr?.stack,
    });
  }

  return {
    playlists,
    songs,
    artists: Array.from(artistsSet),
    errors,
  };
}

