/**
 * Robust Google Gemini Client with Dynamic Model Discovery
 * Queries ModelService.ListModels in real-time to use the exact active models supported by the API key.
 */

let cachedWorkingModel: string | null = null

export async function generateGeminiContent(
  parts: any[],
  geminiKey: string
): Promise<any> {
  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.')
  }

  // 1. Candidate models to check
  let candidateModels: string[] = []

  if (cachedWorkingModel) {
    candidateModels.push(cachedWorkingModel)
  }

  // 2. Discover live models available on this API key via ModelService.ListModels
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`
    )
    if (listRes.ok) {
      const listData = await listRes.json()
      if (Array.isArray(listData.models)) {
        const supported = listData.models
          .filter(
            (m: any) =>
              Array.isArray(m.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes('generateContent')
          )
          .map((m: any) => m.name.replace(/^models\//, ''))

        // Sort: flash models first, then 2.0 / 2.5 / 1.5, then pro
        const flashModels = supported.filter((name: string) => name.includes('flash'))
        const otherModels = supported.filter((name: string) => !name.includes('flash'))

        candidateModels = Array.from(
          new Set([...candidateModels, ...flashModels, ...otherModels])
        )
      }
    }
  } catch (listErr) {
    console.warn('ModelService.ListModels query warning:', listErr)
  }

  // Fallback defaults if ListModels was empty
  if (candidateModels.length === 0) {
    candidateModels = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash-001',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
    ]
  }

  let lastError = ''

  // 3. Try discovered models
  for (const model of candidateModels) {
    for (const version of ['v1beta', 'v1']) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 14000)

        const res = await fetch(
          `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${geminiKey}`,
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

        if (res.ok) {
          const data = await res.json()
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            cachedWorkingModel = model // Cache the confirmed working model
            try {
              return JSON.parse(text)
            } catch (jsonErr) {
              // If not JSON formatted, return raw object with text
              return { text, raw: text }
            }
          }
        } else {
          const errText = await res.text()
          lastError = `${version}/models/${model} (${res.status}): ${errText}`
        }
      } catch (err: any) {
        lastError = `${version}/models/${model} failed: ${err.message}`
      }
    }
  }

  throw new Error(`Unable to generate content with Gemini API. Last error: ${lastError}`)
}
