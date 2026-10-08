'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useId } from 'react'
import { Button } from './ui/button'

export function DashboardFilters({ uniqueStorages, uniqueForms }: { uniqueStorages: string[]; uniqueForms: string[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const id = useId()
  const fields = ['q', 'storage', 'form', 'sort', 'expiry']
  function navigate(next: URLSearchParams) { startTransition(() => router.push('/?' + next.toString())) }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next = new URLSearchParams(params.toString())
    for (const key of fields) {
      const value = String(data.get(key) || '').trim()
      if (value && value !== 'ALL') next.set(key, value); else next.delete(key)
    }
    next.delete('page'); navigate(next)
  }
  function clear() {
    const next = new URLSearchParams(params.toString())
    for (const key of [...fields, 'page']) next.delete(key)
    navigate(next)
  }
  const control = 'block w-full min-w-0 mt-1 rounded-lg border bg-white px-3 py-2 text-base'
  const active = fields.filter(key => params.has(key))
  return <form onSubmit={submit} aria-busy={pending} className="rounded-xl border bg-white p-4 space-y-4">
    <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
      <label htmlFor={id + '-q'} className="sm:col-span-2 text-sm font-semibold">Search cabinet
        <input id={id + '-q'} type="search" name="q" defaultValue={params.get('q') || ''} maxLength={160} placeholder="Medicine, ingredient or recorded notes" className={control} /></label>
      <label className="text-sm font-semibold">Storage
        <select name="storage" defaultValue={params.get('storage') || 'ALL'} className={control}>
          <option value="ALL">All storage locations</option>{uniqueStorages.map(s => <option key={s} value={s}>{s}</option>)}
        </select></label>
      <label className="text-sm font-semibold">Medicine form
        <select name="form" defaultValue={params.get('form') || 'ALL'} className={control}>
          <option value="ALL">All forms</option>{uniqueForms.map(s => <option key={s} value={s}>{s}</option>)}
        </select></label>
      <label className="text-sm font-semibold">Sort order
        <select name="sort" defaultValue={params.get('sort') || 'expiry_asc'} className={control}>
          <option value="expiry_asc">Earliest expiry first</option><option value="expiry_desc">Latest expiry first</option><option value="name_asc">Name A–Z</option><option value="name_desc">Name Z–A</option>
        </select></label>
      <label className="text-sm font-semibold">Expiry
        <select name="expiry" defaultValue={params.get('expiry') || 'ALL'} className={control}>
          <option value="ALL">All expiry dates</option><option value="EXPIRED">Expired</option><option value="CRITICAL">0–15 days</option><option value="WARNING">16–45 days</option><option value="SAFE">More than 45 days</option><option value="UNKNOWN">Not recorded</option>
        </select></label>
      <div className="flex flex-wrap gap-2 items-end sm:col-span-2"><Button type="submit">Apply filters</Button><Button type="button" variant="outline" onClick={clear}>Clear filters</Button></div>
    </fieldset>
    {active.length > 0 && <p className="text-sm break-words">Current filters: {active.map(key => key + ': ' + params.get(key)).join(' · ')}</p>}
    <p role="status" className="text-sm">{pending ? 'Updating inventory…' : 'Filters apply to medicine inventory. Reports keep their member scope.'}</p>
  </form>
}
