// api/send-email.js
// Sends transactional emails via Resend
// POST { to, type: 'voucher' | 'confirmation', data: {...} }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: 'Resend API key not configured' });
  }

  const { to, type, data } = req.body || {};
  if (!to || !type) {
    return res.status(400).json({ error: 'Missing to or type' });
  }

  let subject, html;

  if (type === 'voucher') {
    const { name, code, box, message } = data || {};
    subject = `🎁 Your WowBox Voucher — ${box?.name || 'Experience'}`;
    html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#faf8f2;margin:0;padding:0}
  .container{max-width:580px;margin:0 auto;background:#ffffff}
  .header{background:#0b2419;padding:32px;text-align:center}
  .logo{color:#c8983a;font-size:28px;font-weight:700;letter-spacing:.02em}
  .body{padding:40px 32px}
  .voucher-box{background:#0b2419;border-radius:12px;padding:28px;text-align:center;margin:28px 0}
  .code{font-family:monospace;font-size:26px;font-weight:700;color:#e2b75a;letter-spacing:.15em;border:2px dashed rgba(200,152,58,.4);padding:14px 28px;border-radius:8px;display:inline-block;margin:12px 0}
  .box-name{color:rgba(255,255,255,.7);font-size:14px;margin-bottom:8px}
  h1{color:#0b2419;font-size:24px;margin:0 0 12px}
  p{color:#555;line-height:1.7;font-size:15px;margin:0 0 16px}
  .message-box{background:#faf8f2;border-left:3px solid #c8983a;padding:16px;border-radius:0 8px 8px 0;font-style:italic;color:#444;margin:20px 0}
  .footer{background:#0b2419;padding:24px;text-align:center;color:rgba(255,255,255,.45);font-size:13px}
  .footer a{color:#c8983a;text-decoration:none}
  .steps{display:flex;gap:16px;margin:20px 0}
  .step{flex:1;background:#faf8f2;border-radius:8px;padding:16px;text-align:center;font-size:13px;color:#555}
  .step-icon{font-size:24px;margin-bottom:8px}
</style></head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">WowBox</div>
    <p style="color:rgba(255,255,255,.6);font-size:13px;margin:4px 0 0">South Africa's Gift Experience Platform</p>
  </div>
  <div class="body">
    <h1>Your gift experience awaits! 🎉</h1>
    <p>Hi <strong>${escHtml(name || 'there')}</strong>,</p>
    <p>Your WowBox has been confirmed. Below is your unique voucher code for <strong>${escHtml(box?.name || 'your experience')}</strong>.</p>

    <div class="voucher-box">
      <div class="box-name">${escHtml(box?.name || 'Experience Box')}</div>
      <div>Your Voucher Code</div>
      <div class="code">${escHtml(code)}</div>
      <div style="color:rgba(255,255,255,.5);font-size:13px;margin-top:8px">Valid for 12 months</div>
    </div>

    ${message ? `<div class="message-box"><p style="margin:0"><strong>Personal message:</strong><br>${escHtml(message)}</p></div>` : ''}

    <h2 style="font-size:18px;color:#0b2419">How to redeem</h2>
    <p>1. <strong>Contact the experience provider</strong> directly to book your date.<br>
       2. <strong>Present your voucher code</strong> at the time of your experience.<br>
       3. <strong>Enjoy!</strong> — and leave a review on WowBox.</p>

    <p>You can also manage your vouchers anytime at <a href="https://wowbox.co.za/my-vouchers" style="color:#0b2419;font-weight:600">wowbox.co.za/my-vouchers</a>.</p>

    <p style="color:#999;font-size:13px">Questions? Email us at <a href="mailto:support@wowbox.co.za" style="color:#0b2419">support@wowbox.co.za</a></p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} WowBox · <a href="https://wowbox.co.za">wowbox.co.za</a><br>
    This voucher was sent to ${escHtml(to)}</p>
  </div>
</div>
</body>
</html>`;
  } else if (type === 'partner_welcome') {
    const { name, business_name, password } = data || {};
    subject = `Welcome to WowBox Partner Portal — ${business_name}`;
    html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#faf8f2;padding:20px">
<div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#0b2419;padding:28px;text-align:center">
    <div style="color:#c8983a;font-size:26px;font-weight:700">WowBox</div>
    <p style="color:rgba(255,255,255,.6);font-size:13px">Partner Portal</p>
  </div>
  <div style="padding:36px 32px">
    <h1 style="color:#0b2419;font-size:22px">Welcome aboard, ${escHtml(name || 'Partner')}!</h1>
    <p style="color:#555;line-height:1.7">Your WowBox partner account for <strong>${escHtml(business_name || '')}</strong> has been created.</p>
    <div style="background:#faf8f2;border-radius:8px;padding:20px;margin:20px 0">
      <p style="margin:0;font-size:14px;color:#444"><strong>Login URL:</strong> <a href="https://wowbox.co.za/partner" style="color:#0b2419">wowbox.co.za/partner</a><br>
      <strong>Email:</strong> ${escHtml(to)}<br>
      <strong>Temp Password:</strong> ${escHtml(password || '(provided separately)')}</p>
    </div>
    <p style="color:#555">Please change your password after first login. Questions? <a href="mailto:info@wowbox.co.za" style="color:#0b2419">info@wowbox.co.za</a></p>
  </div>
</div>
</body></html>`;
  } else {
    return res.status(400).json({ error: 'Unknown email type' });
  }

  try {
    // Send via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WowBox <info@wowbox.co.za>',
        to: [to],
        cc: ['geff.pr@gmail.com'],   // BCC copy to admin
        subject,
        html,
        reply_to: 'support@wowbox.co.za',
      }),
    });

    const result = await emailRes.json();

    if (!emailRes.ok) {
      console.error('Resend error:', result);
      return res.status(400).json({ error: result.message || 'Email send failed' });
    }

    return res.status(200).json({ success: true, id: result.id });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
