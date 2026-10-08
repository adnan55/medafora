import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { PageHeader } from '@/components/PageHeader'
import { DataUnavailable } from '@/components/DataUnavailable'
import { DashboardFilters } from '@/components/DashboardFilters'
import { MedicineSummary } from '@/components/MedicineSummary'
import { AddMedicalRecordModal } from '@/components/AddMedicalRecordModal'
import { MedicalRecordDetailModal } from '@/components/MedicalRecordDetailModal'
import { LogVitalModal } from '@/components/LogVitalModal'
import { EmergencyCardModal } from '@/components/EmergencyCardModal'
import { calculateExpiryStatus, type ExpiryUrgency } from '@/lib/utils/expiryCalculator'
import { measurementPresentation } from '@/lib/utils/statusPresentation'
import { latestRecordedReadings, recordedDate } from '@/lib/utils/recordReadings'
import type { MemberRecord, MedicineRecord, ReportRecord, VitalRecord } from '@/lib/types/records'

type Params = { member?: string; storage?: string; form?: string; sort?: string; q?: string; expiry?: string; page?: string; recordsPage?: string; view?: string }
const pageSize = 12
const pageNumber = (raw?: string) => /^\d+$/.test(raw || '') ? Math.max(1, Math.min(1000, Number(raw))) : 1

export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const [familyResult, summaryResult, bannedResult] = await Promise.all([
    supabase.from('family_members').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('medicines').select('id, family_member_id, expiry_date, storage_location, dosage_form, is_banned', { count: 'exact' }).eq('user_id', user.id).range(0, 999),
    supabase.from('medicines').select('id, is_banned', { count: 'exact' }).eq('user_id', user.id).eq('is_banned', true).range(0, 999),
  ])
  const members = (familyResult.data || []) as MemberRecord[]
  const summaries = summaryResult.data || []
  const member = params.member && params.member !== 'ALL' ? members.find(m => m.id === params.member) : undefined
  const memberInvalid = !!params.member && params.member !== 'ALL' && !member
  const page = pageNumber(params.page)
  const recordsPage = pageNumber(params.recordsPage)
  const sort = { expiry_desc: ['expiry_date', false], name_asc: ['medicine_name', true], name_desc: ['medicine_name', false] }[params.sort || ''] || ['expiry_date', true]
  let inventoryQuery = supabase.from('medicines').select('*, family_members(id, full_name, relationship)', { count: 'exact' }).eq('user_id', user.id).order(String(sort[0]), { ascending: Boolean(sort[1]), nullsFirst: false }).order('id')
  let reportQuery = supabase.from('medical_records').select('id, family_member_id, title, record_type, test_date, diagnosis, summary, hospital_clinic, doctor_name, biomarkers, file_url, file_name, file_type, ai_analysis, family_members(id, full_name, relationship)', { count: 'exact' }).eq('user_id', user.id).order('test_date', { ascending: false, nullsFirst: false }).order('id')
  let vitalQuery = supabase.from('vital_logs').select('*, family_members(id, full_name, relationship)', { count: 'exact' }).eq('user_id', user.id).order('recorded_at', { ascending: false }).order('id')
  if (member) {
    inventoryQuery = inventoryQuery.eq('family_member_id', member.id)
    reportQuery = reportQuery.eq('family_member_id', member.id)
    vitalQuery = vitalQuery.eq('family_member_id', member.id)
  }
  if (params.storage && params.storage !== 'ALL') inventoryQuery = inventoryQuery.eq('storage_location', params.storage)
  if (params.form && params.form !== 'ALL') inventoryQuery = inventoryQuery.eq('dosage_form', params.form)
  // Restrict PostgREST filter syntax to search text and use AND between words.
  const terms = (params.q || '').slice(0, 160).replace(/[^\p{L}\p{N}\s.-]/gu, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 8)
  for (const term of terms) inventoryQuery = inventoryQuery.or(['medicine_name', 'salt_composition', 'primary_uses', 'dosage_instructions', 'brand_or_manufacturer', 'notes', 'storage_location', 'dosage_form'].map(field => field + '.ilike.%' + term + '%').join(','))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = (offset: number) => { const date = new Date(today); date.setDate(date.getDate() + offset); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') }
  if (params.expiry === 'EXPIRED') inventoryQuery = inventoryQuery.lt('expiry_date', day(0))
  if (params.expiry === 'CRITICAL') inventoryQuery = inventoryQuery.gte('expiry_date', day(0)).lte('expiry_date', day(15))
  if (params.expiry === 'WARNING') inventoryQuery = inventoryQuery.gt('expiry_date', day(15)).lte('expiry_date', day(45))
  if (params.expiry === 'SAFE') inventoryQuery = inventoryQuery.gt('expiry_date', day(45))
  if (params.expiry === 'UNKNOWN') inventoryQuery = inventoryQuery.is('expiry_date', null)
  const [inventoryResult, reportResult, vitalResult] = await Promise.all([
    inventoryQuery.range((page - 1) * pageSize, page * pageSize - 1),
    reportQuery.range((recordsPage - 1) * pageSize, recordsPage * pageSize - 1),
    vitalQuery.range(0, 11),
  ])
  const medicines = (inventoryResult.data || []) as unknown as MedicineRecord[]
  const reports = (reportResult.data || []) as unknown as ReportRecord[]
  const vitals = (vitalResult.data || []) as unknown as VitalRecord[]
  const scopedSummary = member ? summaries.filter(m => m.family_member_id === member.id) : summaries
  const counts: Record<ExpiryUrgency, number> = { EXPIRED: 0, CRITICAL: 0, WARNING: 0, SAFE: 0, UNKNOWN: 0 }
  scopedSummary.forEach(m => counts[calculateExpiryStatus(m.expiry_date).urgency]++)
  const readings = latestRecordedReadings(reports, vitals)
  const flags = reports.flatMap(r => r.biomarkers || []).filter(b => ['HIGH', 'LOW', 'ABNORMAL', 'CRITICAL'].includes(b.status || ''))
  const inventoryTotal = inventoryResult.count || 0
  const reportTotal = reportResult.count || 0
  function href(update: Partial<Params>, anchor = '') {
    const query = new URLSearchParams(Object.entries({ ...params, ...update }).filter((entry): entry is [string, string] => !!entry[1]))
    return '/?' + query.toString() + anchor
  }
  const storages = [...new Set(summaries.map(m => m.storage_location).filter((s): s is string => !!s))].sort()
  const forms = [...new Set(summaries.map(m => m.dosage_form).filter((s): s is string => !!s))].sort()
  const incomplete = (summaryResult.count || 0) > summaries.length
  return <>
    <Navbar familyMembers={members} medicines={bannedResult.data || []} alertsCount={bannedResult.count ?? undefined} warningsUnavailable={!!(familyResult.error || bannedResult.error)} />
    <main id="main-content" tabIndex={-1} className="page-shell">
      <PageHeader title={params.view === 'reports' ? 'Family reports and readings' : 'Family medicine cabinet'} description="Keep dated records, review recorded warnings, and manage your household inventory.">
        <Link href="/medicines/new" className="action-link">Add medicine</Link>
        {member ? <LogVitalModal familyMemberId={member.id} familyMemberName={member.full_name} /> : <LogVitalModal familyMembers={members} />}
      </PageHeader>
      {familyResult.error ? <DataUnavailable message="Family profiles could not be loaded. Inventory scope cannot be verified." /> : <>
        <nav aria-label="Choose family member" className="flex flex-wrap gap-2">
          <Link href={href({ member: undefined, page: undefined, recordsPage: undefined })} aria-current={!member && !memberInvalid ? 'page' : undefined} className="scope-link">All family members</Link>
          {members.map(m => <Link key={m.id} href={href({ member: m.id, page: undefined, recordsPage: undefined })} aria-current={member?.id === m.id ? 'page' : undefined} className="scope-link">{m.full_name}</Link>)}
        </nav>
        {memberInvalid ? <DataUnavailable message="That family profile is unavailable. Choose a listed member to continue." /> : <>
          {!members.length && <section className="rounded-2xl border bg-white p-5 space-y-3"><h2 className="text-lg font-bold">Start with a family profile</h2><p>Create a profile so reports and readings are assigned to the right person.</p><Link href="/family/new" className="action-link">Add family member</Link></section>}
          {(bannedResult.count || 0) > 0 && <section role="status" className="rounded-2xl border border-rose-300 bg-rose-50 p-5 space-y-2">
            <h2 className="text-lg font-bold text-rose-950">{bannedResult.count} cabinet item(s) have recorded regulatory warnings</h2><p className="text-rose-950">These cabinet-wide warnings remain visible while searching or selecting a member.</p><Link href="/safety" className="underline font-semibold text-rose-950">Review recorded alerts</Link></section>}
          {bannedResult.error && <DataUnavailable message="Cabinet regulatory warnings could not be loaded." />}
          {member && <div className="flex flex-wrap items-center gap-3"><Link href={'/family/' + member.id} className="underline font-semibold">Open {member.full_name}&apos;s records and trends</Link>
            <AddMedicalRecordModal familyMemberId={member.id} familyMemberName={member.full_name} />
          </div>}
          <section aria-labelledby="inventory-heading" className="space-y-4">
            <h2 id="inventory-heading" className="text-xl font-bold">Medicine inventory</h2>
            <DashboardFilters key={JSON.stringify(params)} uniqueStorages={storages} uniqueForms={forms} />
            <p className="text-sm text-muted-foreground">Expiry counts cover {member ? member.full_name : 'the whole cabinet'} and ignore search, storage and form filters. Expiry does not establish suitability for use.</p>
            {summaryResult.error ? <DataUnavailable message="Expiry counts and filter options could not be loaded." /> : <>
              {incomplete && <p role="status" className="text-amber-950">Counts and filter options cover the first {summaries.length} of {summaryResult.count} items. Inventory search below covers all items.</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {([['EXPIRED', 'Expired'], ['CRITICAL', '0–15 days until expiry'], ['WARNING', '16–45 days until expiry'], ['SAFE', 'More than 45 days until expiry'], ['UNKNOWN', 'Expiry not recorded']] as const).map(([status, label]) =>
                  <Link key={status} href={'/?' + new URLSearchParams({ ...(member ? { member: member.id } : {}), expiry: status })} className="rounded-xl border bg-white p-4 hover:border-[#2F4858] space-y-2" aria-label={'View ' + label + ': ' + counts[status] + ' items'}>
                    <span className="block text-sm font-semibold">{label}</span><span className="block text-2xl font-bold">{counts[status]}</span>
                  </Link>)}
              </div>
            </>}
            {inventoryResult.error ? <DataUnavailable message="Medicine inventory could not be loaded. Your cabinet may still contain items." /> : <>
              <p role="status" className="text-sm">{inventoryTotal} matching item(s) · page {page} · {member ? member.full_name : 'all members'}</p>
              {medicines.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{medicines.map(m => <MedicineSummary key={m.id} medicine={m} />)}</div> :
                <div className="rounded-xl border bg-white p-5"><p>No medicines match this view.</p><Link href={member ? '/?member=' + member.id : '/'} className="underline">Clear inventory filters</Link></div>}
              <nav aria-label="Inventory pages" className="flex gap-4">{page > 1 && <Link href={href({ page: String(page - 1) })} className="underline">Previous inventory page</Link>}{page * pageSize < inventoryTotal && <Link href={href({ page: String(page + 1) })} className="underline">Next inventory page</Link>}</nav>
            </>}
          </section>
          <section id="reports" aria-labelledby="reports-heading" className="space-y-4 scroll-mt-40">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="reports-heading" className="text-xl font-bold">Dated reports</h2><AddMedicalRecordModal familyMembers={members} familyMemberId={member?.id} familyMemberName={member?.full_name} /></div>
            {reportResult.error ? <DataUnavailable message="Reports could not be loaded. No health conclusion can be drawn." /> : <>
              <p className="text-sm text-muted-foreground">{reportTotal} report(s) · page {recordsPage}. {reports.length ? flags.length + ' recorded abnormal flag(s) in reports shown; absence of flags is not a health assessment.' : 'No reports in this view; health status is unassessed.'}</p>
              <div className="grid gap-4 md:grid-cols-2">{reports.map(r => <article key={r.id} className="rounded-xl border bg-white p-5 space-y-3 min-w-0">
                <h3 className="font-bold text-lg break-words">{r.title}</h3><p className="text-sm">{r.family_members?.full_name || 'Member'} · {recordedDate(r.test_date)} · {r.record_type.replaceAll('_', ' ')}</p>
                {r.diagnosis && <p className="break-words">Recorded finding: {r.diagnosis}</p>}
                <MedicalRecordDetailModal record={r} familyMemberName={r.family_members?.full_name || 'Member'} />
              </article>)}</div>
              <nav aria-label="Report pages" className="flex gap-4">{recordsPage > 1 && <Link href={href({ recordsPage: String(recordsPage - 1) }, '#reports')} className="underline">Previous reports</Link>}{recordsPage * pageSize < reportTotal && <Link href={href({ recordsPage: String(recordsPage + 1) }, '#reports')} className="underline">Next reports</Link>}</nav>
            </>}
          </section>
          <section aria-labelledby="readings-heading" className="space-y-4">
            <h2 id="readings-heading" className="text-xl font-bold">Recorded readings by source and context</h2>
            <p className="text-sm text-muted-foreground">Latest comparable series within the reports on this page and the 12 most recent home readings. Open a family profile for its fuller history.</p>
            {vitalResult.error || reportResult.error ? <DataUnavailable message="Reading sources could not be loaded completely." /> : <div className="grid gap-3 sm:grid-cols-2">
              {!readings.length && <p>No dated readings recorded in this view.</p>}
              {readings.slice(0, 8).map(r => <article key={r.id} className="rounded-xl border bg-white p-4 space-y-2 min-w-0">
                <h3 className="font-bold">{r.memberName} · {r.name}</h3><p className="text-xl font-semibold">{r.value} {r.unit}</p>
                <p className="text-sm">{r.source} · {r.context}</p><p className="text-sm">{recordedDate(r.date)}</p>
                <span className={'inline-block rounded-lg border p-1 text-sm ' + measurementPresentation(r.status).className}>{measurementPresentation(r.status).label}</span>
              </article>)}
              {readings.length > 8 && <p className="text-sm">Showing 8 of {readings.length} recorded series in this view.</p>}
            </div>}
          </section>
          {member && !summaryResult.error && !incomplete && <EmergencyInventory member={member} />}
        </>}
      </>}
    </main>
  </>
}

async function EmergencyInventory({ member }: { member: MemberRecord }) {
  const supabase = await createClient()
  const { data, error, count } = await supabase.from('medicines').select('medicine_name, salt_composition', { count: 'exact' }).eq('family_member_id', member.id).range(0, 999)
  if (error || (count || 0) > (data?.length || 0)) return <DataUnavailable message="The complete emergency medicine list could not be loaded. Open the family profile to retry." />
  return <EmergencyCardModal member={member} medicines={data || []} />
}
