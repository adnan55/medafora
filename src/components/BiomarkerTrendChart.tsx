'use client'
import { useState, useId, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogVitalModal } from './LogVitalModal'
import { Button } from './ui/button'
import { deleteVitalLog } from '@/app/actions/vitals'
import { measurementPresentation } from '@/lib/utils/statusPresentation'
import { recordedDate } from '@/lib/utils/recordReadings'
import type { ReportRecord, VitalRecord } from '@/lib/types/records'

interface Props { familyMemberId: string; familyMemberName: string; medicalRecords: ReportRecord[]; vitalLogs: VitalRecord[] }
interface Point { id: string; type: string; name: string; date: string; unit: string; context: string; source: 'Home' | 'Lab'; raw: string; value: number | null; secondary: number | null; status?: string }
const categories = [
  ['BLOOD_GLUCOSE', 'Blood glucose'], ['BLOOD_PRESSURE', 'Blood pressure'], ['HBA1C', 'HbA1c'],
  ['HEART_RATE', 'Pulse'], ['SPO2', 'Oxygen saturation'], ['WEIGHT', 'Weight'], ['TEMPERATURE', 'Temperature'], ['CHOLESTEROL', 'Cholesterol'],
]
function numeric(raw: string | number | null | undefined) {
  const text = String(raw ?? '').trim()
  return /^[-+]?\d+(?:\.\d+)?$/.test(text) && Number.isFinite(Number(text)) ? Number(text) : null
}
function category(name: string) {
  const n = name.toLowerCase()
  if (/hba1c|glycated/.test(n)) return 'HBA1C'
  if (/glucose|sugar/.test(n)) return 'BLOOD_GLUCOSE'
  if (/blood pressure|\bbp\b/.test(n)) return 'BLOOD_PRESSURE'
  if (/pulse|heart rate/.test(n)) return 'HEART_RATE'
  if (/spo2|oxygen saturation/.test(n)) return 'SPO2'
  if (/weight/.test(n)) return 'WEIGHT'
  if (/temperature/.test(n)) return 'TEMPERATURE'
  if (/cholesterol|\bhdl\b|\bldl\b|triglyceride/.test(n)) return 'CHOLESTEROL'
  return 'OTHER'
}
export function BiomarkerTrendChart({ familyMemberId, familyMemberName, medicalRecords, vitalLogs }: Props) {
  const router = useRouter()
  const id = useId()
  const [selectedCategory, setCategory] = useState('BLOOD_GLUCOSE')
  const [selectedSeries, setSeries] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [deleting, setDeleting] = useState('')
  const [error, setError] = useState('')
  const pointRefs = useRef(new Map<string, SVGGElement>())
  const chartBox = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(650)
  useEffect(() => {
    const element = chartBox.current
    if (!element) return
    const observer = new ResizeObserver(entries => {
      if (entries[0]) setChartWidth(Math.max(260, entries[0].contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const all: Point[] = vitalLogs.map(v => ({
    id: v.id, type: v.vital_type, name: v.name, date: v.recorded_at, unit: v.unit || 'Unit not recorded',
    context: v.context || 'Context not recorded', source: 'Home', raw: String(v.value) + (v.value_secondary != null ? '/' + v.value_secondary : ''),
    value: numeric(v.value), secondary: numeric(v.value_secondary), status: v.status,
  }))
  medicalRecords.forEach(r => (r.biomarkers || []).forEach((b, index) => all.push({
    id: 'lab-' + r.id + '-' + index, type: category(b.name), name: b.name, date: r.test_date || '', unit: b.unit || 'Unit not recorded',
    context: b.context || 'Report context not recorded', source: 'Lab', raw: String(b.value), value: numeric(b.value), secondary: null, status: b.status,
  })))
  const seriesKey = (p: Point) => JSON.stringify([p.name.trim().toLowerCase(), p.unit, p.context, p.source])
  const categoryPoints = all.filter(p => p.type === selectedCategory)
  const series = [...new Map(categoryPoints.map(p => [seriesKey(p), p])).entries()]
  const active = series.some(([key]) => key === selectedSeries) ? selectedSeries : series[0]?.[0] || ''
  const readings = categoryPoints.filter(p => seriesKey(p) === active).sort((a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0))
  const plotted = readings.filter((p): p is Point & { value: number } => p.value !== null && Number.isFinite(Date.parse(p.date)))
  const selected = readings.find(p => p.id === selectedId)
  const latest = plotted.at(-1)
  const previous = plotted.at(-2)
  const omitted = readings.length - plotted.length
  const min = Math.min(...plotted.flatMap(p => p.secondary === null ? [p.value] : [p.value, p.secondary]))
  const max = Math.max(...plotted.flatMap(p => p.secondary === null ? [p.value] : [p.value, p.secondary]))
  const range = max - min || Math.max(Math.abs(max) * .1, 1)
  const low = min - range * .1
  const high = max + range * .1
  const width = chartWidth, height = 270, left = 70, right = 30, top = 25, bottom = 45
  const focusedPointId = plotted.some(p => p.id === selectedId) ? selectedId : plotted[0]?.id
  const start = Date.parse(plotted[0]?.date || '')
  const end = Date.parse(plotted.at(-1)?.date || '')
  const x = (p: Point) => left + (end === start ? .5 : (Date.parse(p.date) - start) / (end - start)) * (width - left - right)
  const y = (v: number) => top + (1 - (v - low) / (high - low || 1)) * (height - top - bottom)
  const path = plotted.map((p, index) => (index ? 'L ' : 'M ') + x(p) + ' ' + y(p.value)).join(' ')
  const secondaryPath = plotted.map((p, index) => {
    if (p.secondary === null) return ''
    const command = index > 0 && plotted[index - 1].secondary !== null ? 'L ' : 'M '
    return command + x(p) + ' ' + y(p.secondary)
  }).join(' ')
  async function remove(point: Point) {
    if (deleting || point.source !== 'Home' || !window.confirm('Delete this recorded reading?')) return
    setDeleting(point.id); setError('')
    try {
      const result = await deleteVitalLog(point.id, familyMemberId)
      if (!result.success) throw new Error(result.error || 'Reading could not be deleted.')
      setSelectedId(''); router.refresh()
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Deletion failed. Please retry.') }
    finally { setDeleting('') }
  }
  return <section className="space-y-5 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Dated measurement trends</h2>
      <LogVitalModal familyMemberId={familyMemberId} familyMemberName={familyMemberName} defaultType={selectedCategory === 'CHOLESTEROL' || selectedCategory === 'OTHER' ? 'BLOOD_GLUCOSE' : selectedCategory} /></div>
    <label className="block text-sm font-semibold">Measurement category
      <select value={selectedCategory} onChange={e => { setCategory(e.target.value); setSeries(''); setSelectedId('') }} className="block w-full mt-1 border rounded-lg p-3 text-base">
        {[...categories, ['OTHER', 'Other report measurements']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
    <label className="block text-sm font-semibold">Comparable measurement series
      <select value={active} onChange={e => { setSeries(e.target.value); setSelectedId('') }} className="block w-full mt-1 border rounded-lg p-3 text-base">
        {series.length ? series.map(([key, p]) => <option key={key} value={key}>{p.name} · {p.unit} · {p.context} · {p.source}</option>) : <option value="">No recorded series</option>}
      </select></label>
    <p className="text-sm text-muted-foreground">Series separate names, units, context and source. Change direction alone does not establish improvement or deterioration. Status comes from the recorded entry.</p>
    {error && <p role="alert" className="rounded-lg bg-rose-50 text-rose-900 p-3">{error}</p>}
    {latest && <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold">Latest exact numeric reading in this series</h3><p className="text-xl">{latest.raw} {latest.unit}</p><p className="text-sm">{recordedDate(latest.date)}</p></div>
      <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold">Change from previous exact reading</h3>
        <p className="text-xl">{previous ? (latest.value - previous.value > 0 ? '+' : '') + (latest.value - previous.value).toFixed(2) + ' ' + latest.unit : 'Not enough readings'}</p>
        {previous && <p className="text-sm">{recordedDate(previous.date)}</p>}</div>
    </div>}
    {omitted > 0 && <p role="status" className="text-sm">{omitted} entry/entries have a missing date or a non-exact numeric value (such as “&lt;5”). They remain in the table and are not plotted.</p>}
    <div ref={chartBox} className="min-w-0">
    {plotted.length ? <div className="rounded-xl border bg-white p-2 sm:p-4">
      <p id={id + '-description'} className="text-sm mb-2">Tap a point for details. Keyboard users: Tab to a point, then use Left/Right arrows. Dates and full values are also in the table.</p>
      <svg viewBox={'0 0 ' + width + ' ' + height} className="w-full h-auto" role="group" aria-labelledby={id + '-title'} aria-describedby={id + '-description'}>
        <title id={id + '-title'}>{familyMemberName}&apos;s {latest?.name} recorded trend</title>
        {[0, .5, 1].map(t => { const value = low + (high - low) * t; return <g key={t}>
          <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#d1e5de" />
          <text x={left - 8} y={y(value) + 5} textAnchor="end" fontSize={14} fill="#2f4858">{value.toFixed(1)}</text></g> })}
        <path d={path} fill="none" stroke="#2f4858" strokeWidth={2} />
        {secondaryPath && <path d={secondaryPath} fill="none" stroke="#92400e" strokeDasharray="4 4" strokeWidth={2} />}
        {plotted.map((p, index) => <g key={p.id} ref={element => { if (element) pointRefs.current.set(p.id, element); else pointRefs.current.delete(p.id) }}
          role="button" tabIndex={focusedPointId === p.id ? 0 : -1} aria-pressed={selectedId === p.id}
          aria-label={recordedDate(p.date) + ': ' + p.raw + ' ' + p.unit + ', ' + measurementPresentation(p.status).label}
          onClick={() => setSelectedId(p.id)} onFocus={() => setSelectedId(p.id)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(p.id) }
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault(); const next = plotted[Math.max(0, Math.min(plotted.length - 1, index + (e.key === 'ArrowRight' ? 1 : -1)))]
              setSelectedId(next.id); pointRefs.current.get(next.id)?.focus()
            }
          }} className="cursor-pointer">
          <circle cx={x(p)} cy={y(p.value)} r={14} fill="transparent" />
          <circle cx={x(p)} cy={y(p.value)} r={selectedId === p.id ? 7 : 5} fill={measurementPresentation(p.status).color} stroke="#fff" strokeWidth={2} />
        </g>)}
        <text x={left} y={height - 12} textAnchor="start" fontSize={14} fill="#2f4858">{new Date(plotted[0].date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</text>
        <text x={width - right} y={height - 12} textAnchor="end" fontSize={14} fill="#2f4858">{new Date(plotted.at(-1)!.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</text>
      </svg>
      {secondaryPath && <p className="text-sm">Solid line: primary value. Dashed line: secondary blood-pressure value.</p>}
      {selected && <p role="status" className={'rounded-lg border p-3 mt-3 text-sm ' + measurementPresentation(selected.status).className}>{recordedDate(selected.date)} · {selected.source} · {selected.context} · {selected.raw} {selected.unit} · {measurementPresentation(selected.status).label}</p>}
    </div> : <p className="rounded-xl border bg-white p-4">No exact dated measurements to plot in this series.</p>}
    </div>
    <div className="overflow-x-auto rounded-xl border bg-white" tabIndex={0} role="region" aria-label="Recorded measurement table">
      <table className="w-full text-sm text-left"><caption className="text-left font-bold p-3">Recorded entries for the selected series</caption>
        <thead><tr>{['Date', 'Value', 'Context and source', 'Recorded status', 'Actions'].map(label => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
        <tbody>{readings.slice().reverse().map(p => <tr key={p.id} className="border-t">
          <td className="p-3">{recordedDate(p.date)}</td><td className="p-3">{p.raw} {p.unit}</td><td className="p-3">{p.context} · {p.source}</td>
          <td className="p-3"><span className={'rounded-lg border p-1 ' + measurementPresentation(p.status).className}>{measurementPresentation(p.status).label}</span></td>
          <td className="p-3">{p.source === 'Home' ? <Button variant="outline" size="sm" disabled={!!deleting} onClick={() => remove(p)} aria-label={'Delete reading from ' + recordedDate(p.date)}>{deleting === p.id ? 'Deleting…' : 'Delete'}</Button> : 'Manage in Reports'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>
}
