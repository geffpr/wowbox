import crypto from 'crypto';

// PHP-accurate urlencode (matches PHP's urlencode exactly)
function phpUrlencode(str) {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/!/g,   '%21')
    .replace(/'/g,   '%27')
    .replace(/\(/g,  '%28')
    .replace(/\)/g,  '%29')
    .replace(/\*/g,  '%2A')
    .replace(/~/g,   '%7E');
}

function generateSignature(data, passphrase) {
  const keys = Object.keys(data).sort();
  let pfOutput = '';
  for (const key of keys) {
    const val = data[key];
    if (val !== '' && val !== null && val !== undefined) {
      pfOutput += `${key}=${phpUrlencode(String(val).trim())}&`;
    }
  }
  let strToHash = pfOutput.slice(0, -1);
  if (passphrase) {
    strToHash += `&passphrase=${phpUrlencode(passphrase.trim())}`;
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

  console.error('[PF] MID:', MERCHANT_ID, '| Pass len:', PASSPHRASE?.length, '| Pass chars:', JSON.stringify(PASSPHRASE));

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

  if ((name_last || '').trim())        payload.name_last        = name_last.trim();
  if ((item_description || '').trim()) payload.item_description = item_description.trim().substring(0, 255);

  payload.signature = generateSignature(payload, ""); // TEST: no passphrase

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
      // Extract just the error message from Payfast HTML
      const match = text.match(/err-msg[^>]*>.*?<strong>(.*?)<\/strong>(.*?)<\/span>/s);
      const errMsg = match ? `${match[1]}: ${match[2].trim()}` : text.substring(0, 200);
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
