'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Activity,
  Pill,
  ShieldAlert,
  Calendar,
  User,
  Plus,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Building,
  HeartPulse,
  Stethoscope,
  Info,
  Clock,
  Sun,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AnimatedTabs, type AnimatedTabItem } from '@/components/shadcn-space/tabs/tabs-08'
import { AddMedicalRecordModal } from '@/components/AddMedicalRecordModal'
import { MedicalRecordDetailModal } from '@/components/MedicalRecordDetailModal'
import { MedicineDetailsDrawer } from '@/components/MedicineDetailsDrawer'
import { LogVitalModal } from '@/components/LogVitalModal'
import { BiomarkerTrendChart } from '@/components/BiomarkerTrendChart'
import { calculateExpiryStatus } from '@/lib/utils/expiryCalculator'

interface FamilyMemberHealthHubProps {
  member: any
  medicalRecords: any[]
  vitalLogs: any[]
  medicines: any[]
}

export function FamilyMemberHealthHub({
  member,
  medicalRecords,
  vitalLogs,
  medicines,
}: FamilyMemberHealthHubProps) {
  const records = medicalRecords || []
  const vitals = vitalLogs || []

  const labReports = records.filter(r => r.record_type === 'LAB_REPORT' || r.record_type === 'IMAGING')
  const clinicalDiagnoses = records.filter(r => r.record_type === 'DIAGNOSIS' || r.record_type === 'DOCTOR_CONSULT' || r.record_type === 'DISCHARGE_SUMMARY' || r.diagnosis)

  // 1. Diagnostic Reports Tab
  const ReportsTab = (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#2F4858]/15 shadow-xs">
        <div>
          <h3 className="font-extrabold text-sm text-[#2F4858]">Diagnostic Lab Reports & Scans</h3>
          <p className="text-xs font-medium text-[#2F4858]/70">
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
            <p className="text-xs text-[#2F4858]/70 max-w-sm mx-auto mt-1 mb-4 font-medium">
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
            const abnormalCount = biomarkers.filter((b: any) => b.status === 'HIGH' || b.status === 'CRITICAL' || b.status === 'LOW').length

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
                      <CardDescription className="text-[11px] font-semibold text-[#2F4858]/70 flex items-center gap-1.5 mt-0.5">
                        {record.test_date && <span>{new Date(record.test_date).toLocaleDateString()}</span>}
                        {record.hospital_clinic && <span>• {record.hospital_clinic}</span>}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold bg-white text-[#2F4858] border-[#2F4858]/20 shrink-0">
                    {record.record_type}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  {record.diagnosis && (
                    <div className="p-2.5 rounded-xl bg-[#DDFBEF]/40 border border-[#B7EED8]">
                      <span className="font-extrabold text-[10px] uppercase text-[#2F4858]/70 block">Diagnosis:</span>
                      <span className="font-bold text-[#2F4858]">{record.diagnosis}</span>
                    </div>
                  )}

                  {biomarkers.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#2F4858]">
                        <span>Key Biomarkers ({biomarkers.length})</span>
                        {abnormalCount > 0 && (
                          <Badge variant="destructive" className="text-[9px] font-bold px-1.5 py-0">
                            {abnormalCount} Attention Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {biomarkers.slice(0, 4).map((bm: any, idx: number) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              bm.status === 'HIGH' || bm.status === 'CRITICAL'
                                ? 'bg-red-100 text-red-800 border-red-300 font-black'
                                : bm.status === 'LOW'
                                ? 'bg-amber-100 text-amber-800 border-amber-300 font-black'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                            }`}
                          >
                            {bm.name}: {bm.value} {bm.unit}
                          </span>
                        ))}
                        {biomarkers.length > 4 && (
                          <span className="text-[10px] font-bold text-[#2F4858]/60 self-center">
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
                      href={record.file_url}
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
          <Badge variant="outline" className="text-[10px] font-bold bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]">
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
          <p className="text-xs text-[#2F4858]/70 font-medium">No chronic conditions recorded in profile baseline.</p>
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
              <Stethoscope className="size-8 text-[#2F4858]/50 mb-2" />
              <p className="text-xs font-bold text-[#2F4858]">No diagnostic history entries recorded</p>
              <p className="text-[11px] text-[#2F4858]/60 mt-0.5">
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
                    <Badge variant="outline" className="text-[10px] font-bold bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]">
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
                  <div className="text-[11px] font-semibold text-[#2F4858]/60 flex items-center gap-2 pt-1">
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
          <p className="text-xs font-medium text-[#2F4858]/70">
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
            <Pill className="size-8 text-[#2F4858]/50 mb-2" />
            <p className="text-xs font-bold text-[#2F4858]">No medicines assigned to this member</p>
            <p className="text-[11px] text-[#2F4858]/60 mt-0.5 mb-4">
              Add medications to your cabinet and assign them to {member.full_name}.
            </p>
            <Button render={<Link href="/medicines/new" />} size="sm" className="bg-[#2F4858] text-[#DDFBEF] rounded-xl text-xs font-bold">
              Add Medicine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medicines.map((med) => {
            const status = calculateExpiryStatus(med.expiry_date);
            let statusColor = 'text-emerald-700 bg-emerald-100 border-emerald-200';
            let dotColor = 'bg-emerald-600';

            if (status.label === 'Expired' || status.label === '< 15 Days') {
              statusColor = 'text-rose-700 bg-rose-100 border-rose-200';
              dotColor = 'bg-rose-600';
            } else if (status.label === '< 45 Days') {
              statusColor = 'text-amber-700 bg-amber-100 border-amber-200';
              dotColor = 'bg-amber-600';
            }

            return (
              <Card key={med.id} className="bg-white border-[#2F4858]/15 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center">
                        <Pill className="size-4" />
                      </div>
                      <span className="font-extrabold text-sm text-[#2F4858]">{med.medicine_name}</span>
                    </div>
                    {med.is_daily_routine && (
                      <Badge variant="outline" className="text-[10px] font-bold bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                        <Sun className="size-2.5" /> Daily
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs font-bold text-[#2F4858]/80 bg-[#DDFBEF]/30 p-2 rounded-xl border border-[#B7EED8]">
                    {med.salt_composition}
                  </p>

                  {/* Expiry Banner */}
                  <div className={`flex items-center justify-between p-2 px-2.5 rounded-xl border text-xs font-bold ${statusColor}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span className="font-black text-xs">{status.label}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold tabular-nums text-xs">
                      <Clock className="size-3.5 opacity-80" />
                      <span>Exp: {new Date(med.expiry_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#2F4858]/70">
                    <span>Qty: {med.quantity} {med.unit}</span>
                    <span>• Spot: {med.storage_location}</span>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-[#2F4858]/10 flex items-center justify-between">
                  <MedicineDetailsDrawer medicine={med} />
                  <Link href={`/medicines/${med.id}`} className="text-xs font-bold text-[#2F4858] hover:underline">
                    Full Details →
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  // 0. Vitals & Biomarker Trends Tab
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
              </div>
              <p className="text-xs font-semibold text-[#2F4858]/70">
                Patient & Medical Records Guardian Profile
              </p>
              {member.notes && (
                <p className="text-xs font-medium text-[#2F4858]/80 italic pt-0.5 max-w-md">
                  "{member.notes}"
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions & Allergy Stats */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
              <LogVitalModal
                familyMemberId={member.id}
                familyMemberName={member.full_name}
              />
            </div>

            <div className="w-full sm:w-auto">
              {member.allergies && member.allergies.length > 0 ? (
                <div className="p-2.5 px-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-center sm:justify-start gap-2 text-xs font-bold shadow-xs">
                  <ShieldAlert className="size-4 text-rose-600 shrink-0" />
                  <div className="text-left">
                    <span className="block font-black text-[10px] uppercase tracking-wider text-rose-700">Allergies:</span>
                    <span>{member.allergies.join(', ')}</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 px-3 rounded-2xl bg-[#DDFBEF]/50 border border-[#B7EED8] text-[#2F4858] flex items-center justify-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>No Drug Allergies</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Animated Tabs Content */}
      <AnimatedTabs tabs={tabs} defaultValue="vitals" />
    </div>
  )
}
