'use client'
import { useState, useEffect, useRef, useId } from 'react'
import { Button } from './ui/button'
import { recordedDate } from '@/lib/utils/recordReadings'
import type { MemberRecord, MedicineRecord, ReportRecord, VitalRecord } from '@/lib/types/records'

interface Props { member: MemberRecord; medicines: MedicineRecord[]; medicalRecords: ReportRecord[]; vitalLogs: VitalRecord[] }
interface Summary {
  clinical_overview: string; vitality_status: string; ai_status?: string; generated_at?: string
  age_specific_alerts?: string[]; allergy_warnings?: string[]; biomarker_highlights?: string[]
  medication_evaluation?: string; vitals_trend_summary?: string; actionable_recommendations?: string[]; doctor_discussion_guide?: string[]
}
interface Chat { question: string; answer: string; flag: string; date: string }

export function AIHealthSummaryCard(props: Props) {
  // A changed record snapshot starts a fresh session and aborts the old requests.
  return <SummarySession key={JSON.stringify(props)} {...props} />
}
function SummarySession({ member }: Props) {
  const id = useId()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [pending, setPending] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [question, setQuestion] = useState('')
  const [chat, setChat] = useState<Chat[]>([])
  const [asking, setAsking] = useState(false)
  const [chatError, setChatError] = useState('')
  const summaryRequest = useRef<AbortController | null>(null)
  const chatRequest = useRef<AbortController | null>(null)
  useEffect(() => () => { summaryRequest.current?.abort(); chatRequest.current?.abort() }, [])
  async function generate() {
    if (summaryRequest.current) return
    const controller = new AbortController(); summaryRequest.current = controller
    setPending(true); setSummaryError('')
    try {
      const response = await fetch('/api/ai/health-summary', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyMemberId: member.id }) })
      const json = await response.json()
      if (controller.signal.aborted || summaryRequest.current !== controller) return
      if (!response.ok || !json.success || typeof json.data?.clinical_overview !== 'string') throw new Error(json.error || 'Summary unavailable. Please retry.')
      setSummary(json.data)
    } catch (error) {
      if (!controller.signal.aborted && summaryRequest.current === controller) setSummaryError(error instanceof Error ? error.message : 'Summary unavailable. Please retry.')
    } finally { if (summaryRequest.current === controller) { summaryRequest.current = null; setPending(false) } }
  }
  async function ask(event: React.FormEvent) {
    event.preventDefault()
    if (!question.trim() || chatRequest.current) return
    const text = question.trim()
    const controller = new AbortController(); chatRequest.current = controller
    setAsking(true); setChatError('')
    try {
      const response = await fetch('/api/agent/chat', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyMemberId: member.id, prompt: text }) })
      const json = await response.json()
      if (controller.signal.aborted || chatRequest.current !== controller) return
      if (!response.ok || !json.success || typeof json.data?.response !== 'string') throw new Error(json.error || 'Answer unavailable. Please retry.')
      setChat(previous => [...previous, { question: text, answer: json.data.response, flag: json.data.safety_flag || 'UNKNOWN', date: new Date().toISOString() }])
      setQuestion('')
    } catch (error) {
      if (!controller.signal.aborted && chatRequest.current === controller) setChatError(error instanceof Error ? error.message : 'Answer unavailable. Please retry.')
    } finally { if (chatRequest.current === controller) { chatRequest.current = null; setAsking(false) } }
  }
  function cancelSummary() { summaryRequest.current?.abort(); summaryRequest.current = null; setPending(false) }
  function cancelChat() { chatRequest.current?.abort(); chatRequest.current = null; setAsking(false) }
  function list(title: string, items?: string[], warning = false) {
    if (!items?.length) return null
    return <section className={'rounded-xl border p-4 space-y-2 ' + (warning ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-white')}>
      <h3 className="text-lg font-bold">{title}</h3><ul className="list-disc pl-5 space-y-2">{items.map((item, i) => <li key={i} className="break-words">{item}</li>)}</ul>
    </section>
  }
  return <div className="space-y-6">
    <section className="rounded-2xl border bg-white p-5 space-y-4">
      <h2 className="text-xl font-bold">Review records with AI</h2>
      <p className="text-base text-muted-foreground">Summarize {member.full_name}&apos;s dated records and cabinet items. AI output requires clinical review and does not verify medication safety.</p>
      <div className="flex flex-wrap gap-2"><Button onClick={generate} disabled={pending}>{pending ? 'Preparing summary…' : summary ? 'Refresh record summary' : 'Generate record summary'}</Button>
        {pending && <Button variant="outline" onClick={cancelSummary}>Cancel summary</Button>}</div>
      {pending && <p role="status">Preparing the record summary…</p>}
      {summaryError && <p role="alert" className="text-rose-900 bg-rose-50 rounded-lg p-3">{summaryError}</p>}
      {!summary && !pending && <p className="text-sm">Generate a summary when you are ready, or ask a question below. Your original records remain in the other tabs.</p>}
      {summary && <div className="space-y-4">
        <div className="rounded-lg bg-slate-100 p-3 space-y-1">
          <p className="font-semibold">Record review: {summary.vitality_status === 'ATTENTION_REQUIRED' ? 'Review recorded warnings' : summary.vitality_status === 'MODERATE_ATTENTION' ? 'Follow up on recorded flags' : 'Overall health unassessed'}</p>
          <p className="text-sm">{summary.ai_status === 'UNAVAILABLE' ? 'AI unavailable; displaying recorded information.' : 'Generated summary — needs review.'}</p>
          <p className="text-sm">Generated: {recordedDate(summary.generated_at)}. Medication safety is not verified.</p>
        </div>
        {list('Recorded allergy warnings', summary.allergy_warnings, true)}
        {list('Age-related review warnings', summary.age_specific_alerts, true)}
        <section><h3 className="text-lg font-bold mb-2">Record overview</h3><p className="whitespace-pre-wrap break-words">{summary.clinical_overview}</p></section>
        {list('Recorded laboratory measurements', summary.biomarker_highlights)}
        {summary.medication_evaluation && <section><h3 className="text-lg font-bold mb-2">Cabinet context</h3><p>{summary.medication_evaluation}</p></section>}
        {summary.vitals_trend_summary && <section><h3 className="text-lg font-bold mb-2">Home reading context</h3><p className="break-words">{summary.vitals_trend_summary}</p></section>}
        {list('Points to review', summary.actionable_recommendations)}
        {list('Questions for your clinician', summary.doctor_discussion_guide)}
      </div>}
    </section>
    <section className="rounded-2xl border bg-white p-5 space-y-4">
      <h2 className="text-xl font-bold">Ask about these records</h2>
      <p className="text-sm text-muted-foreground">Answers are educational, may be incomplete, and cannot establish a diagnosis or medicine clearance.</p>
      {chat.length > 0 && <ol className="space-y-4" aria-label="Questions and answers">{chat.map((item, index) => <li key={index} className="space-y-2 border-t pt-4">
        <h3 className="font-semibold break-words">{item.question}</h3><p className="whitespace-pre-wrap break-words">{item.answer}</p>
        <p className="rounded-lg border bg-slate-100 text-slate-800 p-2 text-sm">Response flag: {item.flag}. No clinical safety clearance is issued. {recordedDate(item.date)}</p>
      </li>)}</ol>}
      {chatError && <p role="alert" className="text-rose-900 bg-rose-50 rounded-lg p-3">{chatError}</p>}
      <form onSubmit={ask} className="space-y-3">
        <label htmlFor={id + '-question'} className="block font-semibold text-sm">Your question for {member.full_name}</label>
        <textarea id={id + '-question'} value={question} onChange={e => setQuestion(e.target.value)} maxLength={8000} disabled={asking} required rows={3}
          className="w-full border rounded-lg p-3 text-base" placeholder="For example: Which dated results should I discuss with my clinician?" />
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={asking || !question.trim()}>{asking ? 'Preparing answer…' : 'Ask about records'}</Button>
          {asking && <Button type="button" variant="outline" onClick={cancelChat}>Cancel answer</Button>}</div>
      </form>
      {asking && <p role="status">Preparing an answer…</p>}
    </section>
  </div>
}
