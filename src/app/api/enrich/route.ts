import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { medicineName, brandHint } = await req.json()

    if (!medicineName) {
      return NextResponse.json({ error: "Medicine name is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Invoke the Supabase Edge Function which securely holds the GEMINI_API_KEY
    const { data, error } = await supabase.functions.invoke('enrich-medicine', {
      body: { medicineName, brandHint }
    })

    if (error) {
      console.error('Edge Function Error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (data && data.success === false) {
      console.error('Edge Function AI Error:', data)
      return NextResponse.json({ success: false, error: data.error, raw: data.raw || data.rawText }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data.data || data })

  } catch (error: any) {
    console.error('Route Handler Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
