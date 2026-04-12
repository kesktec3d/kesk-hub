import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, company, email, phone, address, message,
    shape, texture, texamp, dims, color, lh, layers, wall, bottom,
    filename, stl_url
  } = req.body;

  if (!name || !email || !email.includes('@'))
    return res.status(400).json({ error: 'Données invalides.' });

  const ref = 'JAR-' + Date.now();
  const date = new Date().toLocaleDateString('fr-CH', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

  // Couleur swatch
  const swatches = { blanc:'#eeeae4', white:'#eeeae4', gris:'#909088', grey:'#909088',
    noir:'#28272a', black:'#28272a', rouge:'#b02015', red:'#b02015',
    bleu:'#182f80', blue:'#182f80', vert:'#165e22', green:'#165e22' };
  const hex = swatches[(color||'').toLowerCase()] || '#ccc';
  const sw = `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${hex};border:1px solid #ccc;vertical-align:middle;margin-right:6px"></span>`;

  const stlRow = stl_url
    ? `<tr><td style="padding:4px 0;color:#9a948c;font-size:13px;width:140px">Fichier STL</td><td style="padding:4px 0"><a href="${stl_url}" style="color:#e8420a;font-weight:700;font-size:13px">${filename||'model.stl'} — Télécharger ↓</a></td></tr>`
    : `<tr><td style="padding:4px 0;color:#9a948c;font-size:13px;width:140px">Fichier STL</td><td style="padding:4px 0;color:#9a948c;font-size:13px">Non joint</td></tr>`;

  // ── Transport SMTP Infomaniak ──
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.infomaniak.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // ── Email hello@kesk.ch ──
  const adminHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">
  <div style="background:#0e0d0c;padding:22px 28px;border-bottom:3px solid #B85C38">
    <span style="background:#B85C38;padding:5px 14px;border-radius:5px;font-weight:700;color:#fff;font-size:15px">Kesk</span>
    &nbsp;&nbsp;<span style="color:#F7F3EE;font-size:15px;font-weight:600">Nouvelle demande — Vase &amp; Pied de table</span>
    <div style="color:#9a948c;font-size:12px;margin-top:8px">Réf. <strong style="color:#B85C38">${ref}</strong> · ${date}</div>
  </div>
  <div style="padding:20px 28px;background:#f8f6f3;border-bottom:1px solid #e0dbd4">
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a948c;margin-bottom:10px;font-weight:600">Configuration</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px;width:140px">Forme</td><td style="color:#1c1916;font-size:13px;font-weight:600">${shape||'—'}</td></tr>
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Texture</td><td style="color:#1c1916;font-size:13px">${texture||'—'} <span style="color:#9a948c">(amp. ${texamp||'—'} mm)</span></td></tr>
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Dimensions</td><td style="color:#1c1916;font-size:13px;font-weight:600">${dims||'—'}</td></tr>
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Couleur</td><td style="color:#1c1916;font-size:13px">${sw}${color||'—'}</td></tr>
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Haut. couche</td><td style="color:#1c1916;font-size:13px">${lh||'—'} mm (~${layers||'—'} couches)</td></tr>
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Paroi / Fond</td><td style="color:#1c1916;font-size:13px">${wall||'10'} / ${bottom||'10'} mm</td></tr>
      ${stlRow}
    </table>
  </div>
  <div style="padding:20px 28px;border-bottom:1px solid #e0dbd4">
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a948c;margin-bottom:10px;font-weight:600">Client</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px;width:140px">Nom</td><td style="color:#1c1916;font-size:13px;font-weight:600">${name}</td></tr>
      ${company ? `<tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Entreprise</td><td style="color:#1c1916;font-size:13px">${company}</td></tr>` : ''}
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Email</td><td style="font-size:13px"><a href="mailto:${email}" style="color:#B85C38">${email}</a></td></tr>
      ${phone ? `<tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Tél.</td><td style="color:#1c1916;font-size:13px">${phone}</td></tr>` : ''}
      ${address ? `<tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Adresse</td><td style="color:#1c1916;font-size:13px">${address}</td></tr>` : ''}
    </table>
    ${message ? `<div style="margin-top:10px;padding:10px 12px;background:#f8f6f3;border-radius:6px;border-left:3px solid #B85C38"><div style="font-size:11px;color:#B85C38;text-transform:uppercase;margin-bottom:4px">Message</div><div style="color:#1c1916;font-size:13px;line-height:1.6">${message.replace(/\n/g,'<br>')}</div></div>` : ''}
  </div>
  <div style="padding:16px 28px;background:#f8f6f3;text-align:center">
    <a href="mailto:${email}" style="display:inline-block;padding:10px 24px;background:#B85C38;color:#fff;border-radius:7px;font-weight:700;font-size:14px;text-decoration:none">Répondre au client →</a>
  </div>
</div>
</body></html>`;

  // ── Email client ──
  const clientHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f0ede8;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">
  <div style="background:#0e0d0c;padding:18px 24px">
    <h1 style="color:#F7F3EE;margin:0;font-size:18px;font-family:Georgia,serif">Kesk<span style="color:#B85C38">.</span></h1>
    <p style="color:rgba(247,243,238,.6);margin:3px 0 0;font-size:13px">Design sur mesure · Saillon, Valais</p>
  </div>
  <div style="padding:22px 24px">
    <p style="color:#1c1916;font-size:15px;margin:0 0 10px">Bonjour ${name},</p>
    <p style="color:#555;line-height:1.7;font-size:14px;margin:0 0 16px">Votre demande a bien été reçue. Nous vous répondons sous <strong>48h ouvrables</strong>.</p>
    <div style="background:#f8f6f3;border-left:4px solid #B85C38;padding:12px 14px;border-radius:0 6px 6px 0;margin-bottom:16px">
      <p style="margin:0 0 3px;font-size:11px;color:#9a948c;text-transform:uppercase;letter-spacing:.08em">Récapitulatif</p>
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
</div>
</body></html>`;

  try {
    await transporter.sendMail({
      from: `"Kesk Studio" <${process.env.SMTP_USER}>`,
      to: 'hello@kesk.ch',
      replyTo: `${name} <${email}>`,
      subject: `[Kesk] Vase ${ref} — ${name} — ${dims||''}`,
      html: adminHtml,
    });

    await transporter.sendMail({
      from: `"Kesk Studio" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Confirmation demande vase — Kesk (Réf. ${ref})`,
      html: clientHtml,
    });

    return res.status(200).json({ success: true, ref });
  } catch (e) {
    console.error('SMTP error:', e);
    return res.status(500).json({ error: 'Erreur envoi email : ' + e.message });
  }
}
