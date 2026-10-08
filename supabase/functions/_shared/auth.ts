import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const budgets = new Map<string, { start: number; count: number }>();
export async function authenticateUser(req: Request) {
  if (req.method !== 'POST') throw new Error('METHOD_NOT_ALLOWED');
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: header } }, auth: { persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser(header.slice(7));
  if (error || !user) throw new Error('UNAUTHORIZED');
  const now = Date.now();
  for (const [id, budget] of budgets) if (now - budget.start >= 60_000) budgets.delete(id);
  const budget = budgets.get(user.id) || { start: now, count: 0 };
  if (budget.count >= 12) throw new Error('RATE_LIMITED');
  budget.count++; budgets.set(user.id, budget);
  return user;
}

export async function readBody(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error('INVALID_BODY');
  const decoder = new TextDecoder();
  let text = '', bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 4_000_000) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  const body = JSON.parse(text);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('INVALID_BODY');
  if (body.images && (!Array.isArray(body.images) || body.images.length > 4)) throw new Error('INVALID_BODY');
  if (body.notes && (typeof body.notes !== 'string' || body.notes.length > 8000)) throw new Error('INVALID_BODY');
  return body;
}

export function failureStatus(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return message === 'UNAUTHORIZED' ? 401 : message === 'METHOD_NOT_ALLOWED' ? 405 : message === 'RATE_LIMITED' ? 429 : message === 'BODY_TOO_LARGE' ? 413 : message === 'INVALID_BODY' || error instanceof SyntaxError ? 400 : 503;
}

let cachedModel: { name: string; expires: number } | null = null;
export async function aiModel() {
  const configured = Deno.env.get('GEMINI_MODEL');
  if (configured && /^[a-zA-Z0-9.-]+$/.test(configured)) return configured;
  if (cachedModel && cachedModel.expires > Date.now()) return cachedModel.name;
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') || '' }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Model discovery failed');
  const data = await response.json();
  const model = data.models?.find((m: { name: string; supportedGenerationMethods?: string[] }) => m.name.includes('flash') && m.supportedGenerationMethods?.includes('generateContent'))?.name?.replace(/^models\//, '');
  if (!model) throw new Error('No supported model available');
  cachedModel = { name: model, expires: Date.now() + 300_000 };
  return model;
}
export function boundedFetch(input: string, init?: RequestInit) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(30_000) });
}
