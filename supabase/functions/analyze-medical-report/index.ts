import { authenticateUser, readBody, failureStatus, aiModel, boundedFetch } from '../_shared/auth.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    await authenticateUser(req);
    const body = await readBody(req);
    const { task, images, fileBase64, mimeType, notes, patientName, member, medicines, diagnoses, abnormalBiomarkers, vitals, customQuery } = body;

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured in Supabase secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // TASK 1: Multi-Image Medicine Vision Scan
    if (task === 'MEDICINE_MULTI_IMAGE_SCAN') {
      const parts: any[] = [
        {
          text: `You are an expert pharmaceutical vision OCR and clinical AI assistant.
Analyze the uploaded medicine packaging photos, blister strip front & back, bottle label, or box flaps.
Extract all details into a structured JSON object:
- medicine_name: Exact brand name
- generic_name: Common generic name
- salt_composition: Full active ingredients and strengths
- brand_or_manufacturer: Manufacturer or marketer
- dosage_form: One of ["TABLET", "CAPSULE", "SYRUP", "OINTMENT", "DROPS", "INHALER", "CREAM", "GEL", "INJECTION", "POWDER / SACHET"]
- strength: Dosage strength
- expiry_date: YYYY-MM-DD format
- manufacture_date: YYYY-MM-DD format if visible, else null
- batch_number: Batch / Lot number if printed, else null
- quantity: Estimated count/volume (number)
- unit: "TABLETS", "CAPSULES", "STRIPS", "BOTTLE (ML)", "TUBE (G)", etc.
- storage_location: One of ["Bedroom Cabinet", "Refrigerator Door (2-8°C)", "Bathroom Mirror Box", "Kitchen Pantry Top Shelf", "First-Aid Kit (Travel)", "Living Room Sideboard"]
- primary_uses: Clinical indication
- dosage_instructions: Administration directions
- target_diseases: Array of disease tags
- precautions: Warnings
- is_prescription_required: boolean
- is_daily_routine: boolean
- confidence_score: integer 0-100

Return strictly valid JSON conforming to the schema.`
        }
      ];

      if (notes) parts.push({ text: `Notes: ${notes}` });

      if (Array.isArray(images)) {
        images.forEach((img: any) => {
          if (img.fileBase64) {
            parts.push({
              inline_data: {
                mime_type: img.mimeType || 'image/jpeg',
                data: img.fileBase64.replace(/^data:[^;]+;base64,/, '')
              }
            });
          }
        });
      }

      const response = await boundedFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${await aiModel()}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              maxOutputTokens: 4096,
              response_mime_type: "application/json"
            }
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return new Response(JSON.stringify({ success: false, error: data.error?.message || "Gemini API error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty AI output");
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid AI output");
      return new Response(JSON.stringify({ success: true, data: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // TASK 2: Patient Health Summary Synthesis
    if (task === 'PATIENT_HEALTH_SUMMARY') {
      const prompt = `You are a world-class preventative clinical health intelligence engine.
Synthesize the complete health record for ${member?.full_name || 'Patient'}:
- Age: ${member?.age || 'Unknown'} (${member?.lifeStage || 'Adult'})
- Allergies: ${member?.allergies?.join(', ') || 'None'}
- Chronic Conditions: ${member?.chronic_conditions?.join(', ') || 'None'}
- Active Medicines: ${medicines?.map((m: any) => `${m.name} (${m.salts || ''})`).join(', ') || 'None'}
- Abnormal Biomarkers: ${abnormalBiomarkers?.join(', ') || 'None'}
- Vitals: ${vitals?.join(', ') || 'None'}
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
}`;

      const response = await boundedFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${await aiModel()}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 4096,
              response_mime_type: "application/json"
            }
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return new Response(JSON.stringify({ success: false, error: data.error?.message || "Gemini API error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty AI output");
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid AI output");
      return new Response(JSON.stringify({ success: true, data: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // TASK 3: Diagnostic Lab Report Multimodal OCR
    if (!fileBase64 && !notes) {
      return new Response(JSON.stringify({ error: "Either a document file or clinical notes are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const systemInstruction = `You are a world-class diagnostic medical report extraction and clinical AI assistant.
Patient context: ${patientName || "Family member"}.

Extract from document:
1. title: Clean professional title
2. record_type: One of: ["LAB_REPORT", "DIAGNOSIS", "PRESCRIPTION", "IMAGING", "DOCTOR_CONSULT", "DISCHARGE_SUMMARY"]
3. test_date: ISO YYYY-MM-DD
4. doctor_name: Treating doctor
5. hospital_clinic: Name of lab or hospital
6. diagnosis: Primary diagnostic conclusions
7. summary: Clear 2-3 sentence executive clinical summary
8. biomarkers: Array of detected biomarkers (name, value, unit, status NORMAL/HIGH/LOW/CRITICAL, reference_range)
9. key_recommendations: Clinical next steps
10. detected_allergies_or_contraindications: Allergies or drug contraindications

Return strictly valid JSON conforming to the schema.`;

    const parts: any[] = [{ text: systemInstruction }];
    if (notes) parts.push({ text: `Additional Notes:\n${notes}` });
    if (fileBase64 && mimeType) {
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: fileBase64.replace(/^data:[^;]+;base64,/, '')
        }
      });
    }

    const response = await boundedFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${await aiModel()}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
              maxOutputTokens: 4096,
            response_mime_type: "application/json"
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: data.error?.message || "Gemini API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty AI output");
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid AI output");
    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: "AI request unavailable" }), {
      status: failureStatus(err),
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
