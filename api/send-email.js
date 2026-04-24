export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const RESEND_KEY  = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL = 'geff.pr@gmail.com';
  const FROM        = 'WowBox <onboarding@resend.dev>';

  if (!RESEND_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const { type, order } = req.body;
  if (!type || !order) return res.status(400).json({ error: 'Missing type or order' });

  const isEbox     = order.type === 'E-Box';
  const isPhysical = order.type === 'Physical';
  const codes      = (order.items || []).filter(i => i.code && i.code !== '--')
    .map(i => '<code style="font-family:monospace;font-size:15px;font-weight:700;color:#2563eb;background:#dbeafe;padding:4px 10px;border-radius:6px">' + i.code + '</code> — ' + i.name)
    .join('<br>');

  const header = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center"><div style="font-size:28px;font-weight:700;color:#fff">WowBox</div><div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:4px;text-transform:uppercase;letter-spacing:.08em">Gift Experiences</div></div><div style="background:#fff;padding:32px 36px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">';
  const footer = '</div><div style="padding:20px;text-align:center;font-size:12px;color:#94a3b8">WowBox · wowbox.co.za · support@wowbox.co.za<br>' + (order.email || '') + ' · ' + (order.id || '') + '</div></div>';
  const orderBlock = '<div style="background:#f8fafc;border-radius:10px;padding:18px 22px;margin:20px 0;border:1px solid #e2e8f0"><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:12px">Order summary</div><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748b;font-size:14px">Order #</span><span style="font-weight:700;color:#0f172a">' + (order.id||'') + '</span></div><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#64748b;font-size:14px">Date</span><span style="color:#0f172a;font-size:14px">' + (order.date||'') + '</span></div><div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:10px;margin-top:10px"><span style="color:#64748b;font-size:14px">Total</span><span style="font-weight:700;font-size:16px;color:#2563eb">' + (order.total||'') + '</span></div></div>';
  const codeBlock = codes ? '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px 24px;margin:20px 0;text-align:center"><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#166534;margin-bottom:12px">Your voucher code</div><div style="font-size:14px;line-height:2.2">' + codes + '</div></div>' : '';
  const browseBtn = '<div style="text-align:center;margin:24px 0"><a href="https://wowbox.co.za" style="background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Browse experiences →</a></div>';

  let subject, html;

  if (type === 'box_activated') {
    subject = 'Your WowBox is ready! — ' + (order.id || '');
    html = header
      + '<h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your WowBox is activated! 🎁</h2>'
      + '<p style="color:#475569;font-size:15px;line-height:1.7">Hi ' + (order.name || 'there') + ',<br><br>Your WowBox has been activated and is ready to use. Use your code below to browse and book your experience on wowbox.co.za</p>'
      + codeBlock
      + browseBtn
      + '<p style="color:#94a3b8;font-size:13px">Your voucher is valid for 12 months. Visit wowbox.co.za to browse hundreds of experiences across South Africa.</p>'
      + footer;
  } else if (type === 'status_pending') {
    subject = 'Order confirmed — ' + (order.id || '');
    html = header + '<h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">We\'ve received your order! 🎁</h2><p style="color:#475569;font-size:15px;line-height:1.7">Hi ' + (order.name||'there') + ',<br><br>Thank you for your WowBox order. We\'re processing it now.</p>' + orderBlock + footer;
  } else if (type === 'status_in_process') {
    subject = 'Your WowBox is being prepared — ' + (order.id || '');
    html = header + '<h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your order is being prepared ⚙️</h2><p style="color:#475569;font-size:15px;line-height:1.7">Hi ' + (order.name||'there') + ',<br><br>' + (isEbox ? 'Your e-vouchers are being generated.' : 'Your physical box is being packed.') + '</p>' + orderBlock + footer;
  } else if (type === 'status_in_transit') {
    const address = order.delivery ? order.delivery.street + ', ' + order.delivery.city : 'your delivery address';
    subject = 'Your WowBox is on its way! 📦 — ' + (order.id || '');
    html = header + '<h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your WowBox has shipped! 🚚</h2><p style="color:#475569;font-size:15px;line-height:1.7">Hi ' + (order.name||'there') + ',<br><br>Your WowBox is on its way to <strong>' + address + '</strong>. Expected delivery: 2–3 business days.</p>' + orderBlock + footer;
  } else if (type === 'status_delivered' && isPhysical) {
    subject = 'Your WowBox has arrived! — ' + (order.id || '');
    html = header + '<h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your WowBox has arrived! 🎉</h2><p style="color:#475569;font-size:15px;line-height:1.7">Hi ' + (order.name||'there') + ',<br><br>Your physical WowBox is with you. Activate it at wowbox.co.za to start browsing experiences.</p>' + codeBlock + browseBtn + orderBlock + footer;
  } else if (type === 'status_delivered') {
    subject = 'Your e-voucher is ready! — ' + (order.id || '');
    html = header + '<h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your e-voucher is ready! ✨</h2><p style="color:#475569;font-size:15px;line-height:1.7">Hi ' + (order.name||'there') + ',<br><br>Your WowBox e-voucher is active. Present your code at the partner venue to book.</p>' + codeBlock + browseBtn + orderBlock + footer;
  } else if (type === 'resend') {
    subject = 'Your WowBox order — ' + (order.id || '');
    html = header + '<h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your WowBox order 📋</h2><p style="color:#475569;font-size:15px;line-height:1.7">Hi ' + (order.name||'there') + ', here\'s a copy of your order details.</p>' + orderBlock + codeBlock + browseBtn + footer;
  } else if (type === 'reissue') {
    subject = 'Your new WowBox code — ' + (order.id || '');
    html = header + '<h2 style="font-size:22px;color:#0f172a;margin-bottom:8px">Your new voucher code 🔄</h2><p style="color:#475569;font-size:15px;line-height:1.7">Hi ' + (order.name||'there') + ',<br><br>Here is your reissued WowBox voucher. The previous code has been deactivated.</p>' + codeBlock + browseBtn + footer;
  } else {
    return res.status(400).json({ error: 'Unknown type: ' + type });
  }

  const send = async (to, subj, body) => {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject: subj, html: body }),
    });
    return r.json();
  };

  try {
    const result = await send(order.email, subject, html);
    if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));

    // Admin copy
    await send(ADMIN_EMAIL,
      '[WowBox] ' + type + ' — ' + (order.id||'') + ' — ' + (order.name||''),
      '<p><b>Type:</b> ' + type + '</p><p><b>Order:</b> ' + (order.id||'') + '</p><p><b>Customer:</b> ' + (order.name||'') + ' (' + (order.email||'') + ')</p><p><b>Total:</b> ' + (order.total||'') + '</p>'
    );

    return res.status(200).json({ success: true, message: 'Email sent to ' + order.email });
  } catch(err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: err.message });
  }
}
