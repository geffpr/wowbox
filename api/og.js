// Vercel Edge Function — OG tag injector for /box/ and /experience/ routes
// Runs only for social media crawlers (Googlebot, Twitterbot, facebookexternalhit, etc.)
// Real users always get the full SPA index.html untouched.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gfqxuygfkzgmotnxrlwb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NNDH11RkDff2KHghf_k-8g_wL2NtUIL';

// Local box data as fallback (mirrors boxDB in index.html)
const BOX_DB = {
  'road-trip':       { name:'WowBox Road Trip',            desc:'Hit the open road and discover South Africa\'s most spectacular landscapes. From Garden Route forest trails to the Wild Coast, this box unlocks hundreds of road trip adventures and overnight stops.', img:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop' },
  'celebration':     { name:'WowBox Celebration',          desc:'Mark every milestone in style. Exclusive restaurant experiences, private dining events, champagne tastings, and culinary masterclasses — perfect for birthdays, anniversaries, and promotions.', img:'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1200&auto=format&fit=crop' },
  'reset':           { name:'WowBox Reset',                desc:'Unwind, recharge, and reset. This wellness box connects you to South Africa\'s finest spas, yoga retreats, forest bathing experiences, and holistic wellness sanctuaries.', img:'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200&auto=format&fit=crop' },
  'luxury-escape':   { name:'WowBox Luxury Escape',        desc:'The pinnacle of gifting. Handpicked ultra-luxury lodges, helicopter transfers, private chef dinners, and once-in-a-lifetime experiences reserved for the most discerning guests.', img:'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop' },
  'city-break':      { name:'WowBox City Break',           desc:'Your city, your way. Over 3,890 urban hotels, boutique stays, and city experiences in Cape Town, Johannesburg, Durban and beyond. Perfect for spontaneous weekenders.', img:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1200&auto=format&fit=crop' },
  'family-fun':      { name:'WowBox Family Fun',           desc:'Create memories that last forever. From penguin encounters at Boulders Beach to treetop adventures and family-friendly game reserves — fun for every age.', img:'https://images.unsplash.com/photo-1602520733810-e63e40f2ae9e?q=80&w=1200&auto=format&fit=crop' },
  'couples-retreat': { name:'WowBox Couples Retreat',      desc:'Reignite the romance. This curated couples\' box includes luxury hotel stays for two, candlelit dining experiences, couples spa treatments, and sunset wine tastings at Cape Winelands estates.', img:'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200&auto=format&fit=crop' },
  'surprise':        { name:'WowBox Surprise Experience',  desc:'Don\'t know where to start? Let WowBox decide. Our curators have handpicked 500 surprising, unexpected experiences across food, adventure, wellness, and culture — the perfect mystery gift.', img:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop' },
  'weekend-escape':  { name:'WowBox Weekend Escape',       desc:'Two days, one unforgettable memory. Weekend-friendly stays, spa days, and experiences designed to fit your schedule without the need for extended leave.', img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop' },
  'premium-adventure':{ name:'WowBox Premium Adventure',  desc:'For those who want it all — Big Five safaris at exclusive game lodges, guided mountain expeditions, deep-sea fishing, shark cage diving, and skydiving over the Cape peninsula.', img:'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200&auto=format&fit=crop' },
  'chill-day':       { name:'WowBox Chill Day',            desc:'Sometimes all you need is a perfect day off. Beach picnics, whale watching, afternoon teas, lazy day spas, and slow brunch experiences — for the gift of pure relaxation.', img:'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200&auto=format&fit=crop' },
  'signature':       { name:'WowBox Signature Experience', desc:'The WowBox signature selection. Michelin-standard restaurants, private chef experiences, exclusive wine events, and intimate culinary journeys curated by South Africa\'s top food critics.', img:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&auto=format&fit=crop' },
};

function isCrawler(ua) {
  if (!ua) return false;
  return /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|googlebot|bingbot|applebot|iframely|embedly|preview/i.test(ua);
}

function buildOGHtml(title, desc, img, url) {
  const safeTitle = title.replace(/"/g, '&quot;');
  const safeDesc  = desc.replace(/"/g, '&quot;').substring(0, 200);
  const safeImg   = img.replace(/"/g, '&quot;');
  const safeUrl   = url.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <meta property="og:site_name" content="WowBox">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImg}">
  <meta property="og:url" content="${safeUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImg}">
</head>
<body></body>
</html>`;
}

export const config = { matcher: ['/box/:slug*', '/experience/:slug*'] };

export default async function handler(request) {
  const ua  = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const path = url.pathname;

  // Only intercept crawlers — real users get the SPA as-is
  if (!isCrawler(ua)) {
    return; // pass through to normal rewrite (index.html)
  }

  try {
    // ── /box/[slug] ──
    if (path.startsWith('/box/')) {
      const slug = path.replace('/box/', '').replace(/\/+$/, '');

      // Try local fallback first (fast, no DB round-trip)
      let box = BOX_DB[slug];

      // Try Supabase if not found locally
      if (!box) {
        const db = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data } = await db.from('boxes').select('name,description,image_url').eq('id', slug).single();
        if (data) box = { name: data.name, desc: data.description, img: data.image_url };
      }

      if (box) {
        const title = `${box.name} — WowBox Gift Box`;
        const desc  = box.desc || `Discover the ${box.name} experience box — curated by WowBox across South Africa.`;
        const img   = box.img || 'https://wowbox.co.za/og-default.jpg';
        return new Response(buildOGHtml(title, desc, img, url.toString()), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
        });
      }
    }

    // ── /experience/[slug] ──
    if (path.startsWith('/experience/')) {
      const slug = path.replace('/experience/', '').replace(/\/+$/, '');
      const db = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data } = await db.from('experiences').select('name,description,image_url').eq('id', slug).single();

      if (data) {
        const title = `${data.name} — WowBox`;
        const desc  = data.description || `Experience ${data.name} — available exclusively through WowBox across South Africa.`;
        const img   = data.image_url || 'https://wowbox.co.za/og-default.jpg';
        return new Response(buildOGHtml(title, desc, img, url.toString()), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
        });
      }
    }
  } catch (e) {
    console.error('OG handler error:', e.message);
  }

  // Fallback — default OG tags
  return new Response(buildOGHtml(
    'WowBox — Offer Unforgettable Experiences',
    'Curated gift boxes for couples, adventurers and dreamers across South Africa.',
    'https://wowbox.co.za/og-default.jpg',
    url.toString()
  ), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
}
