export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Code manquant' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    const r = await fetch(`${url}/get/config:${code.toUpperCase()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    console.log('Upstash load response:', JSON.stringify(data));
    if (!data.result) return res.status(404).json({ error: 'Config introuvable' });
    const config = JSON.parse(decodeURIComponent(data.result));
    return res.status(200).json({ config });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
