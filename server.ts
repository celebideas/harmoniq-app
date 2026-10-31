import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

// Explicitly allow Geolocation in Permissions-Policy for mobile & desktop browsers
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(self *)');
  next();
});

// API route for YouTube search resolver
// Helper to extract playlist ID from link or raw ID
function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const listParam = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listParam) return listParam[1];
  if (/^[a-zA-Z0-9_-]{12,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

// API route for YouTube playlist resolver
app.get('/api/youtube-playlist', async (req, res) => {
  try {
    const rawInput = (req.query.list || req.query.url) as string;
    if (!rawInput) {
      res.status(400).json({ error: 'Missing playlist URL or list ID' });
      return;
    }

    const playlistId = extractPlaylistId(rawInput);
    if (!playlistId) {
      res.status(400).json({ error: 'Geçersiz YouTube Music çalma listesi formatı.' });
      return;
    }

    const ytUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
    const ytRes = await fetch(ytUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const html = await ytRes.text();
    let playlistTitle = 'YouTube Music Çalma Listesi';
    let playlistDesc = 'YouTube Music üzerinden senkronize edildi';
    let playlistCover =
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
    const tracks: any[] = [];

    // Try parsing ytInitialData
    const jsonMatch =
      html.match(/var ytInitialData\s*=\s*({[\s\S]+?});<\/script>/) ||
      html.match(/ytInitialData\s*=\s*({[\s\S]+?});/);

    const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
    const clientVersion =
      html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/)?.[1] || '2.20261022.01.00';

    function extractContinuationToken(item: any): string | null {
      return (
        item?.continuationItemViewModel?.continuationCommand?.innertubeCommand?.continuationCommand?.token ||
        item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ||
        null
      );
    }

    function parseTrackFromItem(
      item: any,
      pId: string,
      idx: number,
      pTitle: string,
      defaultCover: string
    ) {
      let videoId = '';
      let rawTitle = '';
      let channel = '';
      let trackCover = defaultCover;
      let lengthSec = 210;

      if (item.playlistVideoRenderer) {
        const pvr = item.playlistVideoRenderer;
        videoId = pvr.videoId;
        rawTitle = pvr.title?.runs?.[0]?.text || pvr.title?.simpleText || '';
        channel = pvr.shortBylineText?.runs?.[0]?.text || 'YouTube Music';
        const thumbs = pvr.thumbnail?.thumbnails;
        if (thumbs && thumbs.length > 0) {
          trackCover = thumbs[thumbs.length - 1].url;
        }
        lengthSec = parseInt(pvr.lengthSeconds || '210', 10);
      } else if (item.lockupViewModel) {
        const lvm = item.lockupViewModel;
        videoId = lvm.contentId;
        rawTitle =
          lvm.metadata?.lockupMetadataViewModel?.title?.content ||
          lvm.rendererContext?.accessibilityContext?.label ||
          '';
        const subDesc =
          lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
        if (subDesc && subDesc[0]?.elements?.[0]?.text?.content) {
          channel = subDesc[0].elements[0].text.content;
        }
        const thumbs = lvm.contentImage?.thumbnailViewModel?.image?.sources;
        if (thumbs && thumbs.length > 0) {
          trackCover = thumbs[thumbs.length - 1].url;
        }
      }

      if (!videoId || rawTitle === '[Deleted video]' || rawTitle === '[Private video]') {
        return null;
      }

      const parts = rawTitle.split(/\s*[-–—:]\s*/);
      const artist =
        parts.length >= 2
          ? parts[0].trim()
          : channel
          ? channel.replace(/ - Topic$/, '').trim()
          : 'YouTube Music';
      const title = parts.length >= 2 ? parts.slice(1).join(' - ').trim() : rawTitle;

      return {
        id: `yt-sync-${pId}-${idx}-${videoId}`,
        title: title
          .replace(
            /\s*[\(\[](official\s*video|official\s*audio|4k|hd|remastered|lyrics|klip|video|audio|canlı|live)[\)\]]/gi,
            ''
          )
          .trim(),
        artist: artist || 'YouTube Music',
        album: pTitle,
        genre: 'YouTube Music Senkron',
        rawMediaTitle: rawTitle,
        coverGradient: 'from-red-900 to-neutral-950',
        coverUrl: trackCover,
        durationSeconds: isNaN(lengthSec) || lengthSec <= 0 ? 210 : lengthSec,
        bpm: 115,
        keyNote: 'A',
        catalogNumber: `YTM-${videoId}`,
        releaseYear: new Date().getFullYear(),
        soundType: 'rock',
        youtubeVideoId: videoId,
        timelineMarkers: [
          { second: 15, label: 'Giriş', emoji: '⚡' },
          { second: 60, label: 'Nakarat', emoji: '🔥' },
          { second: 120, label: 'Vokal', emoji: '✨' },
        ],
      };
    }

    if (jsonMatch && jsonMatch[1]) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        if (data.metadata?.playlistMetadataRenderer?.title) {
          playlistTitle = data.metadata.playlistMetadataRenderer.title;
        } else if (data.header?.playlistHeaderRenderer?.title?.simpleText) {
          playlistTitle = data.header.playlistHeaderRenderer.title.simpleText;
        } else if (data.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text) {
          playlistTitle = data.header.playlistHeaderRenderer.title.runs[0].text;
        }

        if (data.metadata?.playlistMetadataRenderer?.description) {
          playlistDesc = data.metadata.playlistMetadataRenderer.description;
        }

        const thumbList =
          data.microformat?.microformatDataRenderer?.thumbnail?.thumbnails ||
          data.header?.playlistHeaderRenderer?.playlistHeaderBanner?.heroPlaylistThumbnailRenderer
            ?.thumbnail?.thumbnails;
        if (thumbList && thumbList.length > 0) {
          playlistCover = thumbList[thumbList.length - 1].url;
        }

        // Extract playlist video items
        const isr =
          data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
            ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer;
        const initialItems: any[] =
          isr?.contents?.[0]?.playlistVideoListRenderer?.contents || isr?.contents || [];

        let continuationToken: string | null = null;

        for (const item of initialItems) {
          const track = parseTrackFromItem(
            item,
            playlistId,
            tracks.length,
            playlistTitle,
            playlistCover
          );
          if (track) tracks.push(track);
          const c = extractContinuationToken(item);
          if (c) continuationToken = c;
        }

        // Pagination loop: Fetch ALL remaining pages with no 100 limit!
        let pageCount = 0;
        while (continuationToken && apiKey && pageCount < 40) {
          try {
            const browseRes = await fetch(
              `https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  context: { client: { clientName: 'WEB', clientVersion } },
                  continuation: continuationToken,
                }),
              }
            );

            if (!browseRes.ok) break;
            const browseData = await browseRes.json();
            const actions = browseData.onResponseReceivedActions;
            const contItems =
              actions?.[0]?.appendContinuationItemsAction?.continuationItems || [];
            continuationToken = null;

            for (const it of contItems) {
              const track = parseTrackFromItem(
                it,
                playlistId,
                tracks.length,
                playlistTitle,
                playlistCover
              );
              if (track) tracks.push(track);
              const c = extractContinuationToken(it);
              if (c) continuationToken = c;
            }

            pageCount++;
          } catch (contErr) {
            console.warn('Playlist continuation fetch notice:', contErr);
            break;
          }
        }
      } catch (jsonErr) {
        console.warn('ytInitialData parse error:', jsonErr);
      }
    }

    // Fallback regex matching if tracks array is still empty
    if (tracks.length === 0) {
      const vidMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
      const uniqueVids = [...new Set(vidMatches)].slice(0, 100);

      uniqueVids.forEach((vid, idx) => {
        tracks.push({
          id: `yt-sync-${playlistId}-${idx}-${vid}`,
          title: `YouTube Parça #${idx + 1}`,
          artist: playlistTitle,
          album: playlistTitle,
          genre: 'YouTube Music',
          rawMediaTitle: `YouTube Track ${vid}`,
          coverGradient: 'from-red-900 to-neutral-950',
          coverUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
          durationSeconds: 210,
          bpm: 115,
          keyNote: 'C',
          catalogNumber: `YTM-${vid}`,
          releaseYear: new Date().getFullYear(),
          soundType: 'rock',
          youtubeVideoId: vid,
          timelineMarkers: [
            { second: 15, label: 'Giriş', emoji: '⚡' },
            { second: 60, label: 'Nakarat', emoji: '🔥' },
          ],
        });
      });
    }

    const totalSeconds = tracks.reduce((acc, t) => acc + (t.durationSeconds || 210), 0);
    const durationMin = Math.round(totalSeconds / 60);
    const durationFormatted =
      durationMin >= 60
        ? `${Math.floor(durationMin / 60)} sa ${durationMin % 60} dk`
        : `${durationMin} dk`;

    const playlist = {
      id: `yt-pl-${playlistId}`,
      title: playlistTitle,
      description: playlistDesc,
      coverUrl: tracks[0]?.coverUrl || playlistCover,
      trackCount: tracks.length,
      duration: durationFormatted,
      genre: 'YouTube Music Hesabım',
      source: 'youtube_music',
      isFavorite: true,
      updatedAt: 'Tam liste içe aktarıldı (Sınırsız)',
      tracks,
    };

    res.json({ playlist });
  } catch (err: any) {
    console.warn('Playlist resolver notice:', err);
    res.status(500).json({ error: 'Çalma listesi çözümlenemedi.' });
  }
});

// API route for YouTube channel / handle discovery (bypasses OAuth 403 restrictions for public channels/playlists)
app.get('/api/youtube-channel-sync', async (req, res) => {
  try {
    const rawHandle = ((req.query.handle || req.query.q || '') as string).trim();
    if (!rawHandle) {
      res.status(400).json({ error: 'Kullanıcı adı veya kanal bağlantısı gerekli.' });
      return;
    }

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    // Determine target URLs to inspect for playlists
    const cleanHandle = rawHandle
      .replace(/^https?:\/\/(www\.|music\.)?youtube\.com\//i, '')
      .replace(/\/(playlists|videos|featured|streams|channels).*$/i, '')
      .replace(/^@/, '')
      .trim();

    const urlsToTry = rawHandle.startsWith('http')
      ? [
          `${rawHandle.replace(/\/$/, '')}/playlists`,
          rawHandle.replace(/\/$/, ''),
        ]
      : [
          `https://www.youtube.com/@${encodeURIComponent(cleanHandle)}/playlists`,
          `https://www.youtube.com/@${encodeURIComponent(cleanHandle)}`,
        ];

    const discoveredPlaylistIds = new Set<string>();
    let channelTitle = cleanHandle;

    for (const url of urlsToTry) {
      try {
        const pageRes = await fetch(url, { headers });
        if (!pageRes.ok) continue;
        const html = await pageRes.text();

        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (titleMatch && titleMatch[1]) {
          channelTitle = titleMatch[1];
        }

        const plMatches = [
          ...html.matchAll(/"playlistId":"((?:PL|OLAK5uy_|FL|UU)[a-zA-Z0-9_-]{10,})"/g),
        ].map((m) => m[1]);

        for (const pid of plMatches) {
          if (!pid.startsWith('RD')) {
            discoveredPlaylistIds.add(pid);
          }
        }
        if (discoveredPlaylistIds.size > 0) break;
      } catch {
        // continue to next URL
      }
    }

    res.json({
      channelTitle,
      playlistIds: Array.from(discoveredPlaylistIds).slice(0, 10),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Kanal taranamadı.', playlistIds: [] });
  }
});

// API route for YouTube search resolver
app.get('/api/youtube-search', async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) {
      res.status(400).json({ error: 'Missing query' });
      return;
    }
    const ytRes = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
    const text = await ytRes.text();
    const matches = text.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    const videoId = matches && matches[0] ? matches[0].replace(/"videoId":"|"/g, '') : null;
    res.json({ videoId });
  } catch (err: any) {
    res.json({ videoId: null });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static assets from dist
    app.use(express.static(path.join(__dirname, 'dist')));

    // SPA fallback for all other routes
    app.get('*', (_req, res) => {
      const indexPath = path.join(__dirname, 'dist', 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          res.status(200).send('<!doctype html><html lang="tr"><head><title>Harmoniq</title></head><body>Harmoniq yükleniyor...</body></html>');
        }
      });
    });
  }

  if (process.env.NODE_ENV !== 'test') {
    app.listen(port, '0.0.0.0', () => {
      console.log(`Harmoniq server listening on port ${port}`);
    });
  }
}

startServer();

export default app;

