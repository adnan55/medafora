import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { screenRegulatory } from '../../../src/lib/server/regulatory.ts';

let running = false;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
serve(async req => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = Deno.env.get('SAFETY_SCAN_SECRET');
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401);
  if (running) return json({ error: 'Scan already running in this worker' }, 409);
  running = true;
  const token = crypto.randomUUID();
  let supabase: ReturnType<typeof createClient> | null = null;
  let acquired = false;
  try {
    // Privileged client is created only after verifying the scheduler credential.
    supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const lease = await supabase.rpc('acquire_safety_scan', { p_token: token });
    if (lease.error) throw new Error('Unable to acquire scan lease');
    if (!lease.data) return json({ error: 'Scan already running' }, 409);
    acquired = true;
    const { data: medicines, error } = await supabase.from('medicines').select('id, medicine_name, salt_composition, brand_or_manufacturer, is_banned').order('last_regulatory_screen', { ascending: true, nullsFirst: true }).limit(10);
    if (error) throw new Error('Unable to load inventory');
    if (!medicines?.length) return json({ success: true, processed: 0 });
    const entries = await screenRegulatory(medicines, Deno.env.get('GEMINI_API_KEY') || '', Deno.env.get('GEMINI_REGULATORY_MODEL') || '');
    const { error: saveError } = await supabase.rpc('record_safety_screen', { p_entries: entries });
    if (saveError) throw new Error('Unable to save screen results');
    return json({ success: true, processed: entries.length, clearanceIssued: false });
  } catch (error) {
    console.error('Scheduled safety screen failed', error);
    return json({ success: false, status: 'UNAVAILABLE', error: 'Safety scan could not be completed' }, 503);
  } finally {
    if (acquired && supabase) {
      const { error } = await supabase.rpc('release_safety_scan', { p_token: token });
      if (error) console.error('Scan lease release failed');
    }
    running = false;
  }
});
