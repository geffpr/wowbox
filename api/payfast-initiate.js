import crypto from 'crypto';

function generateSignature(data, passphrase) {
  const sortedKeys = Object.keys(data).sort();
  const pfOutput = sortedKeys
    .filter(k => data[k] !== '' && data[k] !== null && data[k] !== undefined)
    .map(k => `${k}=${encodeURIComponent(String(data[k]).trim()).replace(/%20/g, '+')}`)
    .join('&');

  const strToHash = passphrase
    ? `${pfOutput}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : pfOutput;

  console.log('[PAYFAST DEBUG] String to hash:', strToHash);
  const sig = crypto.createHash('md5').update(strToHash).digest('hex');
  console.log('[PAYFAST DEBUG] Signature:', sig);
  return sig;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, email, name_first, name_last, item_name, item_description, m_payment_id } = req.body;

  if (!amount || !email || !item_name || !m_payment_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const MERCHANT_ID  = process.env.PAYFAST_MERCHANT_ID;
  const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
  const PASSPHRASE   = process.env.PAYFAST_PASSPHRASE;
  const BASE_URL     = process.env.SITE_URL || 'https://wowbox.co.za';

  console.log('[PAYFAST DEBUG] Merchant ID:', MERCHANT_ID);
  console.log('[PAYFAST DEBUG] Passphrase length:', PASSPHRASE?.length);

  if (!MERCHANT_ID || !MERCHANT_KEY || !PASSPHRASE) {
    return res.status(500).json({ error: 'Payment provider not configured' });
  }

  const payload = {
    merchant_id:   MERCHANT_ID,
    merchant_key:  MERCHANT_KEY,
    return_url:    `${BASE_URL}/checkout?payment=success`,
    cancel_url:    `${BASE_URL}/checkout?payment=cancelled`,
    notify_url:    `${BASE_URL}/api/payfast-notify`,
    name_first:    (name_first || '').trim(),
    email_address: email.trim(),
    m_payment_id:  m_payment_id,
    amount:        parseFloat(amount).toFixed(2),
    item_name:     item_name.substring(0, 100),
  };

  // Only add optional fields if they have values
  if ((name_last || '').trim())        payload.name_last        = name_last.trim();
  if ((item_description || '').trim()) payload.item_description = item_description.trim().substring(0, 255);

  console.log('[PAYFAST DEBUG] Payload keys:', Object.keys(payload));

  payload.signature = generateSignature(payload, PASSPHRASE);

  const postBody = new URLSearchParams(payload).toString();
  console.log('[PAYFAST DEBUG] POST body:', postBody);

  try {
    const pfResponse = await fetch('https://sandbox.payfast.co.za/onsite/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: postBody,
    });

    const text = await pfResponse.text();
    console.log('[PAYFAST DEBUG] Payfast response status:', pfResponse.status);

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      console.error('[PAYFAST] Non-JSON response:', text.substring(0, 500));
      return res.status(502).json({ error: 'Unexpected response from payment provider' });
    }

    if (!result.uuid) {
      console.error('[PAYFAST] Error response:', result);
      return res.status(400).json({ error: 'Payment initiation failed', details: result });
    }

    return res.status(200).json({ uuid: result.uuid });

  } catch (err) {
    console.error('[PAYFAST] Fetch error:', err);
    return res.status(500).json({ error: 'Could not reach payment provider' });
  }
}
