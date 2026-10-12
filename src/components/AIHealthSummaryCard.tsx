'use client'

import { useState, useEffect, useRef, useId } from 'react';
import { Sparkles, ShieldAlert, ShieldCheck, Activity, AlertTriangle, HeartPulse, User, Stethoscope, Send, Loader2, RefreshCw, CheckCircle2, ChevronRight, Brain } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calculateAge } from '@/lib/utils/ageCalculator';

import type { MemberRecord, MedicineRecord, ReportRecord, VitalRecord } from '@/lib/types/records';
import { recordedDate } from '@/lib/utils/recordReadings';
interface Props { member: MemberRecord; medicines: MedicineRecord[]; medicalRecords: ReportRecord[]; vitalLogs: VitalRecord[] }
interface Summary {
  out_of_range_biomarkers?: { name: string; value: string | number; unit?: string; reference_range?: string; status?: string; clinical_meaning?: string }[]; clinical_overview: string; vitality_status: string; ai_status?: string; generated_at?: string
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
  const ageInfo = calculateAge(member.date_of_birth || member.birth_date)
  const isLoading = pending, isAsking = asking, query = question, setQuery = setQuestion
  const generateSummary = generate, handleAskQuestion = ask
  const chatHistory = chat.map(item => ({q:item.question,a:item.answer,safetyFlag:item.flag,time:recordedDate(item.date)}))
  return (
    <div className="space-y-5">
      {/* Top AI Health Guardian Banner */}
      <Card className="bg-gradient-to-br from-white via-[#F8FDFB] to-[#DDFBEF]/30 border border-[#2F4858]/15 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2F4858]/10">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="size-6 text-[#DDFBEF] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg sm:text-xl font-black text-[#2F4858]">
                  AI Clinical Health Guardian & Synthesis
                </CardTitle>
                <Badge className="bg-[#2F4858] text-[#DDFBEF] text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Brain className="size-3 text-[#DDFBEF]" />
                  <span>AI Record Review</span>
                </Badge>
              </div>
              <CardDescription className="text-xs text-[#2F4858]/70 font-semibold mt-0.5">
                Review dated records, cabinet medicines and recorded clinical history. AI output requires clinical review.
              </CardDescription>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => generateSummary()}
            disabled={isLoading}
            className="rounded-xl border-[#2F4858]/20 bg-white hover:bg-white/80 text-[#2F4858] text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 self-start md:self-auto h-9"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{summary ? 'Refresh Health Synthesis' : 'Generate Health Synthesis'}</span>
          </Button>
        </div>

        {summaryError && <p role="alert" className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-900">{summaryError}</p>}
        {pending && <Button variant="outline" onClick={cancelSummary}>Cancel summary</Button>}
        {!summary && !pending && <p className="mt-4 text-sm">Generate a summary when you are ready, or ask a question below.</p>}
        {summary && <p className="mt-4 text-xs">{summary.ai_status === 'UNAVAILABLE' ? 'AI unavailable; displaying recorded information.' : 'Generated summary — needs review.'} Generated: {recordedDate(summary.generated_at)}</p>}


        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="size-8 animate-spin text-[#2F4858]" />
            <div className="space-y-1">
              <p className="text-sm font-extrabold text-[#2F4858]">
                Synthesizing {member.full_name}&apos;s Complete Medical Profile...
              </p>
              <p className="text-xs text-[#2F4858]/60 font-medium">
                Evaluating age-specific safety, active salts, lab biomarker ranges, and clinical memories.
              </p>
            </div>
          </div>
        ) : summary ? (
          <div className="mt-5 space-y-6">
            {/* Top Score & Life-Stage Hero Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Vitality Score */}
              <div className="p-4 rounded-2xl bg-white border border-[#2F4858]/10 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#2F4858]/60 tracking-wider">
                    Record Review
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-[#2F4858]">{summary.vitality_status === 'ATTENTION_REQUIRED' ? 'Review needed' : 'Unassessed'}</span>
                    <span className="text-xs text-[#2F4858]/50 font-bold"></span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">
                    No validated wellness score
                  </span>
                </div>
                <div className="size-11 rounded-2xl bg-[#DDFBEF] flex items-center justify-center text-[#2F4858]">
                  <HeartPulse className="size-6" />
                </div>
              </div>

              {/* Life-Stage Context */}
              <div className="p-4 rounded-2xl bg-white border border-[#2F4858]/10 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#2F4858]/60 tracking-wider">
                    Age & Life-Stage
                  </span>
                  <div className="text-base font-black text-[#2F4858] mt-0.5">
                    {ageInfo ? ageInfo.formatted : 'Not Set'}
                  </div>
                  <span className="text-[11px] font-bold text-[#2F4858]/70">
                    {ageInfo ? ageInfo.lifeStageLabel : 'Add birthdate'}
                  </span>
                </div>
                <div className="size-11 rounded-2xl bg-[#DDFBEF] flex items-center justify-center text-[#2F4858]">
                  <User className="size-6" />
                </div>
              </div>

              {/* Safety Status */}
              <div className="p-4 rounded-2xl bg-white border border-[#2F4858]/10 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#2F4858]/60 tracking-wider">
                    Medication Safety
                  </span>
                  <div className="text-base font-black text-[#2F4858] mt-0.5">
                    {(summary.age_specific_alerts?.length || 0) > 0 ? 'Safety Warnings' : 'Not verified'}
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {(summary.age_specific_alerts?.length || 0) > 0 ? 'Review Warnings Below' : 'Requires clinical review'}
                  </span>
                </div>
                <div
                  className={`size-11 rounded-2xl flex items-center justify-center ${
                    (summary.age_specific_alerts?.length || 0) > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[#DDFBEF] text-[#2F4858]'
                  }`}
                >
                  {(summary.age_specific_alerts?.length || 0) > 0 ? (
                    <AlertTriangle className="size-6" />
                  ) : (
                    <ShieldCheck className="size-6" />
                  )}
                </div>
              </div>
            </div>

            {/* Age-Specific Safety Alerts */}
            {(summary.age_specific_alerts?.length || 0) > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-200 space-y-2">
                <div className="flex items-center gap-2 text-rose-900 text-xs font-black uppercase tracking-wide">
                  <ShieldAlert className="size-4 text-rose-600" />
                  <span>Age-Specific Clinical Safety Warnings</span>
                </div>
                <ul className="space-y-1.5 text-xs font-bold text-rose-900">
                  {summary.age_specific_alerts?.map((alert: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-600">•</span>
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!summary.allergy_warnings?.length && <div role="status" className="p-4 rounded-2xl border border-amber-300 bg-amber-50"><h3 className="font-bold text-sm">Recorded allergy warnings</h3>{summary.allergy_warnings.map((warning,i)=><p key={i} className="text-sm">{warning}</p>)}</div>}
            {/* Executive Synthesis Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#2F4858]/10 shadow-xs space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                <Activity className="size-4 text-[#2F4858]" />
                <span>Executive Health Synthesis</span>
              </span>
              <p className="text-xs sm:text-sm font-semibold text-[#2F4858] leading-relaxed">
                {summary.clinical_overview}
              </p>
            </div>

            {/* Out of Range Biomarkers & Concerns */}
            {(summary.out_of_range_biomarkers?.length || 0) > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#2F4858]/10 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                    <HeartPulse className="size-4 text-rose-600" />
                    <span>Out-of-Range Biomarkers & Clinical Trends</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-rose-50 text-rose-800 border-rose-200">
                    Needs Attention
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {summary.out_of_range_biomarkers?.map((b, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#F8FDFB] border border-[#2F4858]/15 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-black text-[#2F4858]">
                        <span>{b.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-black uppercase px-1.5 py-0 ${
                            b.status === 'CRITICAL'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {b.status || 'ABNORMAL'}
                        </Badge>
                      </div>
                      <div className="flex items-baseline gap-2 font-bold text-[#2F4858]/80 text-[11px]">
                        <span>
                          Value: {b.value} {b.unit}
                        </span>
                        {b.reference_range && (
                          <span className="text-[#2F4858]/50 text-[10px]">Ref: {b.reference_range}</span>
                        )}
                      </div>
                      {b.clinical_meaning && (
                        <p className="text-[11px] font-medium text-[#2F4858]/70 pt-0.5">
                          {b.clinical_meaning}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proactive Recommendations */}
            {(summary.actionable_recommendations?.length || 0) > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#DDFBEF]/50 border border-[#B7EED8] space-y-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-[#2F4858]" />
                  <span>Proactive Health Recommendations</span>
                </span>
                <div className="space-y-1.5">
                  {summary.actionable_recommendations?.map((rec: string, i: number) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-white border border-[#2F4858]/10 flex items-start gap-2 text-xs font-bold text-[#2F4858] shadow-xs"
                    >
                      <ChevronRight className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions to Ask Doctor at Next Checkup */}
            {(summary.doctor_discussion_guide?.length || 0) > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Stethoscope className="size-4 text-amber-700" />
                    <span>Doctor Discussion Guide (For Next Appointment)</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-white text-amber-900 border-amber-300">
                    Physician Talking Points
                  </Badge>
                </div>
                <ul className="space-y-1.5 text-xs font-semibold text-amber-950">
                  {summary.doctor_discussion_guide?.map((q: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-black text-amber-700">Q{i + 1}:</span>
                      <span className="leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        ) : null}
      </Card>
            {/* Interactive "Ask AI Clinical Agent" Box with Supabase Memory */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#2F4858]/15 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                  <Brain className="size-4 text-[#2F4858]" />
                  <span>Ask AI Clinical Agent</span>
                </span>
                <span className="text-[10px] font-bold text-[#2F4858]/60">
                  Dated records & recorded history
                </span>
              </div>

              {/* Chat QA History */}
              {chatHistory.length > 0 && (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {chatHistory.map((item, idx) => (
                    <div key={idx} className="space-y-1.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#2F4858] text-[#DDFBEF] font-bold flex items-start gap-2">
                        <User className="size-3.5 shrink-0 mt-0.5 text-[#DDFBEF]" />
                        <span>{item.q}</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#F8FDFB] border border-[#2F4858]/15 font-semibold text-[#2F4858] leading-relaxed space-y-2">
                        <div className="flex items-center justify-between border-b border-[#2F4858]/10 pb-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-800">
                            <Sparkles className="size-3.5 text-emerald-600" />
                            <span>AI record assistant</span>
                          </div>
                          <span className="text-[10px] text-[#2F4858]/60">{item.time}</span>
                        </div>
                        <div className="whitespace-pre-line text-xs font-medium text-[#2F4858]">
                          {item.a}
                        </div>
                        <p className="text-[10px] text-[#2F4858]/70">{item.safetyFlag === 'NONE' ? 'No safety clearance issued.' : `Review flag: ${item.safetyFlag.replaceAll('_', ' ')}. No safety clearance issued.`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Preset Query Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  `What issues did ${member.full_name.split(' ')[0]} have in past reports?`,
                  `Are ${member.full_name.split(' ')[0]}'s medicines safe for their age?`,
                  `Explain ${member.full_name.split(' ')[0]}'s out-of-range lab markers`,
                  `What dietary steps should ${member.full_name.split(' ')[0]} follow?`,
                ].map((promptText, i) => (
                  <button
                    key={i}
                    type="button" disabled={asking}
                    onClick={() => {
                      setQuery(promptText)
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#DDFBEF]/60 text-[#2F4858] hover:bg-[#DDFBEF] border border-[#B7EED8] transition-colors cursor-pointer text-left"
                  >
                    💬 {promptText}
                  </button>
                ))}
              </div>

              {/* Query Input Bar */}
              {chatError && <p role="alert" className="text-rose-900 bg-rose-50 p-3 rounded-xl">{chatError}</p>}
              <form onSubmit={handleAskQuestion} className="flex items-center gap-2 pt-1">
                <Input aria-label={"Your question for " + member.full_name} id={id + "-question"} maxLength={8000}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Ask anything about ${member.full_name}'s health, memories, medicines, or reports...`}
                  className="h-10 rounded-xl border-[#2F4858]/20 bg-[#F8FDFB] text-xs font-semibold text-[#2F4858] flex-1"
                />
                <Button
                  type="submit"
                  disabled={isAsking || !query.trim()}
                  className="h-10 px-4 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] text-xs font-extrabold cursor-pointer shadow-sm disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                >
                  {isAsking ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  <span>Ask Agent</span>
                </Button>
              </form>{asking && <Button variant="outline" onClick={cancelChat}>Cancel answer</Button>}
            </div>

    </div>
  )
}
