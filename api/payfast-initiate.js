import crypto from 'crypto';

/**
 * Generates the Payfast MD5 signature.
 * Fields must be in the same order they are added to the payload.
 */
function generateSignature(data, passphrase) {
  // Payfast requires keys sorted alphabetically (same as PHP ksort)
  const sortedKeys = Object.keys(data).sort();
  const pfOutput = sortedKeys
    .filter(k => data[k] !== '' && data[k] !== null && data[k] !== undefined)
    .map(k => `${k}=${encodeURIComponent(String(data[k]).trim()).replace(/%20/g, '+')}`)
    .join('&');

  const strToHash = passphrase
    ? `${pfOutput}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : pfOutput;

  return crypto.createHash('md5').update(strToHash).digest('hex');
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    amount,
    email,
    name_first,
    name_last,
    item_name,
    item_description,
    m_payment_id,
  } = req.body;

  // Validate required fields
  if (!amount || !email || !item_name || !m_payment_id) {
    return res.status(400).json({ error: 'Missing required fields: amount, email, item_name, m_payment_id' });
  }

  const MERCHANT_ID  = process.env.PAYFAST_MERCHANT_ID;
  const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
  const PASSPHRASE   = process.env.PAYFAST_PASSPHRASE;
  const BASE_URL     = process.env.SITE_URL || 'https://wowbox.co.za';

  if (!MERCHANT_ID || !MERCHANT_KEY || !PASSPHRASE) {
    console.error('Missing Payfast env vars');
    return res.status(500).json({ error: 'Payment provider not configured' });
  }

  // Build payload — field ORDER matters for signature
  const payload = {
    merchant_id:      MERCHANT_ID,
    merchant_key:     MERCHANT_KEY,
    return_url:       `${BASE_URL}/checkout?payment=success`,
    cancel_url:       `${BASE_URL}/checkout?payment=cancelled`,
    notify_url:       `${BASE_URL}/api/payfast-notify`,
    name_first:       (name_first || '').trim(),
    name_last:        (name_last  || '').trim(),
    email_address:    email.trim(),
    m_payment_id:     m_payment_id,
    amount:           parseFloat(amount).toFixed(2),
    item_name:        item_name.substring(0, 100),  // Payfast max 100 chars
    item_description: (item_description || '').substring(0, 255),
  };

  // Remove empty optional fields (keeps signature clean)
  if (!payload.name_last)        delete payload.name_last;
  if (!payload.item_description) delete payload.item_description;

  // Generate signature
  payload.signature = generateSignature(payload, PASSPHRASE);

  // POST to Payfast Onsite — get UUID
  try {
    const pfResponse = await fetch('https://sandbox.payfast.co.za/onsite/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload).toString(),
    });

    const text = await pfResponse.text();

    // Payfast returns JSON: { "uuid": "..." }
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      console.error('Payfast non-JSON response:', text);
      return res.status(502).json({ error: 'Unexpected response from payment provider' });
    }

    if (!result.uuid) {
      console.error('Payfast error response:', result);
      return res.status(400).json({ error: 'Payment initiation failed', details: result });
    }

    return res.status(200).json({ uuid: result.uuid });

  } catch (err) {
    console.error('Payfast fetch error:', err);
    return res.status(500).json({ error: 'Could not reach payment provider' });
  }
}
