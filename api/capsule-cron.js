// Cron job quotidien — envoie les capsules arrivées à échéance
// Configurer dans vercel.json : { "crons": [{ "path": "/api/capsule-cron", "schedule": "0 8 * * *" }] }

export default async function handler(req, res) {
  // Vérifier que c'est bien un appel Vercel Cron ou admin
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && 
      req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const brevoKey = process.env.BREVO_API_KEY;
  const now = new Date();
  let sent = 0, errors = 0;

  try {
    // Lire la liste des capsules
    const listRes = await fetch(`${url}/get/capsule-list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const list = listData.result ? JSON.parse(listData.result) : [];
    if (!list.length) return res.status(200).json({ sent: 0, message: 'Aucune capsule' });

    const remaining = [];

    for (const id of list) {
      try {
        const capRes = await fetch(`${url}/get/capsule:${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const capData = await capRes.json();
        if (!capData.result) continue; // expirée

        const cap = JSON.parse(capData.result);
        const sendDate = new Date(cap.send_at);

        if (sendDate > now) {
          remaining.push(id); // pas encore l'heure
          continue;
        }

        // Envoyer l'email capsule
        const shareUrl = cap.config_code ? `https://kesk-hub.vercel.app/?config=${cap.config_code}` : 'https://kesk-hub.vercel.app';
        const emailHtml = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
          <div style="background:#0e0d0c;padding:24px;text-align:center">
            <span style="font-family:'Georgia',serif;font-size:28px;color:#F7F3EE;letter-spacing:.05em">Kesk<span style="color:#B85C38">.</span></span>
          </div>
          <div style="padding:32px 24px;background:#F7F3EE">
            <div style="font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#9a948c;margin-bottom:12px">Capsule temporelle</div>
            <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400;color:#1c1916;margin:0 0 16px">Il y a quelque temps, tu avais créé quelque chose.</h1>
            ${cap.image_preview ? `<img src="${cap.image_preview}" style="width:100%;border-radius:10px;margin-bottom:20px;display:block"/>` : ''}
            <p style="font-size:14px;color:#5a5550;line-height:1.7;margin:0 0 12px">Ta création <strong>${cap.shape}</strong> t'attend.</p>
            ${cap.message ? `<div style="padding:14px;background:#fff;border-left:3px solid #B85C38;border-radius:4px;font-size:13px;color:#5a5550;font-style:italic;margin-bottom:20px">"${cap.message}"</div>` : ''}
            <a href="${shareUrl}" style="display:inline-block;padding:14px 28px;background:#B85C38;color:#fff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:20px">Retrouver ma création →</a>
            <p style="font-size:12px;color:#9a948c;margin:0">Fabriqué à Saillon, Valais · <a href="https://kesk.ch" style="color:#B85C38">kesk.ch</a></p>
          </div>
        </div>`;

        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'Kesk Studio', email: 'hello@kesk.ch' },
            to: [{ email: cap.email }],
            subject: `Ta capsule Kesk est arrivée ✦ — ${cap.shape}`,
            htmlContent: emailHtml
          })
        });

        // Supprimer la capsule envoyée
        await fetch(`${url}/del/capsule:${id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });

        sent++;
      } catch(e) {
        console.error('capsule send error:', id, e.message);
        remaining.push(id);
        errors++;
      }
    }

    // Mettre à jour la liste
    await fetch(`${url}/set/capsule-list`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(remaining) })
    });

    return res.status(200).json({ sent, errors, remaining: remaining.length });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
