'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Building,
  Activity,
  FileCheck,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { createMedicalRecord } from '@/app/actions/medicalRecords'

interface AddMedicalRecordModalProps {
  familyMemberId?: string
  familyMemberName?: string
  familyMembers?: Array<{ id: string; full_name: string; relationship?: string }>
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const RECORD_TYPES = [
  { value: 'LAB_REPORT', label: 'Diagnostic Lab Test' },
  { value: 'DIAGNOSIS', label: 'Clinical Diagnosis' },
  { value: 'PRESCRIPTION', label: 'Doctor Prescription' },
  { value: 'IMAGING', label: 'X-Ray / MRI / Scan' },
  { value: 'DOCTOR_CONSULT', label: 'Consultation Note' },
  { value: 'DISCHARGE_SUMMARY', label: 'Hospital Summary' },
]

export function AddMedicalRecordModal({
  familyMemberId,
  familyMemberName,
  familyMembers,
  trigger,
  onSuccess,
}: AddMedicalRecordModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  
  // Selected Member state
  const [selectedMemberId, setSelectedMemberId] = useState(
    familyMemberId || (familyMembers && familyMembers.length > 0 ? familyMembers[0].id : '')
  )
  const currentMember = familyMembers?.find(m => m.id === selectedMemberId)
  const activeMemberName = familyMemberName || currentMember?.full_name || 'Family Member'

  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  
  // Form State
  const [title, setTitle] = useState('')
  const [recordType, setRecordType] = useState('LAB_REPORT')
  const [diagnosis, setDiagnosis] = useState('')
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0])
  const [doctorName, setDoctorName] = useState('')
  const [hospitalClinic, setHospitalClinic] = useState('')
  const [summary, setSummary] = useState('')
  const [biomarkers, setBiomarkers] = useState<
    Array<{ name: string; value: string; unit: string; status: string; reference_range: string }>
  >([])
  const [aiAnalysis, setAiAnalysis] = useState<any>({})

  // Loading States
  const [isAiScanning, setIsAiScanning] = useState(false)
  const [aiSuccessMessage, setAiSuccessMessage] = useState('')
  const [aiError, setAiError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    setAiError('')
    setAiSuccessMessage('')

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setFilePreview(reader.result as string)
      reader.readAsDataURL(selectedFile)
    } else {
      setFilePreview(null)
    }
  }

  const handleAiScan = async () => {
    if (!file && !summary) {
      setAiError('Please select a file (.pdf, .jpg, .png) or provide clinical notes first.')
      return
    }

    setIsAiScanning(true)
    setAiError('')
    setAiSuccessMessage('')

    try {
      let fileBase64 = ''
      let mimeType = ''

      if (file) {
        mimeType = file.type
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            const base64 = result.split(',')[1]
            resolve(base64)
          }
          reader.onerror = (error) => reject(error)
          reader.readAsDataURL(file)
        })
      }

      const res = await fetch('/api/ai/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          mimeType,
          notes: summary,
          patientName: familyMemberName,
        }),
      })

      const data = await res.json()

      if (!data.success || !data.data) {
        throw new Error(data.error || 'AI analysis failed')
      }

      const extracted = data.data

      // Populate form fields from AI response
      if (extracted.title) setTitle(extracted.title)
      if (extracted.record_type) setRecordType(extracted.record_type)
      if (extracted.test_date) setTestDate(extracted.test_date)
      if (extracted.doctor_name) setDoctorName(extracted.doctor_name)
      if (extracted.hospital_clinic) setHospitalClinic(extracted.hospital_clinic)
      if (extracted.diagnosis) setDiagnosis(extracted.diagnosis)
      if (extracted.summary) setSummary(extracted.summary)
      if (extracted.biomarkers && Array.isArray(extracted.biomarkers)) {
        setBiomarkers(extracted.biomarkers)
      }
      setAiAnalysis(extracted)
      setAiSuccessMessage('Report successfully extracted and parsed by AI!')

    } catch (err: any) {
      console.error(err)
      setAiError(err.message || 'Failed to scan report with AI')
    } finally {
      setIsAiScanning(false)
    }
  }

  const handleAddBiomarker = () => {
    setBiomarkers([
      ...biomarkers,
      { name: '', value: '', unit: '', status: 'NORMAL', reference_range: '' },
    ])
  }

  const handleRemoveBiomarker = (index: number) => {
    setBiomarkers(biomarkers.filter((_, i) => i !== index))
  }

  const handleBiomarkerChange = (index: number, field: string, value: string) => {
    const updated = [...biomarkers]
    updated[index] = { ...updated[index], [field]: value }
    setBiomarkers(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setSaveError('Report title is required.')
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      let fileUrl = ''
      let fileName = ''
      let fileType = ''

      // Upload file to Supabase Storage if present
      if (file) {
        const supabase = createClient()
        const fileExt = file.name.split('.').pop()
        const cleanFileName = `${familyMemberId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('medical_reports')
          .upload(cleanFileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw new Error('Failed to upload file to storage: ' + uploadError.message)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('medical_reports')
          .getPublicUrl(uploadData.path)

        fileUrl = publicUrl
        fileName = file.name
        fileType = file.type
      }

      const result = await createMedicalRecord({
        family_member_id: selectedMemberId,
        title,
        record_type: recordType,
        diagnosis,
        test_date: testDate,
        doctor_name: doctorName,
        hospital_clinic: hospitalClinic,
        summary,
        biomarkers,
        ai_analysis: aiAnalysis,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to save record')
      }

      // Reset Form State
      setTitle('')
      setDiagnosis('')
      setSummary('')
      setDoctorName('')
      setHospitalClinic('')
      setBiomarkers([])
      setAiAnalysis({})
      setFile(null)
      setFilePreview(null)
      setAiSuccessMessage('')

      setOpen(false)
      router.refresh()
      onSuccess?.()
    } catch (err: any) {
      setSaveError(err.message || 'Error saving medical record.')
    } finally {
      setIsSaving(false)
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
          size="sm"
          className="bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] rounded-xl font-extrabold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Add Lab Report / Diagnosis</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[96vw] sm:w-[92vw] sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 bg-white border border-[#2F4858]/15 rounded-2xl sm:rounded-3xl shadow-2xl text-[#2F4858]">
        <DialogHeader className="pb-4 border-b border-[#2F4858]/10">
          <div className="flex items-center gap-3">
            <div className="size-10 sm:size-11 rounded-2xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center shadow-sm shrink-0">
              <FileText className="size-5 sm:size-6" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-[#2F4858]">
                Add Medical Record for {activeMemberName}
              </DialogTitle>
              <p className="text-xs font-semibold text-[#2F4858]/70">
                Upload reports (.pdf, .jpg, .png) or use AI to extract diagnoses and test biomarkers.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Member Selector if multiple family members provided */}
        {familyMembers && familyMembers.length > 1 && (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <Label className="text-xs font-bold text-[#2F4858] shrink-0">Select Family Member:</Label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858] focus:outline-none focus:ring-1 focus:ring-[#2F4858] w-full sm:max-w-xs cursor-pointer"
            >
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} {m.relationship ? `(${m.relationship})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* AI Multimodal Scanner Section */}
        <div className="p-4 rounded-2xl bg-[#DDFBEF]/50 border border-[#B7EED8] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#2F4858]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#2F4858]">
                AI Report Scanner & Multimodal OCR
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold bg-white text-[#2F4858] border-[#2F4858]/20">
              Gemini Vision
            </Badge>
          </div>

          <p className="text-xs font-medium text-[#2F4858]/80 leading-relaxed">
            Attach any lab test report, doctor prescription, or diagnostic scan image. Our AI will automatically read values, flag abnormal biomarkers, and summarize the diagnosis.
          </p>

          {/* File Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#2F4858]/30 hover:border-[#2F4858] rounded-2xl p-4 text-center bg-white/80 cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-[#DDFBEF] flex items-center justify-center text-[#2F4858]">
                    {file.type.startsWith('image/') ? <ImageIcon className="size-5" /> : <FileText className="size-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-[#2F4858] truncate max-w-xs">{file.name}</p>
                    <p className="text-[10px] font-semibold text-[#2F4858]/60">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Document'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setFilePreview(null)
                  }}
                  className="text-rose-600 hover:bg-rose-50"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-2">
                <UploadCloud className="size-8 text-[#2F4858]/60 mb-1" />
                <span className="text-xs font-bold text-[#2F4858]">
                  Click or drag and drop to upload report
                </span>
                <span className="text-[10px] text-[#2F4858]/60 mt-0.5">
                  Supports PDF, JPG, PNG, WEBP (Lab Tests, Blood Panels, Imaging, Prescriptions)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              disabled={isAiScanning || (!file && !summary)}
              onClick={handleAiScan}
              className="w-full h-10 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isAiScanning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>AI Reading & Extracting Medical Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Scan & Auto-Extract Details with AI</span>
                </>
              )}
            </Button>
          </div>

          {aiSuccessMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>{aiSuccessMessage}</span>
            </div>
          )}

          {aiError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-600 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}
        </div>

        {/* Manual Review & Structured Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">Report / Test Title *</Label>
              <Input
                required
                placeholder="e.g. Lipid Profile & Blood Sugar Panel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">Record Category</Label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer"
              >
                {RECORD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">Date of Test</Label>
              <Input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">Doctor / Physician</Label>
              <Input
                placeholder="e.g. Dr. Jennifer Adams"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">Hospital / Lab</Label>
              <Input
                placeholder="e.g. Quest Diagnostics"
                value={hospitalClinic}
                onChange={(e) => setHospitalClinic(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-[#2F4858]">Clinical Diagnosis / Findings</Label>
            <Input
              placeholder="e.g. Hyperlipidemia, Borderline Fasting Glucose"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-[#2F4858]">Clinical Summary & Interpretation</Label>
            <textarea
              rows={3}
              placeholder="Summary of report conclusions, abnormal findings, or doctor advice..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#2F4858]/20 bg-white text-xs font-medium text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none"
            />
          </div>

          {/* Biomarkers / Key Test Values List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#2F4858] flex items-center gap-1.5">
                <Activity className="size-3.5 text-[#2F4858]" />
                <span>Extracted Biomarkers & Test Parameters ({biomarkers.length})</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleAddBiomarker}
                className="rounded-lg text-[11px] font-bold border-[#2F4858]/20 text-[#2F4858] hover:bg-[#DDFBEF]/50 cursor-pointer flex items-center gap-1"
              >
                <Plus className="size-3" />
                <span>Add Biomarker</span>
              </Button>
            </div>

            {biomarkers.length > 0 && (
              <div className="space-y-2 border border-[#2F4858]/10 rounded-2xl p-2.5 sm:p-3 bg-[#F8FDFB] max-h-60 overflow-y-auto">
                {biomarkers.map((bm, index) => (
                  <div key={index} className="p-2.5 rounded-xl bg-white border border-[#2F4858]/15 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        placeholder="Test Name (e.g. Fasting Glucose, HbA1c)"
                        value={bm.name}
                        onChange={(e) => handleBiomarkerChange(index, 'name', e.target.value)}
                        className="h-9 rounded-lg text-xs font-bold flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveBiomarker(index)}
                        className="text-rose-600 hover:bg-rose-50 size-8 rounded-lg shrink-0 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Input
                          placeholder="Value"
                          value={bm.value}
                          onChange={(e) => handleBiomarkerChange(index, 'value', e.target.value)}
                          className="h-9 rounded-lg text-xs font-black w-full"
                        />
                        <Input
                          placeholder="Unit"
                          value={bm.unit}
                          onChange={(e) => handleBiomarkerChange(index, 'unit', e.target.value)}
                          className="h-9 rounded-lg text-xs w-20"
                        />
                      </div>

                      <select
                        value={bm.status}
                        onChange={(e) => handleBiomarkerChange(index, 'status', e.target.value)}
                        className={`h-9 px-2 rounded-lg text-xs font-black border cursor-pointer w-full ${
                          bm.status === 'HIGH' || bm.status === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : bm.status === 'LOW'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="LOW">LOW</option>
                        <option value="ABNORMAL">ABNORMAL</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>

                      <div className="col-span-2 sm:col-span-1">
                        <Input
                          placeholder="Ref Range (e.g. 70-99)"
                          value={bm.reference_range}
                          onChange={(e) => handleBiomarkerChange(index, 'reference_range', e.target.value)}
                          className="h-9 rounded-lg text-xs w-full text-[#2F4858]/80"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {saveError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {saveError}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-[#2F4858]/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-10 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] font-extrabold text-xs px-6 cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSaving ? 'Saving Record...' : 'Save Medical Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
