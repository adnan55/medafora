'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Calendar,
  User,
  Building,
  Activity,
  ExternalLink,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Info,
  Edit3,
  Save,
  X,
  Plus,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { deleteMedicalRecord, updateMedicalRecord } from '@/app/actions/medicalRecords'

interface MedicalRecordDetailModalProps {
  record: any
  familyMemberName: string
  trigger?: React.ReactNode
  onDeleted?: () => void
  onUpdated?: () => void
}

export function MedicalRecordDetailModal({
  record,
  familyMemberName,
  trigger,
  onDeleted,
  onUpdated,
}: MedicalRecordDetailModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Editable Form States
  const [title, setTitle] = useState(record.title || '')
  const [recordType, setRecordType] = useState(record.record_type || 'LAB_REPORT')
  const [diagnosis, setDiagnosis] = useState(record.diagnosis || '')
  const [testDate, setTestDate] = useState(record.test_date ? record.test_date.split('T')[0] : '')
  const [hospitalClinic, setHospitalClinic] = useState(record.hospital_clinic || '')
  const [doctorName, setDoctorName] = useState(record.doctor_name || '')
  const [summary, setSummary] = useState(record.summary || '')
  const [biomarkers, setBiomarkers] = useState<any[]>(Array.isArray(record.biomarkers) ? record.biomarkers : [])

  // Sync state whenever record prop changes or modal opens
  useEffect(() => {
    setTitle(record.title || '')
    setRecordType(record.record_type || 'LAB_REPORT')
    setDiagnosis(record.diagnosis || '')
    setTestDate(record.test_date ? record.test_date.split('T')[0] : '')
    setHospitalClinic(record.hospital_clinic || '')
    setDoctorName(record.doctor_name || '')
    setSummary(record.summary || '')
    setBiomarkers(Array.isArray(record.biomarkers) ? record.biomarkers : [])
    setIsEditing(false)
    setErrorMessage('')
  }, [record, open])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this medical record?')) return
    setIsDeleting(true)
    try {
      const res = await deleteMedicalRecord(record.id, record.family_member_id)
      if (res.success) {
        setOpen(false)
        router.refresh()
        onDeleted?.()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddBiomarkerRow = () => {
    setBiomarkers((prev) => [
      ...prev,
      {
        name: '',
        value: '',
        unit: '',
        reference_range: '',
        status: 'NORMAL',
      },
    ])
  }

  const handleUpdateBiomarker = (index: number, field: string, value: string) => {
    setBiomarkers((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleRemoveBiomarker = (index: number) => {
    setBiomarkers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMessage('Report title cannot be empty.')
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    try {
      const res = await updateMedicalRecord(record.id, {
        family_member_id: record.family_member_id,
        title: title.trim(),
        record_type: recordType,
        diagnosis: diagnosis.trim() || undefined,
        test_date: testDate || undefined,
        doctor_name: doctorName.trim() || undefined,
        hospital_clinic: hospitalClinic.trim() || undefined,
        summary: summary.trim() || undefined,
        biomarkers: biomarkers.filter((b) => b.name?.trim()),
        ai_analysis: record.ai_analysis,
        file_url: record.file_url,
        file_name: record.file_name,
        file_type: record.file_type,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to update record.')
      }

      setIsEditing(false)
      router.refresh()
      onUpdated?.()
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating medical record.')
    } finally {
      setIsSaving(false)
    }
  }

  const aiAnalysis = record.ai_analysis || {}

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase()
    switch (s) {
      case 'HIGH':
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-red-600 text-white shadow-xs">
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
            {status}
          </span>
        )
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500 text-white shadow-xs">
            {status}
          </span>
        )
      case 'NORMAL':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
            {status}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#DDFBEF] text-[#2F4858] border border-[#B7EED8]">
            {status || 'RECORDED'}
          </span>
        )
    }
  }

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          size="sm"
          className="text-[#2F4858] hover:bg-[#DDFBEF]/50 rounded-xl text-xs font-bold cursor-pointer"
        >
          View Report & AI Summary
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[96vw] sm:w-[92vw] sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 bg-white border border-[#2F4858]/15 rounded-2xl sm:rounded-3xl shadow-2xl text-[#2F4858]">
        {/* Header with Title and Mode Toggle */}
        <DialogHeader className="pb-4 border-b border-[#2F4858]/10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 sm:size-12 rounded-2xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center shadow-sm shrink-0">
                <FileText className="size-5 sm:size-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-black text-[#2F4858] truncate">
                    {isEditing ? 'Edit Medical Record' : record.title}
                  </DialogTitle>
                </div>
                {!isEditing && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px] font-extrabold uppercase tracking-wider bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]">
                      {record.record_type}
                    </Badge>
                    {record.test_date && (
                      <span className="text-xs font-semibold text-[#2F4858]/70 flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(record.test_date).toLocaleDateString()}
                      </span>
                    )}
                    {record.hospital_clinic && (
                      <span className="text-xs font-semibold text-[#2F4858]/70 flex items-center gap-1">
                        <Building className="size-3" />
                        {record.hospital_clinic}
                      </span>
                    )}
                    {record.doctor_name && (
                      <span className="text-xs font-semibold text-[#2F4858]/70 flex items-center gap-1">
                        <User className="size-3" />
                        {record.doctor_name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Edit Button in Header */}
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="bg-[#F8FDFB] hover:bg-[#DDFBEF]/60 text-[#2F4858] border-[#2F4858]/20 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="size-3.5 text-[#2F4858]" />
                <span>Edit Record</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* EDIT MODE */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-5 pt-2">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-bold text-[#2F4858]">Report / Document Title</Label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Comprehensive Metabolic Panel (CMP)"
                  className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#2F4858]">Record Type</Label>
                <Select value={recordType} onValueChange={(val) => setRecordType(val || 'LAB_REPORT')}>
                  <SelectTrigger className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#2F4858]/20 bg-[#F8FDFB]">
                    <SelectItem value="LAB_REPORT" className="text-xs font-semibold">Diagnostic Lab Report</SelectItem>
                    <SelectItem value="DIAGNOSIS" className="text-xs font-semibold">Clinical Diagnosis</SelectItem>
                    <SelectItem value="DOCTOR_CONSULT" className="text-xs font-semibold">Doctor Prescription / Consult</SelectItem>
                    <SelectItem value="IMAGING" className="text-xs font-semibold">Imaging / Radiology / X-Ray</SelectItem>
                    <SelectItem value="DISCHARGE_SUMMARY" className="text-xs font-semibold">Hospital Discharge Summary</SelectItem>
                    <SelectItem value="VACCINATION" className="text-xs font-semibold">Immunization / Vaccine</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#2F4858]">Test / Consultation Date</Label>
                <Input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#2F4858]">Hospital / Lab / Clinic</Label>
                <Input
                  value={hospitalClinic}
                  onChange={(e) => setHospitalClinic(e.target.value)}
                  placeholder="e.g. Apollo Diagnostics"
                  className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#2F4858]">Consulting Doctor / Pathologist</Label>
                <Input
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-medium"
                />
              </div>
            </div>

            {/* Diagnosis / Clinical Impression */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">
                Clinical Impression & Diagnosis Name
              </Label>
              <Input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Type 2 Diabetes Mellitus, Iron Deficiency Anemia"
                className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-bold"
              />
            </div>

            {/* Clinical Summary */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">
                Medical Summary / Findings
              </Label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief summary of test findings or physician notes..."
                className="w-full p-3 rounded-xl border border-[#2F4858]/20 text-xs font-medium text-[#2F4858] bg-white focus:outline-none focus:ring-1 focus:ring-[#2F4858]"
              />
            </div>

            {/* Biomarkers / Test Parameters Table Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                  <Activity className="size-4" />
                  <span>Biomarkers & Test Results ({biomarkers.length})</span>
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddBiomarkerRow}
                  className="h-7 text-xs font-bold rounded-lg bg-[#DDFBEF]/50 border-[#B7EED8] text-[#2F4858] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Add Test Parameter</span>
                </Button>
              </div>

              {biomarkers.length > 0 ? (
                <div className="border border-[#2F4858]/15 rounded-2xl overflow-x-auto">
                  <table className="min-w-[520px] w-full text-xs">
                    <thead className="bg-[#F8FDFB] border-b border-[#2F4858]/10 text-[#2F4858]/70 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Test Name</th>
                        <th className="py-2.5 px-2 text-left w-24">Value</th>
                        <th className="py-2.5 px-2 text-left w-20">Unit</th>
                        <th className="py-2.5 px-2 text-left w-32">Status</th>
                        <th className="py-2.5 px-2 text-left">Ref Interval</th>
                        <th className="py-2.5 px-1 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2F4858]/10">
                      {biomarkers.map((bm, index) => (
                        <tr key={index} className="bg-white hover:bg-[#F8FDFB]/50">
                          <td className="p-1.5">
                            <Input
                              value={bm.name || ''}
                              onChange={(e) => handleUpdateBiomarker(index, 'name', e.target.value)}
                              placeholder="e.g. HbA1c"
                              className="h-9 text-xs font-bold rounded-lg border-[#2F4858]/20"
                            />
                          </td>
                          <td className="p-1.5">
                            <Input
                              value={bm.value || ''}
                              onChange={(e) => handleUpdateBiomarker(index, 'value', e.target.value)}
                              placeholder="5.8"
                              className="h-9 text-xs font-black rounded-lg border-[#2F4858]/20"
                            />
                          </td>
                          <td className="p-1.5">
                            <Input
                              value={bm.unit || ''}
                              onChange={(e) => handleUpdateBiomarker(index, 'unit', e.target.value)}
                              placeholder="%"
                              className="h-9 text-xs font-medium rounded-lg border-[#2F4858]/20"
                            />
                          </td>
                          <td className="p-1.5">
                            <Select
                              value={bm.status || 'NORMAL'}
                              onValueChange={(val) => handleUpdateBiomarker(index, 'status', val || 'NORMAL')}
                            >
                              <SelectTrigger className="h-9 text-xs font-bold rounded-lg border-[#2F4858]/20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-[#2F4858]/20 bg-[#F8FDFB]">
                                <SelectItem value="NORMAL" className="text-xs font-bold text-emerald-700">NORMAL</SelectItem>
                                <SelectItem value="HIGH" className="text-xs font-bold text-rose-700">HIGH</SelectItem>
                                <SelectItem value="LOW" className="text-xs font-bold text-amber-700">LOW</SelectItem>
                                <SelectItem value="CRITICAL" className="text-xs font-bold text-rose-800">CRITICAL</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-1.5">
                            <Input
                              value={bm.reference_range || ''}
                              onChange={(e) => handleUpdateBiomarker(index, 'reference_range', e.target.value)}
                              placeholder="e.g. 70 - 99"
                              className="h-9 text-xs font-medium rounded-lg border-[#2F4858]/20"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleRemoveBiomarker(index)}
                              className="text-rose-600 hover:bg-rose-100 rounded-md cursor-pointer size-8"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#F8FDFB] border border-dashed border-[#2F4858]/20 text-center">
                  <p className="text-xs text-[#2F4858]/60 font-medium">No biomarker parameters added. Click "+ Add Test Parameter" above.</p>
                </div>
              )}
            </div>

            {/* Form Save/Cancel Buttons */}
            <div className="pt-4 border-t border-[#2F4858]/10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="h-10 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] font-extrabold text-xs px-6 cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* VIEW MODE */
          <div className="space-y-5 pt-2">
            {/* Clinical Diagnosis Card */}
            {record.diagnosis && (
              <div className="p-4 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/15 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">
                  Clinical Impression & Diagnosis
                </span>
                <p className="text-sm font-black text-[#2F4858]">{record.diagnosis}</p>
              </div>
            )}

            {/* AI Clinical Summary */}
            {record.summary && (
              <div className="p-4 rounded-2xl bg-[#DDFBEF]/40 border border-[#B7EED8] space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#2F4858] uppercase tracking-wider">
                  <Sparkles className="size-3.5" />
                  <span>Executive Summary & Analysis</span>
                </div>
                <p className="text-xs font-medium text-[#2F4858]/90 leading-relaxed">
                  {record.summary}
                </p>
              </div>
            )}

            {/* Biomarkers Breakdown */}
            {biomarkers.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                  <Activity className="size-4" />
                  <span>Extracted Biomarkers & Test Parameters</span>
                </span>

                <div className="border border-[#2F4858]/10 rounded-2xl overflow-x-auto shadow-xs">
                  <table className="min-w-[480px] w-full text-left text-xs">
                    <thead className="bg-[#F8FDFB] border-b border-[#2F4858]/10 text-[#2F4858]/70 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Test Parameter</th>
                        <th className="py-2.5 px-3">Measured Result</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Standard Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2F4858]/10 font-semibold">
                      {biomarkers.map((bm: any, idx: number) => {
                        const isHigh = bm.status === 'HIGH' || bm.status === 'CRITICAL'
                        const isLow = bm.status === 'LOW'
                        return (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              isHigh
                                ? 'bg-rose-50/80 hover:bg-rose-100/80'
                                : isLow
                                ? 'bg-amber-50/50 hover:bg-amber-100/50'
                                : 'hover:bg-[#F8FDFB]/60'
                            }`}
                          >
                            <td className="py-3 px-3 font-bold text-[#2F4858]">
                              <div className="flex items-center gap-2">
                                {isHigh && <span className="size-2 rounded-full bg-red-600 shrink-0 ring-2 ring-red-200" />}
                                {isLow && <span className="size-2 rounded-full bg-amber-500 shrink-0 ring-2 ring-amber-200" />}
                                <span>{bm.name}</span>
                              </div>
                            </td>
                            <td className={`py-3 px-3 font-black text-sm ${isHigh ? 'text-red-700 font-black' : isLow ? 'text-amber-700 font-black' : 'text-[#2F4858]'}`}>
                              {bm.value} <span className="text-[11px] font-medium text-[#2F4858]/70">{bm.unit}</span>
                            </td>
                            <td className="py-3 px-3">{getStatusBadge(bm.status)}</td>
                            <td className="py-3 px-3 text-[#2F4858]/70 text-[11px] font-semibold">{bm.reference_range || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Key AI Recommendations */}
            {aiAnalysis?.key_recommendations && aiAnalysis.key_recommendations.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Info className="size-3.5 text-amber-700" />
                  <span>Clinical Recommendations & Follow-Up</span>
                </span>
                <ul className="list-disc list-inside space-y-1 text-xs font-semibold text-amber-900">
                  {aiAnalysis.key_recommendations.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Attached Document File Preview / Link */}
            {record.file_url && (
              <div className="p-3.5 sm:p-4 rounded-2xl border border-[#2F4858]/15 bg-[#F8FDFB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-[#DDFBEF] flex items-center justify-center text-[#2F4858] shrink-0">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#2F4858] truncate">{record.file_name || 'Medical Document Report'}</p>
                    <p className="text-[10px] font-semibold text-[#2F4858]/60 uppercase tracking-wider">{record.file_type || 'Attached Document'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={record.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto justify-center px-3.5 py-2 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Open Document</span>
                  </a>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-4 mt-4 border-t border-[#2F4858]/10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer h-10"
              >
                <Trash2 className="size-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Record'}</span>
              </Button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="bg-[#DDFBEF]/50 hover:bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer h-10"
                >
                  <Edit3 className="size-3.5 text-[#2F4858]" />
                  <span>Edit Report</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="rounded-xl text-xs font-bold cursor-pointer h-10"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
