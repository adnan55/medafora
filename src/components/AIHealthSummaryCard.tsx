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
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string; time: string }>>([])
  const [error, setError] = useState<string | null>(null)

  const ageInfo = calculateAge(member.date_of_birth || member.birth_date)

  const generateSummary = async (customQuestion?: string) => {
    if (customQuestion) {
      setIsAsking(true)
    } else {
      setIsLoading(true)
    }
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
          customQuery: customQuestion || undefined,
        }),
      })

      const json = await res.json()

      if (json.success && json.data) {
        setSummary(json.data)
        if (customQuestion && json.data.custom_answer) {
          setChatHistory((prev) => [
            ...prev,
            {
              q: customQuestion,
              a: json.data.custom_answer,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ])
          setQuery('')
        }
      } else {
        setError(json.error || 'Failed to generate AI health analysis')
      }
    } catch (err: any) {
      console.error('Failed to generate summary:', err)
      setError(err.message || 'Network error occurred')
    } finally {
      setIsLoading(false)
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
    generateSummary(query.trim())
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
                <h2 className="text-base sm:text-lg font-black text-[#2F4858]">
                  AI Clinical & Health Guardian Analysis
                </h2>
                {ageInfo ? (
                  <Badge className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs ${ageInfo.badgeColor}`}>
                    Age: {ageInfo.formatted} • {ageInfo.lifeStageLabel}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-bold bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]">
                    Age Not Specified (Add Birthdate)
                  </Badge>
                )}
              </div>
              <p className="text-xs font-semibold text-[#2F4858]/70 mt-0.5">
                Continuous clinical cross-synthesis across age, medicines, lab reports, and vitals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => generateSummary()}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="bg-white hover:bg-[#DDFBEF]/60 text-[#2F4858] border-[#2F4858]/20 rounded-xl text-xs font-extrabold shadow-xs cursor-pointer flex items-center gap-1.5 h-9"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Synthesizing...' : 'Refresh AI Analysis'}</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading && !summary ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="size-8 text-[#2F4858] animate-spin" />
            <p className="text-xs font-bold text-[#2F4858]/70">
              Analyzing {member.full_name}'s age profile, diagnostic records, active salts, and biomarker trends...
            </p>
          </div>
        ) : summary ? (
          <div className="pt-5 space-y-5">
            {/* Vitality Status & Life Stage Assessment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Vitality Score Card */}
              <div className="p-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-xs flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">
                  Vitality & Health Status
                </span>
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-[#2F4858]">
                      {summary.vitality_score}/100
                    </span>
                    <Badge
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        summary.vitality_status === 'OPTIMAL'
                          ? 'bg-emerald-600 text-white'
                          : summary.vitality_status === 'MODERATE_ATTENTION'
                          ? 'bg-amber-500 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {summary.vitality_status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-semibold text-[#2F4858]/70 mt-1">
                    {summary.vitality_status === 'OPTIMAL'
                      ? 'All indicators in healthy range'
                      : summary.vitality_status === 'MODERATE_ATTENTION'
                      ? 'Minor test flags noted'
                      : 'Requires doctor review'}
                  </p>
                </div>
              </div>

              {/* Life Stage Overview */}
              <div className="p-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-xs md:col-span-2 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60 flex items-center gap-1.5">
                  <User className="size-3.5 text-[#2F4858]" />
                  <span>Life Stage Assessment</span>
                </span>
                <p className="text-xs font-bold text-[#2F4858] leading-relaxed pt-1">
                  {summary.life_stage_assessment}
                </p>
                <p className="text-[11px] font-medium text-[#2F4858]/70">
                  {summary.clinical_overview}
                </p>
              </div>
            </div>

            {/* Critical Age & Allergy Safety Alerts Banner */}
            {(summary.age_safety_alerts?.length > 0 || summary.allergy_warnings?.length > 0) && (
              <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <ShieldAlert className="size-4 text-rose-600" />
                  <span>Clinical Safety & Age-Specific Alerts</span>
                </span>
                <div className="space-y-1.5">
                  {summary.allergy_warnings?.map((warning: string, i: number) => (
                    <p key={`allergy-${i}`} className="text-xs font-bold text-rose-800 flex items-start gap-1.5">
                      <span>•</span>
                      <span>{warning}</span>
                    </p>
                  ))}
                  {summary.age_safety_alerts?.map((alert: string, i: number) => (
                    <p key={`age-${i}`} className="text-xs font-bold text-rose-800 flex items-start gap-1.5">
                      <span>•</span>
                      <span>{alert}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 2-Column Clinical Synthesis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Diagnostic Biomarkers Synthesis */}
              <div className="p-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                    <Activity className="size-4 text-[#2F4858]" />
                    <span>Diagnostics & Biomarkers Status</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]">
                    {medicalRecords.length} Reports
                  </Badge>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {summary.biomarker_highlights?.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 font-semibold text-[#2F4858]">
                      <span className="size-1.5 rounded-full bg-[#2F4858] shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Medication & Safety Review */}
              <div className="p-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                    <Pill className="size-4 text-[#2F4858]" />
                    <span>Cabinet Medications Evaluation</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]">
                    {medicines.length} Medicines
                  </Badge>
                </div>
                <p className="text-xs font-bold text-[#2F4858] leading-relaxed">
                  {summary.medication_evaluation}
                </p>
                <div className="pt-2 border-t border-[#2F4858]/10 text-xs">
                  <span className="text-[10px] font-black uppercase text-[#2F4858]/60 block mb-1">
                    At-Home Vitals Trend:
                  </span>
                  <p className="font-semibold text-[#2F4858]/80 leading-relaxed">
                    {summary.vitals_trend_summary}
                  </p>
                </div>
              </div>
            </div>

            {/* Proactive Actionable Recommendations */}
            {summary.actionable_recommendations?.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/15 space-y-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Proactive Health Recommendations</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {summary.actionable_recommendations.map((rec: string, i: number) => (
                    <div key={i} className="p-2.5 rounded-xl bg-white border border-[#2F4858]/10 flex items-start gap-2 text-xs font-bold text-[#2F4858] shadow-xs">
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

            {/* Interactive "Ask AI About this Profile" Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#2F4858]/15 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                  <Sparkles className="size-4 text-[#2F4858]" />
                  <span>Ask AI Assistant About {member.full_name}'s Health</span>
                </span>
                <span className="text-[10px] font-bold text-[#2F4858]/60">
                  Contextual AI Q&A
                </span>
              </div>

              {/* Chat QA History */}
              {chatHistory.length > 0 && (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {chatHistory.map((item, idx) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#2F4858] text-[#DDFBEF] font-bold flex items-start gap-2">
                        <User className="size-3.5 shrink-0 mt-0.5 text-[#DDFBEF]" />
                        <span>{item.q}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F8FDFB] border border-[#2F4858]/15 font-semibold text-[#2F4858] leading-relaxed flex items-start gap-2">
                        <Sparkles className="size-3.5 shrink-0 mt-0.5 text-emerald-600" />
                        <span>{item.a}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Preset Query Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  `Are ${member.full_name.split(' ')[0]}'s medicines safe for their age?`,
                  `Explain ${member.full_name.split(' ')[0]}'s out-of-range lab markers`,
                  `What dietary steps should ${member.full_name.split(' ')[0]} follow?`,
                ].map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(promptText)
                      generateSummary(promptText)
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
                  placeholder={`Ask anything about ${member.full_name}'s health, medicines, or reports...`}
                  className="h-10 rounded-xl border-[#2F4858]/20 bg-[#F8FDFB] text-xs font-semibold text-[#2F4858] flex-1"
                />
                <Button
                  type="submit"
                  disabled={isAsking || !query.trim()}
                  className="h-10 px-4 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] text-xs font-extrabold cursor-pointer shadow-sm disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                >
                  {isAsking ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  <span className="hidden sm:inline">Ask AI</span>
                </Button>
              </form>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
