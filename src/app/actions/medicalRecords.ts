'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { medicalRecordSchema } from '@/lib/validation/requests'
import type { BiomarkerRecord } from '@/lib/types/records'
import { ownedMember } from '@/lib/server/requestGuard'

export async function createMedicalRecord(payload: {
  family_member_id: string
  title: string
  record_type: string
  diagnosis?: string
  test_date?: string
  doctor_name?: string
  hospital_clinic?: string
  summary?: string
  biomarkers?: BiomarkerRecord[]
  ai_analysis?: Record<string, unknown>
  file_url?: string
  file_name?: string
  file_type?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = medicalRecordSchema.safeParse(payload)
  if (!parsed.success || JSON.stringify(payload).length > 128000) return { success: false, error: 'Invalid report fields' }
  if (payload.file_url && (!payload.file_url.startsWith(`${user.id}/${payload.family_member_id}/`) || payload.file_url.includes('..'))) return { success: false, error: 'Invalid report attachment owner' }
  try { await ownedMember(supabase, user.id, payload.family_member_id) }
  catch { return { success: false, error: 'Family member unavailable' } }

  const { data, error } = await supabase
    .from('medical_records')
    .insert([
      {
        user_id: user.id,
        family_member_id: payload.family_member_id,
        title: payload.title,
        record_type: payload.record_type || 'LAB_REPORT',
        diagnosis: payload.diagnosis || null,
        test_date: payload.test_date || null,
        doctor_name: payload.doctor_name || null,
        hospital_clinic: payload.hospital_clinic || null,
        summary: payload.summary || null,
        biomarkers: payload.biomarkers || [],
        ai_analysis: payload.ai_analysis || {},
        file_url: payload.file_url || null,
        file_name: payload.file_name || null,
        file_type: payload.file_type || null,
      }
    ])
    .select()
    .single()

  if (error) {
    console.error('Error inserting medical record:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/family/${payload.family_member_id}`)
  revalidatePath('/family')
  return { success: true, data }
}

export async function updateMedicalRecord(
  id: string,
  payload: {
    family_member_id: string
    title: string
    record_type: string
    diagnosis?: string
    test_date?: string
    doctor_name?: string
    hospital_clinic?: string
    summary?: string
    biomarkers?: BiomarkerRecord[]
    ai_analysis?: Record<string, unknown>
    file_url?: string
    file_name?: string
    file_type?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: existing, error: existingError } = await supabase.from('medical_records').select('family_member_id, file_url').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (existingError || !existing || existing.family_member_id !== payload.family_member_id) return { success: false, error: 'Report not found' }
  if (payload.file_url && payload.file_url !== existing.file_url && (!payload.file_url.startsWith(`${user.id}/${payload.family_member_id}/`) || payload.file_url.includes('..'))) return { success: false, error: 'Invalid report attachment owner' }
  const parsed = medicalRecordSchema.safeParse(payload)
  if (!parsed.success || JSON.stringify(payload).length > 128000) return { success: false, error: 'Invalid report fields' }
  try { await ownedMember(supabase, user.id, payload.family_member_id) }
  catch { return { success: false, error: 'Family member unavailable' } }

  const { data, error } = await supabase
    .from('medical_records')
    .update({
      title: payload.title,
      record_type: payload.record_type || 'LAB_REPORT',
      diagnosis: payload.diagnosis || null,
      test_date: payload.test_date || null,
      doctor_name: payload.doctor_name || null,
      hospital_clinic: payload.hospital_clinic || null,
      summary: payload.summary || null,
      biomarkers: payload.biomarkers || [],
      ai_analysis: payload.ai_analysis || {},
      file_url: payload.file_url || null,
      file_name: payload.file_name || null,
      file_type: payload.file_type || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating medical record:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/family/${payload.family_member_id}`)
  revalidatePath('/family')
  return { success: true, data }
}

export async function deleteMedicalRecord(id: string, familyMemberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data, error } = await supabase.from('medical_records').delete().eq('id', id).eq('user_id', user.id).eq('family_member_id', familyMemberId).select('file_url')
  if (error || data?.length !== 1) return { success: false, error: 'Report not found or could not be deleted' }
  let cleanupPending = false
  const path = data[0].file_url
  if (typeof path === 'string' && path.startsWith(user.id + '/') && !path.includes('..')) {
    const result = await supabase.storage.from('medical_reports').remove([path])
    cleanupPending = !!result.error
  }

  revalidatePath(`/family/${familyMemberId}`)
  revalidatePath('/family')
  return { success: true, cleanupPending }
}
