import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, company, email, phone, address, message,
    shape, texture, texamp, dims, color, lh, layers, wall, bottom,
    filename, stl_base64
  } = req.body;

  if (!name || !email || !email.includes('@'))
    return res.status(400).json({ error: 'Données invalides.' });

  const ref = 'JAR-' + Date.now();
  const senderEmail = process.env.BREVO_SENDER || 'hello@kesk.ch';

  // Upload STL vers Cloudinary
  let stl_url = '';
  if (stl_base64) {
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = 'kesk-stl';
      const publicId = ref;
      const paramsString = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(paramsString).digest('hex');

      const fd = new FormData();
      fd.append('file', `data:application/octet-stream;base64,${stl_base64}`);
      fd.append('api_key', apiKey);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);
      fd.append('folder', folder);
      fd.append('public_id', publicId);
      fd.append('resource_type', 'raw');

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, { method: 'POST', body: fd });
      const cloudData = await cloudRes.json();
      if (cloudData.secure_url) stl_url = cloudData.secure_url;
      console.log('STL upload:', cloudData.secure_url || cloudData.error?.message);
    } catch(e) { console.log('STL upload error:', e.message); }
  }

  const swatches = { blanc:'#eeeae4', white:'#eeeae4', gris:'#909088', grey:'#909088',
    noir:'#28272a', black:'#28272a', rouge:'#b02015', red:'#b02015',
    bleu:'#182f80', blue:'#182f80', vert:'#165e22', green:'#165e22' };
  const hex = swatches[(color||'').toLowerCase()] || '#ccc';
  const sw = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${hex};border:1px solid #ccc;vertical-align:middle;margin-right:5px"></span>`;

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
    const data = await r.json();
    console.log('Brevo:', JSON.stringify(data));
    return data;
  }

  const adminHtml = `<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto">
    <div style="background:#0e0d0c;padding:18px 24px;border-bottom:3px solid #B85C38">
      <span style="background:#B85C38;padding:5px 14px;border-radius:5px;font-weight:700;color:#fff">Kesk</span>
      &nbsp;<span style="color:#F7F3EE;font-size:15px;font-weight:600">Demande vase & pied de table</span>
      <div style="color:#9a948c;font-size:12px;margin-top:6px">Réf. <strong style="color:#B85C38">${ref}</strong></div>
    </div>
    <div style="padding:20px 24px;background:#f8f6f3">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a948c;margin-bottom:10px;font-weight:600">Configuration</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 0;color:#9a948c;width:130px">Forme</td><td style="color:#1c1916;font-weight:600">${shape||'—'}</td></tr>
        <tr><td style="padding:4px 0;color:#9a948c">Texture</td><td style="color:#1c1916">${texture||'—'} (amp. ${texamp||'—'} mm)</td></tr>
        <tr><td style="padding:4px 0;color:#9a948c">Dimensions</td><td style="color:#1c1916;font-weight:600">${dims||'—'}</td></tr>
        <tr><td style="padding:4px 0;color:#9a948c">Couleur</td><td style="color:#1c1916">${sw}${color||'—'}</td></tr>
        <tr><td style="padding:4px 0;color:#9a948c">Haut. couche</td><td style="color:#1c1916">${lh||'—'} mm (~${layers||'—'} couches)</td></tr>
        <tr><td style="padding:4px 0;color:#9a948c">Paroi / Fond</td><td style="color:#1c1916">${wall||'10'} / ${bottom||'10'} mm</td></tr>
        ${stl_url ? `<tr><td style="padding:4px 0;color:#9a948c">Fichier STL</td><td><a href="${stl_url}" style="color:#B85C38;font-weight:700">${filename||'model.stl'} — Télécharger ↓</a></td></tr>` : ''}
      </table>
    </div>
    <div style="padding:20px 24px;background:#fff">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a948c;margin-bottom:10px;font-weight:600">Client</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 0;color:#9a948c;width:130px">Nom</td><td style="color:#1c1916;font-weight:600">${name}</td></tr>
        ${company ? `<tr><td style="padding:4px 0;color:#9a948c">Entreprise</td><td style="color:#1c1916">${company}</td></tr>` : ''}
        <tr><td style="padding:4px 0;color:#9a948c">Email</td><td><a href="mailto:${email}" style="color:#B85C38">${email}</a></td></tr>
        ${phone ? `<tr><td style="padding:4px 0;color:#9a948c">Tél.</td><td style="color:#1c1916">${phone}</td></tr>` : ''}
        ${address ? `<tr><td style="padding:4px 0;color:#9a948c">Adresse</td><td style="color:#1c1916">${address}</td></tr>` : ''}
      </table>
      ${message ? `<div style="margin-top:10px;padding:10px 12px;background:#f8f6f3;border-left:3px solid #B85C38"><div style="font-size:11px;color:#B85C38;text-transform:uppercase;margin-bottom:4px">Message</div><div style="color:#1c1916;font-size:13px;line-height:1.6">${message.replace(/\n/g,'<br>')}</div></div>` : ''}
      <div style="margin-top:16px">
        <a href="mailto:${email}" style="display:inline-block;padding:10px 20px;background:#B85C38;color:#fff;border-radius:7px;font-weight:700;font-size:13px;text-decoration:none">Répondre au client →</a>
      </div>
    </div>
    <div style="background:#f8f6f3;padding:10px;text-align:center">
      <p style="color:#9a948c;font-size:11px;margin:0">Kesk Studio · Route de Fully 21 · 1913 Saillon</p>
    </div>
  </div>`;

  const clientHtml = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
    <div style="background:#0e0d0c;padding:18px 24px">
      <h1 style="color:#F7F3EE;margin:0;font-size:18px;font-family:Georgia,serif">Kesk<span style="color:#B85C38">.</span></h1>
      <p style="color:rgba(247,243,238,.6);margin:3px 0 0;font-size:13px">Design sur mesure · Saillon, Valais</p>
    </div>
    <div style="padding:22px 24px;background:#fff">
      <p style="color:#1c1916;font-size:15px;margin:0 0 10px">Bonjour ${name},</p>
      <p style="color:#555;line-height:1.7;font-size:14px;margin:0 0 16px">Votre demande a bien été reçue. Nous vous répondons sous <strong>48h ouvrables</strong>.</p>
      <div style="background:#f8f6f3;border-left:4px solid #B85C38;padding:12px 14px;border-radius:0 6px 6px 0;margin-bottom:16px">
        <p style="margin:0 0 3px;font-size:11px;color:#9a948c;text-transform:uppercase">Récapitulatif</p>
        <p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Réf. :</strong> ${ref}</p>
        <p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Forme :</strong> ${shape||'—'}</p>
        <p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Dimensions :</strong> ${dims||'—'}</p>
        <p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Couleur :</strong> ${color||'—'}</p>
      </div>
      <p style="color:#9a948c;font-size:13px;margin:0">Questions : <a href="mailto:hello@kesk.ch" style="color:#B85C38">hello@kesk.ch</a></p>
    </div>
    <div style="background:#f8f6f3;padding:10px;text-align:center;border-top:1px solid #e0dbd4">
      <p style="color:#9a948c;font-size:11px;margin:0">Kesk Studio · Route de Fully 21 · 1913 Saillon · Suisse</p>
    </div>
  </div>`;

  try {
    await sendEmail('hello@kesk.ch', `[Kesk] Vase ${ref} — ${name} — ${dims||''}`, adminHtml);
    await sendEmail(email, `Confirmation demande vase — Kesk (Réf. ${ref})`, clientHtml);
    return res.status(200).json({ success: true, ref });
  } catch(e) {
    console.error('Email error:', e.message);
    return res.status(500).json({ error: 'Erreur envoi email : ' + e.message });
  }
}
