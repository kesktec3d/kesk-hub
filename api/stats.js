export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const { type, action, session } = req.query;

  if (!type) return res.status(400).json({ error: 'type requis' });

  try {
    if (req.method === 'GET') {
      // Lire total + actifs
      const [totalRes, activeRes] = await Promise.all([
        fetch(`${url}/get/stats:${type}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${url}/keys/active:${type}:*`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const totalData = await totalRes.json();
      const activeData = await activeRes.json();
      const total = totalData.result ? parseInt(totalData.result) : 0;
      const active = activeData.result ? activeData.result.length : 0;
      return res.status(200).json({ total_created: total, active_now: active });
    }

    if (req.method === 'POST') {
      if (action === 'increment') {
        // Incrémenter total
        await fetch(`${url}/incr/stats:${type}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });
      } else if (action === 'active' && session) {
        // Enregistrer présence avec TTL 10 min
        await fetch(`${url}/pipeline`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify([
            ['SET', `active:${type}:${session}`, '1'],
            ['EXPIRE', `active:${type}:${session}`, 600]
          ])
        });
      }
      return res.status(200).json({ success: true });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
