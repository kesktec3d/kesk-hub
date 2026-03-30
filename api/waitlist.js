export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, type } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email invalide' });

  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        listIds: [3],
        attributes: { PRODUIT: type || 'Non précisé' },
        updateEnabled: true,
      }),
    });
    const data = await r.json();
    if (r.ok || r.status === 204) return res.status(200).json({ success: true });
    // Contact déjà existant = OK aussi
    if (data.code === 'duplicate_parameter') return res.status(200).json({ success: true });
    return res.status(500).json({ error: data.message || 'Erreur Brevo' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
