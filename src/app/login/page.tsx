import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Mail, ShieldCheck } from 'lucide-react'
import { FloatingLabel } from '@/components/shadcn-space/label/label-06'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const resolvedParams = await searchParams

  if (user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FDFB] p-4">
      <Card className="max-w-md w-full border border-[#2F4858]/15 shadow-sm rounded-2xl bg-white">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center mb-2 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-black text-[#2F4858] tracking-tight">Sign in to MedVault</CardTitle>
          <CardDescription className="text-xs font-semibold text-[#2F4858]/70">
            Your family's secure digital medicine cabinet
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-4">
          {resolvedParams.error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-bold text-center">
              Invalid credentials. Please check and try again.
            </div>
          )}

          <form className="space-y-6" action="/auth/login" method="post">
            <input type="hidden" name="remember" defaultValue="true" />
            
            <div className="pt-1">
              <FloatingLabel
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                label="Email Address"
                icon={<Mail className="size-4" />}
                containerClassName="max-w-full"
              />
            </div>

            <div className="pt-1">
              <FloatingLabel
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                label="Password"
                icon={<Lock className="size-4" />}
                containerClassName="max-w-full"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] font-extrabold text-xs shadow-sm cursor-pointer mt-4"
            >
              Sign In to Cabinet
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
