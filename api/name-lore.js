export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { name } = req.body;
  if (!name || name.length < 2 || name.length > 30)
    return res.status(400).json({ error: 'Prénom invalide' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const cacheKey = 'name:' + name.toLowerCase().trim();

  try {
    // Vérifier le cache
    const cacheRes = await fetch(`${url}/get/${cacheKey}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const cacheData = await cacheRes.json();
    if (cacheData.result) {
      return res.status(200).json({ lore: cacheData.result });
    }

    // Appel Claude Haiku
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        messages: [{
          role: 'user',
          content: `Donne une phrase poétique de 15 mots maximum sur le prénom "${name}" : étymologie, histoire, ou évocation. En français. Sans guillemets. Sans majuscule au début.`
        }]
      })
    });
    const d = await r.json();
    const lore = d.content?.[0]?.text?.trim() || '';
    if (!lore) return res.status(200).json({ lore: '' });

    // Mettre en cache 30 jours
    await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SET', cacheKey, lore],
        ['EXPIRE', cacheKey, 2592000]
      ])
    });

    return res.status(200).json({ lore });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
