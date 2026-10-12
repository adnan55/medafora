import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateUser, aiModel, failureStatus } from '../_shared/auth.ts';
import { screenRegulatory } from '../../../src/lib/server/regulatory.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers:cors});
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = Deno.env.get('SAFETY_SCAN_SECRET');
  const scheduled = !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
  const token = scheduled ? crypto.randomUUID() : "";
  let supabase: ReturnType<typeof createClient> | null = null;
  let acquired = false;
  try {
    let userId: string | undefined;
    if (scheduled) {
      // Privileged client is created only after verifying the scheduler credential.
      supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const lease = await supabase.rpc('acquire_safety_scan', { p_token: token });
      if (lease.error) throw new Error('Unable to acquire scan lease');
      if (!lease.data) return json({ error: 'Scan already running' }, 409);
      acquired = true;
    } else {
      const user = await authenticateUser(req);
      userId = user.id;
      supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {global:{headers:{Authorization:req.headers.get('authorization')!}},auth:{persistSession:false}});
    }
    let query = supabase.from('medicines').select('id, medicine_name, salt_composition, brand_or_manufacturer, is_banned');
    if (userId) query = query.eq('user_id', userId);
    const { data: medicines, error } = await query.order('last_regulatory_screen', { ascending: true, nullsFirst: true }).limit(10);
    if (error) throw new Error('Unable to load inventory');
    if (!medicines?.length) return json({ success: true, processed: 0 });
    const entries = await screenRegulatory(medicines, Deno.env.get('GEMINI_API_KEY') || '', Deno.env.get('GEMINI_REGULATORY_MODEL') || await aiModel());
    const { error: saveError } = await supabase.rpc('record_safety_screen', { p_entries: entries });
    if (saveError) throw new Error('Unable to save screen results');
    return json({ success: true, processed: entries.length, clearanceIssued: false });
  } catch (error) {
    return json({ success: false, status: 'UNAVAILABLE', error: 'Safety scan could not be completed' }, failureStatus(error));
  } finally {
    if (acquired && supabase) {
      const { error } = await supabase.rpc('release_safety_scan', { p_token: token });
      if (error) console.error('Scan lease release failed');
    }
  }
});
