import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    await client.from('boxes').select('id', { count: 'exact', head: true }).eq('is_active', true);
    res.status(200).json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
