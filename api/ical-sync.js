// api/ical-sync.js — WowBox iCal sync with RRULE support
// Handles: Google Calendar, Airbnb, Booking.com, Outlook, Apple Calendar
// Supports: single events, recurring events (RRULE FREQ=DAILY/WEEKLY/MONTHLY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ical_url, experience_id } = req.body || {};
  if (!ical_url)      return res.status(400).json({ error: 'Missing ical_url' });
  if (!experience_id) return res.status(400).json({ error: 'Missing experience_id' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY)
    return res.status(500).json({ error: 'Supabase env vars not set' });

  try {
    let icsText = null;
    let icsUrl  = ical_url.replace(/^webcal:\/\//i, 'https://').replace('corsproxy.io/?', '');
    const isGoogle = icsUrl.includes('calendar.google.com');

    const attempts = isGoogle ? [
      { url: icsUrl, headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/calendar, text/plain, */*',
          'Cache-Control': 'no-cache',
      }},
      { url: 'https://ical.ink/proxy?url=' + encodeURIComponent(icsUrl), headers: {} },
      { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent(icsUrl), headers: {} },
    ] : [
      { url: icsUrl, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WowBox/1.0)', 'Accept': 'text/calendar, */*' }}
    ];

    let lastError = null;
    for (const attempt of attempts) {
      try {
        const r = await fetch(attempt.url, { headers: attempt.headers });
        if (r.ok) {
          const text = await r.text();
          if (text.includes('BEGIN:VCALENDAR')) { icsText = text; break; }
        } else { lastError = `HTTP ${r.status} from ${attempt.url}`; }
      } catch(e) { lastError = e.message; }
    }
    if (!icsText) throw new Error(`Failed to fetch iCal: ${lastError || 'all attempts failed'}`);

    const unfolded    = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const eventBlocks = unfolded.split('BEGIN:VEVENT');
    eventBlocks.shift();

    const today   = new Date(); today.setUTCHours(0,0,0,0);
    const horizon = new Date(today); horizon.setUTCFullYear(horizon.getUTCFullYear() + 2);
    const blocked = new Set();

    for (const block of eventBlocks) {
      const startMatch = block.match(/DTSTART(?:;[^:\r\n]+)?:([\dT]+)Z?/);
      const endMatch   = block.match(/DTEND(?:;[^:\r\n]+)?:([\dT]+)Z?/);
      if (!startMatch) continue;

      const startDate = parseIcsDateTime(startMatch[1]);
      const endDate   = endMatch ? parseIcsDateTime(endMatch[1]) : addDays(startDate, 1);
      if (!startDate) continue;

      const exdates = new Set();
      const exIter  = block.matchAll(/EXDATE(?:;[^:\r\n]+)?:([^\r\n]+)/g);
      for (const m of exIter) {
        m[1].split(',').forEach(d => {
          const p = parseIcsDateTime(d.trim());
          if (p) exdates.add(p.toISOString().slice(0,10));
        });
      }

      const rruleMatch = block.match(/RRULE:([^\r\n]+)/);

      if (rruleMatch) {
        const occurrences = expandRRule(startDate, endDate, rruleMatch[1], horizon, exdates);
        occurrences.forEach(([s, e]) => {
          let cur = new Date(s);
          while (cur < e) {
            const k = cur.toISOString().slice(0,10);
            if (!exdates.has(k)) blocked.add(k);
            cur = addDays(cur, 1);
          }
        });
      } else {
        if (endDate <= today) continue;
        let cur = new Date(startDate);
        while (cur < endDate) {
          const k = cur.toISOString().slice(0,10);
          if (!exdates.has(k)) blocked.add(k);
          cur = addDays(cur, 1);
        }
      }
    }

    if (blocked.size === 0)
      return res.json({ success: true, count: 0, total_events: eventBlocks.length, total_dates: 0 });

    const rows = [...blocked].map(date => ({ experience_id, date, status: 'blocked', source: 'ical' }));
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/availability?on_conflict=experience_id,date`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(chunk),
      });
      if (!sbRes.ok) { const t = await sbRes.text(); throw new Error(`Supabase upsert failed: ${t}`); }
      upserted += chunk.length;
    }

    return res.json({ success: true, count: upserted, total_events: eventBlocks.length, total_dates: blocked.size });

  } catch (err) {
    console.error('ical-sync error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

function expandRRule(dtStart, dtEnd, rruleStr, horizon, exdates) {
  const rule     = parseRRule(rruleStr);
  const duration = dtEnd - dtStart;
  const results  = [];
  const freq     = rule.FREQ     || 'WEEKLY';
  const interval = rule.INTERVAL || 1;
  const maxCount = rule.COUNT    || 9999;
  const until    = rule.UNTIL    || horizon;
  const byDay    = rule.BYDAY    || [];
  const DAY_NAMES = ['SU','MO','TU','WE','TH','FR','SA'];
  const now = new Date(); now.setUTCHours(0,0,0,0);

  let cur   = new Date(dtStart);
  let count = 0;
  let iter  = 0;
  const maxIter = 800;

  while (cur <= until && cur <= horizon && count < maxCount && iter < maxIter) {
    iter++;
    if (freq === 'DAILY') {
      if (cur >= now) { results.push([new Date(cur), new Date(cur.getTime() + duration)]); count++; }
      cur = addDays(cur, interval);
    } else if (freq === 'WEEKLY') {
      if (byDay.length > 0) {
        const weekStart = getWeekStart(cur);
        byDay.forEach(dayName => {
          const dayIdx = DAY_NAMES.indexOf(dayName.replace(/[+\-\d]/g, ''));
          if (dayIdx === -1) return;
          const dayDate = addDays(weekStart, dayIdx);
          const k = dayDate.toISOString().slice(0,10);
          if (dayDate >= cur && dayDate >= now && dayDate <= until && dayDate <= horizon && !exdates.has(k)) {
            results.push([new Date(dayDate), new Date(dayDate.getTime() + duration)]);
            count++;
          }
        });
        cur = addDays(weekStart, 7 * interval);
      } else {
        if (cur >= now) { results.push([new Date(cur), new Date(cur.getTime() + duration)]); count++; }
        cur = addDays(cur, 7 * interval);
      }
    } else if (freq === 'MONTHLY') {
      if (cur >= now) { results.push([new Date(cur), new Date(cur.getTime() + duration)]); count++; }
      cur = addMonths(cur, interval);
    } else {
      results.push([new Date(dtStart), new Date(dtEnd)]); break;
    }
  }
  return results;
}

function parseRRule(str) {
  const rule = {};
  str.split(';').forEach(part => {
    const [k, v] = part.split('=');
    if (!k || !v) return;
    if (k === 'FREQ')     rule.FREQ     = v;
    if (k === 'INTERVAL') rule.INTERVAL = parseInt(v);
    if (k === 'COUNT')    rule.COUNT    = parseInt(v);
    if (k === 'BYDAY')    rule.BYDAY    = v.split(',');
    if (k === 'UNTIL')    rule.UNTIL    = parseIcsDateTime(v.replace('Z',''));
  });
  return rule;
}

function parseIcsDateTime(str) {
  if (!str) return null;
  str = str.replace(/Z$/, '').trim().slice(0,8);
  if (str.length < 8) return null;
  return new Date(Date.UTC(parseInt(str.slice(0,4)), parseInt(str.slice(4,6))-1, parseInt(str.slice(6,8))));
}

function addDays(date, n) {
  const d = new Date(date); d.setUTCDate(d.getUTCDate() + n); return d;
}
function addMonths(date, n) {
  const d = new Date(date); d.setUTCMonth(d.getUTCMonth() + n); return d;
}
function getWeekStart(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0,0,0,0);
  return d;
}
