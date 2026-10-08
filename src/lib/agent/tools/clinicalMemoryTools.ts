import { FunctionTool, LOAD_MEMORY } from '@google/adk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ownedMember } from '@/lib/server/requestGuard'

/**
 * Tool: Record Clinical Memory & Diagnostic Anomaly to Supabase DB
 */
export const recordClinicalMemoryTool = new FunctionTool({
  name: 'record_clinical_memory',
  description: 'Persists a critical diagnostic finding, lab anomaly, adverse drug reaction, or clinical insight directly to Supabase DB so future agent interactions remember it.',
  parameters: z.object({
    family_member_id: z.string().describe('ID of the family member'),
    patient_name: z.string().describe('Full name of the family member'),
    category: z.enum([
      'DIAGNOSTIC_ANOMALY',
      'ALLERGY_ALERT',
      'MEDICATION_ISSUE',
      'CHRONIC_CONDITION',
      'DOCTOR_DIRECTIVE',
    ]).describe('Category of the clinical memory'),
    headline: z.string().describe('Short headline of what the issue was (e.g. HbA1c 6.8% prediabetic spike, Amoxicillin rash)'),
    details: z.string().describe('Detailed clinical findings, test numbers, or symptoms'),
    underlying_reason_or_mechanism: z.string().describe('Why this occurred or the physiological cause behind it'),
    recommended_actions: z.string().describe('Doctor directives, dietary guidelines, or contraindicated medicines'),
  }),
  execute: async (input: { family_member_id: string; patient_name: string; category: string; headline: string; details: string; underlying_reason_or_mechanism: string; recommended_actions: string }) => {
    const {
      family_member_id,
      patient_name = 'Family Member',
      category = 'DIAGNOSTIC_ANOMALY',
      headline = '',
      details = '',
      underlying_reason_or_mechanism = '',
      recommended_actions = '',
    } = input || {}

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || !family_member_id) return { status: 'UNAUTHORIZED' }
      await ownedMember(supabase, user.id, family_member_id)
      if (user && family_member_id) {
        const { data, error } = await supabase
          .from('patient_clinical_memories')
          .insert([
            {
              user_id: user.id,
              family_member_id,
              category,
              headline,
              details,
              underlying_reason_or_mechanism,
              recommended_actions,
            },
          ])
          .select()
          .single()

        if (!error && data) {
          return {
            status: 'SAVED_TO_SUPABASE_DB',
            memory_id: data.id,
            patient: patient_name,
            headline,
            message: `Clinical memory permanently saved to Supabase DB for ${patient_name}.`,
          }
        }
      }
    } catch (dbErr) {
      console.warn('Clinical memory insert failed:', dbErr)
    }

    return { status: 'UNAVAILABLE', message: 'Clinical memory was not saved.' }
  },
})

/**
 * Tool: Recall Patient Clinical Memories from Supabase DB
 */
export const recallPatientMemoriesTool = new FunctionTool({
  name: 'recall_patient_memories',
  description: 'Searches and retrieves past medical issues, historical diagnostic anomalies, past symptoms, and reasons stored in Supabase DB for a patient.',
  parameters: z.object({
    family_member_id: z.string().optional().describe('ID of the family member'),
    query: z.string().optional().describe('Keywords or medical topic to search (e.g. "blood sugar", "allergies", "kidney", "rash")'),
  }),
  execute: async (input: { family_member_id?: string; query?: string }) => {
    const { family_member_id, query = '' } = input || {}
    const qLower = String(query).toLowerCase()

    let dbRecords: Record<string, string>[] = []

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { status: 'UNAUTHORIZED', total_memories_found: 0, memories: [] }
      if (family_member_id) await ownedMember(supabase, user.id, family_member_id)
      let req = supabase.from('patient_clinical_memories').select('*').eq('user_id', user.id)

      if (family_member_id) {
        req = req.eq('family_member_id', family_member_id)
      }

      const { data, error } = await req.order('created_at', { ascending: false }).limit(20)

      if (error) return { status: 'UNAVAILABLE', total_memories_found: 0, memories: [] }
      if (!error && Array.isArray(data)) {
        dbRecords = data
      }
    } catch (err) {
      console.warn('Clinical memory read failed:', err)
      return { status: 'UNAVAILABLE', total_memories_found: 0, memories: [] }
    }

    // Shape owned database results for recall
    const combined = [
      ...dbRecords.map((r) => ({
        id: r.id,
        family_member_id: r.family_member_id,
        timestamp: r.created_at || new Date().toISOString(),
        category: r.category,
        headline: r.headline,
        details: r.details,
        underlying_reason_or_mechanism: r.underlying_reason_or_mechanism,
        recommended_actions: r.recommended_actions,
      })),

    ]

    const matches = combined.filter((item) => {
      if (!qLower) return true
      const text = `${item.headline} ${item.details} ${item.underlying_reason_or_mechanism} ${item.recommended_actions}`.toLowerCase()
      return text.includes(qLower)
    })

    return {
      total_memories_found: matches.length,
      memories: matches.map((m) => ({
        date: m.timestamp.split('T')[0],
        category: m.category,
        issue: m.headline,
        findings: m.details,
        why_it_happened: m.underlying_reason_or_mechanism,
        management_directive: m.recommended_actions,
      })),
      clinical_guidance:
        matches.length > 0
          ? 'Use these historical memories to maintain continuity of care and explain how past issues relate to current symptoms.'
          : 'No past recorded issues found for this query.',
    }
  },
})

export { LOAD_MEMORY }
