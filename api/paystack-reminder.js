// api/paystack-reminder.js
// Weekly cron — runs every Monday at 09:00 SAST (07:00 UTC)
// Sends a reminder to all partners who haven't connected their Paystack account

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gfqxuygfkzgmotnxrlwb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET  = process.env.CRON_SECRET;
const SITE_URL     = process.env.SITE_URL || 'https://wowbox.co.za';

export default async function handler(req, res) {
  // Security
  const authHeader = req.headers['authorization'];
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[paystack-reminder] Running at', new Date().toISOString());

  try {
    // Fetch all active partners without Paystack connected
    const profilesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?role=eq.partner&paystack_account_id=is.null&select=email,full_name,partner_name`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const profiles = await profilesRes.json();

    if (!profiles || !profiles.length) {
      console.log('[paystack-reminder] All partners have Paystack connected.');
      return res.status(200).json({ message: 'All partners connected.', sent: 0 });
    }

    console.log(`[paystack-reminder] Sending reminders to ${profiles.length} partners`);

    let sent = 0;
    for (const prof of profiles) {
      try {
        await fetch(`${SITE_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'partner_paystack_reminder',
            data: {
              to: prof.email,
              name: prof.partner_name || prof.full_name || prof.email,
            },
          }),
        });
        sent++;
        console.log(`[paystack-reminder] ✅ Sent to ${prof.email}`);
      } catch (err) {
        console.warn(`[paystack-reminder] Failed for ${prof.email}:`, err.message);
      }
    }

    return res.status(200).json({ message: 'Reminders sent.', sent, total: profiles.length });

  } catch (err) {
    console.error('[paystack-reminder] Fatal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
