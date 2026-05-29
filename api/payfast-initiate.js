import crypto from 'crypto';

function encodeVal(str) {
  return encodeURIComponent(String(str).trim())
    .replace(/%20/g, '+')
    .replace(/!/g,  '%21')
    .replace(/'/g,  '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g,  '%7E');
}

function generateSignature(data, passphrase) {
  let pfOutput = '';
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val !== '' && val !== null && val !== undefined) {
      pfOutput += `${key}=${encodeVal(val)}&`;
    }
  }
  let strToHash = pfOutput.slice(0, -1);
  if (passphrase) {
    strToHash += `&passphrase=${encodeVal(passphrase)}`;
  }
  return crypto.createHash('md5').update(strToHash).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, email, name_first, name_last, item_name, item_description, m_payment_id } = req.body;

  const MERCHANT_ID  = process.env.PAYFAST_MERCHANT_ID;
  const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
  const PASSPHRASE   = process.env.PAYFAST_PASSPHRASE;
  const BASE_URL     = process.env.SITE_URL || 'https://wowbox.co.za';
  const SANDBOX      = process.env.PAYFAST_SANDBOX === 'true';

  if (!MERCHANT_ID || !MERCHANT_KEY) {
    return res.status(500).json({ error: 'Payment provider not configured' });
  }

  const PAYFAST_URL = SANDBOX
    ? 'https://sandbox.payfast.co.za/onsite/process'
    : 'https://www.payfast.co.za/onsite/process';

  // Field order matches Payfast documentation exactly
  const payload = {
    merchant_id:   MERCHANT_ID,
    merchant_key:  MERCHANT_KEY,
    return_url:    `${BASE_URL}/checkout?payment=success`,
    cancel_url:    `${BASE_URL}/checkout?payment=cancelled`,
    notify_url:    `${BASE_URL}/api/payfast-notify`,
    name_first:    (name_first || '').trim(),
  };

  if ((name_last || '').trim()) payload.name_last = name_last.trim();

  payload.email_address = email.trim();
  payload.m_payment_id  = m_payment_id;
  payload.amount        = parseFloat(amount).toFixed(2);
  payload.item_name     = item_name.substring(0, 100);

  if ((item_description || '').trim()) {
    payload.item_description = item_description.trim().substring(0, 255);
  }

  payload.signature = generateSignature(payload, PASSPHRASE || '');

  try {
    const pfResponse = await fetch(PAYFAST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload).toString(),
    });

    const text = await pfResponse.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      console.error('[Payfast] Unexpected response:', text.substring(0, 300));
      return res.status(502).json({ error: 'Unexpected response from payment provider' });
    }

    if (!result.uuid) {
      console.error('[Payfast] No UUID:', JSON.stringify(result));
      return res.status(400).json({ error: 'Payment initiation failed', details: result });
    }

    return res.status(200).json({ uuid: result.uuid });

  } catch (err) {
    console.error('[Payfast] Fetch error:', err.message);
    return res.status(500).json({ error: 'Could not reach payment provider' });
  }
}
