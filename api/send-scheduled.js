// api/send-scheduled.js — WowBox Scheduled Email Sender
// Runs daily via Vercel Cron (configured in vercel.json)
// Queries orders with scheduled_send_date = today and sends gift emails

const SUPABASE_URL    = process.env.SUPABASE_URL    || 'https://gfqxuygfkzgmotnxrlwb.supabase.co';
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const CRON_SECRET     = process.env.CRON_SECRET;
const SITE_URL        = process.env.SITE_URL || 'https://wowbox.co.za';

// ── Supabase REST helper ──────────────────────────────────────────────────
async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        options.prefer || 'return=minimal',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  return options.method === 'PATCH' ? null : res.json();
}

// ── Mark order as scheduled email sent ───────────────────────────────────
async function markSent(orderId) {
  await supabaseFetch(`/orders?id=eq.${orderId}`, {
    method:  'PATCH',
    prefer:  'return=minimal',
    body:    JSON.stringify({ scheduled_email_sent: true }),
  });
}

// ── Call /api/send-email for a given order ────────────────────────────────
async function sendGiftEmail(order, vouchers, giftAddons) {
  const isGift = !!(order.recipient_email && order.recipient_email !== order.customer_email);
  // Physical boxes get a 'PENDING-...' placeholder code until the admin ships them — never
  // show that to the recipient as if it were a real, redeemable voucher code.
  const items = (vouchers || [])
    .filter(v => v.code && v.code.indexOf('PENDING-') !== 0)
    .map(v => ({
      name:   v.box_name || 'WowBox Gift Box',
      code:   v.code,
      type:   order.delivery_type || 'E-Box',
      status: 'active',
    }));

  const payload = {
    type: isGift ? 'recipient_gift' : 'status_delivered',
    order: {
      id:               order.id,
      name:             isGift ? order.customer_name : (order.recipient_name || order.customer_name),
      email:            order.recipient_email || order.customer_email,
      recipientName:    order.recipient_name || order.customer_name,
      type:             order.delivery_type === 'physical' ? 'Physical Box' : 'E-Box',
      total:            order.total_amount ? `R${Number(order.total_amount).toLocaleString('en-ZA')}` : '',
      date:             new Date(order.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
      items,
      giftMsg:          order.gift_message || '',
      videoToken:       order.video_token || null,
      videoUrl:         order.video_url || null,
      giftAddons:       isGift ? (giftAddons || []) : undefined,
      bookingReference: null,
    },
  };

  const res = await fetch(`${SITE_URL}/api/send-email`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`send-email failed: ${text}`);
  }
  return res.json();
}

// ── Main handler ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Security: only Vercel Cron or requests with the right secret can call this
  const authHeader = req.headers['authorization'];
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    // 1. Fetch orders scheduled for today, not yet sent, not cancelled
    const orders = await supabaseFetch(
      `/orders?scheduled_send_date=eq.${today}&scheduled_email_sent=eq.false&status=neq.cancelled`,
      { headers: { 'Prefer': 'return=representation' } }
    );

    if (!orders || orders.length === 0) {
      console.log(`[send-scheduled] No orders to send for ${today}`);
      return res.status(200).json({ sent: 0, date: today });
    }

    console.log(`[send-scheduled] Found ${orders.length} order(s) to send for ${today}`);

    const results = [];

    for (const order of orders) {
      try {
        // 2. Fetch voucher codes for this order
        const vouchers = await supabaseFetch(
          `/vouchers?order_id=eq.${order.id}&select=code,box_name,is_physical_box`,
          { headers: { 'Prefer': 'return=representation' } }
        );

        // 2b. Fetch gift add-ons (prepaid extras) linked to this order's E-Box codes
        let giftAddons = [];
        const eboxCodes = (vouchers || []).filter(v => v.code && !v.is_physical_box).map(v => v.code);
        if (eboxCodes.length) {
          const codesFilter = eboxCodes.map(c => `"${c}"`).join(',');
          const gaRows = await supabaseFetch(
            `/wb_prepaid_addons?wb_code=in.(${codesFilter})&select=addon_name,addon_price`,
            { headers: { 'Prefer': 'return=representation' } }
          );
          giftAddons = (gaRows || []).map(g => ({ name: g.addon_name, price: g.addon_price }));
        }

        // 3. Send gift email
        await sendGiftEmail(order, vouchers || [], giftAddons);

        // 4. Mark order as sent
        await markSent(order.id);

        results.push({ id: order.id, status: 'sent', email: order.recipient_email || order.customer_email });
        console.log(`[send-scheduled] ✅ Sent order ${order.id} to ${order.recipient_email || order.customer_email}`);
      } catch (orderErr) {
        console.error(`[send-scheduled] ❌ Failed order ${order.id}:`, orderErr.message);
        results.push({ id: order.id, status: 'error', error: orderErr.message });
      }
    }

    const sent   = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'error').length;

    // ── Voucher expiry reminders — 30 days before expiry ──────────────────────
    let reminders = 0;
    try {
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      const targetDate = in30.toISOString().slice(0, 10);

      const expiringVouchers = await supabaseFetch(
        `/vouchers?status=eq.active&expires_at=gte.${targetDate}T00:00:00&expires_at=lte.${targetDate}T23:59:59&select=code,box_name,user_email,created_at,expires_at`,
        { headers: { 'Prefer': 'return=representation' } }
      );

      for (const v of (expiringVouchers || [])) {
        if (!v.user_email) continue;
        try {
          await fetch(`${SITE_URL}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type:         'voucher_expiry_reminder',
              email:        v.user_email,
              voucherCode:  v.code,
              boxName:      v.box_name,
              expiresAt:    v.expires_at,
              purchaseDate: v.created_at
                ? new Date(v.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})
                : '',
            }),
          });
          reminders++;
          console.log(`[send-scheduled] 🔔 Expiry reminder sent to ${v.user_email} for ${v.code}`);
        } catch(reminderErr) {
          console.error(`[send-scheduled] ❌ Reminder failed for ${v.code}:`, reminderErr.message);
        }
      }
    } catch(expiryErr) {
      console.error('[send-scheduled] Expiry reminder error:', expiryErr.message);
    }

    return res.status(200).json({ date: today, sent, failed, results, reminders });
  } catch (err) {
    console.error('[send-scheduled] Fatal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
