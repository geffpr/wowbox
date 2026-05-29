/**
 * /api/process-boost-notifications
 * Daily cron (runs at 08:00 UTC) — handles boost lifecycle:
 *   1. Boosts expiring in exactly 7 days  → send boost_expiring_7d email
 *   2. Boosts expiring in exactly 1 day   → send boost_expiring_1d email
 *   3. Active boosts past expires_at      → mark 'expired' + send boost_expired email
 *
 * Called by Vercel cron via vercel.json
 */

import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.SITE_URL || 'https://wowbox.co.za';

async function sendBoostEmail(type, data) {
  try {
    const res = await fetch(`${SITE_URL}/api/send-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type, data }),
    });
    const json = await res.json();
    if (!res.ok) console.error(`[boost-notif] Email ${type} failed:`, json);
    return json;
  } catch (err) {
    console.error(`[boost-notif] Email ${type} error:`, err.message);
  }
}

export default async function handler(req, res) {
  // Allow GET (Vercel cron) or POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const now   = new Date();
  const stats = { expired: 0, expiring7d: 0, expiring1d: 0, errors: 0 };

  try {
    // ── Fetch all active boosts ──────────────────────────────────────────────
    const { data: boosts, error } = await db
      .from('experience_boosts')
      .select('id, experience_name, partner_email, expires_at, payfast_reference')
      .eq('status', 'active');

    if (error) throw error;
    if (!boosts || !boosts.length) {
      console.log('[boost-notif] No active boosts found.');
      return res.status(200).json({ success: true, ...stats });
    }

    const jobs = boosts.map(async (boost) => {
      const expiresAt  = new Date(boost.expires_at);
      const msLeft     = expiresAt - now;
      const daysLeft   = msLeft / (1000 * 60 * 60 * 24);

      const emailData = {
        partnerEmail:   boost.partner_email,
        experienceName: boost.experience_name,
        expiresAt:      boost.expires_at,
        ref:            boost.payfast_reference,
      };

      // Expired
      if (daysLeft <= 0) {
        try {
          await db
            .from('experience_boosts')
            .update({ status: 'expired' })
            .eq('id', boost.id);
          await sendBoostEmail('boost_expired', emailData);
          stats.expired++;
        } catch (e) {
          console.error('[boost-notif] Expire error for', boost.id, e.message);
          stats.errors++;
        }
        return;
      }

      // Expiring in 7 days (between 6.5 and 7.5 days)
      if (daysLeft >= 6.5 && daysLeft < 7.5) {
        await sendBoostEmail('boost_expiring_7d', emailData);
        stats.expiring7d++;
        return;
      }

      // Expiring in 1 day (between 0.5 and 1.5 days)
      if (daysLeft >= 0.5 && daysLeft < 1.5) {
        await sendBoostEmail('boost_expiring_1d', emailData);
        stats.expiring1d++;
      }
    });

    await Promise.allSettled(jobs);

    console.log('[boost-notif] Done:', stats);
    return res.status(200).json({ success: true, ...stats });

  } catch (err) {
    console.error('[boost-notif] Fatal error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
