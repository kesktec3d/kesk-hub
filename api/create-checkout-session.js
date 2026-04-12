export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { price_chf, is_free, promo_code, promo_label, customer, support, style, prompt, image_url } = req.body;

  if (is_free) return res.status(200).json({ free: true });

  try {
    const appUrl = process.env.APP_URL || 'https://kesk-hub.vercel.app';
    const amountCents = Math.round(Number(price_chf) * 100);

    // Appel API Stripe en fetch direct — pas de SDK
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('currency', 'chf');
    params.append('line_items[0][quantity]', '1');
    params.append('line_items[0][price_data][currency]', 'chf');
    params.append('line_items[0][price_data][unit_amount]', String(amountCents));
    params.append('line_items[0][price_data][product_data][name]', `Kesk — ${support || 'Création UV'} · Style ${style || ''}`);
    params.append('line_items[0][price_data][product_data][description]', (prompt || 'Impression UV relief · Suisse').substring(0, 100));
    if (image_url && image_url.startsWith('http')) {
      params.append('line_items[0][price_data][product_data][images][0]', image_url);
    }
    if (customer?.email) params.append('customer_email', customer.email);
    params.append('metadata[support]', support || '');
    params.append('metadata[style]', style || '');
    params.append('metadata[customer_name]', `${customer?.prenom || ''} ${customer?.nom || ''}`.trim());
    params.append('metadata[promo_code]', promo_code || '');
    params.append('success_url', `${appUrl}/uv?success=1`);
    params.append('cancel_url', `${appUrl}/uv`);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const session = await stripeRes.json();
    if (session.error) throw new Error(session.error.message);
    return res.status(200).json({ url: session.url });

  } catch (e) {
    console.error('Stripe error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
