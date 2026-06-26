// api/verify-payment.js
// Verifies a Paystack payment reference server-side
// POST { reference: "WOW_..." }

async function getPaystackSecretKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  let mode = 'test'; // safe default — never assume live
  if (supabaseUrl && supabaseKey) {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/site_settings?key=eq.paystack_mode&select=value`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      const rows = await r.json();
      if (Array.isArray(rows) && rows[0] && rows[0].value === 'live') mode = 'live';
    } catch (e) { console.warn('getPaystackSecretKey: mode lookup failed, defaulting to test —', e.message); }
  }
  return mode === 'live'
    ? (process.env.PAYSTACK_SECRET_KEY_LIVE || process.env.PAYSTACK_SECRET_KEY)
    : (process.env.PAYSTACK_SECRET_KEY_TEST || process.env.PAYSTACK_SECRET_KEY);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference } = req.body || {};
  if (!reference) {
    return res.status(400).json({ error: 'Missing reference' });
  }

  const secretKey = await getPaystackSecretKey();
  if (!secretKey) {
    return res.status(500).json({ error: 'Paystack secret key not configured' });
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.message || 'Verification failed', status: 'failed' });
    }

    // Return key fields to client
    return res.status(200).json({
      status: data.data?.status,           // 'success' | 'failed' | 'abandoned'
      amount: data.data?.amount,           // in kobo/cents
      currency: data.data?.currency,
      reference: data.data?.reference,
      paid_at: data.data?.paid_at,
      customer: data.data?.customer,
    });
  } catch (err) {
    console.error('Paystack verify error:', err);
    return res.status(500).json({ error: 'Internal error', status: 'failed' });
  }
}
