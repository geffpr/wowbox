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
  // Payfast requires fields in SUBMISSION ORDER (not alphabetical)
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
  console.error('[PF] Hash string:', strToHash);
  const sig = crypto.createHash('md5').update(strToHash).digest('hex');
  console.error('[PF] Signature:', sig);
  return sig;
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

  if (!MERCHANT_ID || !MERCHANT_KEY) {
    return res.status(500).json({ error: 'Payment provider not configured' });
  }

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

  const postBody = new URLSearchParams(payload).toString();
  console.error('[PF] POST body:', postBody);

  try {
    const pfResponse = await fetch('https://sandbox.payfast.co.za/onsite/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: postBody,
    });

    const text = await pfResponse.text();
    console.error('[PF] Status:', pfResponse.status);

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/<span class="err-msg"><strong>(.*?)<\/strong>(.*?)<\/span>/s);
      const errMsg = match ? `${match[1]}: ${match[2].trim()}` : text.substring(0, 300);
      console.error('[PF] Error:', errMsg);
      return res.status(502).json({ error: errMsg });
    }

    if (!result.uuid) {
      console.error('[PF] No UUID:', JSON.stringify(result));
      return res.status(400).json({ error: 'Payment initiation failed', details: result });
    }

    return res.status(200).json({ uuid: result.uuid });

  } catch (err) {
    console.error('[PF] Fetch error:', err.message);
    return res.status(500).json({ error: 'Could not reach payment provider' });
  }
}
