import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Payfast ITN (Instant Transaction Notification) handler.
 * Payfast POSTs to this endpoint after every payment event.
 * We verify the signature and update the order status in Supabase.
 */

const PAYFAST_VALID_HOSTS = [
  'www.payfast.co.za',
  'sandbox.payfast.co.za',
  'w1w.payfast.co.za',
  'w2w.payfast.co.za',
];

function generateSignature(data, passphrase) {
  const pfOutput = Object.entries(data)
    .filter(([k, v]) => k !== 'signature' && v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v).trim()).replace(/%20/g, '+')}`)
    .join('&');

  const strToHash = passphrase
    ? `${pfOutput}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : pfOutput;

  return crypto.createHash('md5').update(strToHash).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const PASSPHRASE   = process.env.PAYFAST_PASSPHRASE;
  const MERCHANT_ID  = process.env.PAYFAST_MERCHANT_ID;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service role key for server-side writes

  const pfData = req.body;

  // ── 1. Verify IP ──────────────────────────────────────────────────
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  // Note: Payfast IP ranges change — in production consider using DNS lookup
  // For now we log and continue; tighten this once you have stable IPs
  console.log('Payfast ITN from IP:', ip);

  // ── 2. Verify signature ───────────────────────────────────────────
  const receivedSignature = pfData.signature;
  const expectedSignature = generateSignature(pfData, PASSPHRASE);

  if (receivedSignature !== expectedSignature) {
    console.error('Payfast ITN: Invalid signature');
    return res.status(400).send('Invalid signature');
  }

  // ── 3. Verify merchant ID ─────────────────────────────────────────
  if (pfData.merchant_id !== MERCHANT_ID) {
    console.error('Payfast ITN: Merchant ID mismatch');
    return res.status(400).send('Invalid merchant');
  }

  // ── 4. Server-side verify with Payfast ───────────────────────────
  try {
    const verifyRes = await fetch('https://www.payfast.co.za/eng/query/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(pfData).toString(),
    });
    const verifyText = await verifyRes.text();
    if (!verifyText.includes('VALID')) {
      console.error('Payfast ITN: Validation failed —', verifyText);
      return res.status(400).send('Payment validation failed');
    }
  } catch (err) {
    console.error('Payfast ITN: Verification request failed', err);
    return res.status(500).send('Verification error');
  }

  // ── 5. Process payment result ─────────────────────────────────────
  const {
    m_payment_id,   // our order reference (WB-xxx)
    payment_status, // COMPLETE | FAILED | PENDING
    amount_gross,
    pf_payment_id,
    item_name,
  } = pfData;

  console.log(`Payfast ITN: ${m_payment_id} → ${payment_status} (R${amount_gross})`);

  // ── 6. Update Supabase ────────────────────────────────────────────
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const db = createClient(SUPABASE_URL, SUPABASE_KEY);

      if (payment_status === 'COMPLETE') {
        await db.from('orders').update({
          payment_status:    'paid',
          payfast_id:        pf_payment_id,
          payfast_reference: m_payment_id,
          amount_paid:       parseFloat(amount_gross),
          paid_at:           new Date().toISOString(),
        }).eq('order_reference', m_payment_id);
      } else if (payment_status === 'FAILED') {
        await db.from('orders').update({
          payment_status: 'failed',
          payfast_id:     pf_payment_id,
        }).eq('order_reference', m_payment_id);
      }
    } catch (dbErr) {
      console.error('Payfast ITN: Supabase update failed', dbErr);
      // Don't return error — Payfast needs 200 OK or it will retry
    }
  }

  // Always return 200 so Payfast doesn't retry
  return res.status(200).send('OK');
}
