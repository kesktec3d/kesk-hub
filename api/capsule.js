export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, send_at, config_code, shape, image_preview, message } = req.body;
  if (!email || !email.includes('@') || !send_at)
    return res.status(400).json({ error: 'Données invalides' });

  const sendDate = new Date(send_at);
  if (isNaN(sendDate) || sendDate <= new Date())
    return res.status(400).json({ error: 'Date invalide' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const id = 'caps-' + Date.now().toString(36);

  const capsule = {
    id, email, send_at: sendDate.toISOString(),
    config_code: config_code || null,
    shape: shape || 'Création Kesk',
    image_preview: image_preview || null,
    message: message || '',
    created_at: new Date().toISOString()
  };

  try {
    // Stocker avec TTL = durée jusqu'à la date + 30 jours de marge
    const ttl = Math.ceil((sendDate - new Date()) / 1000) + 2592000;
    await fetch(`${url}/set/capsule:${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(capsule), ex: ttl })
    });

    // Ajouter l'id dans la liste des capsules actives
    const listRes = await fetch(`${url}/get/capsule-list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const list = listData.result ? JSON.parse(listData.result) : [];
    list.push(id);
    await fetch(`${url}/set/capsule-list`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(list) })
    });

    return res.status(200).json({ success: true, id, send_at: sendDate.toISOString() });
  } catch(e) {
    console.error('capsule error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
