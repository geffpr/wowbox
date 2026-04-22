// api/verify-payment.js
// Verifies a Paystack payment reference server-side
// POST { reference: "WOW_..." }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference } = req.body || {};
  if (!reference) {
    return res.status(400).json({ error: 'Missing reference' });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
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
