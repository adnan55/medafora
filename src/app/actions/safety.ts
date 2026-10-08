'use server'

import { authenticatedAI } from '@/lib/server/requestGuard'
import { revalidatePath } from 'next/cache'
import { screenRegulatory, type AuditEntry } from '@/lib/server/regulatory'

export async function runSafetyAudit() {
  const { supabase, user } = await authenticatedAI()
  const { data: medicines, error } = await supabase.from('medicines').select('id, medicine_name, salt_composition, brand_or_manufacturer, is_banned').eq('user_id', user.id).order('last_regulatory_screen', { ascending: true, nullsFirst: true }).limit(50)
  if (error) throw new Error('Unable to load cabinet medicines')
  if (!medicines?.length) return { completed: false, message: 'No cabinet medicines recorded.' }
  let entries: AuditEntry[]
  try {
    entries = await screenRegulatory(medicines, process.env.GEMINI_API_KEY || '', process.env.GEMINI_REGULATORY_MODEL || '')
  } catch {
    entries = medicines.map(m => ({ medicine_id: m.id, checked_at: new Date().toISOString(), result_status: 'UNKNOWN', summary: 'Regulatory check unavailable. No safety clearance was issued. Existing bans and warnings are unchanged.', source_reference: 'AI UNAVAILABLE' }))
  }
  const { error: saveError } = await supabase.rpc('record_safety_screen', { p_entries: entries })
  if (saveError) throw new Error('Unable to record audit. Apply the safety migration and retry.')
  revalidatePath('/safety')
  revalidatePath('/')
  return { completed: false, message: `Screened ${entries.length} item(s). Findings require review; no regulatory clearance was issued.` }
}
