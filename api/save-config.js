export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { config } = req.body;
  if (!config || typeof config !== 'object')
    return res.status(400).json({ error: 'Config manquante' });

  // Générer un code court unique : K-XXXX (base36, 4 chars)
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = 'K-' + rand;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    // Stocker dans Upstash Redis avec TTL 2 ans (63072000 secondes)
    const r = await fetch(`${url}/set/config:${code}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(config), ex: 63072000 })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    return res.status(200).json({ code });
  } catch (e) {
    console.error('save-config error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
