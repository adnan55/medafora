import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { familyHealthGuardianAgent } from '@/lib/agent/agents/familyHealthGuardianAgent'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { family_member_id, new_medicine_salt, new_medicine_name } = await req.json()

    if (!family_member_id || !new_medicine_salt) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Fetch existing medicines for this family member
    const { data: existingMedicines } = await supabase
      .from('medicines')
      .select('medicine_name, salt_composition')
      .eq('family_member_id', family_member_id)

    if (!existingMedicines || existingMedicines.length === 0) {
      // No other medicines to interact with
      return NextResponse.json({ hasInteraction: false, warning: '' })
    }

    // Format existing medicines
    const currentMedList = existingMedicines
      .map(m => `${m.medicine_name} (${m.salt_composition})`)
      .join(', ')

    // Use Gemini via ADK directly or fetch
    // Since familyHealthGuardianAgent is set up for chat, we can just use the Gemini API directly for a quick check.
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set")
    }

    const prompt = `You are a Pharmacologist AI.
A patient is currently taking the following medicines:
[${currentMedList}]

They are about to add a NEW medicine to their routine:
New Medicine: ${new_medicine_name} (${new_medicine_salt})

Task: Check for severe or clinically significant drug-drug interactions between the NEW medicine and the EXISTING medicines.
Only flag ACTUAL dangerous or highly significant interactions (e.g. blood thinners + NSAIDs, two CNS depressants, QT prolongation). Do not flag minor theoretical interactions.

Return ONLY a JSON object (no markdown, no backticks, no text outside JSON) in this format:
{
  "hasInteraction": boolean,
  "warning": "Plain language explanation of the interaction, why it's dangerous, and what they should do." (Leave empty string if hasInteraction is false)
}`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    hasInteraction: { type: "BOOLEAN" },
                    warning: { type: "STRING" }
                },
                required: ["hasInteraction", "warning"]
            }
        }
      })
    })

    if (!res.ok) {
       console.error("Gemini API error", await res.text())
       return NextResponse.json({ hasInteraction: false, warning: '' }) // fail open
    }

    const data = await res.json()
    const textResp = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (textResp) {
       try {
           const parsed = JSON.parse(textResp)
           return NextResponse.json(parsed)
       } catch (e) {
           console.error("Failed to parse Gemini JSON", e, textResp)
       }
    }

    return NextResponse.json({ hasInteraction: false, warning: '' })

  } catch (error) {
    console.error('Check Interactions Error:', error)
    return NextResponse.json({ error: 'Failed to check interactions' }, { status: 500 })
  }
}
