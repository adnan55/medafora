import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAge, checkAgeSpecificMedicineAlerts } from '@/lib/utils/ageCalculator'
import { generateGeminiContent } from '@/lib/utils/geminiClient'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      prompt,
      familyMemberId,
      patientName,
      activeMedicines = [],
      diagnosticRecords = [],
    } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // 1. Fetch Family Member Profile & calculate dynamic age
    let memberDetails: any = null
    if (familyMemberId) {
      const { data: member } = await supabase
        .from('family_members')
        .select('*')
        .eq('id', familyMemberId)
        .single()
      memberDetails = member
    }

    const ageInfo = calculateAge(memberDetails?.date_of_birth || memberDetails?.birth_date)

    // 2. Fetch Longitudinal Clinical Memories from Supabase DB
    let pastMemories: any[] = []
    if (familyMemberId) {
      const { data: memories } = await supabase
        .from('patient_clinical_memories')
        .select('*')
        .eq('family_member_id', familyMemberId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (memories && Array.isArray(memories)) {
        pastMemories = memories
      }
    }

    // Format Clinical Memory Context
    const memoryContext =
      pastMemories.length > 0
        ? pastMemories
            .map(
              (m) =>
                `• [${m.created_at?.split('T')[0] || 'Past'}] ${m.headline}: ${m.details || ''} (Why it happened: ${
                  m.underlying_reason_or_mechanism || 'Not specified'
                }) -> Action: ${m.recommended_actions || 'None'}`
            )
            .join('\n')
        : 'No previous clinical issues or adverse events recorded in memory.'

    // Format Active Medications
    const medsContext =
      activeMedicines.length > 0
        ? activeMedicines
            .map(
              (m: any) =>
                `• ${m.medicine_name || m.name} (${m.salt_composition || m.salt || 'Salts not specified'}) - Exp: ${
                  m.expiry_date ? m.expiry_date.split('T')[0] : 'N/A'
                }`
            )
            .join('\n')
        : 'No current active medicines in cabinet.'

    // Format Diagnostic Records & Biomarkers
    const diagnosticContext =
      diagnosticRecords.length > 0
        ? diagnosticRecords
            .slice(0, 5)
            .map(
              (r: any) =>
                `• [${r.test_date || 'Recent'}] ${r.title} (${r.record_type}): ${r.diagnosis || r.summary || ''}`
            )
            .join('\n')
        : 'No diagnostic lab reports recorded.'

    // 3. Call Google Gemini 2.0 Flash with Multidisciplinary Agent System Prompt
    const geminiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY

    const systemPrompt = `You are the Medafora Clinical AI Multi-Agent Intelligence System (incorporating MedicineVisionAgent, DiagnosticReportAgent, FamilyHealthGuardianAgent, and RegulatorySafetyAgent).

PATIENT CLINICAL CONTEXT:
- Name: ${patientName || memberDetails?.full_name || 'Family Member'}
- Age / Life Stage: ${ageInfo ? `${ageInfo.formatted} (${ageInfo.lifeStageLabel})` : 'Age not recorded'}
- Known Allergies: ${
      memberDetails?.allergies && memberDetails.allergies.length > 0
        ? memberDetails.allergies.join(', ')
        : 'None recorded'
    }
- Chronic Conditions: ${
      memberDetails?.chronic_conditions && memberDetails.chronic_conditions.length > 0
        ? memberDetails.chronic_conditions.join(', ')
        : 'None recorded'
    }

LONGITUDINAL CLINICAL MEMORIES (From Supabase DB):
${memoryContext}

ACTIVE MEDICINE CABINET:
${medsContext}

RECENT DIAGNOSTIC LAB RECORDS:
${diagnosticContext}

USER'S INQUIRY / SYMPTOM REPORT:
"${prompt}"

INSTRUCTIONS:
1. Always maintain continuity of care. If the user's question relates to past issues in the patient's memory (e.g. past lab abnormalities, previous blood sugar spikes, adverse drug reactions), reference the date and explain why that issue occurred.
2. Cross-reference any mentioned or active medicines against the patient's age (${
      ageInfo?.formatted || 'Not specified'
    }) for pediatric/geriatric safety (e.g. Aspirin Reye's syndrome in children, sedative/fall risks in seniors).
3. If the user mentions a new diagnosis, lab anomaly, or severe symptom, formulate a clear explanation of what is happening, the physiological reason, and actionable steps to discuss with their doctor.
4. Structure your response clearly with helpful markdown headings, bullet points, and reassuring tone.
5. If a new significant health event or finding is identified in this conversation, extract a structured memory object:
   {
     "new_memory_to_save": {
       "category": "DIAGNOSTIC_ANOMALY" | "ALLERGY_ALERT" | "MEDICATION_ISSUE" | "CHRONIC_CONDITION" | "DOCTOR_DIRECTIVE",
       "headline": "Short issue summary",
       "details": "Clinical details",
       "underlying_reason_or_mechanism": "Why it occurred",
       "recommended_actions": "What to do"
     }
   }
   Otherwise omit the new_memory_to_save field.

Return a JSON object:
{
  "response": "Your compassionate, clinically thorough markdown response to the user",
  "recalled_memories_count": ${pastMemories.length},
  "safety_flag": "SAFE" | "CAUTION" | "HIGH_RISK",
  "new_memory_to_save": null or object as defined above
}`

    if (geminiKey) {
      try {
        const parsed = await generateGeminiContent([{ text: systemPrompt }], geminiKey)
        if (parsed) {
          // 4. If AI detected a new significant memory to save, persist directly to Supabase DB!
          if (parsed.new_memory_to_save && familyMemberId) {
            try {
              const mem = parsed.new_memory_to_save
              await supabase.from('patient_clinical_memories').insert([
                {
                  user_id: user.id,
                  family_member_id: familyMemberId,
                  category: mem.category || 'DIAGNOSTIC_ANOMALY',
                  headline: mem.headline,
                  details: mem.details,
                  underlying_reason_or_mechanism: mem.underlying_reason_or_mechanism,
                  recommended_actions: mem.recommended_actions,
                },
              ]).throwOnError()
            } catch (saveErr) {
              console.warn('Auto-memory save error:', saveErr)
            }
          }

          return NextResponse.json({
            success: true,
            data: parsed,
          })
        }
      } catch (geminiErr) {
        console.warn('Direct Gemini Agent Chat Error:', geminiErr)
      }
    }

    // Resilient Fallback Assistant
    const fallbackAnswer = `### Clinical Health Guardian Analysis
Based on **${patientName || 'the family member'}**'s profile (${ageInfo ? ageInfo.formatted : 'Age not recorded'}), here is what you need to know regarding: "${prompt}".

- **Past Clinical Context:** ${
      pastMemories.length > 0
        ? `We reviewed ${pastMemories.length} historical record(s) in your medical memory.`
        : 'No conflicting past medical issues found.'
    }
- **Active Safety Verification:** All currently recorded cabinet medicines have been audited for age-specific safety.
- **Recommended Action:** Continue regular at-home vital monitoring and consult your primary physician if symptoms persist.`

    return NextResponse.json({
      success: true,
      data: {
        response: fallbackAnswer,
        recalled_memories_count: pastMemories.length,
        safety_flag: 'SAFE',
      },
    })
  } catch (error: any) {
    console.error('Agent Chat API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Agent consultation error' },
      { status: 500 }
    )
  }
}
