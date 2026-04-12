import Stripe from 'stripe';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { price_chf, is_free, promo_code, promo_label, customer, support, style, prompt, image_url } = req.body;

  // Commande gratuite
  if (is_free) {
    return res.status(200).json({ free: true });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const amountCents = Math.round(price_chf * 100);
    const appUrl = process.env.APP_URL || 'https://kesk-hub.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      currency: 'chf',
      line_items: [{
        price_data: {
          currency: 'chf',
          unit_amount: amountCents,
          product_data: {
            name: `Kesk — ${support || 'Création UV'} · Style ${style || ''}`,
            description: prompt ? prompt.substring(0, 100) : 'Impression UV relief · Suisse',
            images: image_url ? [image_url] : [],
          },
        },
        quantity: 1,
      }],
      customer_email: customer?.email,
      metadata: {
        support: support || '',
        style: style || '',
        prompt: (prompt || '').substring(0, 500),
        image_url: image_url || '',
        customer_name: `${customer?.prenom || ''} ${customer?.nom || ''}`.trim(),
        customer_address: `${customer?.adresse || ''}, ${customer?.npa || ''} ${customer?.ville || ''}`.trim(),
        promo_code: promo_code || '',
        promo_label: promo_label || '',
      },
      success_url: `${appUrl}/uv?success=1`,
      cancel_url: `${appUrl}/uv`,
    });

    return res.status(200).json({ url: session.url });

  } catch (e) {
    console.error('Stripe error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
