// api/send-email.js — WowBox email handler via Resend
// Deploy to Vercel. Set env var: RESEND_API_KEY

const FROM = 'WowBox <noreply@wowbox.co.za>';
const ADMIN_EMAIL = 'info@wowbox.co.za';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, order } = req.body || {};
  if (!type) return res.status(400).json({ error: 'Missing type' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not set' });

  try {
    let emails = [];

    // ─── ORDER EMAILS ───────────────────────────────────────────────
    if (type === 'status_delivered' || type === 'resend') {
      const codes = (order.items || [])
        .filter(i => i.code && i.code !== '—')
        .map(i => `<div style="font-family:monospace;font-size:1.1rem;font-weight:700;letter-spacing:.05em;background:#f1f5f9;border-radius:8px;padding:10px 16px;display:inline-block;margin:4px 0">${i.code}</div>`)
        .join('<br>');

      const videoBtn = order.videoToken
        ? `<div style="margin:24px 0"><a href="https://wowbox.co.za/gift-video/${order.videoToken}" style="background:#1e3a5f;color:#fff;text-decoration:none;padding:14px 28px;border-radius:99px;font-weight:700;font-size:.95rem">🎬 Watch your personal video</a></div>`
        : '';

      const schedNote = order.schedDate
        ? `<p style="color:#64748b;font-size:.85rem">📅 Scheduled delivery: ${order.schedDate}</p>`
        : '';

      const giftMsg = order.giftMsg
        ? `<div style="margin:20px 0;padding:16px 20px;background:#fef9f0;border-left:4px solid #f59e0b;border-radius:8px;font-style:italic;color:#1e3a5f">"${order.giftMsg}"</div>`
        : '';

      emails.push({
        to: order.email,
        subject: `🎁 Your WowBox is here — ${order.name}`,
        html: baseTemplate(`
          <h1 style="font-family:'Georgia',serif;font-size:1.8rem;color:#1e3a5f;margin-bottom:8px">Your gift box is here!</h1>
          <p style="color:#64748b">Hi ${order.name || 'there'}, your WowBox is ready to use.</p>
          ${giftMsg}
          ${videoBtn}
          <div style="margin:24px 0">
            <p style="font-weight:700;color:#1e3a5f;margin-bottom:8px">Your voucher code${(order.items||[]).length > 1 ? 's' : ''}:</p>
            ${codes || '<p style="color:#64748b">Your code will be sent shortly.</p>'}
          </div>
          ${schedNote}
          <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-top:20px;font-size:.85rem;color:#64748b">
            <p style="margin:0"><strong>Order #${order.id}</strong> · ${order.date} · ${order.total}</p>
            <p style="margin:6px 0 0">To activate your box, go to <a href="https://wowbox.co.za/activate" style="color:#1e3a5f">wowbox.co.za/activate</a> and enter your code.</p>
          </div>
        `)
      });
    }

    if (type === 'status_pending' || type === 'status_in_process' || type === 'status_in_transit') {
      const statusMessages = {
        status_pending:    { title: 'Order received', msg: 'We\'ve received your order and are preparing your WowBox.' },
        status_in_process: { title: 'Order in progress', msg: 'Your WowBox is being prepared and will be dispatched soon.' },
        status_in_transit: { title: 'On its way!', msg: 'Your WowBox has been dispatched and is on its way to you.' },
      };
      const s = statusMessages[type] || statusMessages.status_pending;
      emails.push({
        to: order.email,
        subject: `WowBox — ${s.title} #${order.id}`,
        html: baseTemplate(`
          <h1 style="font-family:'Georgia',serif;font-size:1.6rem;color:#1e3a5f">${s.title}</h1>
          <p style="color:#64748b">Hi ${order.name || 'there'}, ${s.msg}</p>
          <p style="color:#64748b">Order #${order.id} · ${order.total}</p>
        `)
      });
    }

    if (type === 'reissue') {
      const codes = (order.items || []).filter(i => i.code && i.code !== '—').map(i => `<strong style="font-family:monospace">${i.code}</strong>`).join(', ');
      emails.push({
        to: order.email,
        subject: `WowBox — Your new voucher code`,
        html: baseTemplate(`
          <h1 style="font-family:'Georgia',serif;font-size:1.6rem;color:#1e3a5f">Your new voucher code</h1>
          <p style="color:#64748b">Hi ${order.name || 'there'}, here is your reissued WowBox code:</p>
          <p style="font-family:monospace;font-size:1.2rem;font-weight:700;background:#f1f5f9;padding:12px;border-radius:8px;display:inline-block">${codes}</p>
        `)
      });
    }

    // ─── PARTNER EMAILS ──────────────────────────────────────────────
    if (type === 'partner_application') {
      // Notify admin
      emails.push({
        to: ADMIN_EMAIL,
        subject: `🆕 New partner application — ${order.name}`,
        html: baseTemplate(`
          <h1 style="font-family:'Georgia',serif;font-size:1.6rem;color:#1e3a5f">New partner application</h1>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <tr><td style="padding:8px;color:#64748b;width:140px">Business</td><td style="padding:8px;font-weight:700;color:#1e3a5f">${order.name}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Email</td><td style="padding:8px">${order.email}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Type</td><td style="padding:8px">${(order.items&&order.items[0]) ? order.items[0].name : '—'}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">City</td><td style="padding:8px">${(order.items&&order.items[0]) ? order.items[0].type : '—'}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Phone</td><td style="padding:8px">${(order.items&&order.items[0]) ? order.items[0].status : '—'}</td></tr>
          </table>
          <div style="margin-top:24px"><a href="https://wowbox.co.za/admin" style="background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:99px;font-weight:700">Review in Admin</a></div>
        `)
      });
    }

    if (type === 'partner_approved') {
      emails.push({
        to: order.email,
        subject: `🎉 Welcome to WowBox — your partner account is approved`,
        html: baseTemplate(`
          <h1 style="font-family:'Georgia',serif;font-size:1.8rem;color:#1e3a5f">You're in! Welcome to WowBox.</h1>
          <p style="color:#64748b">Hi ${order.name || 'there'},</p>
          <p style="color:#64748b">Your partner application has been approved. You can now log in to the WowBox Partner Portal to add your experiences and start receiving bookings.</p>
          <div style="margin:28px 0"><a href="https://wowbox.co.za/partners" style="background:#16a34a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:99px;font-weight:700;font-size:.95rem">Access Partner Portal →</a></div>
          <p style="color:#94a3b8;font-size:.82rem">Questions? Email us at <a href="mailto:info@wowbox.co.za" style="color:#1e3a5f">info@wowbox.co.za</a></p>
        `)
      });
    }

    if (type === 'partner_rejected') {
      emails.push({
        to: order.email,
        subject: `WowBox — Partner application update`,
        html: baseTemplate(`
          <h1 style="font-family:'Georgia',serif;font-size:1.6rem;color:#1e3a5f">Application update</h1>
          <p style="color:#64748b">Hi ${order.name || 'there'},</p>
          <p style="color:#64748b">Thank you for your interest in partnering with WowBox. After reviewing your application, we are unable to proceed at this time.</p>
          <p style="color:#64748b">If you believe this is an error or would like to reapply, please contact us at <a href="mailto:info@wowbox.co.za" style="color:#1e3a5f">info@wowbox.co.za</a>.</p>
        `)
      });
    }

    if (type === 'booking_confirmation') {
      // Email to customer
      emails.push({
        to: order.customerEmail,
        subject: `✅ Booking confirmed — ${order.experienceName}`,
        html: baseTemplate(`
          <h1 style="font-family:'Georgia',serif;font-size:1.7rem;color:#1e3a5f">Booking confirmed!</h1>
          <p style="color:#64748b">Hi ${order.customerName || 'there'}, your experience is booked.</p>
          <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:18px 20px;margin:20px 0">
            <p style="margin:0 0 6px;font-weight:700;color:#1e3a5f">${order.experienceName}</p>
            <p style="margin:0;color:#64748b;font-size:.88rem">${order.partnerName}${order.bookingDate ? ' · ' + order.bookingDate : ''}${order.guests ? ' · ' + order.guests + ' guests' : ''}</p>
          </div>
          <p style="color:#64748b;font-size:.85rem">Your voucher code: <strong style="font-family:monospace">${order.voucherCode || '—'}</strong></p>
          <p style="color:#94a3b8;font-size:.82rem">Present this code to your host on the day of your experience.</p>
        `)
      });
      // Notify partner
      if (order.partnerEmail) {
        emails.push({
          to: order.partnerEmail,
          subject: `📅 New booking — ${order.experienceName}`,
          html: baseTemplate(`
            <h1 style="font-family:'Georgia',serif;font-size:1.6rem;color:#1e3a5f">New booking received</h1>
            <table style="width:100%;border-collapse:collapse;margin-top:16px">
              <tr><td style="padding:8px;color:#64748b;width:140px">Experience</td><td style="padding:8px;font-weight:700;color:#1e3a5f">${order.experienceName}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Guest</td><td style="padding:8px">${order.customerName} · ${order.customerEmail}</td></tr>
              <tr><td style="padding:8px;color:#64748b">Date</td><td style="padding:8px">${order.bookingDate || 'TBC'}</td></tr>
              <tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Guests</td><td style="padding:8px">${order.guests || '2'}</td></tr>
              <tr><td style="padding:8px;color:#64748b">Voucher</td><td style="padding:8px;font-family:monospace;font-weight:700">${order.voucherCode || '—'}</td></tr>
            </table>
            <div style="margin-top:24px"><a href="https://wowbox.co.za/partner" style="background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:99px;font-weight:700">View in Partner Portal</a></div>
          `)
        });
      }
    }

    // ─── Send all queued emails ──────────────────────────────────────
    if (!emails.length) return res.json({ success: true, sent: 0, message: 'No emails for type: ' + type });

    const results = await Promise.all(emails.map(e => sendViaResend(e, RESEND_API_KEY)));
    const failed  = results.filter(r => !r.ok);

    return res.json({
      success: failed.length === 0,
      sent:    results.length,
      failed:  failed.length,
      errors:  failed.map(f => f.error),
    });

  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function sendViaResend({ to, subject, html }, apiKey) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from: FROM, to, subject, html }),
    });
    const data = await r.json();
    return r.ok ? { ok: true } : { ok: false, error: data.message || data.error };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function baseTemplate(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:28px 32px;text-align:center">
    <div style="font-family:'Georgia',serif;font-size:1.6rem;font-weight:700;color:#fff;letter-spacing:.04em">WowBox</div>
    <div style="font-size:.7rem;color:rgba(255,255,255,.45);letter-spacing:.18em;text-transform:uppercase;margin-top:4px">Premium Gift Experiences</div>
  </div>
  <div style="padding:32px">${body}</div>
  <div style="padding:20px 32px;background:#f8fafc;text-align:center;font-size:.75rem;color:#94a3b8;border-top:1px solid #e2e8f0">
    © ${new Date().getFullYear()} WowBox · RC Tradeworx Holdings (Pty) Ltd<br>
    <a href="mailto:support@wowbox.co.za" style="color:#64748b">support@wowbox.co.za</a>
  </div>
</div>
</body></html>`;
}
