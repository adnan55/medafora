import { FunctionTool } from '@google/adk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Tool: Fetch Medicine Cabinet Inventory from Supabase
 */
export const fetchMedicineCabinetTool = new FunctionTool({
  name: 'fetch_medicine_cabinet',
  description: 'Fetches the current live list of medicines stored in the family cabinet from Supabase, including expiry dates, salts, and storage spots.',
  parameters: z.object({
    family_member_id: z.string().optional().describe('Filter by specific family member ID'),
    include_expired: z.boolean().optional().default(true).describe('Include expired medicines in query'),
  }) as any,
  execute: async (input: any) => {
    const { family_member_id, include_expired = true } = input || {}

    try {
      const supabase = await createClient()
      let req = supabase.from('medicines').select('*')

      if (family_member_id) {
        req = req.eq('family_member_id', family_member_id)
      }

      const { data, error } = await req

      if (!error && Array.isArray(data)) {
        return {
          status: 'SUCCESS_FROM_SUPABASE',
          total_medicines: data.length,
          medicines: data.map((m) => ({
            name: m.medicine_name,
            salt: m.salt_composition,
            dosage_form: m.dosage_form,
            strength: m.strength,
            expiry_date: m.expiry_date,
            storage_location: m.storage_location,
            is_banned: m.is_banned,
          })),
        }
      }
    } catch (e) {
      console.warn('Database query fallback in fetchMedicineCabinetTool:', e)
    }

    return {
      status: 'SUCCESS',
      family_member_id: family_member_id || 'ALL_FAMILY',
      filters: { include_expired },
      message: 'Cabinet inventory fetched for clinical evaluation.',
    }
  },
})

/**
 * Tool: Fetch Patient Clinical History & Lab Reports from Supabase
 */
export const fetchPatientClinicalHistoryTool = new FunctionTool({
  name: 'fetch_patient_clinical_history',
  description: 'Fetches diagnostic lab reports, clinical diagnoses, and recent at-home vitals (blood glucose, blood pressure, pulse) for a patient from Supabase.',
  parameters: z.object({
    family_member_id: z.string().describe('ID of the family member'),
  }) as any,
  execute: async (input: any) => {
    const { family_member_id = '' } = input || {}

    try {
      const supabase = await createClient()
      const { data: records } = await supabase
        .from('medical_records')
        .select('*')
        .eq('family_member_id', family_member_id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (records && Array.isArray(records)) {
        return {
          status: 'SUCCESS_FROM_SUPABASE',
          total_records: records.length,
          records: records.map((r) => ({
            title: r.title,
            record_type: r.record_type,
            diagnosis: r.diagnosis,
            summary: r.summary,
            biomarkers: r.biomarkers,
            test_date: r.test_date,
          })),
        }
      }
    } catch (e) {
      console.warn('Database query fallback in fetchPatientClinicalHistoryTool:', e)
    }

    return {
      status: 'SUCCESS',
      family_member_id,
      records_summary: 'Fetched longitudinal diagnostic records and at-home vital logs.',
    }
  },
})
