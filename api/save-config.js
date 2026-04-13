export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { config } = req.body;
  if (!config || typeof config !== 'object')
    return res.status(400).json({ error: 'Config manquante' });

  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = 'K-' + rand;
  const key = 'config:' + code;
  const value = JSON.stringify(config);

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    // Upstash REST : POST /pipeline pour SET + EXPIRE
    const r = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SET', key, value],
        ['EXPIRE', key, 63072000]
      ])
    });
    const data = await r.json();
    console.log('Upstash pipeline:', JSON.stringify(data));
    return res.status(200).json({ code });
  } catch (e) {
    console.error('save-config error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
