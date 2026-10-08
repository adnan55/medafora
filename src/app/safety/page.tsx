import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CabinetNav } from '@/components/CabinetNav'
import { PageHeader } from '@/components/PageHeader'
import { DataUnavailable } from '@/components/DataUnavailable'
import { DeepAuditScanButton } from '@/components/DeepAuditScanButton'
import { AuditLogTable, type AuditLog } from '@/components/AuditLogTable'
import { runSafetyAudit } from '@/app/actions/safety'

export default async function SafetyPage({ searchParams }: { searchParams?: Promise<{ q?: string; page?: string }> }) {
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const q = (params.q || '').slice(0, 160).replace(/[^\p{L}\p{N}\s.-]/gu, ' ').trim()
  const page = /^\d+$/.test(params.page || '') ? Math.max(1, Math.min(1000, Number(params.page))) : 1
  const pageSize = 25
  const bannedQuery = supabase.from('medicines').select('id, medicine_name, salt_composition, ban_notice_details', { count: 'exact' }).eq('user_id', user.id).eq('is_banned', true).range(0, 99)
  const matchesQuery = q ? supabase.from('medicines').select('id', { count: 'exact' }).eq('user_id', user.id).or('medicine_name.ilike.%' + q + '%,salt_composition.ilike.%' + q + '%').range(0, 100) : Promise.resolve({ data: [], count: 0, error: null })
  const [banned, matches] = await Promise.all([bannedQuery, matchesQuery])
  let logsQuery = supabase.from('safety_audit_logs').select('id, medicine_id, checked_at, result_status, summary, source_reference, medicines(medicine_name, salt_composition)', { count: 'exact' }).eq('user_id', user.id).order('checked_at', { ascending: false }).order('id')
  const searchTooBroad = (matches.count || 0) > 100
  if (q) {
    const ids = (matches.data || []).map(m => m.id).slice(0, 100)
    logsQuery = logsQuery.or('summary.ilike.%' + q + '%' + (ids.length ? ',medicine_id.in.(' + ids.join(',') + ')' : ''))
  }
  const logs = searchTooBroad || matches.error ? null : await logsQuery.range((page - 1) * pageSize, page * pageSize - 1)
  const nextHref = (next: number) => '/safety?' + new URLSearchParams({ ...(q ? { q } : {}), page: String(next) })
  return <><CabinetNav /><main id="main-content" tabIndex={-1} className="page-shell">
    <PageHeader title="Recorded alerts and regulatory screening" description="Request a screen for potential regulatory notices. Coverage and applicability need review; this is not continuous monitoring or a safety guarantee.">
      <DeepAuditScanButton runAuditAction={runSafetyAudit} />
    </PageHeader>
    {banned.error ? <DataUnavailable message="Recorded cabinet warnings could not be loaded." /> : (banned.count || 0) > 0 ? <section className="rounded-2xl border border-rose-300 bg-rose-50 p-5 space-y-3">
      <h2 className="text-lg font-bold text-rose-950">{banned.count} item(s) have recorded regulatory warnings</h2>
      {(banned.data || []).map(m => <article key={m.id} className="rounded-xl border bg-white p-4 space-y-2">
        <h3 className="font-bold break-words">{m.medicine_name}</h3><p className="break-words">{m.salt_composition}</p>
        <p className="break-words">{m.ban_notice_details || 'Review the recorded warning and applicable notice before use.'}</p>
        <Link href={'/medicines/' + m.id} className="underline">View medicine and warning details</Link>
      </article>)}
      {(banned.count || 0) > (banned.data?.length || 0) && <p role="status">Showing the first 100 warnings. Open the cabinet to find other flagged items.</p>}
    </section> : <p className="rounded-xl border bg-white p-4">No regulatory warnings are recorded in this account. This does not establish medicine safety or complete screening coverage.</p>}
    <section className="space-y-4"><h2 className="text-xl font-bold">Screening history</h2>
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <label htmlFor="audit-search" className="block grow text-sm font-semibold">Search medicines, ingredients or notice summaries
          <input id="audit-search" name="q" type="search" maxLength={160} defaultValue={q} className="block w-full border rounded-lg p-3 text-base mt-1" />
        </label><button className="action-link" type="submit">Search history</button><Link href="/safety" className="underline py-3">Clear search</Link>
      </form>
      {searchTooBroad ? <p role="status" className="text-amber-950">This phrase matches more than 100 medicines. Use a more specific name or ingredient to search their full history.</p> :
        matches.error || logs?.error || !logs ? <DataUnavailable message="Screening history could not be loaded." /> : <>
          <p className="text-sm">{logs.count || 0} matching log entry/entries · page {page}. Search is applied before pagination.</p>
          <AuditLogTable logs={(logs.data || []) as unknown as AuditLog[]} />
          <nav aria-label="Screening history pages" className="flex gap-4">{page > 1 && <Link href={nextHref(page - 1)} className="underline">Previous history page</Link>}{page * pageSize < (logs.count || 0) && <Link href={nextHref(page + 1)} className="underline">Next history page</Link>}</nav>
        </>}
    </section>
    <p className="text-sm text-muted-foreground">Dates identify individual attempts. Unknown or incomplete checks do not clear existing warnings. Confirm notice applicability and current treatment with a pharmacist or clinician.</p>
  </main></>
}
