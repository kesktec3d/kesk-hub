export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt manquant' });

  try {
    const r = await fetch('https://api.meshy.ai/v2/text-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.MESHY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'preview',
        prompt: prompt + '. Objet imprimable en 3D, parois épaisses minimum 2mm, pas de parties flottantes.',
        art_style: 'realistic',
        negative_prompt: 'thin walls, floating parts, low quality, broken mesh'
      })
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
