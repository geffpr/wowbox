// api/add-to-audience.js — WowBox Resend Audiences Handler
// Standalone endpoint, fully separate from send-email.js: adding/updating a
// contact in a Resend Audience must never interfere with transactional emails.
// Required env var: RESEND_API_KEY (same key as send-email.js)
//
// Note: Resend has renamed "Audiences" to "Segments" in their dashboard, but
// the legacy /audiences/{audience_id}/contacts endpoint still works for
// backward compatibility — the audience IDs below remain valid as-is.

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const AUDIENCE_IDS = {
  customers: '3b5a3ec0-f04c-472f-ba4c-7ee148ec990f',
  partners:  '1f5d0a96-491c-4d81-afbd-9517787d0574',
  creators:  '62583312-d68e-4d94-9291-1524e29d61d5',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!RESEND_API_KEY)       return res.status(500).json({ error: 'RESEND_API_KEY not set' });

  try {
    const body = req.body || {};
    const segment  = body.segment; // 'customers' | 'partners' | 'creators'
    const email    = (body.email || '').trim();
    const fullName = (body.name || '').trim();

    const audienceId = AUDIENCE_IDS[segment];
    if (!audienceId) return res.status(400).json({ error: `Unknown segment: ${segment}` });
    if (!email)       return res.status(400).json({ error: 'Missing email' });

    // Split a single "full name" field into first/last, best-effort.
    const nameParts = fullName.split(' ').filter(Boolean);
    const firstName = nameParts[0] || undefined;
    const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

    const resendBody = { email, unsubscribed: false };
    if (firstName) resendBody.first_name = firstName;
    if (lastName)  resendBody.last_name  = lastName;

    const resp = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(resendBody),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Resend audience error');

    return res.status(200).json({ success: true, id: data.id });

  } catch (err) {
    console.error('add-to-audience error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
