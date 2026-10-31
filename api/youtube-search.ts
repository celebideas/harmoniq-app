export default async function handler(req: any, res: any) {
  try {
    const q = ((req.query?.q || (req.url && new URL(req.url, 'http://localhost').searchParams.get('q')) || '') as string).trim();
    if (!q) {
      if (res.status) {
        return res.status(400).json({ error: 'Missing query parameter q' });
      }
      return new Response(JSON.stringify({ error: 'Missing query parameter q' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ytRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      }
    );

    const text = await ytRes.text();
    const matches = text.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    const videoId = matches && matches[0] ? matches[0].replace(/"videoId":"|"/g, '') : null;

    if (res.status) {
      res.setHeader?.('Access-Control-Allow-Origin', '*');
      res.setHeader?.('Content-Type', 'application/json');
      return res.status(200).json({ videoId });
    }

    return new Response(JSON.stringify({ videoId }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    if (res?.status) {
      return res.status(200).json({ videoId: null, fallbackNotice: err?.message });
    }
    return new Response(JSON.stringify({ videoId: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
