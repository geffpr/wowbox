// api/paystack-webhook.js
// Handles Paystack webhook events (charge.success, etc.)
// Configure this URL in your Paystack dashboard under Settings → API Keys & Webhooks

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.warn('Invalid Paystack webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  console.log('Paystack webhook event:', event.event);

  if (event.event === 'charge.success') {
    const data = event.data;
    const reference = data.reference;
    const status = data.status; // 'success'

    if (status !== 'success') {
      return res.status(200).json({ received: true });
    }

    try {
      // Update order in Supabase using service role (bypasses RLS)
      const orderRes = await fetch(
        `${supabaseUrl}/rest/v1/orders?payment_reference=eq.${encodeURIComponent(reference)}&select=id,customer_email,customer_name,box_id`,
        {
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
        }
      );
      const orders = await orderRes.json();

      if (!orders?.length) {
        console.warn('No order found for reference:', reference);
        return res.status(200).json({ received: true });
      }

      const order = orders[0];

      // Mark order as paid
      await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ payment_status: 'paid' }),
        }
      );

      // Create voucher if not exists
      const voucherCode = `WOW-${Math.random().toString(36).substring(2,7).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      const existingVoucher = await fetch(
        `${supabaseUrl}/rest/v1/vouchers?order_id=eq.${order.id}`,
        {
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
        }
      );
      const existing = await existingVoucher.json();

      if (!existing?.length) {
        await fetch(`${supabaseUrl}/rest/v1/vouchers`, {
          method: 'POST',
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            code: voucherCode,
            order_id: order.id,
            box_id: order.box_id,
            status: 'active',
            expires_at: expiresAt,
          }),
        });

        // Send voucher email
        try {
          const boxRes = await fetch(
            `${supabaseUrl}/rest/v1/boxes?id=eq.${order.box_id}&select=name,category`,
            {
              headers: {
                apikey: supabaseServiceKey,
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
            }
          );
          const boxes = await boxRes.json();
          const box = boxes?.[0] || {};

          await fetch(`${process.env.VERCEL_URL || 'https://wowbox.co.za'}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: order.customer_email,
              type: 'voucher',
              data: { name: order.customer_name, code: voucherCode, box },
            }),
          });
        } catch(emailErr) {
          console.error('Voucher email failed:', emailErr);
        }
      }

      console.log('Webhook processed for order:', order.id);
    } catch(err) {
      console.error('Webhook processing error:', err);
      // Still return 200 so Paystack doesn't retry
    }
  }

  return res.status(200).json({ received: true });
}
