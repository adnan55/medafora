'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createVitalLog(payload: {
  family_member_id: string
  vital_type: string
  name: string
  value: number
  value_secondary?: number
  unit: string
  context?: string
  status?: string
  recorded_at?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Determine clinical status if not explicitly passed
  let status = payload.status || 'NORMAL'
  const numericValue = Number(payload.value)
  if (isNaN(numericValue)) {
    return { success: false, error: 'Invalid vital value: must be a valid number' }
  }
  if (payload.vital_type === 'BLOOD_GLUCOSE') {
    const val = Number(payload.value)
    if (payload.context?.includes('Fasting')) {
      if (val >= 126) status = 'HIGH'
      else if (val >= 100) status = 'ABNORMAL'
      else if (val < 70) status = 'LOW'
      else status = 'NORMAL'
    } else {
      if (val >= 200) status = 'HIGH'
      else if (val >= 140) status = 'ABNORMAL'
      else if (val < 70) status = 'LOW'
      else status = 'NORMAL'
    }
  } else if (payload.vital_type === 'BLOOD_PRESSURE') {
    const sys = Number(payload.value)
    const dia = Number(payload.value_secondary || 0)
    if (sys >= 140 || dia >= 90) status = 'HIGH'
    else if (sys >= 130 || dia >= 80) status = 'ABNORMAL'
    else if (sys < 90 || dia < 60) status = 'LOW'
    else status = 'NORMAL'
  } else if (payload.vital_type === 'HBA1C') {
    const val = Number(payload.value)
    if (val >= 6.5) status = 'HIGH'
    else if (val >= 5.7) status = 'ABNORMAL'
    else status = 'NORMAL'
  } else if (payload.vital_type === 'HEART_RATE') {
    const val = Number(payload.value)
    if (val > 100) status = 'HIGH'
    else if (val < 60) status = 'LOW'
    else status = 'NORMAL'
  } else if (payload.vital_type === 'SPO2') {
    const val = Number(payload.value)
    if (val < 92) status = 'CRITICAL'
    else if (val < 95) status = 'LOW'
    else status = 'NORMAL'
  }

  const { data, error } = await supabase
    .from('vital_logs')
    .insert([
      {
        user_id: user.id,
        family_member_id: payload.family_member_id,
        vital_type: payload.vital_type,
        name: payload.name,
        value: payload.value,
        value_secondary: payload.value_secondary || null,
        unit: payload.unit,
        context: payload.context || null,
        status,
        recorded_at: payload.recorded_at || new Date().toISOString(),
        notes: payload.notes || null,
      }
    ])
    .select()
    .single()

  if (error) {
    console.error('Error logging vital:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/family/${payload.family_member_id}`)
  return { success: true, data }
}

export async function deleteVitalLog(id: string, familyMemberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('vital_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting vital log:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/family/${familyMemberId}`)
  return { success: true }
}
