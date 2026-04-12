export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, style } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt manquant' });

  try {
    // 1. Générer via Replicate flux-dev
    const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: '3:4',
          output_format: 'webp',
          output_quality: 90,
          num_outputs: 1,
          guidance: 3.5,
          num_inference_steps: 28,
        }
      })
    });

    const prediction = await replicateRes.json();
    if (prediction.error) throw new Error(prediction.error);

    let imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

    // Polling si pas encore terminé
    if (!imageUrl && prediction.id) {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_KEY}` }
        });
        const pd = await poll.json();
        if (pd.status === 'succeeded') { imageUrl = Array.isArray(pd.output) ? pd.output[0] : pd.output; break; }
        if (pd.status === 'failed') throw new Error('Replicate: génération échouée');
      }
    }

    if (!imageUrl) throw new Error('Image non générée');

    // 2. Upload Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'kesk-uv';

    const enc = new TextEncoder();
    const ck = await crypto.subtle.importKey('raw', enc.encode(apiSecret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', ck, enc.encode(`folder=${folder}&timestamp=${timestamp}`));
    const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');

    const fd = new FormData();
    fd.append('file', imageUrl);
    fd.append('api_key', apiKey);
    fd.append('timestamp', timestamp);
    fd.append('signature', signature);
    fd.append('folder', folder);

    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
    const cloudData = await cloudRes.json();
    if (cloudData.error) throw new Error('Cloudinary: ' + cloudData.error.message);

    return res.status(200).json({ url: cloudData.secure_url, public_id: cloudData.public_id });

  } catch (e) {
    console.error('generate-image error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
