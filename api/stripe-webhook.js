import nodemailer from 'nodemailer';
import crypto from 'crypto';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  // Vérification signature Stripe
  try {
    const parts = sig.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v;
      return acc;
    }, {});
    const timestamp = parts['t'];
    const signed = parts['v1'];
    const payload = `${timestamp}.${rawBody.toString()}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (expected !== signed) return res.status(400).json({ error: 'Invalid signature' });
  } catch (e) {
    return res.status(400).json({ error: 'Webhook error: ' + e.message });
  }

  const event = JSON.parse(rawBody.toString());

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_email || session.customer_details?.email;
    const customerName = session.metadata?.customer_name || 'Client';
    const support = session.metadata?.support || '';
    const style = session.metadata?.style || '';
    const promoCode = session.metadata?.promo_code || '';
    const amount = (session.amount_total / 100).toFixed(2);
    const ref = session.id.substring(0, 16).toUpperCase();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.infomaniak.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    // Email client
    if (customerEmail) {
      await transporter.sendMail({
        from: `"Kesk Studio" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: `Commande confirmée — Kesk (Réf. ${ref})`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f0ede8;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">
  <div style="background:#0e0d0c;padding:18px 24px">
    <h1 style="color:#F7F3EE;margin:0;font-size:18px;font-family:Georgia,serif">Kesk<span style="color:#B85C38">.</span></h1>
    <p style="color:rgba(247,243,238,.6);margin:3px 0 0;font-size:13px">Design sur mesure · Saillon, Valais</p>
  </div>
  <div style="padding:22px 24px">
    <p style="color:#1c1916;font-size:15px;margin:0 0 10px">Bonjour ${customerName},</p>
    <p style="color:#555;line-height:1.7;font-size:14px;margin:0 0 16px">Votre commande est confirmée et en production. Nous vous répondons sous <strong>48h ouvrables</strong>.</p>
    <div style="background:#f8f6f3;border-left:4px solid #B85C38;padding:12px 14px;border-radius:0 6px 6px 0;margin-bottom:16px">
      <p style="margin:0 0 3px;font-size:11px;color:#9a948c;text-transform:uppercase;letter-spacing:.08em">Récapitulatif</p>
      <p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Réf. :</strong> ${ref}</p>
      <p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Support :</strong> ${support}</p>
      <p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Style :</strong> ${style}</p>
      ${promoCode ? `<p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Code promo :</strong> ${promoCode}</p>` : ''}
      <p style="margin:3px 0;font-size:13px;color:#1c1916"><strong>Total payé :</strong> ${amount} CHF</p>
    </div>
    <div style="margin-top:16px;padding:14px;background:rgba(200,168,122,.1);border-radius:8px">
      <p style="font-size:13px;font-weight:500;margin:0 0 4px">Délai estimé</p>
      <p style="font-size:13px;color:#6a6460;margin:0">7–10 jours ouvrables · Livraison Suisse offerte</p>
    </div>
    <p style="color:#9a948c;font-size:13px;margin-top:16px">Questions : <a href="mailto:hello@kesk.ch" style="color:#B85C38">hello@kesk.ch</a></p>
  </div>
  <div style="background:#f8f6f3;padding:10px;text-align:center;border-top:1px solid #e0dbd4">
    <p style="color:#9a948c;font-size:11px;margin:0">Kesk Studio · Route de Fully 21 · 1913 Saillon · Suisse</p>
  </div>
</div>
</body></html>`
      });
    }

    // Email admin
    await transporter.sendMail({
      from: `"Kesk Studio" <${process.env.SMTP_USER}>`,
      to: 'hello@kesk.ch',
      replyTo: customerEmail,
      subject: `[Kesk] Nouvelle commande ${ref} — ${customerName} — ${amount} CHF`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0ede8;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#0e0d0c;padding:22px 28px;border-bottom:3px solid #B85C38">
    <span style="background:#B85C38;padding:5px 14px;border-radius:5px;font-weight:700;color:#fff;font-size:15px">Kesk</span>
    &nbsp;&nbsp;<span style="color:#F7F3EE;font-size:15px;font-weight:600">Paiement reçu — Commande UV</span>
    <div style="color:#9a948c;font-size:12px;margin-top:8px">Réf. <strong style="color:#B85C38">${ref}</strong></div>
  </div>
  <div style="padding:20px 28px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px;width:140px">Client</td><td style="color:#1c1916;font-size:13px;font-weight:600">${customerName}</td></tr>
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Email</td><td><a href="mailto:${customerEmail}" style="color:#B85C38;font-size:13px">${customerEmail}</a></td></tr>
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Support</td><td style="color:#1c1916;font-size:13px">${support}</td></tr>
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Style</td><td style="color:#1c1916;font-size:13px">${style}</td></tr>
      ${promoCode ? `<tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Promo</td><td style="color:#1c1916;font-size:13px">${promoCode}</td></tr>` : ''}
      <tr><td style="padding:4px 0;color:#9a948c;font-size:13px">Montant</td><td style="color:#1c1916;font-size:13px;font-weight:700">${amount} CHF</td></tr>
    </table>
  </div>
</div>
</body></html>`
    });
  }

  return res.status(200).json({ received: true });
}
