import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60; // Allow sufficient time for AI multimodal analysis

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { fileBase64, mimeType, notes, patientName } = body

    if (!fileBase64 && !notes) {
      return NextResponse.json({ success: false, error: 'Document file or clinical notes required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Invoke the deployed Edge Function
    const { data, error } = await supabase.functions.invoke('analyze-medical-report', {
      body: { fileBase64, mimeType, notes, patientName }
    })

    if (error) {
      console.error('Edge Function invoke error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (data && data.success === false) {
      console.error('AI Processing error:', data)
      return NextResponse.json({ success: false, error: data.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data.data || data })

  } catch (error: any) {
    console.error('Analyze Report Route Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
