// api/paystack-connect.js
// GET  → returns list of South African banks from Paystack
// POST → creates a Paystack subaccount for a partner and saves subaccount_code to Supabase

export default async function handler(req, res) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ error: 'Paystack secret key not configured' });

  // ── GET: return list of banks ────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const r = await fetch(
        'https://api.paystack.co/bank?country=south%20africa&currency=ZAR&perPage=100',
        { headers: { Authorization: `Bearer ${secretKey}` } }
      );
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || 'Failed to fetch banks' });
      return res.status(200).json({ status: true, data: data.data });
    } catch (err) {
      console.error('paystack-connect GET error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST: create subaccount ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { business_name, settlement_bank, account_number, user_id } = req.body || {};

    if (!business_name)   return res.status(400).json({ error: 'Business name is required' });
    if (!settlement_bank) return res.status(400).json({ error: 'Bank is required' });
    if (!account_number)  return res.status(400).json({ error: 'Account number is required' });
    if (!user_id)         return res.status(400).json({ error: 'User ID is required' });

    try {
      // 1. Create Paystack subaccount
      const psRes = await fetch('https://api.paystack.co/subaccount', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name,
          settlement_bank,
          account_number,
          percentage_charge: 0, // Payouts handled via explicit transfers, not splits
        }),
      });

      const psData = await psRes.json();

      if (!psData.status) {
        return res.status(400).json({ error: psData.message || 'Paystack subaccount creation failed' });
      }

      const subaccount_code = psData.data.subaccount_code;
      const account_name    = psData.data.account_name || business_name;

      // 2. Create transfer recipient (needed for explicit payouts)
      const rcpRes = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type:           'nuban',
          name:           account_name,
          account_number,
          bank_code:      settlement_bank,
          currency:       'ZAR',
        }),
      });

      const rcpData = await rcpRes.json();

      if (!rcpData.status) {
        console.error('Transfer recipient creation failed:', rcpData.message);
        // Non-blocking: subaccount still created, log and continue
      }

      const recipient_code = rcpData?.data?.recipient_code || null;

      // 3. Save both codes to Supabase user_profiles
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase env vars not configured' });
      }

      // Resolve bank name from Paystack response
      const bank_name_resolved = psData.data.settlement_bank || settlement_bank;

      const sbBody = {
        paystack_account_id:   subaccount_code,
        paystack_connected_at: new Date().toISOString(),
        bank_name:             bank_name_resolved,
        bank_account_number:   account_number,
        bank_code:             settlement_bank,
      };
      if (recipient_code) sbBody.paystack_recipient_code = recipient_code;

      const sbRes = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(user_id)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(sbBody),
        }
      );

      if (!sbRes.ok) {
        const errText = await sbRes.text();
        console.error('Supabase update failed:', errText);
        return res.status(500).json({ error: 'Paystack connected but failed to save to database. Contact support.' });
      }

      return res.status(200).json({
        success:          true,
        subaccount_code,
        recipient_code,
        account_name,
      });

    } catch (err) {
      console.error('paystack-connect POST error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
