export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    // Step 1: get last 50 codes (highest score = most recent)
    const zr = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['ZREVRANGE', 'gallery:codes', 0, 49, 'WITHSCORES']
      ])
    });
    const zdata = await zr.json();
    const raw = zdata[0]?.result || [];

    // raw is alternating [member, score, member, score, ...]
    const entries = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({ code: raw[i], ts: parseInt(raw[i + 1]) });
    }
    if (entries.length === 0) return res.status(200).json({ items: [] });

    // Step 2: batch GET all configs
    const pipeline = entries.map(e => ['GET', 'config:' + e.code]);
    const gr = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(pipeline)
    });
    const gdata = await gr.json();

    const items = entries
      .map((e, i) => {
        const raw = gdata[i]?.result;
        if (!raw) return null;
        try {
          return { code: e.code, config: JSON.parse(raw), created_at: new Date(e.ts).toISOString() };
        } catch { return null; }
      })
      .filter(Boolean);

    return res.status(200).json({ items });
  } catch(e) {
    console.error('gallery error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
