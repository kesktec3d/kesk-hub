export const config = { api: { responseLimit: '20mb' } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL manquante' });

  try {
    const r = await fetch(decodeURIComponent(url));
    if (!r.ok) throw new Error('Fetch failed: ' + r.status);
    const buffer = await r.arrayBuffer();
    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(Buffer.from(buffer));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
