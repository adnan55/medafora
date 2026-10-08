import type { ReportRecord, VitalRecord } from '@/lib/types/records'
export interface RecordedReading {
  id: string; memberId: string; memberName: string; name: string; value: string; unit: string; context: string; date: string; source: string; status?: string
}
export function latestRecordedReadings(reports: ReportRecord[], vitals: VitalRecord[]) {
  const all: RecordedReading[] = vitals.map(v => ({
    id: v.id, memberId: v.family_member_id, memberName: v.family_members?.full_name || 'Unassigned', name: v.name,
    value: String(v.value) + (v.value_secondary != null ? '/' + v.value_secondary : ''), unit: v.unit || 'Unit not recorded',
    context: v.context || 'Context not recorded', date: v.recorded_at, source: 'Home reading', status: v.status,
  }))
  reports.forEach(r => (r.biomarkers || []).forEach((b, i) => all.push({
    id: r.id + '-' + i, memberId: r.family_member_id, memberName: r.family_members?.full_name || 'Unassigned', name: b.name,
    value: String(b.value), unit: b.unit || 'Unit not recorded', context: b.context || 'Report context not recorded', date: r.test_date || '', source: 'Lab report', status: b.status,
  })))
  const latest = new Map<string, RecordedReading>()
  all.filter(r => r.date && Number.isFinite(Date.parse(r.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).forEach(r => {
    const key = JSON.stringify([r.memberId, r.source, r.name.trim().toLowerCase(), r.unit, r.context])
    if (!latest.has(key)) latest.set(key, r)
  })
  return [...latest.values()]
}

export function recordedDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Date not recorded'
  return new Date(value).toLocaleString('en-IN', value.length === 10 ? { dateStyle: 'medium', timeZone: 'UTC' } : { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + (value.length > 10 ? ' UTC' : '')
}
