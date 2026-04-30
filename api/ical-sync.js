// api/ical-sync.js — WowBox iCal sync via Vercel Function
// Fetches a .ics calendar URL, parses blocked dates,
// and upserts them into the Supabase `availability` table.
//
// Required env vars:
//   SUPABASE_URL        — your Supabase project URL
//   SUPABASE_SERVICE_KEY — service role key (not anon key — needs write access)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ical_url, experience_id } = req.body || {};
  if (!ical_url)      return res.status(400).json({ error: 'Missing ical_url' });
  if (!experience_id) return res.status(400).json({ error: 'Missing experience_id' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not set' });
  }

  try {
    // 1. Fetch the .ics file — try multiple strategies for Google Calendar
    let icsText = null;
    let icsUrl = ical_url
      .replace(/^webcal:\/\//i, 'https://')
      .replace('corsproxy.io/?', ''); // strip any proxy the user may have added

    // Google Calendar URLs need special handling
    const isGoogle = icsUrl.includes('calendar.google.com');

    const attempts = isGoogle ? [
      // Strategy 1: direct with browser-like headers
      { url: icsUrl, headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/calendar, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }},
      // Strategy 2: via ical.ink proxy (reliable Google Calendar proxy)
      { url: 'https://ical.ink/proxy?url=' + encodeURIComponent(icsUrl), headers: {} },
      // Strategy 3: via allorigins proxy
      { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent(icsUrl), headers: {} },
    ] : [
      { url: icsUrl, headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WowBox/1.0)',
        'Accept': 'text/calendar, */*',
      }}
    ];

    let lastError = null;
    for (const attempt of attempts) {
      try {
        const r = await fetch(attempt.url, { headers: attempt.headers });
        if (r.ok) {
          const text = await r.text();
          if (text.includes('BEGIN:VCALENDAR')) { icsText = text; break; }
        } else {
          lastError = `HTTP ${r.status} from ${attempt.url}`;
        }
      } catch(e) { lastError = e.message; }
    }

    if (!icsText) throw new Error(`Failed to fetch iCal: ${lastError || 'all attempts failed'}`);

    // 2. Parse VEVENT blocks — unfold lines first (iCal spec: CRLF + space = continuation)
    const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const blocked = new Set();
    const eventBlocks = unfolded.split('BEGIN:VEVENT');
    eventBlocks.shift(); // remove everything before first VEVENT

    for (const block of eventBlocks) {
      // Match both DATE (20250510) and DATETIME (20250510T140000Z) formats
      // We only need the first 8 digits (the date part) in both cases
      const startMatch = block.match(/DTSTART(?:;[^:]+)?:(\d{8})/);
      const endMatch   = block.match(/DTEND(?:;[^:]+)?:(\d{8})/);
      if (!startMatch) continue;

      const start = parseIcsDate(startMatch[1]);
      const end   = endMatch ? parseIcsDate(endMatch[1]) : addDays(start, 1);

      // Block every date in the range [start, end)
      let cur = new Date(start);
      while (cur < end) {
        blocked.add(cur.toISOString().slice(0, 10));
        cur = addDays(cur, 1);
      }
    }

    if (blocked.size === 0) {
      return res.json({ success: true, count: 0, message: 'No blocked dates found in calendar' });
    }

    // 3. Upsert blocked dates into Supabase availability table
    const rows = [...blocked].map(date => ({
      experience_id,
      date,
      status: 'blocked',
      source: 'ical',
    }));

    // Batch upsert in chunks of 100
    let upserted = 0;
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/availability`, {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'resolution=merge-duplicates',
        },
        body: JSON.stringify(chunk),
      });
      if (!sbRes.ok) {
        const errText = await sbRes.text();
        throw new Error(`Supabase upsert failed: ${errText}`);
      }
      upserted += chunk.length;
    }

    return res.json({ success: true, count: upserted });

  } catch (err) {
    console.error('ical-sync error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseIcsDate(str) {
  // str = 'YYYYMMDD'
  const y = parseInt(str.slice(0, 4));
  const m = parseInt(str.slice(4, 6)) - 1;
  const d = parseInt(str.slice(6, 8));
  return new Date(Date.UTC(y, m, d));
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
