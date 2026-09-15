'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function runSafetyAudit() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return

  const { data: familyMembers } = await supabase
    .from('family_members')
    .select('id')
    .eq('user_id', user.id)

  const familyMemberIds = familyMembers?.map(fm => fm.id) || []
  if (familyMemberIds.length === 0) return
  
  const { data: medicines } = await supabase
    .from('medicines')
    .select('id, medicine_name, salt_composition, dosage_form, strength, brand_or_manufacturer, is_banned, ban_notice_details, family_member_id')
    .in('family_member_id', familyMemberIds)

  if (!medicines || medicines.length === 0) return

  const geminiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY

  const medicineList = medicines.map((med, i) => 
    `${i + 1}. "${med.medicine_name}" | Salt: "${med.salt_composition || 'Unknown'}" | Form: "${med.dosage_form || 'Unknown'}" | Strength: "${med.strength || 'Unknown'}" | Manufacturer: "${med.brand_or_manufacturer || 'Unknown'}"`
  ).join('\n')

  const prompt = `You are an expert pharmacovigilance and drug safety auditor with deep knowledge of:
- CDSCO (Central Drugs Standard Control Organisation, India) banned drug gazette notifications under Section 26A of Drugs & Cosmetics Act
- US FDA drug recalls, safety alerts, and market withdrawals
- EMA (European Medicines Agency) referral outcomes and suspensions
- WHO essential medicines safety bulletins
- Known irrational Fixed-Dose Combinations (FDCs) prohibited by regulatory bodies

Analyze EACH of the following medicines from a family medicine cabinet for regulatory safety:

${medicineList}

For EACH medicine, determine:
1. Is this medicine or its salt composition BANNED, RECALLED, or WITHDRAWN by any major regulatory authority?
2. Is the fixed-dose combination (if applicable) declared irrational or prohibited?
3. Are there any active safety warnings, black box warnings, or restricted use advisories?

Return a JSON array where each element corresponds to one medicine (in the same order) with this schema:
[
  {
    "index": 1,
    "result_status": "BANNED" | "WARNING" | "CLEARED",
    "is_banned": true | false,
    "summary": "Detailed regulatory finding: cite the specific gazette notification, FDA alert, or safety bulletin. If cleared, explain why this formulation is considered safe and approved. Be specific and clinically precise.",
    "source_reference": "Specific gazette number, FDA alert ID, or regulatory reference (e.g., 'CDSCO GSR 82(E)', 'FDA Safety Communication 2024-1234', 'No active regulatory alerts')",
    "ban_reason": "If banned: exact reason for prohibition. If cleared: null",
    "action_required": "If banned/warning: specific patient action. If cleared: null"
  }
]

Be thorough and accurate. Do NOT mark medicines as banned unless they genuinely appear in regulatory prohibition lists. Common approved medicines like Paracetamol (standalone), Amoxicillin, Metformin, Atorvastatin, etc. should be CLEARED unless there is a genuine regulatory issue with their specific combination or formulation.

Return strictly valid JSON array only.`

  let auditResults: any[] = []
  let usedModel = 'none'
  let aiErrorMsg = ''

  // Direct Gemini API call with explicit model selection
  if (geminiKey) {
    // Discover available models first
    let modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash']

    try {
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (listRes.ok) {
        const listData = await listRes.json()
        if (Array.isArray(listData.models)) {
          const flashModels = listData.models
            .filter((m: any) =>
              Array.isArray(m.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes('generateContent') &&
              m.name.includes('flash')
            )
            .map((m: any) => m.name.replace(/^models\//, ''))
          
          if (flashModels.length > 0) {
            modelsToTry = flashModels
          }
          console.log('[Safety Audit] Discovered models:', flashModels.join(', '))
        }
      }
    } catch (listErr) {
      console.warn('[Safety Audit] ListModels failed, using defaults:', listErr)
    }

    // Try each model until one succeeds
    for (const model of modelsToTry) {
      try {
        console.log(`[Safety Audit] Trying model: ${model}`)

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.1,
              },
            }),
            signal: AbortSignal.timeout(30000),
          }
        )

        if (!res.ok) {
          const errBody = await res.text()
          console.warn(`[Safety Audit] Model ${model} returned ${res.status}: ${errBody.slice(0, 200)}`)
          aiErrorMsg = `${model}: HTTP ${res.status}`
          continue
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
          console.warn(`[Safety Audit] Model ${model} returned empty candidates`)
          aiErrorMsg = `${model}: empty response`
          continue
        }

        const parsed = JSON.parse(text)
        usedModel = model

        if (Array.isArray(parsed)) {
          auditResults = parsed
        } else if (parsed && typeof parsed === 'object') {
          const possibleArray = Object.values(parsed).find(v => Array.isArray(v))
          if (possibleArray) {
            auditResults = possibleArray as any[]
          }
        }

        console.log(`[Safety Audit] SUCCESS with model ${model}, got ${auditResults.length} results`)
        break // Success, stop trying more models

      } catch (modelErr: any) {
        console.error(`[Safety Audit] Model ${model} exception:`, modelErr.message)
        aiErrorMsg = `${model}: ${modelErr.message}`
      }
    }
  } else {
    aiErrorMsg = 'GEMINI_API_KEY not found in environment variables'
    console.error('[Safety Audit]', aiErrorMsg)
  }

  // Build audit log entries
  const auditLogs = medicines.map((med, i) => {
    const aiResult = auditResults[i] || null

    if (aiResult) {
      return {
        medicine_id: med.id,
        checked_at: new Date().toISOString(),
        result_status: aiResult.result_status || 'CLEARED',
        summary: aiResult.summary || 'AI analysis completed. No specific regulatory issues identified.',
        source_reference: `[Model: ${usedModel}] ${aiResult.source_reference || 'AI Regulatory Knowledge Base'}`,
      }
    }

    // Fallback: AI was unavailable
    return {
      medicine_id: med.id,
      checked_at: new Date().toISOString(),
      result_status: med.is_banned ? 'BANNED' : 'CLEARED',
      summary: med.is_banned 
        ? (med.ban_notice_details || 'Previously flagged as prohibited by regulatory order.') 
        : `AI audit failed (${aiErrorMsg || 'unknown error'}). Falling back to existing database records. No ban found.`,
      source_reference: `[AI UNAVAILABLE: ${aiErrorMsg}] Database Fallback`,
    }
  })

  const { error: insertError } = await supabase.from('safety_audit_logs').insert(auditLogs)
  if (insertError) {
    console.error('[Safety Audit] Failed to insert audit logs:', insertError)
    throw new Error(insertError.message)
  }

  // Update medicines with AI findings
  for (let i = 0; i < medicines.length; i++) {
    const aiResult = auditResults[i]
    if (aiResult) {
      const isBanned = aiResult.result_status === 'BANNED'
      await supabase
        .from('medicines')
        .update({
          last_safety_check: new Date().toISOString(),
          is_banned: isBanned,
          ban_notice_details: isBanned ? aiResult.summary : null,
        })
        .eq('id', medicines[i].id)
    } else {
      await supabase
        .from('medicines')
        .update({ last_safety_check: new Date().toISOString() })
        .eq('id', medicines[i].id)
    }
  }

  revalidatePath('/safety')
}
