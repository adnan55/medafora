import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { medicineSchema } from '@/lib/validation/requests'
import { readJSON, ownedMember, RequestError, errorResponse } from '@/lib/server/requestGuard'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new RequestError('Unauthorized', 401)
    const parsed = medicineSchema.safeParse(await readJSON(req, 32_000))
    if (!parsed.success) throw new RequestError('Invalid medicine fields, quantity or dates')
    if (parsed.data.family_member_id) await ownedMember(supabase, user.id, parsed.data.family_member_id)
    const { data, error } = await supabase.from('medicines').insert([{ ...parsed.data, user_id: user.id }]).select()
    if (error) throw new RequestError('Unable to save medicine', 503)
    if (data?.length !== 1) throw new RequestError('Medicine not found or not saved', 503)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const failure = errorResponse(error)
    return NextResponse.json({ success: false, error: failure.message }, { status: failure.status })
  }
}
