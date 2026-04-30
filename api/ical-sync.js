// api/ical-sync.js — DEBUG VERSION
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { ical_url, experience_id } = req.body || {};
  if (!ical_url) return res.status(400).json({ error: 'Missing ical_url' });

  let icsText = null;
  let icsUrl  = ical_url.replace(/^webcal:\/\//i, 'https://');
  const attempts = [
    { url: icsUrl, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36', 'Accept': 'text/calendar, */*' }},
    { url: 'https://ical.ink/proxy?url=' + encodeURIComponent(icsUrl), headers: {} },
    { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent(icsUrl), headers: {} },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const r = await fetch(attempt.url, { headers: attempt.headers });
      if (r.ok) {
        const text = await r.text();
        if (text.includes('BEGIN:VCALENDAR')) { icsText = text; break; }
      } else { lastError = `HTTP ${r.status}`; }
    } catch(e) { lastError = e.message; }
  }

  if (!icsText) return res.status(500).json({ error: 'Failed to fetch: ' + lastError });

  // Return raw content for debugging
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const blocks = unfolded.split('BEGIN:VEVENT');
  blocks.shift();

  const debug = blocks.slice(0, 5).map((b, i) => {
    const startM = b.match(/DTSTART(?:;[^:\r\n]+)?:([^\r\n]+)/);
    const endM   = b.match(/DTEND(?:;[^:\r\n]+)?:([^\r\n]+)/);
    const rruleM = b.match(/RRULE:([^\r\n]+)/);
    const sumM   = b.match(/SUMMARY:([^\r\n]+)/);
    return {
      event: i+1,
      summary:  sumM?.[1]  || '?',
      dtstart:  startM?.[1] || 'NOT FOUND',
      dtend:    endM?.[1]   || 'NOT FOUND',
      rrule:    rruleM?.[1] || 'NONE',
    };
  });

  return res.json({
    total_vevents: blocks.length,
    first_5_events: debug,
    raw_first_block: blocks[0]?.slice(0, 500) || 'empty'
  });
}
