import { createClient } from '@/lib/supabase/server';
import Link from 'next/link'
import { calculateExpiryStatus } from '@/lib/utils/expiryCalculator';
import { calculateAge } from '@/lib/utils/ageCalculator';
import { Navbar } from '@/components/Navbar';
import { DashboardFilters } from '@/components/DashboardFilters';
import { MedicineDetailsDrawer } from '@/components/MedicineDetailsDrawer';
import { AddMedicalRecordModal } from '@/components/AddMedicalRecordModal';
import { MedicalRecordDetailModal } from '@/components/MedicalRecordDetailModal';
import { LogVitalModal } from '@/components/LogVitalModal';
import { EmergencyCardModal } from '@/components/EmergencyCardModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Pill, ShieldAlert, Ban, User, Sparkles, Users, Sun, Clock, ShieldCheck, AlertTriangle, Plus, FileText, Activity, HeartPulse, Stethoscope } from 'lucide-react';

import { redirect } from 'next/navigation';
import { DataUnavailable } from '@/components/DataUnavailable';
import { latestRecordedReadings, recordedDate } from '@/lib/utils/recordReadings';
import { measurementPresentation } from '@/lib/utils/statusPresentation';
import type { ExpiryUrgency } from '@/lib/utils/expiryCalculator';
import type { MemberRecord, MedicineRecord, ReportRecord, VitalRecord } from '@/lib/types/records';
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
  for (const term of terms) inventoryQuery = inventoryQuery.or(['medicine_name', 'salt_composition', 'primary_uses', 'dosage_instructions', 'brand_or_manufacturer', 'storage_location', 'dosage_form'].map(field => field + '.ilike.%' + term + '%').join(','))
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
  const inventoryTotal = inventoryResult.count || 0
  const reportTotal = reportResult.count || 0
  function href(update: Partial<Params>, anchor = '') {
    const query = new URLSearchParams(Object.entries({ ...params, ...update }).filter((entry): entry is [string, string] => !!entry[1]))
    return '/?' + query.toString() + anchor
  }
  const storages = [...new Set(summaries.map(m => m.storage_location).filter((s): s is string => !!s))].sort()
  const forms = [...new Set(summaries.map(m => m.dosage_form).filter((s): s is string => !!s))].sort()
  const incomplete = (summaryResult.count || 0) > summaries.length
  const familyMembers = members, medicalRecords = reports, vitalLogs = vitals
  const uniqueStorages = storages, uniqueForms = forms
  const currentMemberObj = member
  const selectedMember = member?.id || 'ALL'
  if (familyResult.error || summaryResult.error || inventoryResult.error || reportResult.error || vitalResult.error || memberInvalid) return <><Navbar familyMembers={members} medicines={bannedResult.data || []} warningsUnavailable={!!bannedResult.error} alertsCount={bannedResult.count ?? undefined} /><main id="main-content" className="page-shell"><DataUnavailable message={memberInvalid ? 'That family profile is unavailable. Choose a listed member to continue.' : 'Records could not be loaded. Your saved records may still be present.'} /><Link href="/">Return to all family members</Link></main></>
  // Diagnostic Overview Metrics
  const allBiomarkers = medicalRecords.flatMap(r => Array.isArray(r.biomarkers) ? r.biomarkers : [])
  const abnormalBiomarkers = allBiomarkers.filter(b => b.status === 'HIGH' || b.status === 'CRITICAL' || b.status === 'LOW')

  // Group abnormal biomarkers by member
  const abnormalByMember: Record<string, { memberName: string, count: number, names: string[] }> = {}
  medicalRecords.forEach(r => {
    const bms = Array.isArray(r.biomarkers) ? r.biomarkers : []
    const abnormals = bms.filter((b) => b.status === 'HIGH' || b.status === 'CRITICAL' || b.status === 'LOW')
    if (abnormals.length > 0) {
      const mName = r.family_members?.full_name?.split(' ')[0] || 'Member'
      if (!abnormalByMember[mName]) {
        abnormalByMember[mName] = { memberName: mName, count: 0, names: [] }
      }
      abnormalByMember[mName].count += abnormals.length
      abnormals.forEach((b) => {
        if (b.name && !abnormalByMember[mName].names.includes(b.name)) {
          abnormalByMember[mName].names.push(b.name)
        }
      })
    }
  })

  // Group reports by member
  const reportsByMember: Record<string, number> = {}
  medicalRecords.forEach(r => {
    const mName = r.family_members?.full_name?.split(' ')[0] || 'Member'
    reportsByMember[mName] = (reportsByMember[mName] || 0) + 1
  })

  // Diagnoses with Member attribution
  const diagnosesWithMember = medicalRecords
    .filter(r => r.diagnosis)
    .map(r => ({
      memberName: r.family_members?.full_name?.split(' ')[0] || 'Member',
      diagnosis: r.diagnosis
    }))

  const uniqueDiagnoses = Array.from(
    new Set(medicalRecords.map(r => r.diagnosis).filter(Boolean))
  ) as string[]

  return (
    <div className="bg-[#F8FDFB] min-h-screen text-[#2F4858] font-sans">
      <Navbar familyMembers={familyMembers} medicines={bannedResult.data || []} alertsCount={bannedResult.count ?? undefined} warningsUnavailable={!!bannedResult.error} />

      <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">

        {!members.length && <div className="rounded-2xl border bg-white p-4"><p>Start with a family profile to add reports and readings.</p><Link className="underline font-bold" href="/family/new">Add family member</Link></div>}
        {bannedResult.error && <DataUnavailable message="Cabinet regulatory warnings could not be loaded." />}
        {(bannedResult.count || 0) > 0 && <p role="status" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm">{bannedResult.count} cabinet item(s) have recorded regulatory warnings. <Link href="/safety" className="underline">Review recorded alerts</Link></p>}
        <h1 className="sr-only">Family medicine cabinet</h1>
        {/* Family Member Quick Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full scrollbar-none pb-2" role="navigation" aria-label="Family members">
          <Button
            render={<Link href="/" />}
            variant={selectedMember === 'ALL' ? 'default' : 'outline'}
            size="sm"
            className={`rounded-xl text-xs font-bold transition-all cursor-pointer h-8 px-3 shrink-0 ${
              selectedMember === 'ALL'
                ? 'bg-[#2F4858] text-[#DDFBEF] hover:bg-[#1E313D] shadow-sm'
                : 'bg-[#DDFBEF]/50 text-[#2F4858] hover:bg-[#DDFBEF] border border-[#2F4858]/10'
            }`}
          >
            <Users className="w-3.5 h-3.5 mr-1" />
            All Family
          </Button>

          {familyMembers.map((member) => {
            const isSelected = selectedMember === member.id;
            return (
              <Button
                render={<Link href={`/?member=${member.id}`} />}
                key={member.id}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={`rounded-xl text-xs font-bold transition-all cursor-pointer h-8 px-3 shrink-0 ${
                  isSelected
                    ? 'bg-[#2F4858] text-[#DDFBEF] hover:bg-[#1E313D] shadow-sm'
                    : 'bg-[#DDFBEF]/50 text-[#2F4858] hover:bg-[#DDFBEF] border border-[#2F4858]/10'
                }`}
              >
                <span className={`w-2 h-2 rounded-full mr-1.5 ${(member.allergies?.length || 0) > 0 ? 'bg-amber-500' : 'bg-[#B7EED8]'}`} />
                {member.full_name.split(' ')[0]}
              </Button>
            );
          })}

          <Button
            render={<Link href="/family" />}
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs font-bold text-[#2F4858]/80 hover:bg-[#DDFBEF] hover:text-[#2F4858] h-8 px-3 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Manage Profiles
          </Button>
        </div>

        {/* Member Health Profile Banner (When member is selected) */}
        {currentMemberObj && (
          <Card className="rounded-3xl bg-white border-[#2F4858]/15 shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
              <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
                <Avatar className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-[#2F4858]/20 bg-[#DDFBEF] text-[#2F4858] shadow-inner shrink-0">
                  <AvatarFallback className="rounded-2xl bg-[#DDFBEF] text-[#2F4858] font-black text-lg sm:text-xl">
                    {currentMemberObj.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-[#2F4858] truncate">
                      {currentMemberObj.full_name}
                    </h2>
                    <Badge variant="outline" className="bg-[#DDFBEF] text-[#2F4858] font-black border-[#B7EED8] text-[10px] uppercase tracking-wider rounded-full px-2.5">
                      {currentMemberObj.relationship}
                    </Badge>
                    {(() => {
                      const age = calculateAge(currentMemberObj.date_of_birth || currentMemberObj.birth_date)
                      return age ? (
                        <Badge className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs ${age.badgeColor}`}>
                          Age: {age.formatted} • {age.lifeStageLabel}
                        </Badge>
                      ) : null
                    })()}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                    {(currentMemberObj.allergies?.length || 0) > 0 ? (
                      <Badge variant="destructive" className="font-bold flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] sm:text-[11px]">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        Allergies: {currentMemberObj.allergies?.join(', ')}
                      </Badge>
                    ) : (
                      <span className="text-[#2F4858]/70 font-semibold flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="size-3.5 text-emerald-600" />
                        No recorded allergies
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Action Triggers */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto [&>div]:w-full sm:[&>div]:w-auto [&>div>button]:w-full sm:[&>div>button]:w-auto [&>button]:w-full sm:[&>button]:w-auto">
                <LogVitalModal
                  familyMemberId={currentMemberObj.id}
                  familyMemberName={currentMemberObj.full_name}
                  trigger={
                    <Button size="sm" className="bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1 h-9">
                      <Activity className="size-3.5" />
                      <span>Log Vitals / Sugar</span>
                    </Button>
                  }
                />

                <AddMedicalRecordModal
                  familyMemberId={currentMemberObj.id}
                  familyMemberName={currentMemberObj.full_name}
                  trigger={
                    <Button size="sm" variant="outline" className="bg-white hover:bg-[#DDFBEF]/50 text-[#2F4858] border-[#2F4858]/20 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1 h-9">
                      <Sparkles className="size-3.5 text-[#2F4858]" />
                      <span>Add Lab Report</span>
                    </Button>
                  }
                />

                <Button
                  render={<Link href={`/family/${currentMemberObj.id}`} />}
                  size="sm"
                  variant="outline"
                  className="bg-[#DDFBEF] hover:bg-[#DDFBEF]/80 text-[#2F4858] border-[#B7EED8] rounded-xl text-xs font-extrabold shadow-xs justify-center h-9"
                >
                  <span>Health Hub & Trends →</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AT-A-GLANCE MEDICAL DIAGNOSTICS & CLINICAL OVERVIEW (WITH CLEAR PATIENT ATTRIBUTION) */}
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858] flex items-center gap-2">
              <Activity className="size-4 text-[#2F4858]" />
              <span>
                {currentMemberObj ? `${currentMemberObj.full_name}'s Medical & Clinical Overview` : 'Family Medical Diagnostics & Clinical Overview'}
              </span>
            </h3>
            {currentMemberObj && (
              <Link href={`/family/${currentMemberObj.id}`} className="text-xs font-bold text-[#2F4858] hover:underline flex items-center gap-1">
                <span>Trends →</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Total Reports Card */}
            <Card className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-sm flex flex-col justify-between hover:border-[#2F4858]/40 transition-colors">
              <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">Lab Reports</span>
                <div className="size-6 sm:size-7 rounded-xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center">
                  <FileText className="size-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-black text-[#2F4858] tracking-tight tabular-nums">
                  {medicalRecords.length}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#2F4858]/80 mt-1 flex items-center gap-1 break-words">
                  {medicalRecords.length > 0 ? (
                    currentMemberObj ? (
                      <span>👤 {currentMemberObj.full_name.split(' ')[0]} ({allBiomarkers.length} biomarkers)</span>
                    ) : (
                      <span>👤 {Object.entries(reportsByMember).map(([n, c]) => `${n} (${c})`).join(', ')}</span>
                    )
                  ) : (
                    <span className="text-[#2F4858]/50">No reports uploaded</span>
                  )}
                </div>
              </div>
            </Card>

            {/* Abnormal Biomarkers Alert Card */}
            <Card className={`p-3.5 sm:p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors ${
              abnormalBiomarkers.length > 0
                ? 'bg-rose-50/80 border-rose-200 hover:bg-rose-100/80'
                : 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/80'
            }`}>
              <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  abnormalBiomarkers.length > 0 ? 'text-rose-800' : 'text-emerald-800'
                }`}>
                  Abnormal Flags
                </span>
                <div className={`size-6 sm:size-7 rounded-xl flex items-center justify-center ${
                  abnormalBiomarkers.length > 0 ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                }`}>
                  {abnormalBiomarkers.length > 0 ? <AlertTriangle className="size-3.5 text-rose-700" /> : <ShieldCheck className="size-3.5 text-emerald-700" />}
                </div>
              </div>
              <div>
                <div className={`text-xl sm:text-3xl font-black tracking-tight tabular-nums ${
                  abnormalBiomarkers.length > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {abnormalBiomarkers.length}
                </div>
                <div className={`text-[10px] sm:text-[11px] font-bold mt-1 break-words ${
                  abnormalBiomarkers.length > 0 ? 'text-rose-800' : 'text-emerald-800'
                }`}>
                  {abnormalBiomarkers.length > 0 ? (
                    currentMemberObj ? (
                      <span>⚠️ {currentMemberObj.full_name.split(' ')[0]} ({abnormalBiomarkers.map((b) => b.name).filter(Boolean).slice(0, 2).join(', ')})</span>
                    ) : (
                      <span>⚠️ In: {Object.values(abnormalByMember).map(a => `${a.memberName} (${a.count})`).join(', ')}</span>
                    )
                  ) : (
                    <span>No abnormal flags recorded; health unassessed</span>
                  )}
                </div>
              </div>
            </Card>

            {/* Active Diagnoses Card */}
            <Card className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-sm flex flex-col justify-between hover:border-[#2F4858]/40 transition-colors">
              <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">Diagnoses</span>
                <div className="size-6 sm:size-7 rounded-xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center">
                  <Stethoscope className="size-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-black text-[#2F4858] tracking-tight tabular-nums">
                  {uniqueDiagnoses.length}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#2F4858]/80 mt-1 break-words">
                  {diagnosesWithMember.length > 0 ? (
                    currentMemberObj ? (
                      <span>🩺 {diagnosesWithMember[0].diagnosis}</span>
                    ) : (
                      <span>🩺 {diagnosesWithMember[0].memberName}: {diagnosesWithMember[0].diagnosis}</span>
                    )
                  ) : (
                    <span className="text-[#2F4858]/50">No diagnoses recorded in this view</span>
                  )}
                </div>
              </div>
            </Card>

            {/* At-Home Self Checks Card */}
            <Card className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-sm flex flex-col justify-between hover:border-[#2F4858]/40 transition-colors">
              <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">Self-Checks</span>
                <div className="size-6 sm:size-7 rounded-xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center">
                  <HeartPulse className="size-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-black text-[#2F4858] tracking-tight tabular-nums">
                  {vitalLogs.length}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#2F4858]/80 mt-1 break-words">
                  {vitalLogs.length > 0 ? (
                    currentMemberObj ? (
                      <span>📊 {vitalLogs[0].name}: {vitalLogs[0].value} {vitalLogs[0].unit}</span>
                    ) : (
                      <span>📊 {vitalLogs[0].family_members?.full_name?.split(' ')[0] || 'Member'}: {vitalLogs[0].name} ({vitalLogs[0].value})</span>
                    )
                  ) : (
                    <span className="text-[#2F4858]/50">Glucometer, BP, Pulse</span>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {readings.length > 0 && <Card className="p-3 px-4 rounded-2xl bg-white border-[#2F4858]/15 shadow-sm">
            <h3 className="text-xs font-black uppercase mb-2">Recorded readings by source and context</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">{readings.slice(0, 8).map(r => <div key={r.id} className="shrink-0 border-l pl-3 text-xs space-y-1">
              <p className="font-bold">{r.memberName} · {r.name}</p><p className="font-black">{r.value} {r.unit}</p>
              <p>{r.source} · {r.context}</p><p>{recordedDate(r.date)}</p><span className={measurementPresentation(r.status).className}>{measurementPresentation(r.status).label}</span>
            </div>)}</div>
          </Card>}
          <p className="text-xs text-muted-foreground">Overview covers reports on this page and the 12 most recent home readings. Open a family profile for its fuller history.</p>
        </div>

        {/* Medicine Expiry Urgency Status Grid */}
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#2F4858]/80 flex items-center gap-1.5">
            <Pill className="size-3.5 text-[#2F4858]" />
            <span>Medicine Cabinet & Expiry Urgency Status</span>
          </span>

          <p className="text-xs">Expiry counts cover {member ? member.full_name : 'the whole cabinet'} and ignore search, storage and form filters. Expiry does not establish suitability for use.</p>
          {incomplete && <p role="status">Counts and filter options cover the first {summaries.length} of {summaryResult.count} items.</p>}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {([['EXPIRED','Expired','bg-rose-50 border-rose-200 text-rose-800'],['CRITICAL','0–15 days','bg-amber-50 border-amber-200 text-amber-800'],['WARNING','16–45 days','bg-[#DDFBEF]/50 border-[#B7EED8]'],['SAFE','More than 45 days','bg-emerald-50 border-emerald-200 text-emerald-800'],['UNKNOWN','Expiry not recorded','bg-slate-50 border-slate-200']] as const).map(([status,label,style]) =>
              <Link key={status} href={href({expiry:status,page:undefined})} aria-label={'View ' + label + ': ' + counts[status] + ' items'} className={'p-4 rounded-2xl border shadow-sm space-y-2 hover:shadow-md ' + style}><span className="text-xs font-extrabold uppercase">{label}</span><span className="block text-3xl font-black">{counts[status]}</span></Link>)}
          </div>
        </div>

        {/* Dashboard Search & Multi-Filters */}
        <Card className="rounded-2xl border-[#2F4858]/15 bg-white shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <DashboardFilters key={JSON.stringify(params)}
                uniqueStorages={uniqueStorages}
                uniqueForms={uniqueForms}
              />
            </div>
            {currentMemberObj && (
              <div className="shrink-0 w-full md:w-auto">
                <EmergencyInventory member={currentMemberObj} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 1: Cabinet Medicine Inventory */}
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858] flex items-center gap-2">
              <Pill className="size-4 text-[#2F4858]" />
              <span>Cabinet Medicine Inventory</span>
              <Badge variant="secondary" className="bg-[#DDFBEF] text-[#2F4858] font-extrabold text-xs">
                {medicines.length}
              </Badge>
            </h3>
            <Button render={<Link href="/medicines/new" />} size="sm" className="bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] font-bold rounded-xl text-xs shadow-sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Medicine
            </Button>
          </div>

          {medicines.length === 0 ? (
            <Card className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#2F4858]/20 shadow-xs">
              <CardContent className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center mx-auto">
                  <Pill className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-[#2F4858]">No medicines found</h3>
                  <p className="text-xs text-[#2F4858]/60 max-w-sm mx-auto font-medium">
                    Try adjusting your filters or search keywords, or add new medications to your cabinet.
                  </p>
                </div>
                <Button render={<Link href="/medicines/new" />} size="sm" className="bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] rounded-xl text-xs font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Medicine
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicines.map((med) => {
                const status = calculateExpiryStatus(med.expiry_date);
                let statusColor = 'text-emerald-700 bg-emerald-100 border-emerald-200';
                let dotColor = 'bg-emerald-600';

                if (status.urgency === 'EXPIRED' || status.urgency === 'CRITICAL') {
                  statusColor = 'text-rose-700 bg-rose-100 border-rose-200';
                  dotColor = 'bg-rose-600';
                } else if (status.urgency === 'WARNING') {
                  statusColor = 'text-amber-700 bg-amber-100 border-amber-200';
                  dotColor = 'bg-amber-600';
                }

                if (status.urgency === 'UNKNOWN') { statusColor = 'text-slate-700 bg-slate-100 border-slate-200'; dotColor = 'bg-slate-500' }
                const memberAllergies = members.find(m => m.id === med.family_member_id)?.allergies || [];
                const hasAllergyConflict = memberAllergies.some((allergy: string) =>
                  med.salt_composition?.toLowerCase().includes(allergy.toLowerCase()) ||
                  med.medicine_name.toLowerCase().includes(allergy.toLowerCase())
                );

                return (
                  <Card
                    key={med.id}
                    className={`group relative bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
                      med.is_banned
                        ? 'border-rose-400 ring-1 ring-rose-300'
                        : hasAllergyConflict
                        ? 'border-amber-400 ring-1 ring-amber-300'
                        : 'border-[#2F4858]/15 hover:border-[#2F4858]/40 shadow-sm'
                    }`}
                  >
                    {/* Top Banner if Banned */}
                    {med.is_banned && (
                      <div className="bg-rose-600 text-white px-3.5 py-1 text-[11px] font-black tracking-wider uppercase flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Ban className="w-3.5 h-3.5" />
                          <span>GOVERNMENT BANNED / RECALLED</span>
                        </div>
                        <span className="text-[10px] opacity-90 font-bold">DO NOT CONSUME</span>
                      </div>
                    )}

                    {hasAllergyConflict && <p role="alert" className="bg-amber-50 text-amber-950 px-4 py-2 text-xs font-bold">Possible recorded allergy match. Check ingredients with a pharmacist.</p>}
                    {/* Main Body */}
                    <CardContent className="p-4 sm:p-5 space-y-3.5">
                      {/* Medicine Header: Name, Strength, Routine */}
                      <div className="space-y-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-base text-[#2F4858] leading-snug group-hover:text-[#1E313D] transition-colors">
                              {med.medicine_name}
                            </h3>
                            {med.strength && (
                              <Badge variant="outline" className="text-xs font-bold text-[#2F4858]/80 bg-[#DDFBEF] border-[#B7EED8] rounded-md px-2 py-0.5 shrink-0">
                                {med.strength}
                              </Badge>
                            )}
                            {med.is_daily_routine && (
                              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                                <Sun className="w-3 h-3" /> Daily
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-[#2F4858]/80 flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-[#2F4858]/60 font-medium">Salt:</span>
                            <span className="bg-[#DDFBEF]/50 px-1.5 py-0.5 rounded text-[#2F4858] border border-[#2F4858]/10 font-bold truncate max-w-full">
                              {med.salt_composition}
                            </span>
                          </p>
                        </div>

                        {/* High-Visibility Expiry & Validity Status Banner */}
                        <div className={`flex items-center justify-between p-2.5 px-3 rounded-xl border text-xs font-bold ${statusColor}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                            <span className="font-black text-xs">{status.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold tabular-nums text-xs">
                            <Clock className="w-3.5 h-3.5 opacity-80" />
                            <span>Exp: {recordedDate(med.expiry_date)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Uses & Indications */}
                      <div className="text-xs text-[#2F4858]/90 leading-relaxed bg-[#F8FDFB] p-3 rounded-xl border border-[#2F4858]/15 font-medium">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/70 block mb-1">
                          Primary Uses & Indications:
                        </span>
                        <p className="leading-relaxed">
                          {med.primary_uses || 'Uses not recorded'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#DDFBEF]/50 text-[#2F4858] font-bold border-[#2F4858]/10">
                          <MapPin className="w-3.5 h-3.5 text-[#2F4858]" />
                          <span>{med.storage_location || 'Unassigned'}</span>
                        </Badge>
                        <Badge variant="outline" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#DDFBEF]/50 text-[#2F4858] font-bold border-[#2F4858]/10">
                          <Pill className="w-3.5 h-3.5 text-[#2F4858]" />
                          <span>{med.quantity} {med.unit || 'units'} ({med.dosage_form})</span>
                        </Badge>
                      </div>

                      <div className="pt-2 border-t border-[#2F4858]/10 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {med.family_members ? (
                            <Badge variant="outline" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#DDFBEF]/40 text-[#2F4858] border-[#2F4858]/10">
                              <User className="w-3 h-3" />
                              <span>{med.family_members.full_name.split(' ')[0]}</span>
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-[#2F4858]/50 italic">Household shared</span>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="px-4 py-3 bg-[#F4FCF8] border-t border-[#2F4858]/10 flex items-center justify-between gap-2">
                      <MedicineDetailsDrawer medicine={med} />
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <nav aria-label="Inventory pages" className="flex gap-4 text-sm"><span>{inventoryTotal} matching item(s) · page {page}</span>{page > 1 && <Link href={href({page:String(page-1)})}>Previous inventory page</Link>}{page * pageSize < inventoryTotal && <Link href={href({page:String(page+1)})}>Next inventory page</Link>}</nav>
        {/* SECTION 2: Diagnostic Lab Reports & Medical Records */}
        <div id="reports" className="space-y-3.5 pt-6 border-t border-[#2F4858]/15">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858] flex items-center gap-2">
              <FileText className="size-4 text-[#2F4858]" />
              <span>
                {currentMemberObj ? `${currentMemberObj.full_name}'s Medical Reports & Diagnoses` : 'Family Diagnostic Reports & Records'}
              </span>
              <Badge variant="secondary" className="bg-[#DDFBEF] text-[#2F4858] font-extrabold text-xs">
                {medicalRecords.length}
              </Badge>
            </h3>

            <AddMedicalRecordModal
              familyMemberId={currentMemberObj?.id}
              familyMemberName={currentMemberObj?.full_name}
              familyMembers={familyMembers}
              trigger={
                <Button size="sm" variant="outline" className="bg-[#F8FDFB] hover:bg-[#DDFBEF]/50 text-[#2F4858] font-bold border-[#2F4858]/20 rounded-xl text-xs shadow-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Lab Report / Diagnosis
                </Button>
              }
            />
          </div>

          {medicalRecords.length === 0 ? (
            <Card className="text-center py-10 bg-white rounded-2xl border border-dashed border-[#2F4858]/20 shadow-xs">
              <CardContent className="space-y-2 flex flex-col items-center">
                <div className="size-10 rounded-2xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center">
                  <FileText className="size-5 opacity-70" />
                </div>
                <h4 className="font-bold text-xs text-[#2F4858]">No medical reports uploaded for this view</h4>
                <p className="text-[11px] text-[#2F4858]/60 max-w-sm mx-auto font-medium">
                  Upload pathology tests, CBC, lipid panels, or doctor prescriptions to extract biomarkers with AI.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicalRecords.map((rec) => {
                const biomarkers = Array.isArray(rec.biomarkers) ? rec.biomarkers : []
                return (
                  <Card key={rec.id} className="bg-white border-[#2F4858]/15 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
                    <CardHeader className="p-4 bg-[#F8FDFB] border-b border-[#2F4858]/10 flex flex-row items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center shrink-0">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-xs font-black text-[#2F4858] truncate">
                            {rec.title}
                          </CardTitle>
                          <CardDescription className="text-[10px] font-semibold text-[#2F4858]/70 truncate">
                            {rec.test_date && <span>{new Date(rec.test_date).toLocaleDateString()}</span>}
                            {rec.hospital_clinic && <span> • {rec.hospital_clinic}</span>}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-extrabold uppercase bg-white text-[#2F4858] border-[#2F4858]/20 shrink-0">
                        {rec.record_type}
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-4 space-y-2.5 text-xs">
                      {rec.diagnosis && (
                        <div className="p-2 rounded-xl bg-[#DDFBEF]/40 border border-[#B7EED8]">
                          <span className="font-black text-[9px] uppercase text-[#2F4858]/70 block">Diagnosis:</span>
                          <span className="font-bold text-[#2F4858] text-xs line-clamp-1">{rec.diagnosis}</span>
                        </div>
                      )}

                      {biomarkers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {biomarkers.slice(0, 3).map((bm, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                measurementPresentation(bm.status).className
                              }`}
                            >
                              {bm.name}: {bm.value} {bm.unit} · {measurementPresentation(bm.status).label}
                            </span>
                          ))}
                          {biomarkers.length > 3 && (
                            <span className="text-[10px] font-bold text-[#2F4858]/60 self-center">
                              +{biomarkers.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="px-4 py-3 bg-[#F4FCF8] border-t border-[#2F4858]/10 flex items-center justify-between">
                      <MedicalRecordDetailModal
                        record={rec}
                        familyMemberName={rec.family_members?.full_name || 'Family Member'}
                      />
                      {rec.family_members && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-[#DDFBEF]/40 text-[#2F4858]">
                          {rec.family_members.full_name.split(' ')[0]}
                        </Badge>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <nav aria-label="Report pages" className="flex gap-4 text-sm"><span>{reportTotal} report(s) · page {recordsPage}</span>{recordsPage > 1 && <Link href={href({recordsPage:String(recordsPage-1)}, '#reports')}>Previous reports</Link>}{recordsPage * pageSize < reportTotal && <Link href={href({recordsPage:String(recordsPage+1)}, '#reports')}>Next reports</Link>}</nav>
        {/* SECTION 3: At-Home Vitals & Self-Tests */}
        <div className="space-y-3.5 pt-6 border-t border-[#2F4858]/15 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858] flex items-center gap-2">
              <HeartPulse className="size-4 text-[#2F4858]" />
              <span>
                {currentMemberObj ? `${currentMemberObj.full_name}'s At-Home Vitals & Self-Checks` : 'Family At-Home Vitals & Self-Tests'}
              </span>
              <Badge variant="secondary" className="bg-[#DDFBEF] text-[#2F4858] font-extrabold text-xs">
                {vitalLogs.length}
              </Badge>
            </h3>

            <LogVitalModal
              familyMemberId={currentMemberObj?.id}
              familyMemberName={currentMemberObj?.full_name}
              familyMembers={familyMembers}
              trigger={
                <Button size="sm" variant="outline" className="bg-[#F8FDFB] hover:bg-[#DDFBEF]/50 text-[#2F4858] font-bold border-[#2F4858]/20 rounded-xl text-xs shadow-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Log Sugar / BP / Vitals
                </Button>
              }
            />
          </div>

          {vitalLogs.length === 0 ? (
            <Card className="text-center py-10 bg-white rounded-2xl border border-dashed border-[#2F4858]/20 shadow-xs">
              <CardContent className="space-y-2 flex flex-col items-center">
                <div className="size-10 rounded-2xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center">
                  <Activity className="size-5 opacity-70" />
                </div>
                <h4 className="font-bold text-xs text-[#2F4858]">No self-checks logged yet</h4>
                <p className="text-[11px] text-[#2F4858]/60 max-w-sm mx-auto font-medium">
                  Track daily blood sugar, blood pressure, pulse, or body temperature readings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {vitalLogs.map((vital) => {
                const statusColor = measurementPresentation(vital.status).className

                return (
                  <Card key={vital.id} className="bg-white border-[#2F4858]/15 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-[#2F4858]/60 truncate">
                          {vital.name}
                        </span>
                        <Badge className={`text-[9px] font-black px-1.5 py-0 ${statusColor}`}>
                          {measurementPresentation(vital.status).label}
                        </Badge>
                      </div>
                      <div className="text-xl font-black text-[#2F4858] tabular-nums">
                        {vital.value}{vital.value_secondary && ` / ${vital.value_secondary}`} <span className="text-xs font-semibold text-[#2F4858]/60">{vital.unit}</span>
                      </div>
                      <p className="text-[11px] font-bold text-[#2F4858]/80">
                        {vital.context || 'Home Check'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#2F4858]/10 flex items-center justify-between text-[10px] font-semibold text-[#2F4858]/60">
                      <span>{new Date(vital.recorded_at).toLocaleDateString()}</span>
                      {vital.family_members && <span>{vital.family_members.full_name.split(' ')[0]}</span>}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

async function EmergencyInventory({ member }: { member: MemberRecord }) {
  const supabase = await createClient()
  const { data, error, count } = await supabase.from('medicines').select('medicine_name, salt_composition', { count: 'exact' }).eq('family_member_id', member.id).range(0, 999)
  if (error || (count || 0) > (data?.length || 0)) return <DataUnavailable message="The complete emergency medicine list could not be loaded. Open the family profile to retry." />
  return <EmergencyCardModal member={member} medicines={data || []} />
}
