// Vercel Serverless Function — WowBox Email System
// POST /api/send-email
// Body: { type, order, adminEmail? }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_KEY   = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL  = 'geff.pr@gmail.com';
  const FROM_EMAIL   = 'WowBox <orders@wowbox.co.za>';
  const FROM_FALLBACK = 'WowBox <onboarding@resend.dev>'; // fallback if domain not verified

  if (!RESEND_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured in Vercel env vars' });
  }

  const { type, order } = req.body;
  if (!type || !order) {
    return res.status(400).json({ error: 'Missing type or order' });
  }

  // ── Build email content based on type ──────────────────────────
  let subject, html, customerEmail, ccAdmin = true;

  const isEbox     = order.type === 'E-Box';
  const isPhysical = order.type === 'Physical';
  const isMixed    = order.type === 'Mixed';
  const codes      = (order.items || [])
    .filter(i => i.code && i.code !== '—')
    .map(i => `<code style="font-family:monospace;font-size:15px;font-weight:700;color:#2563eb;background:#dbeafe;padding:4px 10px;border-radius:6px">${i.code}</code> — ${i.name}`)
    .join('<br>');

  customerEmail = order.email;

  // Shared header/footer
  const header = `
    <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc">
      <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
        <div style="font-family:'Georgia',serif;font-size:28px;font-weight:700;color:#fff;letter-spacing:.02em">WowBox</div>
        <div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px;letter-spacing:.08em;text-transform:uppercase">Gift Experiences</div>
      </div>
      <div style="background:#fff;padding:32px 36px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
  `;
  const footer = `
      </div>
      <div style="padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8">
        <p>WowBox · wowbox.co.za · support@wowbox.co.za</p>
        <p style="margin-top:4px">This email was sent to ${customerEmail} regarding order ${order.id}</p>
      </div>
    </div>
  `;

  const orderSummaryBlock = `
    <div style="background:#f8fafc;border-radius:10px;padding:18px 22px;margin:20px 0;border:1px solid #e2e8f0">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:12px">Order summary</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748b;font-size:14px">Order #</span><span style="font-weight:700;color:#0f172a;font-size:14px">${order.id}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748b;font-size:14px">Date</span><span style="font-size:14px;color:#0f172a">${order.date}</span></div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:10px;margin-top:10px"><span style="color:#64748b;font-size:14px">Total</span><span style="font-weight:700;font-size:16px;color:#2563eb">${order.total}</span></div>
    </div>
  `;

  // ── EMAIL TYPES ──────────────────────────────────────────────────

  if (type === 'status_pending') {
    subject = `Order confirmed — ${order.id}`;
    html = header + `
      <h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">We've received your order! 🎁</h2>
      <p style="color:#475569;font-size:15px;line-height:1.7">Hi ${order.name},<br><br>
      Thank you for your WowBox order. We're processing it now and will update you at each step.</p>
      ${orderSummaryBlock}
      <p style="color:#475569;font-size:14px">Expected next update: within a few hours.</p>
    ` + footer;
  }

  else if (type === 'status_in_process') {
    subject = `Your WowBox is being prepared — ${order.id}`;
    html = header + `
      <h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your order is being prepared ⚙️</h2>
      <p style="color:#475569;font-size:15px;line-height:1.7">Hi ${order.name},<br><br>
      Great news — we're currently preparing your WowBox order. 
      ${isEbox ? 'Your e-voucher(s) are being generated.' : 'Your physical box(es) are being packed.'}</p>
      ${orderSummaryBlock}
    ` + footer;
  }

  else if (type === 'status_in_transit') {
    subject = `Your WowBox is on its way! 📦 — ${order.id}`;
    const address = order.delivery
      ? `${order.delivery.street}, ${order.delivery.city}, ${order.delivery.province}`
      : 'your delivery address';
    html = header + `
      <h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your WowBox has shipped! 🚚</h2>
      <p style="color:#475569;font-size:15px;line-height:1.7">Hi ${order.name},<br><br>
      Your WowBox is on its way to <strong>${address}</strong>. Expected delivery within 2–3 business days.</p>
      ${orderSummaryBlock}
      <p style="color:#475569;font-size:14px">If you have any questions about your delivery, reply to this email or contact us at support@wowbox.co.za</p>
    ` + footer;
  }

  else if (type === 'status_delivered' && isPhysical) {
    subject = `Your WowBox has arrived! — ${order.id}`;
    html = header + `
      <h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your WowBox has arrived! 🎉</h2>
      <p style="color:#475569;font-size:15px;line-height:1.7">Hi ${order.name},<br><br>
      Your physical WowBox should now be with you. To activate your box and start browsing experiences, visit:</p>
      <div style="text-align:center;margin:24px 0">
        <a href="https://wowbox.co.za/activate" style="background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Activate my WowBox →</a>
      </div>
      ${orderSummaryBlock}
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px 20px;margin-top:16px">
        <div style="font-size:13px;font-weight:700;color:#166534;margin-bottom:8px">Your box codes</div>
        <div style="font-size:14px;line-height:2">${codes || 'See your original order email'}</div>
      </div>
    ` + footer;
  }

  else if (type === 'status_delivered' && (isEbox || isMixed)) {
    subject = `Your e-voucher is ready! — ${order.id}`;
    html = header + `
      <h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your e-voucher is ready! ✨</h2>
      <p style="color:#475569;font-size:15px;line-height:1.7">Hi ${order.name},<br><br>
      Your WowBox e-voucher is active and ready to use. Present your code at the partner venue to book your experience.</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px 24px;margin:24px 0;text-align:center">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#166534;margin-bottom:12px">Your voucher code(s)</div>
        <div style="font-size:15px;line-height:2.2">${codes}</div>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="https://wowbox.co.za" style="background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Browse experiences →</a>
      </div>
      ${orderSummaryBlock}
      <p style="color:#94a3b8;font-size:13px">Your voucher is valid for 12 months from date of activation. Visit wowbox.co.za to browse and reserve your experience.</p>
    ` + footer;
  }

  else if (type === 'resend') {
    subject = `Your WowBox order — ${order.id}`;
    html = header + `
      <h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your WowBox order 📋</h2>
      <p style="color:#475569;font-size:15px;line-height:1.7">Hi ${order.name},<br><br>
      Here's a copy of your WowBox order details as requested.</p>
      ${orderSummaryBlock}
      ${codes ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px 24px;margin:20px 0">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#166534;margin-bottom:12px">Your voucher code(s)</div>
        <div style="font-size:14px;line-height:2.2">${codes}</div>
      </div>` : ''}
      <div style="text-align:center;margin:20px 0">
        <a href="https://wowbox.co.za" style="background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Go to WowBox →</a>
      </div>
    ` + footer;
  }

  else if (type === 'reissue') {
    subject = `Your new WowBox code — ${order.id}`;
    html = header + `
      <h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your new voucher code 🔄</h2>
      <p style="color:#475569;font-size:15px;line-height:1.7">Hi ${order.name},<br><br>
      As requested, here is your reissued WowBox voucher code. The previous code has been deactivated.</p>
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:20px 24px;margin:24px 0;text-align:center">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#92400e;margin-bottom:12px">New voucher code</div>
        <div style="font-size:15px;line-height:2.2">${codes}</div>
      </div>
      <div style="text-align:center;margin:20px 0">
        <a href="https://wowbox.co.za" style="background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Browse experiences →</a>
      </div>
    ` + footer;
  }

  else {
    return res.status(400).json({ error: `Unknown email type: ${type}` });
  }

  // ── Internal admin notification ──────────────────────────────────
  const adminSubject = `[WowBox Admin] ${type.replace(/_/g,' ')} — ${order.id} — ${order.name}`;
  const adminHtml = `
    <div style="font-family:Arial,sans-serif;max-width:500px;padding:20px">
      <h3 style="color:#0f172a">WowBox internal notification</h3>
      <p><strong>Type:</strong> ${type}</p>
      <p><strong>Order:</strong> ${order.id}</p>
      <p><strong>Customer:</strong> ${order.name} (${order.email})</p>
      <p><strong>Type:</strong> ${order.type}</p>
      <p><strong>Total:</strong> ${order.total}</p>
      <p><strong>Codes:</strong> ${(order.items||[]).map(i=>i.code).join(', ')}</p>
    </div>`;

  // ── Send via Resend ──────────────────────────────────────────────
  try {
    // Customer email
    const customerResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [customerEmail],
        subject,
        html,
      }),
    });

    const customerData = await customerResp.json();
    if (!customerResp.ok) {
      // Try fallback sender
      const fallbackResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:    FROM_FALLBACK,
          to:      [customerEmail],
          subject,
          html,
        }),
      });
      const fallbackData = await fallbackResp.json();
      if (!fallbackResp.ok) {
        return res.status(500).json({ error: 'Resend error', detail: fallbackData });
      }
    }

    // Admin notification
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_FALLBACK,
        to:      [ADMIN_EMAIL],
        subject: adminSubject,
        html:    adminHtml,
      }),
    });

    return res.status(200).json({ success: true, message: `Email sent to ${customerEmail}` });

  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: err.message });
  }
}
