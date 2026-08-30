import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { images = [], notes = '' } = body

    if (!Array.isArray(images) || images.length === 0) {
      if (!notes) {
        return NextResponse.json(
          { success: false, error: 'At least one medicine photo or text description is required.' },
          { status: 400 }
        )
      }
    }

    // 1. Check Gemini API Key from environment variables
    const geminiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY

    let lastError = ''

    if (geminiKey && images.length > 0) {
      try {
        const parts: any[] = [
          {
            text: `You are an expert pharmaceutical vision OCR and clinical AI assistant.
Analyze the uploaded photo(s) of medicine packaging, blister strips (front/back), bottle label, box flaps, or prescription.
Extract all visible and clinically inferred details into a structured JSON response:

Schema:
- medicine_name: Exact brand name on the pack (e.g. "Augmentin 625 Duo", "Calpol 650", "Allegra 120mg", "Pan-D", "Azithral 500")
- generic_name: Common generic name
- salt_composition: Full active pharmaceutical ingredient(s) and strength (e.g. "Amoxicillin 500mg + Potassium Clavulanate 125mg")
- brand_or_manufacturer: Pharmaceutical manufacturer or marketer (e.g. "GSK", "Micro Labs", "Cipla", "Sun Pharma")
- dosage_form: One of ["TABLET", "CAPSULE", "SYRUP", "OINTMENT", "DROPS", "INHALER", "CREAM", "GEL", "INJECTION", "POWDER / SACHET"]
- strength: Dosage strength (e.g. "625mg", "650mg", "10mg/5ml")
- expiry_date: Expiry date in YYYY-MM-DD format (if written as EXP 11/27 or Nov 2027, use last day of month like 2027-11-30)
- manufacture_date: Manufacturing date in YYYY-MM-DD format if visible, or null
- batch_number: Batch / Lot number if printed (e.g. "B24098"), or null
- quantity: Estimated count of tablets/capsules or volume (number)
- unit: "TABLETS", "CAPSULES", "STRIPS", "BOTTLE (ML)", "TUBE (G)", etc.
- storage_location: Recommended storage spot from ["Bedroom Cabinet", "Refrigerator Door (2-8°C)", "Bathroom Mirror Box", "Kitchen Pantry Top Shelf", "First-Aid Kit (Travel)", "Living Room Sideboard"]
- primary_uses: 1-2 sentence clear clinical explanation of what symptoms or conditions this treats
- dosage_instructions: Standard administration directions (e.g. "Take 1 tablet after food with water")
- target_diseases: Array of disease tags (e.g. ["Bacterial Infection", "Fever"])
- precautions: Important warnings (e.g. "Avoid alcohol", "Take after food")
- is_prescription_required: boolean
- is_daily_routine: boolean
- confidence_score: integer 0-100 reflecting OCR clarity

Return ONLY strictly valid JSON.`,
          },
        ]

        if (notes) {
          parts.push({ text: `Additional notes from user: ${notes}` })
        }

        // Add all image parts (REST API v1beta inline_data format)
        images.forEach((img: any) => {
          if (img.fileBase64) {
            const rawData = String(img.fileBase64).replace(/^data:[^;]+;base64,/, '')
            if (rawData.trim()) {
              parts.push({
                inline_data: {
                  mime_type: img.mimeType || 'image/jpeg',
                  data: rawData,
                },
              })
            }
          }
        })

        // Prioritize gemini-2.0-flash (fastest GA model) then gemini-1.5-flash
        const models = ['gemini-2.0-flash', 'gemini-1.5-flash']
        for (const model of models) {
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 14000)

            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts }],
                  generationConfig: {
                    response_mime_type: 'application/json',
                    temperature: 0.1,
                  },
                }),
                signal: controller.signal,
              }
            )

            clearTimeout(timeoutId)

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json()
              const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) {
                const parsed = JSON.parse(text)
                return NextResponse.json({ success: true, data: parsed })
              }
            } else {
              const errText = await geminiRes.text()
              lastError = `Model ${model} error (${geminiRes.status}): ${errText}`
              console.warn(lastError)
            }
          } catch (modelErr: any) {
            lastError = `Model ${model} request error: ${modelErr.message}`
            console.warn(lastError)
          }
        }
      } catch (geminiErr: any) {
        lastError = geminiErr.message
        console.error('Direct Gemini Vision API error:', geminiErr)
      }
    } else if (!geminiKey) {
      lastError = 'GEMINI_API_KEY is not set in environment variables.'
    }

    // 2. Try Supabase Edge Function fallback if direct call failed
    try {
      const supabase = await createClient()
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
        'analyze-medical-report',
        {
          body: {
            task: 'MEDICINE_MULTI_IMAGE_SCAN',
            images: images.map((img: any) => ({
              fileBase64: String(img.fileBase64).replace(/^data:[^;]+;base64,/, ''),
              mimeType: img.mimeType || 'image/jpeg',
              label: img.label || 'Medicine packaging',
            })),
            notes,
          },
        }
      )

      if (!edgeError && edgeData?.success && edgeData?.data) {
        return NextResponse.json({ success: true, data: edgeData.data })
      }
    } catch (edgeErr) {
      console.warn('Edge Function invoke fallback:', edgeErr)
    }

    return NextResponse.json(
      {
        success: false,
        error: `AI Medicine Scan failed: ${lastError || 'Timeout or invalid response from AI service. Please try again.'}`,
      },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Scan Medicine Route Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to scan medicine photos' },
      { status: 500 }
    )
  }
}
