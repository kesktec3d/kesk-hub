export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { style, support, theme } = req.body;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Tu es un assistant créatif francophone. Génère 3 idées de descriptions courtes en FRANÇAIS (max 12 mots chacune) pour une image à imprimer sur ${support} en style artistique "${style}" avec le thème "${theme}". 
Réponds UNIQUEMENT avec un tableau JSON de 3 strings en français, sans aucun texte autour. Exemple: ["description 1", "description 2", "description 3"]`
        }]
      })
    });

    const data = await r.json();
    const text = data.content?.[0]?.text || '[]';
    const suggestions = JSON.parse(text.replace(/```json|```/g, '').trim());
    return res.status(200).json({ suggestions });

  } catch (e) {
    return res.status(200).json({
      suggestions: [
        'Un paysage montagneux au coucher du soleil, tons chauds',
        'Un animal majestueux dans la nature, lumière dorée',
        'Une scène poétique et intemporelle, atmosphère unique'
      ]
    });
  }
}
