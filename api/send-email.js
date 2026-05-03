// api/send-email.js — WowBox Email Handler via Resend
// Required env var: RESEND_API_KEY

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM           = 'WowBox <hello@wowbox.co.za>';
const ADMIN_EMAIL    = 'geff.pr@gmail.com';
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

// ── Send via Resend ─────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html, replyTo }) {
  const body = { from: FROM, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) body.reply_to = replyTo;
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

function tplStatusDelivered(o) {
  const items = (o.items || []).map(i =>
    `<div style="display:flex;justify-content:space-between;align-items:center;
      padding:12px 0;border-bottom:1px solid #f5ede6">
      <span style="font-size:14px;color:${C.text};font-weight:600">${i.name}</span>
      <span style="font-family:'Courier New',monospace;font-size:13px;color:${C.midBrown};
        font-weight:700;letter-spacing:1px;background:#fef3c7;padding:3px 10px;border-radius:6px">${i.code}</span>
    </div>`
  ).join('');

  return {
    subject: `🎁 Your WowBox is ready — ${o.id}`,
    html: layout(`
      ${badge('🎁 Order Confirmed', '#059669')}
      ${h1('Your WowBox is ready, ' + o.name + '!')}
      ${p("Your gift experience has been confirmed. Your voucher codes are below — share this email with your lucky recipient!")}
      ${hr()}
      ${h2('Your Voucher Codes')}
      <div style="background:${C.card};border-radius:10px;padding:4px 16px;margin:16px 0">${items}</div>
      ${infoTable(
        infoRow('Order ref', o.id || '—') +
        infoRow('Date', o.date || new Date().toLocaleDateString('en-ZA')) +
        infoRow('Delivery', 'E-Box — Instant digital delivery') +
        infoRow('Total paid', o.total || '—')
      )}
      ${o.giftMsg ? highlight(`<strong>Gift message:</strong><br><em style="font-family:Georgia,serif;font-size:15px">"${o.giftMsg}"</em>`) : ''}
      ${o.videoToken ? highlight(`<strong>🎬 Video message included</strong><br><a href="${SITE_URL}/gift-video/${o.videoToken}" style="color:${C.goldDark}">Watch the video &rarr;</a>`) : ''}
      ${hr()}
      ${p('<strong>How to use your WowBox:</strong><br>1. Go to <a href="' + SITE_URL + '/redeem" style="color:' + C.goldDark + '">wowbox.co.za/redeem</a> and enter your code<br>2. Browse the experiences in your box<br>3. Book directly with the partner')}
      ${btn('Browse Your Experiences', SITE_URL + '/redeem')}
      ${sm('Need help? <a href="mailto:support@wowbox.co.za" style="color:' + C.goldDark + '">support@wowbox.co.za</a>')}
    `, HEROES.order, 'Your WowBox voucher codes are inside'),
  };
}

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
  // Always show date and voucher code — never hide them
  const dateDisplay  = o.bookingDate || 'To be confirmed with the partner';
  const codeDisplay  = o.voucherCode || '—';

  return {
    subject: `✅ Booking confirmed — ${o.experienceName}`,
    html: layout(`
      ${badge('✅ Experience Booked', '#059669')}
      ${h1("You're all set, " + o.customerName + '!')}
      ${p('Your booking for <strong>' + o.experienceName + '</strong> has been confirmed. The partner will contact you to confirm the final details.')}
      ${infoTable(
        infoRow('Experience', o.experienceName || '—') +
        infoRow('Partner', o.partnerName || '—') +
        infoRow('Date', dateDisplay) +
        infoRow('Guests', o.guests || '2') +
        infoRow('Voucher code', codeDisplay)
      )}
      ${codeBox(codeDisplay)}
      ${hr()}
      ${highlight('<strong>📞 Next step:</strong> Contact <strong>' + (o.partnerName || 'the partner') + '</strong> to confirm your visit date and time.<br>Present this email or your voucher code when you arrive — the partner will scan or enter it to validate your experience.')}
      ${btn('My Account', SITE_URL + '/my-account')}
      ${sm('WowBox is the intermediary — the experience is provided by the partner. Enjoy!')}
    `, HEROES.booking, 'Your ' + o.experienceName + ' booking is confirmed'),
  };
}

function tplBookingPartner(o) {
  const dateDisplay = o.bookingDate || 'To be confirmed with guest';
  const codeDisplay = o.voucherCode || '—';

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
        infoRow('Voucher code', codeDisplay)
      )}
      ${hr()}
      ${highlight('<strong>Action required:</strong> Contact the guest to confirm the visit. When they arrive, validate their voucher code <strong>' + codeDisplay + '</strong> in your Partner Portal.')}
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

// ════════════════════════════════════════════════════════════════════════════
// HANDLER
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
        if (dest) emailJobs.push({ to: dest, ...tplStatusDelivered(o) });
        break;
      }
      case 'status_pending': {
        const dest = toOverride || o.email;
        if (dest) emailJobs.push({ to: dest, ...tplStatusPending(o) });
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
        emailJobs.push({ to: ADMIN_EMAIL, ...tplPartnerApplication(o) });
        break;
      }
      case 'contact_form': {
        emailJobs.push({ to: ADMIN_EMAIL, replyTo: o.email, ...tplContactForm(o) });
        break;
      }
      case 'voucher': {
        const dest = toOverride || o.email;
        if (dest) emailJobs.push({ to: dest, ...tplVoucher(o) });
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
