import { FunctionTool } from '@google/adk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ownedMember } from '@/lib/server/requestGuard'

export const fetchMedicineCabinetTool = new FunctionTool({
  name: 'fetch_medicine_cabinet',
  description: 'Reads the signed-in user cabinet. Inventory does not establish current treatment.',
  parameters: z.object({ family_member_id: z.string().uuid().optional(), include_expired: z.boolean().optional().default(true) }),
  execute: async (input: {family_member_id?: string; include_expired?: boolean}) => {
    try {
      const supabase = await createClient()
      const {data: {user}, error: authError} = await supabase.auth.getUser()
      if (authError || !user) return {status: 'UNAUTHORIZED'}
      if (input.family_member_id) await ownedMember(supabase, user.id, input.family_member_id)
      let query = supabase.from('medicines').select('medicine_name, salt_composition, dosage_form, strength, expiry_date, storage_location, is_banned').eq('user_id', user.id)
      if (input.family_member_id) query = query.eq('family_member_id', input.family_member_id)
      if (input.include_expired === false) query = query.gte('expiry_date', new Date().toISOString().slice(0,10))
      const {data, error} = await query.order('expiry_date', {ascending:true}).limit(100)
      if (error || !data) return {status: 'UNAVAILABLE', message: 'Cabinet could not be loaded.'}
      return {status: 'SUCCESS_FROM_SUPABASE', medicines:data, total_medicines:data.length, limit:100}
    } catch { return {status: 'UNAVAILABLE', message: 'Cabinet could not be loaded.'} }
  },
})

export const fetchPatientClinicalHistoryTool = new FunctionTool({
  name: 'fetch_patient_clinical_history',
  description: 'Reads dated reports and home readings for an owned family profile.',
  parameters: z.object({family_member_id: z.string().uuid()}),
  execute: async (input: {family_member_id: string}) => {
    try {
      const supabase = await createClient()
      const {data: {user}, error: authError} = await supabase.auth.getUser()
      if (authError || !user) return {status: 'UNAUTHORIZED'}
      await ownedMember(supabase, user.id, input.family_member_id)
      const [reports, vitals] = await Promise.all([
        supabase.from('medical_records').select('title,record_type,diagnosis,summary,biomarkers,test_date').eq('user_id',user.id).eq('family_member_id',input.family_member_id).order('test_date',{ascending:false}).limit(20),
        supabase.from('vital_logs').select('name,vital_type,value,value_secondary,unit,context,status,recorded_at').eq('user_id',user.id).eq('family_member_id',input.family_member_id).order('recorded_at',{ascending:false}).limit(20),
      ])
      if (reports.error || vitals.error) return {status:'UNAVAILABLE', message:'History could not be loaded completely.'}
      return {status:'SUCCESS_FROM_SUPABASE', records:reports.data || [], vitals:vitals.data || [], limit_per_source:20}
    } catch { return {status:'UNAVAILABLE', message:'History could not be loaded.'} }
  },
})
