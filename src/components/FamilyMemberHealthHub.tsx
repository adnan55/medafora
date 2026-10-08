'use client'


import Link from 'next/link'
import { FileText, Activity, Pill, ShieldAlert, Plus, Sparkles, ExternalLink, HeartPulse, Stethoscope, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AnimatedTabs, type AnimatedTabItem } from '@/components/shadcn-space/tabs/tabs-08';
import { AddMedicalRecordModal } from '@/components/AddMedicalRecordModal';
import { MedicalRecordDetailModal } from '@/components/MedicalRecordDetailModal';
import { MedicineSummary } from '@/components/MedicineSummary';

import { LogVitalModal } from '@/components/LogVitalModal';
import { BiomarkerTrendChart } from '@/components/BiomarkerTrendChart';
import { AIHealthSummaryCard } from '@/components/AIHealthSummaryCard';
import { EditFamilyMemberModal } from '@/components/EditFamilyMemberModal';
import { EmergencyCardModal } from '@/components/EmergencyCardModal';
import { measurementPresentation } from '@/lib/utils/statusPresentation';

import { calculateAge } from '@/lib/utils/ageCalculator';
import type { MemberRecord, MedicineRecord, ReportRecord, VitalRecord } from '@/lib/types/records';

interface FamilyMemberHealthHubProps {
  member: MemberRecord
  medicalRecords: ReportRecord[]
  vitalLogs: VitalRecord[]
  medicines: MedicineRecord[]
  inventoryIncomplete?: boolean
}

export function FamilyMemberHealthHub({
  member,
  medicalRecords,
  vitalLogs,
  medicines,
  inventoryIncomplete = false,
}: FamilyMemberHealthHubProps) {
  const records = medicalRecords || []
  const vitals = vitalLogs || []
  const ageInfo = calculateAge(member.date_of_birth || member.birth_date)

  const labReports = records.filter(r => r.record_type === 'LAB_REPORT' || r.record_type === 'IMAGING')
  const clinicalDiagnoses = records.filter(r => r.record_type === 'DIAGNOSIS' || r.record_type === 'DOCTOR_CONSULT' || r.record_type === 'DISCHARGE_SUMMARY' || r.diagnosis)

  // 1. Diagnostic Reports Tab
  const ReportsTab = (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#2F4858]/15 shadow-xs">
        <div>
          <h3 className="font-extrabold text-sm text-[#2F4858]">Diagnostic Lab Reports & Scans</h3>
          <p className="text-xs font-medium text-muted-foreground">
            Pathology blood panels, imaging, and AI-extracted biomarkers ({labReports.length} uploaded)
          </p>
        </div>
        <AddMedicalRecordModal
          familyMemberId={member.id}
          familyMemberName={member.full_name}
        />
      </div>

      {labReports.length === 0 ? (
        <Card className="text-center py-12 bg-white rounded-2xl border-dashed border-[#2F4858]/30">
          <CardContent className="flex flex-col items-center">
            <div className="size-12 rounded-2xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center mb-3">
              <FileText className="size-6 opacity-70" />
            </div>
            <h4 className="font-bold text-sm text-[#2F4858]">No diagnostic reports uploaded yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4 font-medium">
              Upload blood tests, lipid panels, urine tests, or radiology scans in PDF or image format to get instant AI biomarker extraction.
            </p>
            <AddMedicalRecordModal
              familyMemberId={member.id}
              familyMemberName={member.full_name}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {labReports.map((record) => {
            const biomarkers = Array.isArray(record.biomarkers) ? record.biomarkers : []
            const abnormalCount = biomarkers.filter(b => ['HIGH', 'LOW', 'ABNORMAL', 'CRITICAL'].includes(b.status || '')).length

            return (
              <Card key={record.id} className="bg-white border-[#2F4858]/15 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
                <CardHeader className="p-4 bg-[#F8FDFB] border-b border-[#2F4858]/10 flex flex-row items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-9 rounded-xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center shrink-0">
                      <FileText className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-extrabold text-[#2F4858] truncate">
                        {record.title}
                      </CardTitle>
                      <CardDescription className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {record.test_date && <span>{new Date(record.test_date).toLocaleDateString()}</span>}
                        {record.hospital_clinic && <span>• {record.hospital_clinic}</span>}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-sm font-bold bg-white text-[#2F4858] border-[#2F4858]/20 shrink-0">
                    {record.record_type}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  {record.diagnosis && (
                    <div className="p-2.5 rounded-xl bg-[#DDFBEF]/40 border border-[#B7EED8]">
                      <span className="font-extrabold text-sm uppercase text-muted-foreground block">Diagnosis:</span>
                      <span className="font-bold text-[#2F4858]">{record.diagnosis}</span>
                    </div>
                  )}

                  {biomarkers.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm font-bold text-[#2F4858]">
                        <span>Key Biomarkers ({biomarkers.length})</span>
                        {abnormalCount > 0 && (
                          <Badge variant="destructive" className="text-sm font-bold px-1.5 py-0">
                            {abnormalCount} Attention Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {biomarkers.slice(0, 4).map((bm, idx) => (
                          <span
                            key={idx}
                            className={'px-2 py-1 rounded-md text-sm font-bold border ' + measurementPresentation(bm.status).className}
                          >
                            {bm.name}: {bm.value} {bm.unit} · {measurementPresentation(bm.status).label}
                          </span>
                        ))}
                        {biomarkers.length > 4 && (
                          <span className="text-sm font-bold text-muted-foreground self-center">
                            +{biomarkers.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                <div className="p-3 bg-[#F8FDFB] border-t border-[#2F4858]/10 flex items-center justify-between">
                  <MedicalRecordDetailModal
                    record={record}
                    familyMemberName={member.full_name}
                  />
                  {record.file_url && (
                    <a
                      href={`/api/medical-records/${record.id}/document`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#2F4858] hover:underline flex items-center gap-1"
                    >
                      <span>Original File</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  // 2. Medical History & Diagnoses Tab
  const DiagnosesTab = (
    <div className="space-y-4">
      {/* Chronic Conditions from profile */}
      <Card className="bg-white border-[#2F4858]/15 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-[#2F4858]">
            <HeartPulse className="size-4.5 text-[#2F4858]" />
            <span>Recorded Chronic Conditions & Health History</span>
          </div>
          <Badge variant="outline" className="text-sm font-bold bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]">
            Profile Baseline
          </Badge>
        </div>

        {member.chronic_conditions && member.chronic_conditions.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {member.chronic_conditions.map((condition: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1.5 shadow-xs"
              >
                <Activity className="size-3.5 text-amber-700" />
                <span>{condition}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-medium">No chronic conditions recorded in profile baseline.</p>
        )}
      </Card>

      {/* Diagnoses from Lab Records & Doctor visits */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-[#2F4858]">Clinical Diagnostics & Doctor Consult History</h3>
          <AddMedicalRecordModal
            familyMemberId={member.id}
            familyMemberName={member.full_name}
          />
        </div>

        {clinicalDiagnoses.length === 0 ? (
          <Card className="text-center py-10 bg-white rounded-2xl border-dashed border-[#2F4858]/30">
            <CardContent className="flex flex-col items-center">
              <Stethoscope className="size-8 text-muted-foreground mb-2" />
              <p className="text-xs font-bold text-[#2F4858]">No diagnostic history entries recorded</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Log doctor consultations, hospital summaries, or clinical conclusions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {clinicalDiagnoses.map((rec) => (
              <Card key={rec.id} className="bg-white border-[#2F4858]/15 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#2F4858]">{rec.title}</span>
                    <Badge variant="outline" className="text-sm font-bold bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]">
                      {rec.record_type}
                    </Badge>
                  </div>
                  {rec.diagnosis && (
                    <p className="text-xs font-bold text-rose-900">
                      Diagnosis: {rec.diagnosis}
                    </p>
                  )}
                  {rec.summary && (
                    <p className="text-xs font-medium text-[#2F4858]/80 line-clamp-2">
                      {rec.summary}
                    </p>
                  )}
                  <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2 pt-1">
                    {rec.test_date && <span>Date: {new Date(rec.test_date).toLocaleDateString()}</span>}
                    {rec.doctor_name && <span>• Dr: {rec.doctor_name}</span>}
                    {rec.hospital_clinic && <span>• {rec.hospital_clinic}</span>}
                  </div>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <MedicalRecordDetailModal
                    record={rec}
                    familyMemberName={member.full_name}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // 3. Active Medicines Tab
  const MedicinesTab = (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#2F4858]/15 shadow-xs">
        <div>
          <h3 className="font-extrabold text-sm text-[#2F4858]">Cabinet Medicines Assigned to {member.full_name.split(' ')[0]}</h3>
          <p className="text-xs font-medium text-muted-foreground">
            {medicines.length} medicines currently linked
          </p>
        </div>
        <Button render={<Link href="/medicines/new" />} size="sm" className="bg-[#2F4858] text-[#DDFBEF] rounded-xl text-xs font-extrabold shadow-sm">
          <Plus className="size-3.5 mr-1" />
          Add Medicine
        </Button>
      </div>

      {medicines.length === 0 ? (
        <Card className="text-center py-12 bg-white rounded-2xl border-dashed border-[#2F4858]/30">
          <CardContent className="flex flex-col items-center">
            <Pill className="size-8 text-muted-foreground mb-2" />
            <p className="text-xs font-bold text-[#2F4858]">No medicines assigned to this member</p>
            <p className="text-sm text-muted-foreground mt-0.5 mb-4">
              Add medications to your cabinet and assign them to {member.full_name}.
            </p>
            <Button render={<Link href="/medicines/new" />} size="sm" className="bg-[#2F4858] text-[#DDFBEF] rounded-xl text-xs font-bold">
              Add Medicine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medicines.map(med => <MedicineSummary key={med.id} medicine={med} />)}
        </div>
      )}
    </div>
  )

  // 0. AI Clinical Guardian Tab
  const AISummaryTab = (
    <AIHealthSummaryCard
      member={member}
      medicines={medicines}
      medicalRecords={records}
      vitalLogs={vitals}
    />
  )

  // 1. Vitals & Biomarker Trends Tab
  const VitalsTab = (
    <BiomarkerTrendChart
      familyMemberId={member.id}
      familyMemberName={member.full_name}
      vitalLogs={vitals}
      medicalRecords={records}
    />
  )

  const tabs: AnimatedTabItem[] = [
    {
      value: 'ai-insights',
      label: 'AI record review',
      icon: Sparkles,
      badge: 'AI',
      content: AISummaryTab,
    },
    {
      value: 'vitals',
      label: 'Vitals & Biomarker Trends',
      icon: HeartPulse,
      badge: vitals.length,
      content: VitalsTab,
    },
    {
      value: 'reports',
      label: 'Lab Reports & Tests',
      icon: FileText,
      badge: labReports.length,
      content: ReportsTab,
    },
    {
      value: 'diagnoses',
      label: 'Medical History',
      icon: Activity,
      badge: clinicalDiagnoses.length,
      content: DiagnosesTab,
    },
    {
      value: 'medicines',
      label: 'Cabinet Medicines',
      icon: Pill,
      badge: medicines.length,
      content: MedicinesTab,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <Card className="bg-white border-[#2F4858]/15 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-5 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar className="size-16 sm:size-20 rounded-2xl border-2 border-[#2F4858]/20 bg-[#DDFBEF] text-[#2F4858] shadow-sm shrink-0">
              <AvatarFallback className="bg-[#DDFBEF] text-[#2F4858] font-black text-xl sm:text-2xl">
                {member.avatar_initials || member.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#2F4858]">{member.full_name}</h1>
                <Badge variant="outline" className="text-xs font-black uppercase bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8] px-2.5 py-0.5 rounded-full">
                  {member.relationship}
                </Badge>
                {ageInfo ? (
                  <Badge className={`text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs ${ageInfo.badgeColor}`}>
                    Age: {ageInfo.formatted} • {ageInfo.lifeStageLabel}
                  </Badge>
                ) : (
                  <EditFamilyMemberModal
                    member={member}
                    trigger={
                      <button className="text-sm font-bold text-muted-foreground hover:text-[#2F4858] underline cursor-pointer">
                        + Add birthdate
                      </button>
                    }
                  />
                )}
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                Dated records and household cabinet
              </p>
              {member.notes && (
                <p className="text-xs font-medium text-[#2F4858]/80 italic pt-0.5 max-w-md">
                  &quot;{member.notes}&quot;
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions & Allergy Stats */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto [&>div]:w-full sm:[&>div]:w-auto">
              <LogVitalModal
                familyMemberId={member.id}
                familyMemberName={member.full_name}
              />
              {inventoryIncomplete ? <p role="status" className="text-sm text-amber-950">The cabinet list is incomplete; retry before creating an emergency card.</p> : <EmergencyCardModal member={member} medicines={medicines} />}
              <EditFamilyMemberModal member={member} />
            </div>

            <div className="w-full sm:w-auto">
              {member.allergies && member.allergies.length > 0 ? (
                <div className="p-2.5 px-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-center sm:justify-start gap-2 text-xs font-bold shadow-xs">
                  <ShieldAlert className="size-4 text-rose-600 shrink-0" />
                  <div className="text-left">
                    <span className="block font-black text-sm uppercase tracking-wider text-rose-700">Allergies:</span>
                    <span>{member.allergies.join(', ')}</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center gap-2 text-xs font-bold">
                  <Info className="size-4 shrink-0" />
                  <span>Allergy history not assessed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Animated Tabs Content */}
      <AnimatedTabs tabs={tabs} defaultValue="reports" />
    </div>
  )
}
