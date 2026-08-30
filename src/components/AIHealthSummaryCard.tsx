'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  HeartPulse,
  Pill,
  Calendar,
  User,
  Stethoscope,
  Send,
  Loader2,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  Info,
  ChevronRight,
  Brain,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { calculateAge, type AgeInfo } from '@/lib/utils/ageCalculator'

interface AIHealthSummaryCardProps {
  member: any
  medicines: any[]
  medicalRecords: any[]
  vitalLogs: any[]
}

interface ChatMessage {
  q: string
  a: string
  recalledMemoriesCount?: number
  safetyFlag?: string
  time: string
}

export function AIHealthSummaryCard({
  member,
  medicines,
  medicalRecords,
  vitalLogs,
}: AIHealthSummaryCardProps) {
  const [summary, setSummary] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  const ageInfo = calculateAge(member.date_of_birth || member.birth_date)

  const generateSummary = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/health-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member,
          medicines,
          medicalRecords,
          vitalLogs,
        }),
      })

      const json = await res.json()

      if (json.success && json.data) {
        setSummary(json.data)
      } else {
        setError(json.error || 'Failed to generate AI health analysis')
      }
    } catch (err: any) {
      console.error('Failed to generate summary:', err)
      setError(err.message || 'Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Ask Question powered by Supabase-backed ADK Multi-Agent System
  const handleAskAgent = async (questionText: string) => {
    if (!questionText.trim()) return
    setIsAsking(true)
    setError(null)

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: questionText,
          familyMemberId: member.id,
          patientName: member.full_name,
          activeMedicines: medicines,
          diagnosticRecords: medicalRecords,
        }),
      })

      const json = await res.json()

      if (json.success && json.data) {
        setChatHistory((prev) => [
          ...prev,
          {
            q: questionText,
            a: json.data.response,
            recalledMemoriesCount: json.data.recalled_memories_count || 0,
            safetyFlag: json.data.safety_flag || 'SAFE',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        setQuery('')
      } else {
        setError(json.error || 'Agent consultation error')
      }
    } catch (err: any) {
      console.error('Agent chat error:', err)
      setError(err.message || 'Failed to connect to clinical agent')
    } finally {
      setIsAsking(false)
    }
  }

  // Automatically fetch initial synthesis on mount
  useEffect(() => {
    generateSummary()
  }, [member.id, medicines.length, medicalRecords.length, vitalLogs.length])

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isAsking) return
    handleAskAgent(query.trim())
  }

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
                  <span>Google ADK Multi-Agent</span>
                </Badge>
              </div>
              <CardDescription className="text-xs text-[#2F4858]/70 font-semibold mt-0.5">
                Longitudinal analysis of age, active medications, lab biomarkers, and Supabase clinical memory.
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
            <span>Refresh Health Synthesis</span>
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="size-8 animate-spin text-[#2F4858]" />
            <div className="space-y-1">
              <p className="text-sm font-extrabold text-[#2F4858]">
                Synthesizing {member.full_name}'s Complete Medical Profile...
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
                    Vitality Index
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-[#2F4858]">{summary.vitality_score || 88}</span>
                    <span className="text-xs text-[#2F4858]/50 font-bold">/ 100</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {summary.vitality_score >= 80 ? 'Optimal Status' : 'Attention Required'}
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
                    {summary.age_specific_alerts?.length > 0 ? 'Safety Warnings' : 'All Clear'}
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {summary.age_specific_alerts?.length > 0 ? 'Review Warnings Below' : 'No Critical Clashes'}
                  </span>
                </div>
                <div
                  className={`size-11 rounded-2xl flex items-center justify-center ${
                    summary.age_specific_alerts?.length > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[#DDFBEF] text-[#2F4858]'
                  }`}
                >
                  {summary.age_specific_alerts?.length > 0 ? (
                    <AlertTriangle className="size-6" />
                  ) : (
                    <ShieldCheck className="size-6" />
                  )}
                </div>
              </div>
            </div>

            {/* Age-Specific Safety Alerts */}
            {summary.age_specific_alerts?.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-200 space-y-2">
                <div className="flex items-center gap-2 text-rose-900 text-xs font-black uppercase tracking-wide">
                  <ShieldAlert className="size-4 text-rose-600" />
                  <span>Age-Specific Clinical Safety Warnings</span>
                </div>
                <ul className="space-y-1.5 text-xs font-bold text-rose-900">
                  {summary.age_specific_alerts.map((alert: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-600">•</span>
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Executive Synthesis Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#2F4858]/10 shadow-xs space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                <Activity className="size-4 text-[#2F4858]" />
                <span>Executive Health Synthesis</span>
              </span>
              <p className="text-xs sm:text-sm font-semibold text-[#2F4858] leading-relaxed">
                {summary.executive_summary}
              </p>
            </div>

            {/* Out of Range Biomarkers & Concerns */}
            {summary.out_of_range_biomarkers?.length > 0 && (
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
                  {summary.out_of_range_biomarkers.map((b: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#F8FDFB] border border-[#2F4858]/15 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-black text-[#2F4858]">
                        <span>{b.name || b.biomarker}</span>
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
            {summary.proactive_recommendations?.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#DDFBEF]/50 border border-[#B7EED8] space-y-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-[#2F4858]" />
                  <span>Proactive Health Recommendations</span>
                </span>
                <div className="space-y-1.5">
                  {summary.proactive_recommendations.map((rec: string, i: number) => (
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
            {summary.doctor_discussion_guide?.length > 0 && (
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
                  {summary.doctor_discussion_guide.map((q: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-black text-amber-700">Q{i + 1}:</span>
                      <span className="leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interactive "Ask AI Clinical Agent" Box with Supabase Memory */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#2F4858]/15 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                  <Brain className="size-4 text-[#2F4858]" />
                  <span>Ask AI Clinical Agent (With Supabase Memory)</span>
                </span>
                <span className="text-[10px] font-bold text-[#2F4858]/60">
                  Longitudinal Patient Memory
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
                            <span>FamilyHealthGuardianAgent</span>
                          </div>
                          {item.recalledMemoriesCount !== undefined && item.recalledMemoriesCount > 0 && (
                            <Badge className="bg-[#DDFBEF] text-[#2F4858] border border-[#B7EED8] text-[9px] font-black px-1.5 py-0 flex items-center gap-1">
                              <Brain className="size-2.5" />
                              <span>{item.recalledMemoriesCount} Supabase Memory(s) Referenced</span>
                            </Badge>
                          )}
                        </div>
                        <div className="whitespace-pre-line text-xs font-medium text-[#2F4858]">
                          {item.a}
                        </div>
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
                    type="button"
                    onClick={() => {
                      setQuery(promptText)
                      handleAskAgent(promptText)
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#DDFBEF]/60 text-[#2F4858] hover:bg-[#DDFBEF] border border-[#B7EED8] transition-colors cursor-pointer text-left"
                  >
                    💬 {promptText}
                  </button>
                ))}
              </div>

              {/* Query Input Bar */}
              <form onSubmit={handleAskQuestion} className="flex items-center gap-2 pt-1">
                <Input
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
                  <span className="hidden sm:inline">Ask Agent</span>
                </Button>
              </form>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
