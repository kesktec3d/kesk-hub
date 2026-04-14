export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  try {
    const r = await fetch(`${url}/get/lunar:current`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (!data.result) return res.status(200).json({ active: false });
    const edition = JSON.parse(data.result);
    const now = new Date();
    const from = new Date(edition.active_from);
    const until = new Date(edition.active_until);
    const active = now >= from && now <= until;
    return res.status(200).json({ active, ...edition });
  } catch(e) {
    return res.status(200).json({ active: false });
  }
}
