import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CabinetNav } from '@/components/CabinetNav'
import { FamilyMemberHealthHub } from '@/components/FamilyMemberHealthHub'
import { DataUnavailable } from '@/components/DataUnavailable'

export default async function FamilyMemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const [memberResult, reportResult, vitalResult, medicineResult] = await Promise.all([
    supabase.from('family_members').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('medical_records').select('*', { count: 'exact' }).eq('family_member_id', id).eq('user_id', user.id).order('test_date', { ascending: false }).range(0, 299),
    supabase.from('vital_logs').select('*', { count: 'exact' }).eq('family_member_id', id).eq('user_id', user.id).order('recorded_at', { ascending: false }).range(0, 299),
    supabase.from('medicines').select('*', { count: 'exact' }).eq('family_member_id', id).eq('user_id', user.id).range(0, 999),
  ])
  if (!memberResult.error && !memberResult.data) notFound()
  if (memberResult.error?.code === '22P02') notFound()
  const failed = memberResult.error || reportResult.error || vitalResult.error || medicineResult.error
  const reports = reportResult.data || [], vitals = vitalResult.data || [], medicines = medicineResult.data || []
  const limited = (reportResult.count || 0) > reports.length || (vitalResult.count || 0) > vitals.length
  return <><CabinetNav /><main id="main-content" tabIndex={-1} className="page-shell">
    <nav aria-label="Profile navigation" className="flex flex-wrap gap-4"><Link href="/family" className="underline">All family profiles</Link><Link href={'/?member=' + id} className="underline">Member cabinet</Link></nav>
    {failed ? <DataUnavailable message="This profile's records could not be loaded completely. Please retry." /> : <>
      {limited && <p role="status" className="rounded-lg bg-amber-50 text-amber-950 p-3">Showing the 300 most recent reports and home readings. AI review loads its records separately. Use the dashboard reports pages for older documents.</p>}
      <FamilyMemberHealthHub member={memberResult.data} medicalRecords={reports} vitalLogs={vitals} medicines={medicines} inventoryIncomplete={(medicineResult.count || 0) > medicines.length} />
    </>}
  </main></>
}
