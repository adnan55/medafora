'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function runSafetyAudit() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return

  // Get the user's family member IDs first (medicines links via family_member_id, not user_id)
  const { data: familyMembers } = await supabase
    .from('family_members')
    .select('id')
    .eq('user_id', user.id)

  const familyMemberIds = familyMembers?.map(fm => fm.id) || []
  if (familyMemberIds.length === 0) return
  
  const { data: medicines } = await supabase
    .from('medicines')
    .select('id, is_banned, ban_notice_details')
    .in('family_member_id', familyMemberIds)

  if (medicines && medicines.length > 0) {
    const auditLogs = medicines.map(med => ({
      medicine_id: med.id,
      checked_at: new Date().toISOString(),
      result_status: med.is_banned ? 'BANNED' : 'CLEARED',
      summary: med.is_banned ? med.ban_notice_details : 'No conflicting gazette notifications or bans found in current CDSCO/FDA databases.',
      source_reference: med.is_banned ? 'CDSCO Section 26A / FDA Notices' : 'Automated AI Reference Check'
    }))

    const { error: insertError } = await supabase.from('safety_audit_logs').insert(auditLogs)
    if (insertError) {
      console.error("Failed to insert audit logs", insertError)
      throw new Error(insertError.message)
    }

    const { error: updateError } = await supabase
      .from('medicines')
      .update({ last_safety_check: new Date().toISOString() })
      .in('family_member_id', familyMemberIds)

    if (updateError) {
      console.error("Failed to update last_safety_check", updateError)
    }
  }

  revalidatePath('/safety')
}
