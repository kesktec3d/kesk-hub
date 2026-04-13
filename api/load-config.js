export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Code manquant' });

  const key = 'config:' + code.toUpperCase();
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    const r = await fetch(`${url}/get/${key}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    console.log('Upstash get:', JSON.stringify(data));
    if (!data.result) return res.status(404).json({ error: 'Config introuvable' });
    const config = JSON.parse(data.result);
    return res.status(200).json({ config });
  } catch (e) {
    console.error('load-config error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
