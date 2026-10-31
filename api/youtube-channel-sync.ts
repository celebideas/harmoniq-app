export default async function handler(req: any, res: any) {
  try {
    const rawHandle = (
      req.query?.handle ||
      req.query?.q ||
      (req.url && new URL(req.url, 'http://localhost').searchParams.get('handle')) ||
      (req.url && new URL(req.url, 'http://localhost').searchParams.get('q')) ||
      ''
    ).trim();

    if (!rawHandle) {
      if (res?.status) {
        return res.status(400).json({ error: 'Kullanıcı adı veya kanal bağlantısı gerekli.' });
      }
      return new Response(JSON.stringify({ error: 'Kullanıcı adı veya kanal bağlantısı gerekli.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    };

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
        // continue
      }
    }

    const result = {
      channelTitle,
      playlistIds: Array.from(discoveredPlaylistIds).slice(0, 10),
    };

    if (res?.status) {
      res.setHeader?.('Access-Control-Allow-Origin', '*');
      res.setHeader?.('Content-Type', 'application/json');
      return res.status(200).json(result);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    if (res?.status) {
      return res.status(500).json({ error: 'Kanal taranamadı.', playlistIds: [] });
    }
    return new Response(JSON.stringify({ error: 'Kanal taranamadı.', playlistIds: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
