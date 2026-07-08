// api/import-places.js
// Admin-only. Imports real places from Google Places API (New) as non-purchasable
// "preview" experiences (source='google_places', is_purchasable=false), so the site
// can show real, attractive local activities before those venues are actual partners.
// Never called by a cron — triggered manually from the admin "Import from Google
// Places" button, and requires a valid admin session (checked below).

const SUPABASE_URL      = process.env.SUPABASE_URL || 'https://gfqxuygfkzgmotnxrlwb.supabase.co';
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Same public/publishable key already embedded in index.html's client-side Supabase
// client — this key is designed to be public, so hardcoding it here (rather than an
// env var that was never configured) is safe and matches how the site already uses it.
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_NNDH11RkDff2KHghf_k-8g_wL2NtUIL';
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;

// How many results to pull per city+category search. Google's Text Search (New)
// caps at 20 per call; we ask for a modest amount per combo and stop the whole
// import once TARGET_TOTAL new places have been added, whichever comes first.
const RESULTS_PER_SEARCH = 8;
const TARGET_TOTAL       = 50;

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         options.prefer || 'return=representation',
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

// Confirms the caller is a logged-in admin, using their own Supabase session
// token (sent from the browser) rather than a shared secret baked into the
// frontend — a static secret in client-side JS would be visible to anyone.
async function verifyIsAdmin(accessToken) {
  if (!accessToken || !SUPABASE_ANON_KEY) return false;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) return false;
  const user = await userRes.json();
  if (!user || !user.email) return false;
  const profiles = await supabaseFetch(`/user_profiles?email=eq.${encodeURIComponent(user.email)}&select=role`);
  return !!(profiles && profiles[0] && profiles[0].role === 'admin');
}

function slugify(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// One Text Search (New) call for a given free-text query. Uses a narrow field
// mask — every extra field (rating, photos, etc.) moves the request to a more
// expensive Google billing tier, so we only ask for what we actually use.
async function searchPlaces(query) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type':     'application/json',
      'X-Goog-Api-Key':   GOOGLE_PLACES_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.location',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: RESULTS_PER_SEARCH }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Places search failed for "${query}"`);
  return data.places || [];
}

// Fetches one photo's bytes from Google (server-side, using our private key —
// never exposed to the browser) and re-uploads it to our own Storage bucket,
// so the public site never hotlinks Google's photo endpoint with our API key
// in the URL. This import is meant as a temporary "coming soon" preview, not
// a permanent photo archive — re-run periodically rather than treating these
// as a fixed asset library, in keeping with Google's usage terms for Place data.
async function rehostFirstPhoto(photos, placeId) {
  if (!photos || !photos.length) return null;
  const photoName = photos[0].name; // e.g. "places/PLACE_ID/photos/PHOTO_ID"
  const mediaRes = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1000&key=${GOOGLE_PLACES_KEY}`
  );
  if (!mediaRes.ok) return null;
  const buffer = Buffer.from(await mediaRes.arrayBuffer());
  const contentType = mediaRes.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const path = `google-places/${placeId}_${Date.now()}.${ext}`;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/site-assets/${path}`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type': contentType,
      'x-upsert':     'true',
    },
    body: buffer,
  });
  if (!uploadRes.ok) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/site-assets/${path}`;
}

// Single-field Place Details lookup — used only for backfilling coordinates on
// places imported before this field was added to the main search.
async function fetchPlaceLocation(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key':   GOOGLE_PLACES_KEY,
      'X-Goog-FieldMask': 'location',
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Place Details failed for ${placeId}`);
  return data.location || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader  = req.headers['authorization'] || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isAdmin = await verifyIsAdmin(accessToken).catch(() => false);
  if (!isAdmin) return res.status(401).json({ error: 'Admin session required' });

  if (!GOOGLE_PLACES_KEY) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY is not configured' });

  // Backfill mode: fills in lat/lng on previously-imported places that predate
  // this field being requested — does not touch name, photo, address, or any
  // other already-saved field, and only ever targets rows missing coordinates.
  if (req.body && req.body.action === 'backfillLatLng') {
    const backfillResults = { updated: [], failed: [] };
    try {
      const missing = await supabaseFetch(
        `/experiences?source=eq.google_places&google_place_id=not.is.null&or=(lat.is.null,lng.is.null)&select=id,name,google_place_id`
      );
      for (const exp of (missing || [])) {
        try {
          const loc = await fetchPlaceLocation(exp.google_place_id);
          if (!loc) { backfillResults.failed.push({ name: exp.name, error: 'No location returned' }); continue; }
          const upd = await fetch(`${SUPABASE_URL}/rest/v1/experiences?id=eq.${encodeURIComponent(exp.id)}`, {
            method: 'PATCH',
            headers: {
              apikey:         SUPABASE_KEY,
              Authorization:  `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer:         'return=minimal',
            },
            body: JSON.stringify({ lat: loc.latitude, lng: loc.longitude }),
          });
          if (!upd.ok) { backfillResults.failed.push({ name: exp.name, error: await upd.text() }); continue; }
          backfillResults.updated.push(exp.name);
        } catch (bfErr) {
          backfillResults.failed.push({ name: exp.name, error: bfErr.message });
        }
      }
      return res.status(200).json({ updatedCount: backfillResults.updated.length, failedCount: backfillResults.failed.length, ...backfillResults });
    } catch (err) {
      console.error('[import-places] Backfill fatal error:', err.message);
      return res.status(500).json({ error: err.message, ...backfillResults });
    }
  }

  const { combos } = req.body || {};
  // combos: [{ city: 'Johannesburg', category: 'Restaurant' }, ...]
  if (!Array.isArray(combos) || !combos.length) {
    return res.status(400).json({ error: 'combos (array of {city, category}) is required' });
  }

  const results = { imported: [], skipped: [], failed: [] };

  try {
    for (const combo of combos) {
      if (results.imported.length >= TARGET_TOTAL) break;
      const city = combo.city, category = combo.category;
      let places;
      try {
        places = await searchPlaces(`${category} in ${city}, South Africa`);
      } catch (searchErr) {
        results.failed.push({ city, category, error: searchErr.message });
        continue;
      }

      for (const place of places) {
        if (results.imported.length >= TARGET_TOTAL) break;
        try {
          // Skip a place we've already imported before (re-running the import
          // is safe and just fills in anything new).
          const existing = await supabaseFetch(`/experiences?google_place_id=eq.${encodeURIComponent(place.id)}&select=id`);
          if (existing && existing.length) { results.skipped.push(place.displayName?.text || place.id); continue; }

          const imageUrl = await rehostFirstPhoto(place.photos, place.id).catch(() => null);
          const ratingLine = place.rating
            ? `⭐ ${place.rating}${place.userRatingCount ? ` (${place.userRatingCount} reviews)` : ''} on Google`
            : '';

          const row = {
            id:              'gp-' + slugify(place.displayName?.text || place.id) + '-' + place.id.slice(-6),
            name:            place.displayName?.text || 'Untitled place',
            category:        category,
            city:            city,
            location:        city,
            address:         place.formattedAddress || '',
            description:      ratingLine,
            image_url:       imageUrl,
            lat:             place.location?.latitude  ?? null,
            lng:             place.location?.longitude ?? null,
            is_active:       true,
            source:          'google_places',
            is_purchasable:  false,
            google_place_id: place.id,
          };

          const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/experiences`, {
            method: 'POST',
            headers: {
              apikey:         SUPABASE_KEY,
              Authorization:  `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer:         'return=minimal',
            },
            body: JSON.stringify(row),
          });
          if (!insertRes.ok) {
            const errText = await insertRes.text();
            results.failed.push({ name: row.name, error: errText });
            continue;
          }
          results.imported.push(row.name);
        } catch (placeErr) {
          results.failed.push({ name: place.displayName?.text || place.id, error: placeErr.message });
        }
      }
    }

    return res.status(200).json({
      importedCount: results.imported.length,
      skippedCount:  results.skipped.length,
      failedCount:   results.failed.length,
      ...results,
    });
  } catch (err) {
    console.error('[import-places] Fatal error:', err.message);
    return res.status(500).json({ error: err.message, ...results });
  }
}
