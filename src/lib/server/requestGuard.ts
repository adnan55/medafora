import { createClient } from '@/lib/supabase/server'

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

// A process-local burst guard. Deployments with multiple workers also need a shared quota.
const budgets = new Map<string, { start: number; count: number }>()
export async function authenticatedAI() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new RequestError('Unauthorized', 401)
  const now = Date.now()
  for (const [key, value] of budgets) if (now - value.start >= 60_000) budgets.delete(key)
  const budget = budgets.get(user.id) || { start: now, count: 0 }
  if (budget.count >= 12) throw new RequestError('Too many AI requests. Please try again shortly.', 429)
  budget.count++
  budgets.set(user.id, budget)
  return { supabase, user }
}

export async function readJSON(req: Request, maxBytes = 4_000_000) {
  if (Number(req.headers.get('content-length')) > maxBytes) throw new RequestError('Request is too large', 413)
  if (!req.body) throw new RequestError('JSON body is required')
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) { await reader.cancel(); throw new RequestError('Request is too large', 413) }
    chunks.push(value)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown }
  catch { throw new RequestError('Invalid JSON body') }
}

export async function ownedMember(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, id: string) {
  const { data, error } = await supabase.from('family_members').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
  if (error) throw new RequestError('Unable to load family member', 503)
  if (!data) throw new RequestError('Family member not found', 404)
  return data
}

export function errorResponse(error: unknown) {
  return { message: error instanceof RequestError ? error.message : 'Service unavailable. Please try again.', status: error instanceof RequestError ? error.status : 503 }
}
