export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } }
let cachedModel: { names: string[]; expires: number } | null = null

/** Two attempts within one 45-second deadline. Invalid output is never a success. */
export async function generateGeminiContent(parts: GeminiPart[], geminiKey: string): Promise<Record<string, unknown>> {
  if (!geminiKey) throw new Error('AI is not configured')
  const signal = AbortSignal.timeout(45_000)
  let models = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || '').split(',').map(v => v.trim()).filter(v => /^[a-zA-Z0-9.-]+$/.test(v))
  if (!models.length && cachedModel && cachedModel.expires > Date.now()) models = cachedModel.names
  if (!models.length) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': geminiKey }, signal })
    if (!response.ok) throw new Error(`AI model discovery failed (${response.status})`)
    const data = await response.json()
    models = (data.models || []).filter((m: { name: string; supportedGenerationMethods?: string[] }) => m.name.includes('flash') && !/tts|image|audio|live|preview|2\.0/.test(m.name) && m.supportedGenerationMethods?.includes('generateContent')).map((m: { name: string }) => m.name.replace(/^models\//, '')).sort((a: string, b: string) => { const priority = (name: string) => name === 'gemini-3.6-flash' ? 0 : name === 'gemini-3.5-flash-lite' ? 1 : 2; return priority(a) - priority(b) || b.localeCompare(a, undefined, { numeric: true }) })
  }
  let lastError = 'No supported AI model available'
  for (const model of models.slice(0, 2)) {
    let response: Response
    try { response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey }, signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192, ...(/^gemini-3[.-]/.test(model) ? { thinkingConfig: { thinkingLevel: "low" } } : {}) } }),
    }) } catch {
      lastError = 'AI provider timed out or could not be reached'
      if (signal.aborted) break
      continue
    }
    if (!response.ok) {
      lastError = `AI request failed (${response.status})`
      if ([400, 401, 403, 429].includes(response.status)) break
      continue
    }
    const data = await response.json()
    const candidate = data.candidates?.[0]
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') throw new Error('AI output was incomplete or blocked')
    const text = candidate?.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || '').join('')
    if (!text) throw new Error('AI returned empty output')
    let parsed: unknown
    try { parsed = JSON.parse(text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')) }
    catch { throw new Error('AI returned invalid JSON') }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AI returned an invalid object')
    cachedModel = { names: [model, ...models.filter(name => name !== model)], expires: Date.now() + 300_000 }
    return parsed as Record<string, unknown>
  }
  throw new Error(lastError)
}
