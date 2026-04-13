export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  // GET — retourner les stats
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${url}/get/impact`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      const data = d.result ? JSON.parse(d.result) : { kg_total: 847, objets_total: 2103 };
      return res.status(200).json(data);
    } catch(e) {
      // Valeur par défaut si KV pas encore initialisé
      return res.status(200).json({ kg_total: 847, objets_total: 2103 });
    }
  }

  // POST — incrémenter (admin uniquement)
  if (req.method === 'POST') {
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    const { add_kg = 0.4, add_objets = 1 } = req.body;
    try {
      // Lire l'état actuel
      const r = await fetch(`${url}/get/impact`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      const current = d.result ? JSON.parse(d.result) : { kg_total: 847, objets_total: 2103 };
      const updated = {
        kg_total: Math.round((current.kg_total + add_kg) * 10) / 10,
        objets_total: current.objets_total + add_objets
      };
      await fetch(`${url}/set/impact`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify(updated) })
      });
      return res.status(200).json(updated);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
}
