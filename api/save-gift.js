export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { dest, occasion, budget, configurateur_url, emoji, label, from_name, message } = req.body;
  if (!configurateur_url) return res.status(400).json({ error: 'configurateur_url requis' });

  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = 'G-' + rand;
  const key = 'gift:' + code;
  const value = JSON.stringify({
    dest: dest || '',
    occasion: occasion || '',
    budget: budget || '',
    configurateur_url,
    emoji: emoji || '🎁',
    label: label || 'Création Kesk',
    from_name: from_name || '',
    message: message || '',
    created_at: new Date().toISOString()
  });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SET', key, value],
        ['EXPIRE', key, 31536000] // 365 days
      ])
    });
    return res.status(200).json({ code });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
