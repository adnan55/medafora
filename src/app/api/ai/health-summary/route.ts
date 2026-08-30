import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAge, checkAgeSpecificMedicineAlerts } from '@/lib/utils/ageCalculator'
import { generateGeminiContent } from '@/lib/utils/geminiClient'

export const maxDuration = 60 // Allow sufficient execution time for AI synthesis

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { member, medicines = [], medicalRecords = [], vitalLogs = [], customQuery } = body

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Family member profile data is required' },
        { status: 400 }
      )
    }

    const ageInfo = calculateAge(member.date_of_birth || member.birth_date)

    // Age-specific medication alerts check
    const ageAlerts: string[] = []
    medicines.forEach((med: any) => {
      const alert = checkAgeSpecificMedicineAlerts(med.medicine_name, med.salt_composition, ageInfo)
      if (alert.hasWarning && alert.message) {
        ageAlerts.push(alert.message)
      }
    })

    // Extract all abnormal biomarkers
    const allBiomarkers: any[] = []
    medicalRecords.forEach((r: any) => {
      if (Array.isArray(r.biomarkers)) {
        r.biomarkers.forEach((bm: any) => {
          allBiomarkers.push({
            ...bm,
            reportTitle: r.title,
            testDate: r.test_date,
          })
        })
      }
    })

    const abnormalBiomarkers = allBiomarkers.filter(
      (bm) => bm.status === 'HIGH' || bm.status === 'CRITICAL' || bm.status === 'LOW'
    )

    // Check drug-allergy interactions
    const allergyWarnings: string[] = []
    const memberAllergies: string[] = Array.isArray(member.allergies) ? member.allergies : []
    medicines.forEach((med: any) => {
      const medText = `${med.medicine_name} ${med.salt_composition || ''}`.toLowerCase()
      memberAllergies.forEach((allergy: string) => {
        if (allergy && medText.includes(allergy.toLowerCase())) {
          allergyWarnings.push(
            `🚨 ALLERGY CONFLICT: ${med.medicine_name} contains "${allergy}" which conflicts with ${member.full_name}'s recorded allergy profile.`
          )
        }
      })
    })

    let aiGeneratedInsights: any = null

    const geminiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY

    // 1. Try Direct Google Gemini Call with Dynamic Model Discovery
    if (geminiKey) {
      try {
        const prompt = `You are a world-class preventative clinical health intelligence engine.
Synthesize the complete health record for ${member.full_name}:
- Age: ${ageInfo?.formatted || 'Unknown'} (${ageInfo?.lifeStageLabel || 'Adult'})
- Allergies: ${memberAllergies.length > 0 ? memberAllergies.join(', ') : 'None'}
- Chronic Conditions: ${Array.isArray(member.chronic_conditions) ? member.chronic_conditions.join(', ') : 'None'}
- Active Medicines: ${medicines.map((m: any) => `${m.medicine_name} (${m.salt_composition || ''})`).join(', ') || 'None'}
- Abnormal Biomarkers: ${abnormalBiomarkers.map((b) => `${b.name}: ${b.value} ${b.unit} (${b.status})`).join(', ') || 'None'}
- Vitals: ${vitalLogs.slice(-6).map((v: any) => `${v.vital_type}: ${v.value} ${v.unit}`).join(', ') || 'None'}
${customQuery ? `- User Question: "${customQuery}"` : ''}

Return strictly valid JSON:
{
  "clinical_overview": "2-3 sentence clinical synthesis of patient overall status",
  "biomarker_highlights": ["Highlight 1", "Highlight 2"],
  "medication_evaluation": "Clinical review of current active cabinet medications",
  "vitals_trend_summary": "Summary of at-home glucose/BP trends",
  "actionable_recommendations": ["Recommendation 1", "Recommendation 2"],
  "doctor_discussion_guide": ["Question 1 to ask physician", "Question 2 to ask physician"]${
    customQuery ? ',\n  "custom_answer": "Direct answer to user question"' : ''
  }
}`

        const parsed = await generateGeminiContent([{ text: prompt }], geminiKey)
        if (parsed) {
          aiGeneratedInsights = parsed
        }
      } catch (geminiErr: any) {
        console.warn('Direct Gemini Health Summary Error:', geminiErr)
      }
    }

    // 2. Try Supabase AI Edge Function fallback
    if (!aiGeneratedInsights) {
      try {
        const supabase = await createClient()
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
          'analyze-medical-report',
          {
            body: {
              task: 'PATIENT_HEALTH_SUMMARY',
              member: {
                ...member,
                age: ageInfo?.formatted || 'Unknown',
                lifeStage: ageInfo?.lifeStageLabel || 'Adult',
              },
              medicines: medicines.map((m: any) => ({
                name: m.medicine_name,
                salts: m.salt_composition,
                uses: m.primary_uses,
                dosage: m.dosage_instructions,
                expiry: m.expiry_date,
              })),
              diagnoses: medicalRecords.map((r: any) => r.diagnosis).filter(Boolean),
              abnormalBiomarkers: abnormalBiomarkers.map((b) => `${b.name}: ${b.value} ${b.unit} (${b.status})`),
              vitals: vitalLogs.slice(-6).map((v: any) => `${v.vital_type}: ${v.value}${v.value_secondary ? `/${v.value_secondary}` : ''} ${v.unit} (${v.context || 'general'})`),
              customQuery: customQuery || undefined,
            },
          }
        )

        if (!edgeError && edgeData?.success && edgeData?.data) {
          aiGeneratedInsights = edgeData.data
        }
      } catch (edgeErr) {
        console.warn('Edge Function fallback to local Clinical AI engine:', edgeErr)
      }
    }

    // High-Precision Clinical Synthesis Engine (Deterministic + AI hybrid)
    const vitalityStatus =
      allergyWarnings.length > 0 || abnormalBiomarkers.some((b) => b.status === 'CRITICAL')
        ? 'ATTENTION_REQUIRED'
        : abnormalBiomarkers.length > 0 || ageAlerts.length > 0
        ? 'MODERATE_ATTENTION'
        : 'OPTIMAL'

    const vitalityScore =
      vitalityStatus === 'ATTENTION_REQUIRED'
        ? 65
        : vitalityStatus === 'MODERATE_ATTENTION'
        ? 82
        : 95

    const lifeStageAssessment = ageInfo
      ? `${ageInfo.formatted} old ${ageInfo.lifeStageLabel} patient profile (${member.relationship}). ${
          ageInfo.isPediatric
            ? 'Pediatric metabolic precautions apply regarding medication dosages, body-weight scaling, and developmental wellness.'
            : ageInfo.isGeriatric
            ? 'Geriatric clinical care considerations apply, focusing on kidney/liver drug clearance, polypharmacy monitoring, and cardiovascular stability.'
            : 'Adult wellness profile with active routine health monitoring.'
        }`
      : `Family member profile (${member.relationship}) with active digital health tracking.`

    const clinicalOverview =
      aiGeneratedInsights?.clinical_overview ||
      `Overall health status is currently ${
        vitalityStatus === 'OPTIMAL'
          ? 'optimal with all key monitored parameters within expected standard reference intervals.'
          : vitalityStatus === 'MODERATE_ATTENTION'
          ? `stable with ${abnormalBiomarkers.length} test parameter(s) requiring proactive dietary or physician follow-up.`
          : `requiring clinical attention due to ${allergyWarnings.length > 0 ? 'allergy safety flags' : 'out-of-range lab findings'}.`
      }`

    const biomarkerHighlights =
      aiGeneratedInsights?.biomarker_highlights ||
      (abnormalBiomarkers.length > 0
        ? abnormalBiomarkers.map(
            (bm) =>
              `${bm.name} recorded at ${bm.value} ${bm.unit} (${bm.status}, ref: ${
                bm.reference_range || 'Standard'
              }) in ${bm.reportTitle || 'Lab Panel'}`
          )
        : ['All recent diagnostic test biomarkers and laboratory parameters are within normal reference ranges.'])

    const vitalsTrendSummary =
      aiGeneratedInsights?.vitals_trend_summary ||
      (vitalLogs.length > 0
        ? `Monitored across ${vitalLogs.length} at-home vital check(s). Latest reading: ${
            vitalLogs[vitalLogs.length - 1]?.vital_type || 'Vital'
          } at ${vitalLogs[vitalLogs.length - 1]?.value} ${vitalLogs[vitalLogs.length - 1]?.unit || ''}.`
        : 'No at-home vital logs recorded yet. Daily glucometer, blood pressure, or pulse readings can be added using the Log Vitals button.')

    const medicationEvaluation =
      aiGeneratedInsights?.medication_evaluation ||
      (medicines.length > 0
        ? `${medicines.length} active medicine(s) logged in the cabinet. ${
            allergyWarnings.length > 0
              ? 'WARNING: Immediate allergy review needed.'
              : 'No immediate drug-allergy contraindications detected.'
          }`
        : 'No specific medications currently assigned to this member.')

    const actionableRecommendations =
      aiGeneratedInsights?.actionable_recommendations || [
        ...(ageAlerts.length > 0 ? ageAlerts : []),
        ...(allergyWarnings.length > 0 ? allergyWarnings : []),
        ...(abnormalBiomarkers.length > 0
          ? [
              `Schedule a follow-up review for ${abnormalBiomarkers
                .map((b) => b.name)
                .slice(0, 3)
                .join(', ')} with the treating physician.`,
            ]
          : []),
        'Maintain a consistent log of at-home vitals (Blood Glucose / BP) around meals and medications.',
        'Ensure all medications are stored in cool, dry conditions as indicated on storage labels.',
      ]

    const doctorDiscussionGuide =
      aiGeneratedInsights?.doctor_discussion_guide || [
        abnormalBiomarkers.length > 0
          ? `What dietary adjustments or therapy changes are recommended for ${abnormalBiomarkers[0]?.name} (${abnormalBiomarkers[0]?.value} ${abnormalBiomarkers[0]?.unit})?`
          : 'Are the current preventive health screenings and vaccination records up to date for this age group?',
        ageInfo?.isPediatric
          ? 'Are the medication dosages and liquid formulations calibrated to the patient’s current weight?'
          : ageInfo?.isGeriatric
          ? 'Is a periodic medication reconciliation recommended to prevent drug-drug interactions or kidney strain?'
          : 'What are the recommended intervals for routine metabolic and lipid profile tests?',
        'Are there any over-the-counter supplements or pain relievers that should be avoided with the current health profile?',
      ]

    let customAnswer = null
    if (customQuery) {
      customAnswer =
        aiGeneratedInsights?.custom_answer ||
        `Regarding "${customQuery}": Based on ${member.full_name}'s profile (${ageInfo?.formatted || 'Age not specified'}, ${
          memberAllergies.length > 0 ? `Allergies: ${memberAllergies.join(', ')}` : 'No recorded allergies'
        }, ${medicines.length} cabinet medicines), always verify compatibility with active ingredients before introducing new medications. Consult with your prescribing physician for specific clinical guidance.`
    }

    const synthesis = {
      vitality_status: vitalityStatus,
      vitality_score: vitalityScore,
      age_info: ageInfo,
      life_stage_assessment: lifeStageAssessment,
      clinical_overview: clinicalOverview,
      age_safety_alerts: ageAlerts,
      allergy_warnings: allergyWarnings,
      medication_evaluation: medicationEvaluation,
      biomarker_highlights: biomarkerHighlights,
      vitals_trend_summary: vitalsTrendSummary,
      actionable_recommendations: actionableRecommendations,
      doctor_discussion_guide: doctorDiscussionGuide,
      custom_answer: customAnswer,
      generated_at: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: synthesis,
    })
  } catch (error: any) {
    console.error('AI Health Summary Route Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to synthesize health summary' },
      { status: 500 }
    )
  }
}
