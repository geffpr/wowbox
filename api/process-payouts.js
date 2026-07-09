// api/process-payouts.js
// Daily Vercel Cron — runs at 08:00 UTC (10:00 SAST)
// Finds commission entries eligible for payout (2 business days after validation)
// and triggers automatic Paystack transfers to partner subaccounts

const SUPABASE_URL  = process.env.SUPABASE_URL || 'https://gfqxuygfkzgmotnxrlwb.supabase.co';
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET   = process.env.CRON_SECRET;
const SITE_URL      = process.env.SITE_URL || 'https://wowbox.co.za';

// ── Add N business days to a date (skips weekends) ───────────────────────────
function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++; // skip Saturday (6) and Sunday (0)
  }
  return result;
}

// ── Supabase REST helper ──────────────────────────────────────────────────────
async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey:          SUPABASE_KEY,
      Authorization:   `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Security
  const authHeader = req.headers['authorization'];
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log('[process-payouts] Running for date:', today.toISOString().slice(0, 10));

  try {
    // 1. Fetch all pending commission entries
    const entries = await supabaseFetch(
      `/commission_entries?payout_status=eq.pending&paystack_transfer_id=is.null&select=*`
    );

    if (!entries || !entries.length) {
      console.log('[process-payouts] No pending entries found.');
      return res.status(200).json({ processed: 0, skipped: 0 });
    }

    // 2. Filter entries where 2 business days have passed since validation
    const eligible = entries.filter(function(entry) {
      if (!entry.validated_at) return false;
      const payoutDate = addBusinessDays(new Date(entry.validated_at), 2);
      payoutDate.setHours(0, 0, 0, 0);
      return payoutDate <= today;
    });

    console.log(`[process-payouts] ${entries.length} pending entries, ${eligible.length} eligible for payout`);

    if (!eligible.length) {
      return res.status(200).json({ processed: 0, skipped: entries.length, message: 'No entries ready yet (< 2 business days)' });
    }

    // 3. Fetch partner Paystack account IDs
    const partnerEmails = [...new Set(eligible.map(function(e){ return e.partner_email; }))];
    const profiles = await supabaseFetch(
      `/user_profiles?email=in.(${partnerEmails.map(function(e){ return encodeURIComponent(e); }).join(',')})&select=email,partner_name,paystack_account_id,paystack_recipient_code`
    );
    const profileMap = {};
    (profiles || []).forEach(function(p){ profileMap[p.email] = p; });

    // 4. Process each eligible entry
    const results = [];
    for (const entry of eligible) {
      const profile = profileMap[entry.partner_email];

      if (!profile || (!profile.paystack_recipient_code && !profile.paystack_account_id)) {
        console.log(`[process-payouts] Skipping ${entry.id} — no Paystack account for ${entry.partner_email}`);
        results.push({ id: entry.id, status: 'skipped', reason: 'No Paystack account connected' });
        continue;
      }

      try {
        const transferRes = await fetch(`${SITE_URL}/api/paystack-transfer`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            Authorization:   `Bearer ${CRON_SECRET}`,
          },
          body: JSON.stringify({
            commission_id:        entry.id,
            partner_email:        entry.partner_email,
            paystack_recipient_code: profile.paystack_recipient_code || null,
            paystack_account_id:  profile.paystack_account_id,
            amount:               entry.partner_payout,
            reason:               `WowBox payout — ${entry.experience_name || 'Experience'} (${entry.booking_reference || entry.transaction_ref})`,
          }),
        });

        const transferData = await transferRes.json();

        if (!transferRes.ok || !transferData.success) {
          throw new Error(transferData.error || 'Transfer failed');
        }

        console.log(`[process-payouts] ✅ Paid ${entry.partner_email} R${entry.partner_payout} — ${transferData.transfer_code}`);
        results.push({
          id:            entry.id,
          status:        'paid',
          partner:       entry.partner_email,
          amount:        entry.partner_payout,
          transfer_code: transferData.transfer_code,
        });

        // Creator payout notification — separate from the partner flow entirely,
        // wrapped so a failure here never affects the payout that already succeeded.
        if (entry.flow === 'creator') {
          try {
            let wbCode = null, boxName = entry.experience_name || null;
            if (entry.booking_reference) {
              const bkRows = await supabaseFetch(`/bookings?booking_reference=eq.${encodeURIComponent(entry.booking_reference)}&select=voucher_code`);
              if (bkRows && bkRows[0] && bkRows[0].voucher_code) {
                wbCode = bkRows[0].voucher_code;
                const vRows = await supabaseFetch(`/vouchers?code=eq.${encodeURIComponent(wbCode)}&select=box_id`);
                if (vRows && vRows[0] && vRows[0].box_id) {
                  const boxRows = await supabaseFetch(`/boxes?id=eq.${encodeURIComponent(vRows[0].box_id)}&select=name`);
                  if (boxRows && boxRows[0] && boxRows[0].name) boxName = boxRows[0].name;
                }
              }
            }
            await fetch(`${SITE_URL}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'creator_payout_processed',
                order: {
                  creatorEmail: entry.partner_email,
                  name:         entry.partner_name || 'there',
                  amount:       entry.partner_payout,
                  boxName:      boxName,
                  wbCode:       wbCode,
                  transferRef:  transferData.transfer_code,
                },
              }),
            });
          } catch (emailErr) {
            console.warn(`[process-payouts] Creator payout email failed for ${entry.id}:`, emailErr.message);
          }
        }

      } catch (err) {
        console.error(`[process-payouts] ❌ Failed ${entry.id}:`, err.message);
        results.push({ id: entry.id, status: 'error', error: err.message });
      }
    }

    const paid    = results.filter(function(r){ return r.status === 'paid'; }).length;
    const skipped = results.filter(function(r){ return r.status === 'skipped'; }).length;
    const errors  = results.filter(function(r){ return r.status === 'error'; }).length;

    return res.status(200).json({
      date: today.toISOString().slice(0, 10),
      processed: eligible.length,
      paid,
      skipped,
      errors,
      results,
    });

  } catch (err) {
    console.error('[process-payouts] Fatal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
