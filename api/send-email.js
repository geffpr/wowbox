// api/send-email.js — WowBox Email Handler via Resend
// Required env var: RESEND_API_KEY

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM           = 'WowBox <hello@wowbox.co.za>';
const ADMIN_EMAIL    = 'hello@wowbox.co.za';
const ADMIN_CC       = 'geff.pr@gmail.com';
const SITE_URL       = 'https://wowbox.co.za';

// ── Brand colours (warm brown palette matching the site) ────────────────────
const C = {
  darkBrown:  '#3d1008',  // logo bar, footer, code box bg
  midBrown:   '#7c2d12',  // accents
  gold:       '#d97706',  // badges, highlights
  goldDark:   '#b45309',  // buttons
  text:       '#3d1008',  // headings
  muted:      '#78350f',  // subtext
  body:       '#57534e',  // paragraph text
  bg:         '#fdf8f3',  // page background
  card:       '#fffbf5',  // card background
  border:     '#e7d5c1',  // dividers
  highlight:  '#fef3c7',  // highlight bg
  hlBorder:   '#fcd34d',  // highlight border
};

// ── Unsplash hero images ────────────────────────────────────────────────────
const HEROES = {
  order:   'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80&auto=format&fit=crop',
  booking: 'https://images.unsplash.com/photo-1559508551-44bff1de756b?w=800&q=80&auto=format&fit=crop',
  partner: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80&auto=format&fit=crop',
  contact: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80&auto=format&fit=crop',
};

// ── Layout wrapper ──────────────────────────────────────────────────────────
function layout(content, heroUrl, preheader) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WowBox</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
${preheader ? `<span style="display:none;max-height:0;overflow:hidden">${preheader}&nbsp;</span>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation"
      style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(61,16,8,0.18)">

      <!-- HERO -->
      <tr><td style="padding:0;line-height:0">
        <img src="${heroUrl}" width="600" height="220"
          style="width:100%;max-width:600px;height:220px;object-fit:cover;display:block" alt="">
      </td></tr>

      <!-- LOGO BAR -->
      <tr><td style="background:${C.darkBrown};padding:20px 40px;text-align:center">
        <span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;
          color:#ffffff;letter-spacing:3px">WowBox</span>
        <span style="display:block;font-size:10px;color:rgba(255,255,255,0.5);
          letter-spacing:5px;text-transform:uppercase;margin-top:4px">Unforgettable Experiences</span>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background:#ffffff;padding:40px 48px 36px">
        ${content}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:${C.darkBrown};padding:28px 40px;text-align:center">
        <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:15px;color:#ffffff;letter-spacing:2px">WowBox</p>
        <p style="margin:0 0 14px;font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:.5px">
          Give unforgettable experiences &nbsp;·&nbsp; wowbox.co.za
        </p>
        <p style="margin:0 0 12px;font-size:11px">
          <a href="${SITE_URL}/privacy" style="color:rgba(255,255,255,0.45);text-decoration:none">Privacy</a>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <a href="${SITE_URL}/terms" style="color:rgba(255,255,255,0.45);text-decoration:none">Terms</a>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <a href="mailto:support@wowbox.co.za" style="color:rgba(255,255,255,0.45);text-decoration:none">Support</a>
        </p>
        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.25)">
          © 2025 WowBox · RC Tradeworx Holdings (Pty) Ltd · South Africa
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Snippets ────────────────────────────────────────────────────────────────
const h1 = t =>
  `<h1 style="margin:0 0 10px;font-family:Georgia,serif;font-size:28px;font-weight:700;color:${C.text};line-height:1.25">${t}</h1>`;
const h2 = t =>
  `<h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:20px;font-weight:700;color:${C.text}">${t}</h2>`;
const p  = t =>
  `<p style="margin:0 0 16px;font-size:15px;color:${C.body};line-height:1.7">${t}</p>`;
const sm = t =>
  `<p style="margin:0 0 10px;font-size:13px;color:#a8a29e;line-height:1.6">${t}</p>`;
const hr = () =>
  `<hr style="border:none;border-top:1px solid ${C.border};margin:28px 0">`;

const badge = (t, color) =>
  `<span style="display:inline-block;background:${color||C.gold};color:#fff;font-size:11px;font-weight:700;
  padding:4px 14px;border-radius:99px;letter-spacing:.8px;text-transform:uppercase;margin-bottom:18px">${t}</span>`;

const btn = (label, url, color) =>
  `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0 8px">
    <tr><td style="background:${color||C.goldDark};border-radius:8px">
      <a href="${url}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;
        color:#ffffff;text-decoration:none;letter-spacing:.3px">${label} &rarr;</a>
    </td></tr>
  </table>`;

const codeBox = code =>
  `<div style="background:${C.darkBrown};border-radius:12px;padding:22px;text-align:center;margin:20px 0">
    <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:2px">Voucher code</p>
    <span style="font-family:'Courier New',monospace;font-size:26px;font-weight:700;
      color:#fcd34d;letter-spacing:4px">${code}</span>
  </div>`;

const infoRow = (label, value) =>
  `<tr>
    <td style="padding:10px 14px;font-size:13px;color:#78716c;width:42%;border-bottom:1px solid #f5ede6">${label}</td>
    <td style="padding:10px 14px;font-size:13px;color:${C.text};font-weight:600;border-bottom:1px solid #f5ede6">${value}</td>
  </tr>`;

const infoTable = rows =>
  `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="border:1px solid ${C.border};border-radius:10px;overflow:hidden;margin:20px 0">${rows}</table>`;

const highlight = (content, bg, border) =>
  `<div style="background:${bg||C.highlight};border-left:4px solid ${border||C.hlBorder};
    border-radius:0 10px 10px 0;padding:16px 20px;margin:20px 0;
    font-size:14px;color:${C.muted};line-height:1.6">${content}</div>`;


// ── Admin simple email layout (no hero, just info) ───────────────────────────
function adminLayout(content) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>WowBox Admin</title></head>
<body style="margin:0;padding:20px;background:#f9fafb;font-family:Arial,sans-serif">
<table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden">
  <tr><td style="background:#3d1008;padding:16px 24px">
    <span style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#fff;letter-spacing:2px">WowBox</span>
    <span style="font-size:11px;color:rgba(255,255,255,.5);margin-left:8px">Admin Notification</span>
  </td></tr>
  <tr><td style="padding:24px">${content}</td></tr>
  <tr><td style="background:#f3f4f6;padding:12px 24px;font-size:11px;color:#6b7280;text-align:center">
    WowBox · RC Tradeworx Holdings (Pty) Ltd · admin@wowbox.co.za
  </td></tr>
</table>
</body></html>`;
}

function adminInfoTable(rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:12px 0">${rows}</table>`;
}
function adminRow(label, value) {
  return `<tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;background:#f9fafb;width:40%;border-bottom:1px solid #e5e7eb">${label}</td><td style="padding:8px 12px;font-size:13px;color:#111827;font-weight:600;border-bottom:1px solid #e5e7eb">${value||'—'}</td></tr>`;
}
function adminBtn(label, url) {
  return `<a href="${url}" style="display:inline-block;margin-top:16px;background:#3d1008;color:#fff;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none">${label} →</a>`;
}

// ── NEW: New partner application (admin) ─────────────────────────────────────
function tplAdminNewPartner(o) {
  return {
    subject: `🆕 New partner application — ${o.bizName || o.name}`,
    html: adminLayout(`
      <h2 style="margin:0 0 4px;font-size:18px;color:#111827">New Partner Application</h2>
      <p style="margin:0 0 16px;font-size:13px;color:#6b7280">Received ${new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}</p>
      ${adminInfoTable(
        adminRow('Business name', o.bizName) +
        adminRow('Contact name', o.name) +
        adminRow('Email', o.email) +
        adminRow('Phone', o.phone) +
        adminRow('Location', o.location) +
        adminRow('Type', o.type)
      )}
      ${adminBtn('Review in Admin', 'https://wowbox.co.za/admin#adm-partners')}
    `),
  };
}

// ── NEW: New experience submitted (admin) ─────────────────────────────────────
function tplAdminExpSubmitted(o) {
  return {
    subject: `📋 New experience to review — "${o.experienceName}"`,
    html: adminLayout(`
      <h2 style="margin:0 0 4px;font-size:18px;color:#111827">New Experience Submitted</h2>
      <p style="margin:0 0 16px;font-size:13px;color:#6b7280">Requires approval before going live</p>
      ${adminInfoTable(
        adminRow('Experience', o.experienceName) +
        adminRow('Partner', o.partnerName) +
        adminRow('Partner email', o.partnerEmail) +
        adminRow('Category', o.category) +
        adminRow('Location', o.location) +
        adminRow('Price', o.price ? 'R' + o.price : '—')
      )}
      ${adminBtn('Review in Admin', 'https://wowbox.co.za/admin#adm-exp-requests')}
    `),
  };
}

// ── NEW: Experience edit submitted (admin) ────────────────────────────────────
function tplAdminExpEdited(o) {
  return {
    subject: `✏️ Experience edit to review — "${o.experienceName}"`,
    html: adminLayout(`
      <h2 style="margin:0 0 4px;font-size:18px;color:#111827">Experience Edit Submitted</h2>
      <p style="margin:0 0 16px;font-size:13px;color:#6b7280">Partner has submitted an update — requires re-approval</p>
      ${adminInfoTable(
        adminRow('Experience', o.experienceName) +
        adminRow('Partner', o.partnerName) +
        adminRow('Partner email', o.partnerEmail)
      )}
      ${adminBtn('Review in Admin', 'https://wowbox.co.za/admin#adm-exp-requests')}
    `),
  };
}

// ── NEW: BKW booking confirmation (customer) ──────────────────────────────────
function tplBkwBookingCustomer(o) {
  const dateDisplay = o.bookingDate
    ? new Date(o.bookingDate).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    : 'To be confirmed with the partner';
  const addons = Array.isArray(o.addons) ? o.addons : [];
  const addonsBlock = addons.length
    ? hr() + p('<strong>Extras added to your booking:</strong>') + infoTable(
        addons.map(a => infoRow(a.name, 'R' + a.price)).join('') +
        infoRow('Extras total', 'R' + (o.addonsTotal || 0))
      )
    : '';
  return {
    subject: `✅ Booking confirmed — ${o.experienceName} (${o.bookingRef})`,
    html: layout(`
      ${badge('✅ Booking Confirmed', '#059669')}
      ${h1("You're booked, " + (o.guestName || o.customerName) + '!')}
      ${p('Your direct booking for <strong>' + o.experienceName + '</strong> with <strong>' + o.partnerName + '</strong> is confirmed.')}
      ${infoTable(
        infoRow('Experience', o.experienceName || '—') +
        infoRow('Partner', o.partnerName || '—') +
        infoRow('Date', dateDisplay) +
        (o.bookingTime ? infoRow('Time', o.bookingTime) : '') +
        infoRow('Guests', o.guests || '1') +
        infoRow('Total paid', o.total ? 'R' + o.total : '—') +
        infoRow('Booking Reference', o.bookingRef || '—')
      )}
      ${addonsBlock}
      ${codeBox(o.bookingRef || '—')}
      ${hr()}
      ${highlight('<strong>📞 What to do next:</strong><br>Present your booking reference <strong>' + (o.bookingRef||'—') + '</strong> when you arrive. The partner will validate your visit.')}
      ${btn('View My Account', SITE_URL + '/my-account')}
      ${sm('Need help? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.booking, 'Your ' + o.experienceName + ' booking is confirmed'),
  };
}

// ── NEW: BKW booking notification (partner) ───────────────────────────────────
function tplBkwBookingPartner(o) {
  const dateDisplay = o.bookingDate
    ? new Date(o.bookingDate).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    : 'To be confirmed';
  return {
    subject: `🔔 New direct booking — ${o.experienceName} (${o.bookingRef})`,
    html: layout(`
      ${badge('🔔 New Direct Booking', C.gold)}
      ${h1('You have a new booking!')}
      ${p('A customer has booked <strong>' + o.experienceName + '</strong> directly through your WowBox page.')}
      ${infoTable(
        infoRow('Experience', o.experienceName || '—') +
        infoRow('Customer', o.customerName || '—') +
        infoRow('Customer email', o.customerEmail || '—') +
        infoRow('Date requested', dateDisplay) +
        infoRow('Guests', o.guests || '1') +
        infoRow('Booking Reference', o.bookingRef || '—') +
        infoRow('Amount', o.total ? 'R' + o.total : '—')
      )}
      ${hr()}
      ${highlight('<strong>Action required:</strong> When the guest arrives, validate their visit in your Partner Portal using the booking reference <strong>' + (o.bookingRef||'—') + '</strong>.')}
      ${btn('Open Partner Portal', SITE_URL + '/partner')}
      ${sm('Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.booking, 'New direct booking for ' + o.experienceName),
  };
}

// ── NEW: Add-on provider notification ─────────────────────────────────────────
function tplAddonProviderNotification(o) {
  const dateDisplay = o.bookingDate
    ? new Date(o.bookingDate).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    : 'To be confirmed with the customer';
  const isDriver = !!o.pickupAddress;
  return {
    subject: `🔔 New order for ${o.addonName} — ${o.bookingRef}`,
    html: layout(`
      ${badge('🔔 New Add-on Order', C.gold)}
      ${h1('You have a new order, ' + (o.providerName || 'partner') + '!')}
      ${p('A customer has booked <strong>' + (o.addonName || 'an add-on') + '</strong> as part of their WowBox booking.')}
      ${infoTable(
        infoRow('Add-on', o.addonName || '—') +
        infoRow('Experience', o.experienceName || '—') +
        infoRow('Experience address', o.experienceAddress || '—') +
        (isDriver ? infoRow('Pickup address', o.pickupAddress) : infoRow('Your address', o.providerAddress || '—')) +
        (o.distanceKm != null ? infoRow('Estimated distance', o.distanceKm + ' km') : '') +
        infoRow('Customer', o.customerName || '—') +
        (o.customerPhone ? infoRow('Customer phone', o.customerPhone) : '') +
        infoRow('Date requested', dateDisplay) +
        (o.bookingTime ? infoRow('Time', o.bookingTime) : '') +
        infoRow('Booking Reference', o.bookingRef || '—')
      )}
      ${hr()}
      ${infoTable(
        infoRow('Your payout', o.providerPayout != null ? 'R' + o.providerPayout : '—') +
        (o.commissionRate != null ? infoRow('WowBox commission', o.commissionRate + '%') : '')
      )}
      ${hr()}
      ${highlight('<strong>Action required:</strong> Please confirm this order and contact WowBox to coordinate logistics, using the booking reference <strong>' + (o.bookingRef||'—') + '</strong>. If you are unable to fulfil this order, notify WowBox immediately — failure to deliver without notice may result in this payout being withheld.')}
      ${sm('Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.booking, 'New order: ' + (o.addonName || 'add-on')),
  };
}

// ── NEW: Add-on purchase receipt (customer) ───────────────────────────────────
function tplAddonReceipt(o) {
  const addons = Array.isArray(o.addons) ? o.addons : [];
  const rows = addons.map(a => infoRow(a.name, 'R' + a.price)).join('');
  return {
    subject: `🧾 Receipt — your extras for ${o.experienceName} (${o.bookingRef})`,
    html: layout(`
      ${badge('🧾 Payment Receipt', '#059669')}
      ${h1('Thanks for the extras, ' + (o.customerName || 'there') + '!')}
      ${p('Here is your receipt for the extras added to your booking of <strong>' + (o.experienceName || 'your experience') + '</strong>.')}
      ${infoTable(
        rows +
        infoRow('Total paid', 'R' + (o.addonsTotal || 0)) +
        infoRow('Booking Reference', o.bookingRef || '—') +
        (o.paymentRef ? infoRow('Payment Reference', o.paymentRef) : '')
      )}
      ${hr()}
      ${sm('Questions about your order? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.booking, 'Receipt for your WowBox extras'),
  };
}

// ── NEW: Experience rejected (partner) ────────────────────────────────────────
// Already exists as tplExperienceRejected — reusing it

// ── NEW: Payout processed (partner) ──────────────────────────────────────────
function tplPayoutProcessed(o) {
  return {
    subject: `💰 Payout processed — R${o.amount} for ${o.period || 'your bookings'}`,
    html: layout(`
      ${badge('💰 Payout Processed', '#059669')}
      ${h1('Your payout is on its way, ' + o.name + '!')}
      ${p('We have processed your payout for validated experiences. The amount will appear in your bank account within 1–2 business days.')}
      ${infoTable(
        infoRow('Amount', o.amount ? 'R' + Number(o.amount).toLocaleString() : '—') +
        infoRow('Period', o.period || '—') +
        infoRow('Bookings', o.bookingCount || '—') +
        infoRow('Transfer ref', o.transferRef || '—') +
        infoRow('Date', new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}))
      )}
      ${hr()}
      ${btn('View Payout History', SITE_URL + '/partner#pp-payouts')}
      ${sm('Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.partner, 'Your WowBox payout has been processed'),
  };
}

// ── Partner monthly statement ─────────────────────────────────────────────────
function tplPartnerMonthlyStatement(o) {
  const txRows = (o.transactions || []).map(t => `
    <tr>
      <td style="padding:8px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6">${t.date}</td>
      <td style="padding:8px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6">${t.experience}</td>
      <td style="padding:8px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;font-family:monospace">${t.booking_ref}</td>
      <td style="padding:8px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;text-align:right">R${Number(t.gross).toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
      <td style="padding:8px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;text-align:right">${t.commission_rate}%</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#16a34a;border-bottom:1px solid #f3f4f6;text-align:right">R${Number(t.payout).toLocaleString('en-ZA',{minimumFractionDigits:2})}</td>
      <td style="padding:8px 12px;font-size:11px;color:#6b7280;border-bottom:1px solid #f3f4f6;font-family:monospace">${t.transfer_ref}</td>
    </tr>`).join('');

  return {
    subject: `📊 WowBox Payout Statement — ${o.period}`,
    html: layout(`
      <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#1e1e2d;margin:0 0 6px">Payout Statement</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px">Period: <strong>${o.period}</strong></p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="padding:14px;background:#f9fafb;border-radius:8px;text-align:center;width:25%">
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Gross revenue</div>
            <div style="font-size:20px;font-weight:700;color:#1e1e2d">R${o.grossTotal}</div>
          </td>
          <td style="width:4%"></td>
          <td style="padding:14px;background:#f0fdf4;border-radius:8px;text-align:center;width:25%">
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Total paid</div>
            <div style="font-size:20px;font-weight:700;color:#16a34a">R${o.totalPaid}</div>
          </td>
          <td style="width:4%"></td>
          <td style="padding:14px;background:#fef3c7;border-radius:8px;text-align:center;width:25%">
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Pending</div>
            <div style="font-size:20px;font-weight:700;color:#d97706">R${o.pendingAmt}</div>
          </td>
          <td style="width:4%"></td>
          <td style="padding:14px;background:#ede9fe;border-radius:8px;text-align:center;width:13%">
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Bookings</div>
            <div style="font-size:20px;font-weight:700;color:#5b21b6">${o.bookingCount}</div>
          </td>
        </tr>
      </table>

      ${txRows ? `
      <h3 style="font-size:14px;font-weight:700;color:#1e1e2d;margin:0 0 12px">Transaction detail</h3>
      <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Date</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Experience</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Booking ref</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase">Gross</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase">Rate</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase">Your payout</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Transfer ref</th>
          </tr>
        </thead>
        <tbody>${txRows}</tbody>
      </table>
      </div>` : '<p style="color:#6b7280;font-size:14px">No transactions found for this period.</p>'}

      <div style="margin-top:24px;text-align:center">
        <a href="https://wowbox.co.za/partner#pp-payouts" style="display:inline-block;background:#8B4513;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">View Payout History →</a>
      </div>
    `)
  };
}

// ── Partner Paystack reminder ──────────────────────────────────────────────────
function tplPartnerPaystackReminder(o) {
  return {
    subject: '💳 Connect your bank account to receive WowBox payouts',
    html: layout(`
      <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#1e1e2d;margin:0 0 16px">Action required</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px">Hi ${o.name || 'Partner'},</p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px">You have pending payouts waiting but your bank account is not connected yet. Connect your account to receive your earnings directly.</p>
      <div style="background:#fef3c7;border:1.5px solid #fcd34d;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <p style="font-size:14px;color:#92400e;margin:0"><strong>⚠️ Payouts are on hold</strong> until you connect your bank account. The process takes less than 2 minutes.</p>
      </div>
      <div style="text-align:center;margin-bottom:24px">
        <a href="https://wowbox.co.za/partner#pp-settings" style="display:inline-block;background:#8B4513;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">Connect bank account →</a>
      </div>
      <p style="font-size:13px;color:#6b7280;text-align:center">Go to Partner Portal → Settings → Payments & Payouts</p>
    `)
  };
}

// ── NEW: Review request (customer J+1) ────────────────────────────────────────
function tplReviewRequest(o) {
  return {
    subject: `⭐ How was your experience at ${o.experienceName}?`,
    html: layout(`
      ${badge('⭐ Share Your Experience', C.gold)}
      ${h1('How was it, ' + (o.guestName || o.customerName) + '?')}
      ${p('We hope you had an amazing time at <strong>' + o.experienceName + '</strong>. Your review helps other WowBox customers discover great experiences.')}
      ${hr()}
      ${p('It only takes 30 seconds — share your rating and a few words about your visit.')}
      ${btn('Leave a Review', SITE_URL + '/my-account')}
      ${sm('Thank you for being part of the WowBox community!')}
    `, HEROES.booking, 'Share your experience at ' + o.experienceName),
  };
}

// ── NEW: Review notification (partner — new review received) ──────────────────
function tplPartnerNewReview(o) {
  const stars = '★'.repeat(o.rating||5) + '☆'.repeat(5-(o.rating||5));
  return {
    subject: `⭐ New review for "${o.experienceName}" — ${stars}`,
    html: layout(`
      ${badge('⭐ New Review', C.gold)}
      ${h1('You have a new review!')}
      ${p('A WowBox customer has left a review for <strong>' + o.experienceName + '</strong>.')}
      ${infoTable(
        infoRow('Experience', o.experienceName || '—') +
        infoRow('Rating', stars + ' (' + (o.rating||5) + '/5)') +
        infoRow('Reviewer', o.reviewerName || 'Anonymous') +
        (o.reviewText ? infoRow('Review', '"' + o.reviewText + '"') : '')
      )}
      ${hr()}
      ${btn('View in Partner Portal', SITE_URL + '/partner#pp-reviews')}
      ${sm('Reviews are moderated before going live. <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">Contact us</a> if you have concerns.')}
    `, HEROES.partner, 'New review for ' + o.experienceName),
  };
}

// ── Send via Resend ─────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html, replyTo, cc }) {
  const body = { from: FROM, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) body.reply_to = replyTo;
  if (cc) body.cc = Array.isArray(cc) ? cc : [cc];
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Resend error');
  return data;
}

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════════════════════

// Email A — sent to BUYER: includes price
function tplBuyerConfirmation(o) {
  const isPhysical = o.type === 'Physical' || o.type === 'Mixed';
  const isGift = !!(o.recipientEmail && o.recipientEmail !== o.email);
  const items = (o.items || []).map(i =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f5ede6">
      <span style="font-size:14px;color:${C.text};font-weight:600">${i.name}</span>
      <span style="font-family:'Courier New',monospace;font-size:13px;color:${C.midBrown};font-weight:700;letter-spacing:1px;background:#fef3c7;padding:3px 10px;border-radius:6px">${i.code}</span>
    </div>`
  ).join('');
  const deliveryLabel = isPhysical ? 'Physical box — 2–3 business days' : 'E-Box — Instant digital delivery';
  const subjectPrefix = isPhysical ? '📦 Order confirmed' : '🎁 Order confirmed';
  const intro = isGift
    ? `Your gift has been prepared. ${isPhysical ? 'It will be shipped shortly.' : 'A separate gift email has been sent to <strong>' + (o.recipientName || o.recipientEmail) + '</strong>.'}`
    : 'Your WowBox is ready. Your voucher code is below — enjoy your experience!';
  const giftAddonsHtml = (o.giftAddons && o.giftAddons.length)
    ? hr() + h2('Extras you added') + infoTable(o.giftAddons.map(a => infoRow(a.name, 'R' + a.price)).join(''))
    : '';
  return {
    subject: `${subjectPrefix} — ${o.id}`,
    html: layout(`
      ${badge(isPhysical ? '📦 Order Confirmed' : '🎁 Order Confirmed', '#059669')}
      ${h1('Your WowBox order is confirmed, ' + o.name + '!')}
      ${p(intro)}
      ${hr()}
      ${h2('Your Voucher Code' + ((o.items||[]).length > 1 ? 's' : ''))}
      <div style="background:${C.card};border-radius:10px;padding:4px 16px;margin:16px 0">${items}</div>
      ${infoTable(
        infoRow('Order ref', o.id || '—') +
        infoRow('Date', o.date || new Date().toLocaleDateString('en-ZA')) +
        infoRow('Delivery', deliveryLabel) +
        infoRow('Total paid', o.total || '—') +
        (isGift ? infoRow('Gift recipient', o.recipientName || o.recipientEmail || '—') : '') +
        (o.bookingReference ? infoRow('Booking ref', '<strong style="font-family:monospace;color:#15803d;letter-spacing:1px">' + o.bookingReference + '</strong>') : '')
      )}
      ${o.videoToken ? highlight('<strong>🎬 Video message included</strong><br>Your video has been sent with the gift.') : ''}
      ${giftAddonsHtml}
      ${hr()}
      ${p('<strong>How to use WowBox:</strong><br>1. Go to <a href="' + SITE_URL + '/redeem" style="color:' + C.goldDark + '">wowbox.co.za/redeem</a> and enter your code<br>2. Browse the experiences in your box<br>3. Book directly with the partner')}
      ${btn('View My Account', SITE_URL + '/my-account')}
      ${sm('Need help? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.order, 'Your WowBox order is confirmed'),
  };
}

// Email B — sent to RECIPIENT: no price, gift-focused
function tplRecipientGift(o) {
  const items = (o.items || []).map(i =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f5ede6">
      <span style="font-size:14px;color:${C.text};font-weight:600">${i.name}</span>
      <span style="font-family:'Courier New',monospace;font-size:13px;color:${C.midBrown};font-weight:700;letter-spacing:1px;background:#fef3c7;padding:3px 10px;border-radius:6px">${i.code}</span>
    </div>`
  ).join('');
  const recipientFirst = (o.recipientName || 'there').split(' ')[0];
  const senderName = o.name || 'Someone special';
  return {
    subject: `🎁 You've received a WowBox gift from ${senderName}!`,
    html: layout(`
      ${badge('🎁 You Have a Gift!', C.midBrown)}
      ${h1('You have received a gift, ' + recipientFirst + '!')}
      ${p('<strong>' + senderName + '</strong> has gifted you a WowBox experience. Your voucher code is below — use it to browse and book your experience.')}
      ${o.giftMsg ? highlight('<strong>💌 A message from ' + senderName + ':</strong><br><em style="font-family:Georgia,serif;font-size:15px">"' + o.giftMsg + '"</em>') : ''}
      ${o.videoToken ? highlight('<strong>🎬 Video message from ' + senderName + '</strong><br><a href="' + SITE_URL + '/gift-video/' + o.videoToken + '" style="color:' + C.goldDark + '">Watch the video &rarr;</a>') : ''}
      ${(o.giftAddons && o.giftAddons.length) ? highlight('<strong>🎁 A gift extra is included with your box!</strong><br>You\'ll discover what it is when you book your experience.') : ''}
      ${hr()}
      ${h2('Your Voucher Code' + ((o.items||[]).length > 1 ? 's' : ''))}
      <div style="background:${C.card};border-radius:10px;padding:4px 16px;margin:16px 0">${items}</div>
      ${hr()}
      ${p('<strong>How to redeem your WowBox gift:</strong><br>1. Go to <a href="' + SITE_URL + '/redeem" style="color:' + C.goldDark + '">wowbox.co.za/redeem</a> and enter your code<br>2. Browse the experiences in your box<br>3. Book directly with the partner')}
      ${btn('Redeem My Gift', SITE_URL + '/redeem')}
      ${sm('Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.order, senderName + ' has sent you an unforgettable experience'),
  };
}

// Legacy alias
function tplStatusDelivered(o) { return tplBuyerConfirmation(o); }

function tplStatusPending(o) {
  return {
    subject: `📦 Order confirmed — your WowBox is being prepared (${o.id})`,
    html: layout(`
      ${badge('📦 Order Received', C.midBrown)}
      ${h1('Thanks for your order, ' + o.name + '!')}
      ${p("Your physical WowBox is being prepared and will be shipped within 2–3 business days. You'll receive a tracking notification once it's on its way.")}
      ${infoTable(
        infoRow('Order ref', o.id || '—') +
        infoRow('Date', o.date || new Date().toLocaleDateString('en-ZA')) +
        infoRow('Delivery', 'Physical box — 2–3 business days') +
        infoRow('Total paid', o.total || '—')
      )}
      ${hr()}
      ${h2("What's inside your box")}
      <div style="background:${C.card};border-radius:10px;padding:4px 16px;margin:16px 0">
        ${(o.items || []).map(i =>
          `<div style="padding:11px 0;border-bottom:1px solid #f5ede6">
            <span style="font-size:14px;color:${C.text};font-weight:600">${i.name}</span>
          </div>`
        ).join('')}
      </div>
      ${highlight('<strong>📬 Tracking:</strong> You\'ll receive an email with your tracking number as soon as your box ships.')}
      ${btn('View My Account', SITE_URL + '/my-account')}
      ${sm('Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.order, 'Your WowBox physical box is being prepared'),
  };
}

function tplStatusInProcess(o) {
  return {
    subject: `🔄 Your WowBox is being prepared — ${o.id}`,
    html: layout(`
      ${badge('🔄 In Preparation', C.gold)}
      ${h1('We are preparing your WowBox, ' + o.name + '!')}
      ${p("Good news — your order is now being processed by our team. Your physical WowBox is being carefully packed and will be on its way to you very soon.")}
      ${infoTable(
        infoRow('Order ref', o.id || '—') +
        infoRow('Date', o.date || new Date().toLocaleDateString('en-ZA')) +
        infoRow('Status', 'In preparation') +
        infoRow('Delivery', 'Physical box — 2–3 business days')
      )}
      ${highlight('<strong>⏳ What\'s next?</strong><br>Once your box has been handed to the courier, you\'ll receive a tracking notification by email.')}
      ${btn('View My Account', SITE_URL + '/my-account')}
      ${sm('Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.order, 'Your WowBox is being packed and prepared'),
  };
}

function tplStatusInTransit(o) {
  return {
    subject: `🚚 Your WowBox is on its way — ${o.id}`,
    html: layout(`
      ${badge('🚚 In Transit', C.midBrown)}
      ${h1('Your WowBox is on its way, ' + o.name + '!')}
      ${p("Your physical WowBox has been handed to our courier and is now on its way to you. Expect delivery within the next 1–3 business days.")}
      ${infoTable(
        infoRow('Order ref', o.id || '—') +
        infoRow('Date', o.date || new Date().toLocaleDateString('en-ZA')) +
        infoRow('Status', 'In transit') +
        infoRow('Delivery', 'Physical box — estimated 1–3 business days')
      )}
      ${highlight('<strong>📬 Delivery tip:</strong><br>Please ensure someone is available to receive the package at your delivery address. If you miss the delivery, the courier will leave a collection notice.')}
      ${btn('View My Account', SITE_URL + '/my-account')}
      ${sm('Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.order, 'Your WowBox is on its way to you'),
  };
}

function tplReissue(o) {
  const newCode = (o.items || [])[0]?.code || '—';
  return {
    subject: `🔄 New WowBox code issued — ${o.id}`,
    html: layout(`
      ${badge('🔄 New Code Issued', '#7c3aed')}
      ${h1('Your new voucher code')}
      ${p('A new voucher code has been issued for your order <strong>' + o.id + '</strong>. Your previous code has been deactivated.')}
      ${codeBox(newCode)}
      ${hr()}
      ${p('Please use this new code when redeeming your WowBox experience. The old code is no longer valid.')}
      ${btn('Redeem Your Code', SITE_URL + '/redeem')}
      ${sm("Didn't request this? Contact <a href='mailto:support@wowbox.co.za' style='color:" + C.goldDark + "'>support@wowbox.co.za</a> immediately.")}
    `, HEROES.order, 'Your replacement WowBox voucher code'),
  };
}

function tplBookingCustomer(o) {
  const dateDisplay  = o.bookingDate ? new Date(o.bookingDate).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : 'To be confirmed with the partner';
  const timeDisplay  = o.bookingTime || '';
  const codeDisplay  = o.voucherCode || '—';
  const locationStr  = [o.address, o.location].filter(Boolean).join(', ') || o.address || o.location || '—';

  // Google Calendar link
  const gcDate = o.bookingDate ? o.bookingDate.replace(/-/g,'') : null;
  const gcStart = gcDate ? gcDate + 'T090000' : null;
  const gcEnd   = gcDate ? gcDate + 'T110000' : null;
  const gcTitle = encodeURIComponent((o.experienceName || 'WowBox Experience') + ' — WowBox');
  const gcDesc  = encodeURIComponent('Booking Reference: ' + (o.bookingReference || '—') + '\n' + 'Partner: ' + (o.partnerName || '—') + (o.phone ? '\nPhone: ' + o.phone : ''));
  const gcLoc   = encodeURIComponent(locationStr !== '—' ? locationStr : '');
  const gcUrl   = gcStart ? 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + gcTitle + '&dates=' + gcStart + '/' + gcEnd + '&details=' + gcDesc + '&location=' + gcLoc : null;

  // iCal (.ics) data URI
  const icsDate = gcDate || '20260101';
  const icsContent = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WowBox//EN',
    'BEGIN:VEVENT',
    'DTSTART:' + icsDate + 'T090000',
    'DTEND:'   + icsDate + 'T110000',
    'SUMMARY:' + (o.experienceName || 'WowBox Experience') + ' — WowBox',
    'DESCRIPTION:Booking Reference: ' + (o.bookingReference || '—'),
    'LOCATION:' + (locationStr !== '—' ? locationStr : ''),
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const icsUri = 'data:text/calendar;charset=utf8,' + encodeURIComponent(icsContent);

  const calButtons = gcUrl
    ? '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0">'
      + '<a href="' + gcUrl + '" target="_blank" style="display:inline-block;background:#1d4ed8;color:#fff;font-size:.8rem;font-weight:600;padding:9px 16px;border-radius:8px;text-decoration:none">📅 Add to Google Calendar</a>'
      + '<a href="' + icsUri + '" download="wowbox-booking.ics" style="display:inline-block;background:#374151;color:#fff;font-size:.8rem;font-weight:600;padding:9px 16px;border-radius:8px;text-decoration:none">📥 Download .ics (Apple / Outlook)</a>'
      + '</div>'
    : '';

  return {
    subject: `✅ Booking confirmed — ${o.experienceName}`,
    html: layout(`
      ${badge('✅ Experience Booked', '#059669')}
      ${h1("You're all set, " + (o.guestName || o.customerName) + '!')}
      ${p('Your booking for <strong>' + o.experienceName + '</strong> is confirmed. Present your booking reference when you arrive.')}
      ${infoTable(
        infoRow('Experience', o.experienceName || '—') +
        infoRow('Partner', o.partnerName || '—') +
        infoRow('Date', dateDisplay) +
        (timeDisplay ? infoRow('Time', timeDisplay) : '') +
        infoRow('Guests', o.guests || '2') +
        (locationStr !== '—' ? infoRow('Location', locationStr) : '') +
        (o.phone ? infoRow('Phone', o.phone) : '') +
        infoRow('Booking Reference', o.bookingReference || '—') +
        infoRow('Box Code', codeDisplay)
      )}
      ${codeBox(o.bookingReference || codeDisplay)}
      ${calButtons}
      ${(o.giftAddons && o.giftAddons.length) ? highlight('<strong>🎁 Extras included with this booking:</strong><br>' + o.giftAddons.map(a => a.name).join('<br>')) : ''}
      ${hr()}
      ${highlight('<strong>📞 Next step:</strong> Call <strong>' + (o.partnerName || 'the partner') + '</strong>' + (o.phone ? ' on <strong>' + o.phone + '</strong>' : '') + ' to confirm your visit.<br>Show your booking reference <strong>' + (o.bookingReference || '—') + '</strong> on arrival — the partner will enter it to validate your experience.')}
      ${btn('My Account', SITE_URL + '/my-account')}
      ${sm('WowBox is the intermediary — the experience is provided by the partner. Enjoy!')}
    `, HEROES.booking, 'Your ' + o.experienceName + ' booking is confirmed'),
  };
}

function tplBookingPartner(o) {
  const dateDisplay = o.bookingDate || 'To be confirmed with guest';
  const maskRef = (s) => s ? s.replace(/[A-Z0-9]{4}$/, '••••') : '—';
  const codeDisplay = maskRef(o.voucherCode);

  return {
    subject: `🔔 New booking — ${o.experienceName} (${o.customerName})`,
    html: layout(`
      ${badge('🔔 New Booking', C.gold)}
      ${h1('You have a new booking!')}
      ${p('A WowBox customer has booked <strong>' + o.experienceName + '</strong>. Please contact them to confirm the date and time.')}
      ${infoTable(
        infoRow('Experience', o.experienceName || '—') +
        infoRow('Guest name', o.customerName || '—') +
        infoRow('Guest email', o.customerEmail || '—') +
        infoRow('Requested date', dateDisplay) +
        infoRow('Guests', o.guests || '2') +
        infoRow('Booking Reference', maskRef(o.bookingReference)) +
        infoRow('Voucher code', codeDisplay)
      )}
      ${hr()}
      ${highlight('<strong>Action required:</strong> Contact the guest to confirm the visit. The full booking reference is hidden for security — ask the guest to present it in person (on their voucher or confirmation email), then type it into your Partner Portal to validate the experience. It will only unlock there once you enter it correctly.')}
      ${btn('Open Partner Portal', SITE_URL + '/partner')}
      ${sm('Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.booking, 'New WowBox booking for ' + o.experienceName),
  };
}

function tplExperienceApproved(o) {
  return {
    subject: `🎉 Your experience is live on WowBox — "${o.experienceName}"`,
    html: layout(`
      ${badge('🎉 Experience Approved', '#059669')}
      ${h1('Great news, ' + o.name + '!')}
      ${p('Your experience <strong>"' + o.experienceName + '"</strong> has been approved and is now live on the platform — visible to thousands of customers across South Africa!')}
      ${hr()}
      ${highlight('<strong>🚀 You\'re live!</strong><br>Customers can now discover your experience through WowBox gift boxes. You\'ll receive an email notification for every new booking.')}
      ${btn('View Your Partner Portal', SITE_URL + '/partner')}
      ${h2('What happens next?')}
      ${p('When a customer books, you\'ll receive an email with their details. Validate their voucher code in your Partner Portal when they arrive.')}
      ${sm('Need to update details? Log into your Partner Portal and submit an edit request.')}
    `, HEROES.partner, '"' + o.experienceName + '" is now live on WowBox'),
  };
}

function tplExperienceRejected(o) {
  return {
    subject: 'Action required — your WowBox experience submission',
    html: layout(`
      ${badge('Update Required', '#dc2626')}
      ${h2('Hi ' + o.name + ',')}
      ${p('Thank you for submitting <strong>"' + o.experienceName + '"</strong> to WowBox. After review, our team has some feedback before we can approve it.')}
      ${o.rejectionNote ? highlight('<strong>Feedback from our team:</strong><br>' + o.rejectionNote, '#fef2f2', '#fca5a5') : ''}
      ${hr()}
      ${p('Please log into your Partner Portal, update your experience based on the feedback, and resubmit. Our team will review within 1–2 business days.')}
      ${btn('Edit & Resubmit', SITE_URL + '/partner')}
      ${sm('Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.partner, 'Your WowBox experience submission needs an update'),
  };
}

function tplPartnerApproved(o) {
  return {
    subject: '🎉 Welcome to WowBox — your partner portal is ready',
    html: layout(`
      ${badge('🎉 Welcome to WowBox', '#059669')}
      ${h1('Welcome aboard, ' + o.name + '!')}
      ${p("Your partner application has been approved. You're now officially part of the WowBox partner network — South Africa's leading gift experience platform.")}
      ${hr()}
      ${highlight("<strong>Your partner portal is ready.</strong><br>Log in to add your experiences, manage bookings and validate customer vouchers.")}
      ${btn('Open Your Partner Portal', SITE_URL + '/partner')}
      ${h2('Getting started')}
      ${p('1. <strong>Add your experiences</strong> — Go to "My Experiences" and submit your first listing<br>2. <strong>Get discovered</strong> — Once approved, your experience appears in WowBox gift boxes<br>3. <strong>Validate vouchers</strong> — Use the QR scanner or manual entry when guests arrive<br>4. <strong>Get paid</strong> — Payment processed within 2 business days of each validation')}
      ${sm('Need help? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.partner, 'Your WowBox partner account has been approved'),
  };
}

function tplPartnerRejected(o) {
  return {
    subject: 'Your WowBox partner application',
    html: layout(`
      ${h2('Hi ' + o.name + ',')}
      ${p('Thank you for your interest in joining the WowBox partner network.')}
      ${p("After reviewing your application, we're unable to approve it at this time. This may be because the experience doesn't currently meet our curation criteria, or because we have similar offerings in your area.")}
      ${hr()}
      ${p("We review our roster regularly as we expand to new regions. You're welcome to reapply in 3 months, or email <a href='mailto:support@wowbox.co.za' style='color:" + C.goldDark + "'>support@wowbox.co.za</a> with any questions.")}
      ${sm('Thank you for considering WowBox.')}
    `, HEROES.contact, 'Regarding your WowBox partner application'),
  };
}

function tplPartnerApplication(o) {
  const item = (o.items || [])[0] || {};
  return {
    subject: `📋 New partner application — ${item.name || o.name}`,
    html: layout(`
      ${badge('📋 New Partner Application', '#7c3aed')}
      ${h1('New Partner Application')}
      ${infoTable(
        infoRow('Business name', item.name || o.name || '—') +
        infoRow('Contact', o.name || '—') +
        infoRow('Email', o.email || '—') +
        infoRow('Type', item.code || '—') +
        infoRow('Location', item.type || '—') +
        infoRow('Date', o.date || new Date().toLocaleDateString('en-ZA'))
      )}
      ${item.status ? `<p style="margin:16px 0;font-size:14px;color:${C.body}"><strong>About:</strong> ${item.status}</p>` : ''}
      ${hr()}
      ${btn('Review in Admin', 'https://wowbox.co.za/admin', C.midBrown)}
    `, HEROES.partner, 'New WowBox partner application'),
  };
}

function tplContactForm(o) {
  return {
    subject: `📩 Contact form — ${o.subject || 'New message'} (${o.name})`,
    html: layout(`
      ${badge('📩 Contact Form', '#475569')}
      ${h1('New message from the website')}
      ${infoTable(
        infoRow('From', o.name || '—') +
        infoRow('Email', o.email || '—') +
        infoRow('Subject', o.subject || '—')
      )}
      ${hr()}
      <div style="background:${C.card};border-radius:10px;padding:20px;margin:16px 0;
        font-size:15px;color:${C.body};line-height:1.7">
        ${(o.message || '').replace(/\n/g, '<br>')}
      </div>
      <a href="mailto:${o.email}" style="color:${C.goldDark};font-size:14px">Reply to ${o.name} &rarr;</a>
    `, HEROES.contact, 'New contact form message from ' + o.name),
  };
}

function tplVoucher(d) {
  return {
    subject: '🎁 Your WowBox voucher is ready',
    html: layout(`
      ${badge('🎁 Your WowBox Voucher', C.gold)}
      ${h1("Here's your WowBox, " + d.name + '!')}
      ${p('Your purchase was successful. Use the code below to activate your experience.')}
      ${codeBox(d.code || '—')}
      ${d.box && d.box.name ? infoTable(infoRow('Box', d.box.name)) : ''}
      ${hr()}
      ${p('Visit <a href="' + SITE_URL + '/redeem" style="color:' + C.goldDark + '">wowbox.co.za/redeem</a> to activate your code and browse your experiences.')}
      ${btn('Activate My Box', SITE_URL + '/redeem')}
      ${sm('This code is valid for 12 months. <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">Need help?</a>')}
    `, HEROES.order, 'Your WowBox voucher code is inside'),
  };
}


// ── Refund Confirmation ──────────────────────────────────────────────────────
function tplRefundConfirmation(o) {
  const content =
    badge('Refund processed', '#dc2626') +
    h1('Your refund has been processed') +
    p('We\'ve processed a refund for your WowBox order. Please allow 5–10 business days for the amount to appear on your statement, depending on your bank.') +
    infoTable([
      infoRow('Order ref',   o.orderId  || '—'),
      infoRow('Item',        o.boxName  || '—'),
      infoRow('Amount',      o.amount   || '—'),
      infoRow('Processed on', new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})),
      ...(o.reason ? [infoRow('Reason', o.reason)] : []),
    ]) +
    hr() +
    p('If you have any questions about your refund, please contact us at <a href="mailto:support@wowbox.co.za" style="color:'+C.goldDark+'">support@wowbox.co.za</a> and reference your order number.') +
    sm('Thank you for choosing WowBox. We hope to welcome you back soon.');
  return {
    subject: 'Your WowBox refund has been processed — ' + (o.orderId||''),
    html: layout(content, HEROES.order, 'Your WowBox refund is on its way'),
  };
}


// ── Boost Started ────────────────────────────────────────────────────────────
function tplBoostStarted(o) {
  const expiry = o.expiresAt
    ? new Date(o.expiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '30 days from today';
  const content =
    badge('🚀 Boost Active', '#7c3aed') +
    h1('You\'re in the Featured pool!') +
    p('Great news — <strong>' + (o.experienceName || 'Your experience') + '</strong> is now featured on WowBox for the next 30 days. Guests browsing Gift Boxes and experience pages will see your listing first.') +
    infoTable(
      infoRow('Experience',  o.experienceName || '—') +
      infoRow('Active from', new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })) +
      infoRow('Active until', expiry) +
      infoRow('Payment ref',  o.ref || '—')
    ) +
    highlight('<strong>Tip:</strong> Keep your calendar up to date and your photos fresh — featured experiences with complete profiles convert best.') +
    hr() +
    btn('View My Boost', SITE_URL + '/partner#pp-boost') +
    sm('Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>');
  return {
    subject: '🚀 Your experience is now Featured on WowBox — ' + (o.experienceName || ''),
    html: layout(content, HEROES.partner, 'Your experience is now featured on WowBox'),
  };
}

// ── Boost Expiring 7 Days ─────────────────────────────────────────────────────
function tplBoostExpiring7d(o) {
  const expiry = o.expiresAt
    ? new Date(o.expiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'in 7 days';
  return {
    subject: `⏰ Your WowBox boost expires in 7 days — renew to stay featured`,
    html: layout(`
      ${badge('⏰ Expiring Soon', '#d97706')}
      ${h1('Your boost expires in 7 days')}
      ${p('Your featured listing for <strong>' + (o.experienceName || 'your experience') + '</strong> will expire on <strong>' + expiry + '</strong>. Renew now to stay at the top of WowBox search results.')}
      ${infoTable(
        infoRow('Experience',   o.experienceName || '—') +
        infoRow('Expires on',   expiry)
      )}
      ${highlight('<strong>Don\'t lose your visibility.</strong> Partners who renew without a gap see up to 3× more bookings than those who let their boost lapse.')}
      ${hr()}
      ${btn('Renew My Boost', SITE_URL + '/partner#pp-boost')}
      ${sm('Not interested in renewing? Your experience will still appear organically based on rating. <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">Contact us</a> with any questions.')}
    `, HEROES.partner, 'Your WowBox featured listing expires in 7 days'),
  };
}

// ── Boost Expiring 1 Day ──────────────────────────────────────────────────────
function tplBoostExpiring1d(o) {
  const expiry = o.expiresAt
    ? new Date(o.expiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'tomorrow';
  return {
    subject: `🔔 Last chance — your WowBox boost expires tomorrow`,
    html: layout(`
      ${badge('🔔 Last Chance', '#dc2626')}
      ${h1('Your boost expires tomorrow')}
      ${p('This is your final reminder — <strong>' + (o.experienceName || 'your experience') + '</strong> will leave the Featured pool tomorrow on <strong>' + expiry + '</strong>.')}
      ${infoTable(
        infoRow('Experience',  o.experienceName || '—') +
        infoRow('Expires',     expiry)
      )}
      ${highlight('<strong>Renew in one click</strong> from your partner portal to keep your featured placement without any interruption.')}
      ${hr()}
      ${btn('Renew Now', SITE_URL + '/partner#pp-boost', '#dc2626')}
      ${sm('<a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">Contact us</a> if you have any questions.')}
    `, HEROES.partner, 'Your WowBox featured listing expires tomorrow'),
  };
}

// ── Boost Expired ─────────────────────────────────────────────────────────────
function tplBoostExpired(o) {
  return {
    subject: `Your WowBox featured listing has ended — ${o.experienceName || ''}`,
    html: layout(`
      ${badge('Boost Ended', '#6b7280')}
      ${h1('Your featured listing has ended')}
      ${p('The featured pool listing for <strong>' + (o.experienceName || 'your experience') + '</strong> has now expired. Your experience will continue to appear on WowBox based on its rating and reviews.')}
      ${p('Ready to boost again? Rejoin the Featured pool to get your experience back to the top.')}
      ${hr()}
      ${btn('Rejoin Featured Pool', SITE_URL + '/partner#pp-boost')}
      ${sm('Thank you for being a WowBox partner. Questions? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.partner, 'Your WowBox featured listing has expired'),
  };
}

// ════════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!RESEND_API_KEY)       return res.status(500).json({ error: 'RESEND_API_KEY not set' });

  try {
    const body = req.body || {};
    const type = body.type;
    const o    = body.order || body.data || {};
    const toOverride = body.to;
    let emailJobs = [];

    switch (type) {
      case 'status_delivered':
      case 'resend': {
        const dest = toOverride || o.email;
        if (dest) emailJobs.push({ to: dest, ...tplBuyerConfirmation(o) });
        // Send separate gift email to recipient if different from buyer
        if (!toOverride && o.recipientEmail && o.recipientEmail !== o.email) {
          emailJobs.push({ to: o.recipientEmail, ...tplRecipientGift(o) });
        }
        break;
      }
      case 'recipient_gift': {
        const dest = toOverride || o.email;
        if (dest) emailJobs.push({ to: dest, ...tplRecipientGift(o) });
        break;
      }
      case 'status_pending': {
        const dest = toOverride || o.email;
        if (dest) emailJobs.push({ to: dest, ...tplStatusPending(o) });
        break;
      }
      case 'status_in_process': {
        const dest = toOverride || o.email;
        if (dest) emailJobs.push({ to: dest, ...tplStatusInProcess(o) });
        break;
      }
      case 'status_in_transit': {
        const dest = toOverride || o.email;
        if (dest) emailJobs.push({ to: dest, ...tplStatusInTransit(o) });
        break;
      }
      case 'reissue': {
        if (o.email) emailJobs.push({ to: o.email, ...tplReissue(o) });
        break;
      }
      case 'booking_confirmation': {
        if (o.customerEmail) emailJobs.push({ to: o.customerEmail, ...tplBookingCustomer(o) });
        if (o.partnerEmail)  emailJobs.push({ to: o.partnerEmail,  ...tplBookingPartner(o) });
        break;
      }
      case 'experience_approved': {
        if (o.email) emailJobs.push({ to: o.email, ...tplExperienceApproved(o) });
        break;
      }
      case 'experience_rejected': {
        if (o.email) emailJobs.push({ to: o.email, ...tplExperienceRejected(o) });
        break;
      }
      case 'partner_approved': {
        if (o.email) emailJobs.push({ to: o.email, ...tplPartnerApproved(o) });
        break;
      }
      case 'partner_rejected': {
        if (o.email) emailJobs.push({ to: o.email, ...tplPartnerRejected(o) });
        break;
      }
      case 'partner_application': {
        emailJobs.push({ to: ADMIN_EMAIL, cc: ADMIN_CC, ...tplPartnerApplication(o) });
        break;
      }
      case 'contact_form': {
        emailJobs.push({ to: ADMIN_EMAIL, replyTo: o.email, ...tplContactForm(o) });
        break;
      }
      case 'refund_confirmation': {
        if (o.email) emailJobs.push({ to: o.email, ...tplRefundConfirmation(o) });
        break;
      }
      case 'buyer_confirmation': {
        const dest = toOverride || o.email;
        if (dest) emailJobs.push({ to: dest, ...tplBuyerConfirmation(o) });
        break;
      }
      case 'voucher': {
        const dest = toOverride || o.email;
        if (dest) emailJobs.push({ to: dest, ...tplVoucher(o) });
        break;
      }
      case 'boost_started': {
        if (o.partnerEmail) emailJobs.push({ to: o.partnerEmail, ...tplBoostStarted(o) });
        break;
      }
      case 'boost_expiring_7d': {
        if (o.partnerEmail) emailJobs.push({ to: o.partnerEmail, ...tplBoostExpiring7d(o) });
        break;
      }
      case 'boost_expiring_1d': {
        if (o.partnerEmail) emailJobs.push({ to: o.partnerEmail, ...tplBoostExpiring1d(o) });
        break;
      }
      case 'boost_expired': {
        if (o.partnerEmail) emailJobs.push({ to: o.partnerEmail, ...tplBoostExpired(o) });
        break;
      }
      case 'admin_new_partner': {
        emailJobs.push({ to: ADMIN_EMAIL, cc: ADMIN_CC, ...tplAdminNewPartner(o) });
        break;
      }
      case 'admin_exp_submitted': {
        emailJobs.push({ to: ADMIN_EMAIL, cc: ADMIN_CC, ...tplAdminExpSubmitted(o) });
        break;
      }
      case 'admin_exp_edited': {
        emailJobs.push({ to: ADMIN_EMAIL, cc: ADMIN_CC, ...tplAdminExpEdited(o) });
        break;
      }
      case 'bkw_booking_confirmation': {
        if (o.customerEmail) emailJobs.push({ to: o.customerEmail, ...tplBkwBookingCustomer(o) });
        if (o.partnerEmail)  emailJobs.push({ to: o.partnerEmail,  ...tplBkwBookingPartner(o) });
        break;
      }
      case 'addon_provider_notification': {
        if (o.providerEmail) emailJobs.push({ to: o.providerEmail, ...tplAddonProviderNotification(o) });
        break;
      }
      case 'addon_receipt': {
        if (o.customerEmail) emailJobs.push({ to: o.customerEmail, ...tplAddonReceipt(o) });
        break;
      }
      case 'payout_processed': {
        if (o.partnerEmail) emailJobs.push({ to: o.partnerEmail, ...tplPayoutProcessed(o) });
        break;
      }
      case 'review_request': {
        if (o.customerEmail) emailJobs.push({ to: o.customerEmail, ...tplReviewRequest(o) });
        break;
      }
      case 'partner_new_review': {
        if (o.partnerEmail) emailJobs.push({ to: o.partnerEmail, ...tplPartnerNewReview(o) });
        break;
      }
      case 'partner_monthly_statement': {
        if (o.to) emailJobs.push({ to: o.to, ...tplPartnerMonthlyStatement(o) });
        break;
      }
      case 'partner_paystack_reminder': {
        if (o.to) emailJobs.push({ to: o.to, ...tplPartnerPaystackReminder(o) });
        break;
      }
      case 'admin_notification': {
        if (o.to) emailJobs.push({ to: o.to, subject: o.subject || 'WowBox Notification', html: `<p>${o.message || ''}</p>` });
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown email type: ${type}` });
    }

    if (!emailJobs.length)
      return res.status(400).json({ error: 'No recipient email address found' });

    const results = await Promise.allSettled(
      emailJobs.map(job => sendEmail({ to: job.to, subject: job.subject, html: job.html, replyTo: job.replyTo }))
    );

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) console.error('Some emails failed:', failed.map(f => f.reason?.message));

    return res.status(200).json({
      success: true,
      sent:   results.filter(r => r.status === 'fulfilled').length,
      failed: failed.length,
    });

  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
