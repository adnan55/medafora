import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CabinetNav } from '@/components/CabinetNav'
import NewFamilyForm from '@/components/NewFamilyForm'
export default async function NewFamilyMemberPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <><CabinetNav /><NewFamilyForm /></>
}
