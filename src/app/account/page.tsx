import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CabinetNav } from '@/components/CabinetNav'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <><CabinetNav /><main id="main-content" tabIndex={-1} className="page-shell"><PageHeader title="Account" description="Manage your current session." />
    <section className="rounded-2xl border bg-white p-6 space-y-4"><p className="break-all">Signed in as <strong>{user.email || 'your account'}</strong></p>
      <form method="POST" action="/auth/signout"><Button type="submit" variant="outline">Sign out</Button></form></section></main></>
}
