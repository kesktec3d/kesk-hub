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

async function sendEmail(to, subject, html) {
  const senderEmail = process.env.BREVO_SENDER || 'hello@kesk.ch';
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Kesk Studio', email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });
  const data = await res.json();
  console.log('Brevo response:', JSON.stringify(data));
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  // Vérification signature
  try {
    const parts = sig.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v; return acc;
    }, {});
    const payload = `${parts['t']}.${rawBody.toString()}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (expected !== parts['v1']) {
      console.log('Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (e) {
    console.log('Signature error:', e.message);
    return res.status(400).json({ error: e.message });
  }

  const event = JSON.parse(rawBody.toString());
  console.log('Event type received:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Session:', JSON.stringify({ id: session.id, email: session.customer_email, customer_details: session.customer_details }));

    const customerEmail = session.metadata?.customer_email || session.customer_details?.email || session.customer_email;
    const customerName = session.metadata?.customer_name || session.customer_details?.name || 'Client';
    const support = session.metadata?.support || '';
    const style = session.metadata?.style || '';
    const amount = ((session.amount_total || 0) / 100).toFixed(2);
    const ref = session.id.substring(0, 16).toUpperCase();

    // Email client
    if (customerEmail) {
      try {
        await sendEmail(customerEmail, `Commande confirmée — Kesk (Réf. ${ref})`,
          `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
            <div style="background:#0e0d0c;padding:18px 24px">
              <h1 style="color:#F7F3EE;margin:0;font-size:18px">Kesk<span style="color:#B85C38">.</span></h1>
            </div>
            <div style="padding:22px 24px;background:#fff">
              <p>Bonjour ${customerName},</p>
              <p>Votre commande est confirmée et en production sous <strong>7–10 jours ouvrables</strong>.</p>
              <div style="background:#f8f6f3;border-left:4px solid #B85C38;padding:12px 14px;margin:16px 0">
                <p style="margin:3px 0"><strong>Réf. :</strong> ${ref}</p>
                <p style="margin:3px 0"><strong>Support :</strong> ${support}</p>
                <p style="margin:3px 0"><strong>Style :</strong> ${style}</p>
                <p style="margin:3px 0"><strong>Total :</strong> ${amount} CHF</p>
              </div>
              <p style="color:#9a948c;font-size:13px">Questions : <a href="mailto:hello@kesk.ch" style="color:#B85C38">hello@kesk.ch</a></p>
            </div>
            <div style="background:#f8f6f3;padding:10px;text-align:center">
              <p style="color:#9a948c;font-size:11px;margin:0">Kesk Studio · Route de Fully 21 · 1913 Saillon</p>
            </div>
          </div>`
        );
        console.log('Client email sent to:', customerEmail);
      } catch(e) { console.log('Client email error:', e.message); }
    }

    // Email admin
    try {
      const imageUrl = session.metadata?.image_url || '';
      const prompt = session.metadata?.prompt || '';
      const address = session.metadata?.customer_address || '';
      const promoLabel = session.metadata?.promo_label || '';

      await sendEmail('hello@kesk.ch', `[Kesk] Commande ${ref} — ${customerName} — ${amount} CHF`,
        `<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto">
          <div style="background:#0e0d0c;padding:18px 24px;border-bottom:3px solid #B85C38">
            <span style="background:#B85C38;padding:5px 14px;border-radius:5px;font-weight:700;color:#fff">Kesk</span>
            &nbsp;<span style="color:#F7F3EE;font-size:15px;font-weight:600">Nouvelle commande UV</span>
            <div style="color:#9a948c;font-size:12px;margin-top:6px">Réf. <strong style="color:#B85C38">${ref}</strong></div>
          </div>
          <div style="padding:20px 24px;background:#fff">
            ${imageUrl && imageUrl.startsWith('http') ? `<img src="${imageUrl}" style="width:100%;max-height:280px;object-fit:cover;border-radius:8px;margin-bottom:16px"/>` : ''}
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:5px 0;color:#9a948c;width:130px">Client</td><td style="color:#1c1916;font-weight:600">${customerName}</td></tr>
              <tr><td style="padding:5px 0;color:#9a948c">Email</td><td><a href="mailto:${customerEmail}" style="color:#B85C38">${customerEmail}</a></td></tr>
              ${address ? `<tr><td style="padding:5px 0;color:#9a948c">Adresse</td><td style="color:#1c1916">${address}</td></tr>` : ''}
              <tr><td style="padding:5px 0;color:#9a948c">Support</td><td style="color:#1c1916">${support}</td></tr>
              <tr><td style="padding:5px 0;color:#9a948c">Style</td><td style="color:#1c1916">${style}</td></tr>
              ${prompt ? `<tr><td style="padding:5px 0;color:#9a948c">Description</td><td style="color:#1c1916">${prompt}</td></tr>` : ''}
              ${promoLabel ? `<tr><td style="padding:5px 0;color:#9a948c">Promo</td><td style="color:#2D7A4F">${promoLabel}</td></tr>` : ''}
              <tr><td style="padding:5px 0;color:#9a948c">Montant</td><td style="color:#1c1916;font-weight:700;font-size:15px">${amount} CHF</td></tr>
            </table>
            <div style="margin-top:16px">
              <a href="mailto:${customerEmail}" style="display:inline-block;padding:10px 20px;background:#B85C38;color:#fff;border-radius:7px;font-weight:700;font-size:13px;text-decoration:none">Répondre au client →</a>
            </div>
          </div>
          <div style="background:#f8f6f3;padding:10px;text-align:center">
            <p style="color:#9a948c;font-size:11px;margin:0">Kesk Studio · Route de Fully 21 · 1913 Saillon</p>
          </div>
        </div>`
      );
      console.log('Admin email sent');
    } catch(e) { console.log('Admin email error:', e.message); }
  }

  return res.status(200).json({ received: true });
}
