'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { createMedicalRecord } from '@/app/actions/medicalRecords'
import { compressImageForVision } from '@/lib/utils/imageCompressor'
import { measurementPresentation } from '@/lib/utils/statusPresentation'

interface Props {
  familyMemberId?: string
  familyMemberName?: string
  familyMembers?: Array<{ id: string; full_name: string; relationship?: string | null }>
  trigger?: React.ReactElement
  onSuccess?: () => void
}
interface Biomarker { name: string; value: string; unit: string; status: string; reference_range: string }
interface Draft {
  title: string; record_type: string; diagnosis: string; test_date: string
  doctor_name: string; hospital_clinic: string; summary: string
}
const categories = ['LAB_REPORT', 'DIAGNOSIS', 'PRESCRIPTION', 'IMAGING', 'DOCTOR_CONSULT', 'DISCHARGE_SUMMARY']
const emptyDraft = (): Draft => ({ title: '', record_type: '', diagnosis: '', test_date: '', doctor_name: '', hospital_clinic: '', summary: '' })
const controlClass = 'w-full min-w-0 rounded-lg border border-input bg-white px-3 py-2 text-base'
function message(error: unknown) { return error instanceof Error ? error.message : 'Please retry.' }

export function AddMedicalRecordModal(props: Props) {
  return <RecordDraft key={props.familyMemberId || 'select-member'} {...props} />
}

function RecordDraft({ familyMemberId, familyMemberName, familyMembers = [], trigger, onSuccess }: Props) {
  const router = useRouter()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState(familyMemberId || '')
  const memberId = familyMemberId || selectedMemberId
  const memberName = familyMemberName || familyMembers.find(m => m.id === memberId)?.full_name || 'a family member'
  const validMember = !!memberId && (!!familyMemberId || familyMembers.some(m => m.id === memberId))
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([])
  const [analysis, setAnalysis] = useState<Record<string, unknown>>({})
  const [file, setFile] = useState<File | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const version = useRef(0)
  const scan = useRef<AbortController | null>(null)
  const saving = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const busy = isScanning || isSaving
  useEffect(() => () => { scan.current?.abort(); version.current++ }, [])

  function clearDraft() {
    version.current++
    scan.current?.abort()
    setDraft(emptyDraft()); setBiomarkers([]); setAnalysis({}); setFile(null); setNotice(''); setError('')
    if (input.current) input.current.value = ''
  }
  function hasDraft() { return !!file || Object.values(draft).some(Boolean) || biomarkers.length > 0 }
  function selectFile(next?: File) {
    if (!next || busy || saving.current) return
    if (next.size > 10_000_000 || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(next.type)) {
      setError('Choose a PDF, JPG, PNG or WEBP file up to 10 MB.'); return
    }
    if (hasDraft() && !window.confirm('Replace this draft? Selecting a new file clears its current fields and extracted results.')) return
    clearDraft(); setFile(next)
  }
  function changeMember(next: string) {
    if (busy || saving.current) return
    if (hasDraft() && !window.confirm('Changing the family member clears this unsaved report draft. Continue?')) return
    clearDraft(); setSelectedMemberId(next)
  }
  async function extract() {
    if (busy || saving.current || !validMember || (!file && !draft.summary.trim())) return
    const request = new AbortController()
    scan.current?.abort(); scan.current = request
    const requestVersion = version.current
    setIsScanning(true); setError(''); setNotice('')
    try {
      const compressed = file ? await compressImageForVision(file, 1600, 1600, 0.82) : null
      if (request.signal.aborted) return
      const response = await fetch('/api/ai/analyze-report', {
        method: 'POST', signal: request.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: compressed?.fileBase64.replace(/^data:[^;]+;base64,/, ''), mimeType: compressed?.mimeType, notes: draft.summary || undefined, patientName: memberName }),
      })
      const json = await response.json()
      if (request.signal.aborted || requestVersion !== version.current) return
      if (!response.ok || !json.success || !json.data) throw new Error(json.error || 'Report extraction unavailable. You can enter the details manually.')
      const extracted = json.data as Record<string, unknown>
      // Fill only blank fields; user-entered content is never silently replaced.
      setDraft(previous => {
        const next = { ...previous }
        for (const key of Object.keys(next) as Array<keyof Draft>) {
          if (!previous[key] && typeof extracted[key] === 'string') next[key] = extracted[key] as string
        }
        if (!categories.includes(next.record_type)) next.record_type = 'LAB_REPORT'
        return next
      })
      if (!biomarkers.length && Array.isArray(extracted.biomarkers)) {
        setBiomarkers(extracted.biomarkers.map((b: Record<string, unknown>) => ({
          name: String(b.name || ''), value: String(b.value ?? ''), unit: String(b.unit || ''), reference_range: String(b.reference_range || ''),
          status: ['NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'CRITICAL'].includes(String(b.status)) ? String(b.status) : 'UNKNOWN',
        })))
      }
      setAnalysis(extracted)
      setNotice('Extraction complete. Review the patient, dates, values and statuses before saving. Existing fields were preserved.')
    } catch (failure) {
      if (!request.signal.aborted && requestVersion === version.current) setError(message(failure))
    } finally {
      if (scan.current === request) { scan.current = null; setIsScanning(false) }
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy || saving.current) return
    if (!validMember || !draft.title.trim() || !categories.includes(draft.record_type)) { setError('Select a family member, enter a report title and choose its category.'); return }
    saving.current = true; setIsSaving(true); setError('')
    let uploaded: string | null = null
    try {
      if (file) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Please sign in again.')
        const path = user.id + '/' + memberId + '/' + crypto.randomUUID() + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const upload = await supabase.storage.from('medical_reports').upload(path, file, { upsert: false })
        if (upload.error) throw new Error('File upload failed. Please retry.')
        uploaded = upload.data.path
      }
      const result = await createMedicalRecord({
        ...draft, title: draft.title.trim(), test_date: draft.test_date || undefined, family_member_id: memberId,
        biomarkers, ai_analysis: analysis, file_url: uploaded || undefined, file_name: file?.name, file_type: file?.type,
      })
      if (!result.success) throw new Error(result.error || 'Report could not be saved.')
      clearDraft(); setOpen(false); router.refresh(); onSuccess?.()
    } catch (failure) {
      if (uploaded) {
        try { await createClient().storage.from('medical_reports').remove([uploaded]) } catch { /* Report save error remains visible. */ }
      }
      setError(message(failure))
    } finally { saving.current = false; setIsSaving(false) }
  }
  function setOpenState(next: boolean) {
    if (saving.current) return
    if (!next) { version.current++; scan.current?.abort(); scan.current = null; setIsScanning(false) }
    setOpen(next)
  }
  function field(key: keyof Draft, label: string, type = 'text') {
    return <div className="space-y-1" key={key}>
      <label htmlFor={id + '-' + key} className="text-sm font-semibold">{label}</label>
      <input id={id + '-' + key} name={key} type={type} required={key === 'title'} value={draft[key]}
        onChange={e => { version.current++; setDraft({ ...draft, [key]: e.target.value }) }} className={controlClass} />
    </div>
  }
  return <Dialog open={open} onOpenChange={setOpenState}>
    <DialogTrigger render={trigger || <Button size="sm">Add report</Button>} />
    <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader><DialogTitle>Add report for {memberName}</DialogTitle>
        <p className="text-sm text-muted-foreground">Upload a document or enter its details. AI extraction is optional and needs your review.</p></DialogHeader>
      {error && <p id={id + '-error'} role="alert" className="rounded-lg bg-rose-50 text-rose-900 p-3">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-slate-100 text-slate-800 p-3 text-sm">{notice}</p>}
      <form onSubmit={save} aria-describedby={error ? id + '-error' : undefined}>
        <fieldset disabled={busy} className="space-y-5 min-w-0">
          {!familyMemberId && <div className="space-y-1">
            <label htmlFor={id + '-member'} className="font-semibold text-sm">Family member</label>
            <select id={id + '-member'} required value={selectedMemberId} onChange={e => changeMember(e.target.value)} className={controlClass}>
              <option value="">Select a family member</option>{familyMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>}
          {!familyMemberId && !familyMembers.length && <p>Add a family profile before saving a report.</p>}
          <section onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); selectFile(e.dataTransfer.files[0]) }}
            className="rounded-xl border-2 border-dashed p-4 space-y-3 min-w-0">
            <label htmlFor={id + '-file'} className="block text-sm font-semibold">Report document (optional)</label>
            <p id={id + '-file-help'} className="text-sm text-muted-foreground">Choose or drop one PDF, JPG, PNG or WEBP file, up to 10 MB.</p>
            <input id={id + '-file'} ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" aria-describedby={id + '-file-help'}
              onChange={e => selectFile(e.target.files?.[0])} className="block w-full min-w-0 text-sm" />
            {file && <div className="flex flex-wrap items-center gap-3"><span className="break-all text-sm">{file.name}</span>
              <Button type="button" variant="outline" onClick={() => { if (!hasDraft() || window.confirm('Remove this file and clear its draft?')) clearDraft() }}>Remove file</Button></div>}
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('title', 'Report title *')}
            <div className="space-y-1"><label htmlFor={id + '-category'} className="text-sm font-semibold">Record category</label>
              <select id={id + '-category'} required value={draft.record_type} onChange={e => { version.current++; setDraft({ ...draft, record_type: e.target.value }) }} className={controlClass}>
                <option value="">Select a record category</option>
                {categories.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}</select></div>
            {field('test_date', 'Date of report', 'date')}{field('doctor_name', 'Doctor')}{field('hospital_clinic', 'Hospital or lab')}{field('diagnosis', 'Recorded diagnosis or findings')}
          </div>
          <div className="space-y-1"><label htmlFor={id + '-summary'} className="text-sm font-semibold">Report notes or summary</label>
            <textarea id={id + '-summary'} rows={4} value={draft.summary} onChange={e => { version.current++; setDraft({ ...draft, summary: e.target.value }) }} className={controlClass} /></div>
          <p className="text-sm text-muted-foreground">Scan fills blank fields. Review extracted values against the original; it does not verify a diagnosis.</p>
          <Button type="button" variant="outline" onClick={extract} disabled={!validMember || (!file && !draft.summary.trim())}>Extract blank fields with AI</Button>
          <section className="space-y-3"><h2 className="text-lg font-bold">Recorded measurements</h2>
            <Button type="button" variant="outline" onClick={() => { version.current++; setBiomarkers([...biomarkers, { name: '', value: '', unit: '', reference_range: '', status: 'UNKNOWN' }]) }}>Add measurement</Button>
            {biomarkers.map((b, index) => <fieldset key={index} className="rounded-xl border p-3 min-w-0">
              <legend className="px-1 text-sm font-semibold">Measurement {index + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['name', 'value', 'unit', 'reference_range'] as const).map(key => <label key={key} className="text-sm space-y-1">
                  <span className="block">{key === 'name' ? 'Test name' : key === 'reference_range' ? 'Report reference range' : key === 'unit' ? 'Unit' : 'Value'}</span>
                  <input value={b[key]} required={key === 'name' || key === 'value'} className={controlClass}
                    onChange={e => { version.current++; setBiomarkers(biomarkers.map((row, i) => i === index ? { ...row, [key]: e.target.value } : row)) }} />
                </label>)}
                <label className="text-sm space-y-1"><span className="block">Status recorded on report</span>
                  <select value={b.status} className={controlClass + ' ' + measurementPresentation(b.status).className}
                    onChange={e => { version.current++; setBiomarkers(biomarkers.map((row, i) => i === index ? { ...row, status: e.target.value } : row)) }}>
                    {['UNKNOWN', 'NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'CRITICAL'].map(s => <option key={s} value={s}>{measurementPresentation(s).label}</option>)}
                  </select></label>
              </div>
              <Button type="button" variant="outline" className="mt-3" onClick={() => { version.current++; setBiomarkers(biomarkers.filter((_, i) => i !== index)) }}>Remove measurement {index + 1}</Button>
            </fieldset>)}
          </section>
          <Button type="submit" disabled={!validMember}>Save reviewed report</Button>
        </fieldset>
      </form>
      {busy && <p role="status">{isSaving ? 'Saving your report…' : 'Extracting report details…'}</p>}
      <Button type="button" variant="outline" disabled={isSaving} onClick={() => setOpenState(false)}>{isScanning ? 'Cancel extraction and close' : 'Close'}</Button>
    </DialogContent>
  </Dialog>
}
