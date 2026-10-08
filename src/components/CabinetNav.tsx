import { createClient } from '@/lib/supabase/server'
import { Navbar } from './Navbar'
export async function CabinetNav() {
  const supabase = await createClient()
  const [{ data: members, error: memberError }, { data: medicines, error: medicineError, count }] = await Promise.all([
    supabase.from('family_members').select('id, full_name, relationship').order('created_at'),
    supabase.from('medicines').select('id, is_banned', { count: 'exact' }).eq('is_banned', true).range(0, 0),
  ])
  return <Navbar familyMembers={members || []} medicines={medicines || []} alertsCount={count ?? undefined} warningsUnavailable={!!(memberError || medicineError)} />
}
