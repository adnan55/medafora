import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateGeminiContent } from '@/lib/utils/geminiClient'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { medicineName, brandHint } = await req.json()

    if (!medicineName) {
      return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 })
    }

    const geminiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY

    let lastError = ''

    // 1. Direct Google Gemini Call with Dynamic Model Discovery
    if (geminiKey) {
      try {
        const prompt = `You are an expert clinical pharmacist and pharmacology database assistant.
Analyze the given medicine name: "${medicineName}"${brandHint ? ` (brand hint: ${brandHint})` : ''}.
Return a strictly valid JSON object matching this schema:
{
  "medicine_name": "Standard clean brand name",
  "brand_or_manufacturer": "Primary pharmaceutical company or manufacturer",
  "salt_composition": "Full active pharmaceutical ingredient (API) and strengths",
  "dosage_form": "TABLET | CAPSULE | SYRUP | OINTMENT | DROPS | INHALER | CREAM | GEL | INJECTION | POWDER / SACHET",
  "strength": "Standard dosage strength (e.g. 500mg, 650mg, 10mg/5ml)",
  "primary_uses": "Clear 1-2 sentence clinical summary of what condition this treats",
  "dosage_instructions": "Standard recommended administration directions (e.g. Take after food with water)",
  "target_diseases": ["Disease1", "Disease2"],
  "precautions": "Crucial safety warnings (e.g. Avoid alcohol, liver caution)"
}`

        const parsedResult = await generateGeminiContent([{ text: prompt }], geminiKey)
        if (parsedResult) {
          return NextResponse.json({ success: true, data: parsedResult })
        }
      } catch (geminiErr: any) {
        lastError = geminiErr.message
        console.warn('Direct Gemini API enrich warning:', geminiErr)
      }
    } else if (!geminiKey) {
      lastError = 'GEMINI_API_KEY is not set in environment variables.'
    }

    // 2. Invoke Supabase Edge Function fallback
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.functions.invoke('enrich-medicine', {
        body: { medicineName, brandHint },
      })

      if (!error && data && data.success !== false) {
        return NextResponse.json({ success: true, data: data.data || data })
      }
    } catch (edgeErr) {
      console.warn('Edge Function fallback error:', edgeErr)
    }

    return NextResponse.json(
      {
        success: false,
        error: `Pharmacological Auto-Fill failed: ${lastError || 'Please check your GEMINI_API_KEY.'}`,
      },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Route Handler Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
