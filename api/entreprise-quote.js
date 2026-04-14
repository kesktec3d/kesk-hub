export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, company, email, phone, quantity, animal, message } = req.body;

  if (!name || !email || !email.includes('@'))
    return res.status(400).json({ error: 'Données invalides.' });

  const ref = 'ENT-' + Date.now();
  const senderEmail = process.env.BREVO_SENDER || 'hello@kesk.ch';

  async function sendEmail(to, subject, html) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Kesk Studio', email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });
    return r.json();
  }

  const adminHtml = `<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto">
    <div style="background:#0e0d0c;padding:18px 24px;border-bottom:3px solid #F07060">
      <span style="background:#F07060;padding:5px 14px;border-radius:5px;font-weight:700;color:#fff">Kesk</span>
      &nbsp;<span style="color:#F7F3EE;font-size:15px;font-weight:600">Demande goodies entreprise</span>
      <div style="color:#9a948c;font-size:12px;margin-top:6px">Réf. <strong style="color:#F07060">${ref}</strong></div>
    </div>
    <div style="padding:20px 24px;background:#f8f6f3">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a948c;margin-bottom:10px;font-weight:600">Commande</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 0;color:#9a948c;width:130px">Animal(s)</td><td style="color:#1c1916;font-weight:600">${animal || '—'}</td></tr>
        <tr><td style="padding:4px 0;color:#9a948c">Quantité</td><td style="color:#1c1916;font-weight:600">${quantity || '—'} pièces</td></tr>
      </table>
    </div>
    <div style="padding:20px 24px;background:#fff">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a948c;margin-bottom:10px;font-weight:600">Client</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 0;color:#9a948c;width:130px">Nom</td><td style="color:#1c1916;font-weight:600">${name}</td></tr>
        ${company ? `<tr><td style="padding:4px 0;color:#9a948c">Entreprise</td><td style="color:#1c1916">${company}</td></tr>` : ''}
        <tr><td style="padding:4px 0;color:#9a948c">Email</td><td><a href="mailto:${email}" style="color:#F07060">${email}</a></td></tr>
        ${phone ? `<tr><td style="padding:4px 0;color:#9a948c">Tél.</td><td style="color:#1c1916">${phone}</td></tr>` : ''}
      </table>
      ${message ? `<div style="margin-top:10px;padding:10px 12px;background:#f8f6f3;border-left:3px solid #F07060"><div style="font-size:11px;color:#F07060;text-transform:uppercase;margin-bottom:4px">Message</div><div style="color:#1c1916;font-size:13px;line-height:1.6">${message.replace(/\n/g,'<br>')}</div></div>` : ''}
      <div style="margin-top:16px">
        <a href="mailto:${email}" style="display:inline-block;padding:10px 20px;background:#F07060;color:#fff;border-radius:7px;font-weight:700;font-size:13px;text-decoration:none">Répondre au client →</a>
      </div>
    </div>
    <div style="background:#f8f6f3;padding:10px;text-align:center">
      <p style="color:#9a948c;font-size:11px;margin:0">Kesk Studio · Route de Fully 21 · 1913 Saillon</p>
    </div>
  </div>`;

  const clientHtml = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
    <div style="background:#F07060;padding:18px 24px">
      <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:.05em">KESK</h1>
      <p style="color:rgba(255,255,255,.8);margin:3px 0 0;font-size:13px">Goodies 3D · Saillon, Valais</p>
    </div>
    <div style="padding:22px 24px;background:#fff">
      <p style="color:#1c1916;font-size:15px;margin:0 0 10px">Bonjour ${name},</p>
      <p style="color:#555;line-height:1.7;font-size:14px;margin:0 0 16px">Votre demande de devis a bien été reçue. Nous vous répondons sous <strong>48h ouvrables</strong> avec un rendu couleur personnalisé.</p>
      <div style="background:#FFF8F2;border-left:4px solid #F07060;padding:12px 14px;border-radius:0 6px 6px 0;margin-bottom:16px">
        <p style="margin:0 0 3px;font-size:11px;color:#9a948c;text-transform:uppercase">Récapitulatif</p>
        <p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Réf. :</strong> ${ref}</p>
        ${animal ? `<p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Modèle(s) :</strong> ${animal}</p>` : ''}
        ${quantity ? `<p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Quantité :</strong> ${quantity} pièces</p>` : ''}
        ${company ? `<p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Entreprise :</strong> ${company}</p>` : ''}
      </div>
      <p style="color:#9a948c;font-size:13px;margin:0">Questions : <a href="mailto:hello@kesk.ch" style="color:#F07060">hello@kesk.ch</a></p>
    </div>
    <div style="background:#f8f6f3;padding:10px;text-align:center;border-top:1px solid #e0dbd4">
      <p style="color:#9a948c;font-size:11px;margin:0">Kesk Studio · Route de Fully 21 · 1913 Saillon · Suisse</p>
    </div>
  </div>`;

  try {
    await sendEmail('hello@kesk.ch', `[Kesk Entreprises] Devis ${ref} — ${name}${company ? ' / ' + company : ''} — ${quantity || '?'} pièces`, adminHtml);
    await sendEmail(email, `Votre demande de goodies Kesk — Réf. ${ref}`, clientHtml);
    return res.status(200).json({ success: true, ref });
  } catch(e) {
    console.error('Email error:', e.message);
    return res.status(500).json({ error: 'Erreur envoi email : ' + e.message });
  }
}
