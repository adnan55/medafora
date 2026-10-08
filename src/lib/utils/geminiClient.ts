export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } }
let cachedModel: { name: string; expires: number } | null = null

/** Two attempts within one 25-second deadline. Invalid output is never a success. */
export async function generateGeminiContent(parts: GeminiPart[], geminiKey: string): Promise<Record<string, unknown>> {
  if (!geminiKey) throw new Error('AI is not configured')
  const signal = AbortSignal.timeout(25_000)
  let models = (process.env.GEMINI_MODELS || '').split(',').map(v => v.trim()).filter(v => /^[a-zA-Z0-9.-]+$/.test(v))
  if (!models.length && cachedModel && cachedModel.expires > Date.now()) models = [cachedModel.name]
  if (!models.length) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': geminiKey }, signal })
    if (!response.ok) throw new Error(`AI model discovery failed (${response.status})`)
    const data = await response.json()
    models = (data.models || []).filter((m: { name: string; supportedGenerationMethods?: string[] }) => m.name.includes('flash') && m.supportedGenerationMethods?.includes('generateContent')).map((m: { name: string }) => m.name.replace(/^models\//, ''))
  }
  let lastError = 'No supported AI model available'
  for (const model of models.slice(0, 2)) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey }, signal,
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 4096 } }),
    })
    if (!response.ok) {
      lastError = `AI request failed (${response.status})`
      if ([400, 401, 403, 429].includes(response.status)) break
      continue
    }
    const data = await response.json()
    const candidate = data.candidates?.[0]
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') throw new Error('AI output was incomplete or blocked')
    const text = candidate?.content?.parts?.map((p: { text?: string }) => p.text || '').join('')
    if (!text) throw new Error('AI returned empty output')
    let parsed: unknown
    try { parsed = JSON.parse(text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')) }
    catch { throw new Error('AI returned invalid JSON') }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AI returned an invalid object')
    cachedModel = { name: model, expires: Date.now() + 300_000 }
    return parsed as Record<string, unknown>
  }
  throw new Error(lastError)
}
