import { authenticateUser, readBody, failureStatus, aiModel, boundedFetch } from '../_shared/auth.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    await authenticateUser(req);
    const { medicineName, brandHint } = await readBody(req);

    if (!medicineName) {
      return new Response(JSON.stringify({ error: "Medicine name is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (medicineName === "LIST_MODELS") {
      const res = await boundedFetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
      const data = await res.json();
      return new Response(JSON.stringify({ success: true, models: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `You are an expert clinical pharmacist and pharmacology database assistant.
Analyze the given medicine name and provide structured, accurate pharmacological information.
Always provide the active salt composition, main target diseases, primary indications, dosage form hints, precautions, and side effects.
Return strictly valid JSON conforming to the requested schema.`;

    const userPrompt = `Medicine: "${medicineName}" ${brandHint ? `(Brand/Manufacturer: ${brandHint})` : ""}`;

    const response = await boundedFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${await aiModel()}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
          ],
          generationConfig: {
              maxOutputTokens: 4096,
            response_mime_type: "application/json",
            response_schema: {
              type: "OBJECT",
              properties: {
                salt_composition: { type: "STRING", description: "Active chemical salt / generic compound name" },
                brand_or_manufacturer: { type: "STRING", description: "Standard manufacturer or brand name" },
                dosage_form: { type: "STRING", description: "Tablet, Syrup, Capsule, Cream, etc." },
                target_diseases: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: "List of diseases or conditions this medicine treats"
                },
                primary_uses: { type: "STRING", description: "Plain-language explanation of what this medicine is used for" },
                dosage_instructions: { type: "STRING", description: "Standard usage instructions (e.g., after food)" },
                precautions: { type: "STRING", description: "Key warnings, contraindications, and alcohol/pregnancy safety" },
                common_side_effects: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: "List of common side effects"
                },
                is_prescription_required: { type: "BOOLEAN" }
              },
              required: ["salt_composition", "target_diseases", "primary_uses", "precautions"]
            }
          }
        })
      }
    );

    const data = await response.json();
    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return new Response(JSON.stringify({ success: false, error: "Failed to generate AI content", raw: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Strip markdown code block formatting if Gemini adds it
    resultText = resultText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    try {
      const parsedData = JSON.parse(resultText);
      return new Response(JSON.stringify({ success: true, data: parsedData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (parseError: any) {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON from AI", rawText: resultText }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: "AI request unavailable" }), {
      status: failureStatus(error),
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
