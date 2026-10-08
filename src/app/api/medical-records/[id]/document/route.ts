import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RequestError, errorResponse } from '@/lib/server/requestGuard'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new RequestError('Unauthorized', 401)
    const { id } = await params
    const { data: record, error } = await supabase.from('medical_records').select('file_url, family_member_id').eq('id', id).eq('user_id', user.id).maybeSingle()
    if (error) throw new RequestError('Unable to load document', 503)
    if (!record?.file_url) throw new RequestError('Document not found', 404)
    let path = record.file_url as string
    // Resolve legacy public URLs only from this project's bucket; never redirect arbitrary URLs.
    if (path.startsWith('https://')) {
      const url = new URL(path)
      const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin
      const prefix = '/storage/v1/object/public/medical_reports/'
      if (url.origin !== origin || !url.pathname.startsWith(prefix)) throw new RequestError('Invalid document location')
      path = decodeURIComponent(url.pathname.slice(prefix.length))
    }
    if (path.includes('..') || !(path.startsWith(user.id + '/') || path.startsWith(record.family_member_id + '/'))) throw new RequestError('Invalid document owner', 403)
    const { data, error: signError } = await supabase.storage.from('medical_reports').createSignedUrl(path, 60)
    if (signError || !data?.signedUrl) throw new RequestError('Document unavailable', 503)
    return NextResponse.redirect(data.signedUrl, { status: 307, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const failure = errorResponse(error)
    return NextResponse.json({ error: failure.message }, { status: failure.status, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
