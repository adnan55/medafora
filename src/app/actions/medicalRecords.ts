'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createMedicalRecord(payload: {
  family_member_id: string
  title: string
  record_type: string
  diagnosis?: string
  test_date?: string
  doctor_name?: string
  hospital_clinic?: string
  summary?: string
  biomarkers?: any[]
  ai_analysis?: any
  file_url?: string
  file_name?: string
  file_type?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

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
    biomarkers?: any[]
    ai_analysis?: any
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

  const { error } = await supabase
    .from('medical_records')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting medical record:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/family/${familyMemberId}`)
  revalidatePath('/family')
  return { success: true }
}
