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
  // Brevo SMTP via fetch (pas de nodemailer)
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Kesk Studio', email: process.env.SMTP_USER || 'hello@kesk.ch' },
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

    const customerEmail = session.customer_details?.email || session.customer_email;
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
      await sendEmail('hello@kesk.ch', `[Kesk] Commande ${ref} — ${customerName} — ${amount} CHF`,
        `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px">
          <h2 style="color:#B85C38">Nouvelle commande reçue</h2>
          <p><strong>Réf :</strong> ${ref}</p>
          <p><strong>Client :</strong> ${customerName}</p>
          <p><strong>Email :</strong> <a href="mailto:${customerEmail}">${customerEmail}</a></p>
          <p><strong>Support :</strong> ${support}</p>
          <p><strong>Style :</strong> ${style}</p>
          <p><strong>Montant :</strong> ${amount} CHF</p>
        </div>`
      );
      console.log('Admin email sent');
    } catch(e) { console.log('Admin email error:', e.message); }
  }

  return res.status(200).json({ received: true });
}
