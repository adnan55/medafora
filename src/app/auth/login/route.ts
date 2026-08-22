import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Redirect back to login with error, or simply return error response
    // A more robust app would use query params like ?error=Invalid credentials
    return NextResponse.redirect(new URL('/login?error=true', request.url), {
      status: 303,
    })
  }

  return NextResponse.redirect(new URL('/', request.url), {
    status: 303,
  })
}
