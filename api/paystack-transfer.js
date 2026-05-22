// api/paystack-transfer.js
// Initiates a Paystack transfer to a partner's subaccount
// Called by the process-payouts cron — never directly from the browser

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const SUPABASE_URL    = process.env.SUPABASE_URL || 'https://gfqxuygfkzgmotnxrlwb.supabase.co';
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabasePatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: 'PATCH',
    headers: {
      apikey:          SUPABASE_KEY,
      Authorization:   `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase patch failed: ${await res.text()}`);
}

async function paystackTransfer({ amount_kobo, recipient_code, reason, reference }) {
  const res = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source:         'balance',
      amount:         amount_kobo,        // in kobo (cents) — multiply ZAR by 100
      recipient:      recipient_code,     // ACCT_xxx or TRF recipient code
      reason,
      reference,
    }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(data.message || 'Paystack transfer failed');
  return data.data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { commission_id, partner_email, paystack_account_id, amount, reason } = req.body || {};

  if (!commission_id || !paystack_account_id || !amount) {
    return res.status(400).json({ error: 'Missing required fields: commission_id, paystack_account_id, amount' });
  }

  try {
    const amount_kobo = Math.round(Number(amount) * 100); // ZAR → kobo
    const reference   = `PAYOUT-${commission_id}-${Date.now()}`;
    const transfer_reason = reason || `WowBox payout for ${partner_email || 'partner'}`;

    const transfer = await paystackTransfer({
      amount_kobo,
      recipient_code: paystack_account_id,
      reason: transfer_reason,
      reference,
    });

    // Mark commission entry as paid
    await supabasePatch(`/commission_entries?id=eq.${commission_id}`, {
      payout_status:        'paid',
      paid_at:              new Date().toISOString(),
      paystack_transfer_id: transfer.transfer_code || transfer.id || reference,
    });

    return res.status(200).json({
      success:       true,
      transfer_code: transfer.transfer_code,
      reference,
      amount_zar:    amount,
    });

  } catch (err) {
    console.error('[paystack-transfer] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
