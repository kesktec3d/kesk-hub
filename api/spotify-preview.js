export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL manquante' });

  // Extraire le track ID depuis l'URL Spotify
  const match = url.match(/track\/([a-zA-Z0-9]+)/);
  if (!match) return res.status(400).json({ error: 'URL Spotify invalide' });
  const trackId = match[1];

  try {
    // Obtenir un token Spotify via client_credentials
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) throw new Error('Token Spotify invalide');

    // Récupérer les infos du track
    const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const track = await trackRes.json();

    return res.status(200).json({
      preview_url: track.preview_url || null,
      name: track.name,
      artist: track.artists?.[0]?.name || '',
      cover: track.album?.images?.[0]?.url || null
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
