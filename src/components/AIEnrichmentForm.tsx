'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Sparkles,
  Pill,
  Save,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Building,
  ShieldAlert,
  Info,
  Clock,
  Layers,
  FileCheck,
  Plus,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { calculateAge, checkAgeSpecificMedicineAlerts } from '@/lib/utils/ageCalculator'

const STORAGE_OPTIONS = [
  'Bedroom Cabinet',
  'Bathroom Mirror Box',
  'Kitchen Pantry Top Shelf',
  'Refrigerator Door (2-8°C)',
  'First-Aid Kit (Travel)',
  'Office Desk Drawer',
  'Living Room Sideboard',
]

const DOSAGE_FORMS = [
  'TABLET',
  'CAPSULE',
  'SYRUP',
  'OINTMENT',
  'DROPS',
  'INHALER',
  'CREAM',
  'GEL',
  'INJECTION',
  'POWDER / SACHET',
]

const QUANTITY_UNITS = [
  'TABLETS',
  'CAPSULES',
  'STRIPS',
  'BOTTLE (ML)',
  'TUBE (G)',
  'SACHETS',
  'VIALS',
  'PUFFS / DOSES',
]

interface FamilyMember {
  id: string
  full_name: string
  relationship: string
  date_of_birth?: string | null
  birth_date?: string | null
  allergies?: string[]
}

interface MedicineData {
  id?: string
  medicine_name?: string
  brand_or_manufacturer?: string
  salt_composition?: string
  dosage_form?: string
  strength?: string
  quantity?: number
  unit?: string
  expiry_date?: string
  manufacture_date?: string
  batch_number?: string
  storage_location?: string
  family_member_id?: string
  primary_uses?: string
  dosage_instructions?: string
  target_diseases?: string[]
  precautions?: string
  is_daily_routine?: boolean
  is_prescription_required?: boolean
}

interface UploadedImageItem {
  id: string
  file: File
  preview: string
  label: string
}

export function AIEnrichmentForm({
  familyMembers = [],
  initialData,
}: {
  familyMembers: FamilyMember[]
  initialData?: MedicineData
}) {
  const router = useRouter()

  // Input Mode: 'SCAN' | 'MANUAL'
  const [entryMode, setEntryMode] = useState<'SCAN' | 'MANUAL'>(
    initialData?.id ? 'MANUAL' : 'SCAN'
  )

  // Multi-Image Upload State
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([])
  const [scanNotes, setScanNotes] = useState('')
  const [isAiScanning, setIsAiScanning] = useState(false)
  const [scanSuccessSummary, setScanSuccessSummary] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  // Form Fields State
  const [medicineName, setMedicineName] = useState(initialData?.medicine_name || '')
  const [brandOrManufacturer, setBrandOrManufacturer] = useState(initialData?.brand_or_manufacturer || '')
  const [saltComposition, setSaltComposition] = useState(initialData?.salt_composition || '')
  const [dosageForm, setDosageForm] = useState(initialData?.dosage_form || 'TABLET')
  const [strength, setStrength] = useState(initialData?.strength || '')
  const [quantity, setQuantity] = useState(initialData?.quantity || 10)
  const [unit, setUnit] = useState(initialData?.unit || 'TABLETS')
  const [expiryDate, setExpiryDate] = useState(
    initialData?.expiry_date ? initialData.expiry_date.split('T')[0] : ''
  )
  const [manufactureDate, setManufactureDate] = useState(
    initialData?.manufacture_date ? initialData.manufacture_date.split('T')[0] : ''
  )
  const [batchNumber, setBatchNumber] = useState(initialData?.batch_number || '')
  const [storageLocation, setStorageLocation] = useState(
    initialData?.storage_location || 'Bedroom Cabinet'
  )
  const [familyMemberId, setFamilyMemberId] = useState(initialData?.family_member_id || '')
  const [primaryUses, setPrimaryUses] = useState(initialData?.primary_uses || '')
  const [dosageInstructions, setDosageInstructions] = useState(
    initialData?.dosage_instructions || ''
  )
  const [precautions, setPrecautions] = useState(initialData?.precautions || '')
  const [targetDiseases, setTargetDiseases] = useState<string[]>(
    initialData?.target_diseases || []
  )
  const [isDailyRoutine, setIsDailyRoutine] = useState(initialData?.is_daily_routine || false)
  const [isPrescriptionRequired, setIsPrescriptionRequired] = useState(
    initialData?.is_prescription_required || false
  )

  // Single-Text AI Auto-fill Loading State
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Selected Member Details for Safety Verification
  const selectedMember = familyMembers.find((m) => m.id === familyMemberId)
  const memberAgeInfo = calculateAge(selectedMember?.date_of_birth || selectedMember?.birth_date)
  const ageAlert = checkAgeSpecificMedicineAlerts(medicineName, saltComposition, memberAgeInfo)

  // Check Allergy Conflicts
  const allergyConflict = (() => {
    if (!selectedMember || !Array.isArray(selectedMember.allergies)) return null
    const text = `${medicineName} ${saltComposition}`.toLowerCase()
    for (const allergy of selectedMember.allergies) {
      if (allergy && text.includes(allergy.toLowerCase())) {
        return `🚨 ALLERGY WARNING: Contains "${allergy}" which conflicts with ${selectedMember.full_name}'s allergy profile!`
      }
    }
    return null
  })()

  // Handle Multi-Image Selection
  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newItems: UploadedImageItem[] = []
    Array.from(files).forEach((file, idx) => {
      if (file.type.startsWith('image/')) {
        const totalCount = uploadedImages.length + newItems.length + 1
        const defaultLabel =
          totalCount === 1
            ? 'Front (Brand & Salts)'
            : totalCount === 2
            ? 'Back (Expiry & Batch)'
            : `Photo ${totalCount}`

        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          preview: URL.createObjectURL(file),
          label: defaultLabel,
        })
      }
    })

    setUploadedImages((prev) => [...prev, ...newItems])
    setScanError(null)
    setScanSuccessSummary(null)
  }

  const handleRemoveImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id))
  }

  // Multi-Image AI Vision Scan Handler
  const handleScanMedicinePhotos = async () => {
    if (uploadedImages.length === 0) {
      setScanError('Please upload or capture at least 1 photo of the medicine.')
      return
    }

    setIsAiScanning(true)
    setScanError(null)
    setScanSuccessSummary(null)

    try {
      // Convert all images to Base64 in parallel
      const imagePayloads = await Promise.all(
        uploadedImages.map(async (img) => {
          return new Promise<{ fileBase64: string; mimeType: string; label: string }>(
            (resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                resolve({
                  fileBase64: reader.result as string,
                  mimeType: img.file.type,
                  label: img.label,
                })
              }
              reader.onerror = reject
              reader.readAsDataURL(img.file)
            }
          )
        })
      )

      const res = await fetch('/api/ai/scan-medicine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imagePayloads,
          notes: scanNotes,
        }),
      })

      const json = await res.json()

      if (json.success && json.data) {
        const d = json.data

        // Auto-fill extracted values into form
        if (d.medicine_name) setMedicineName(d.medicine_name)
        if (d.salt_composition) setSaltComposition(d.salt_composition)
        if (d.brand_or_manufacturer) setBrandOrManufacturer(d.brand_or_manufacturer)
        if (d.dosage_form) setDosageForm(d.dosage_form.toUpperCase())
        if (d.strength) setStrength(d.strength)
        if (d.expiry_date) setExpiryDate(d.expiry_date)
        if (d.manufacture_date) setManufactureDate(d.manufacture_date)
        if (d.batch_number) setBatchNumber(d.batch_number)
        if (d.quantity) setQuantity(Number(d.quantity))
        if (d.unit) setUnit(d.unit.toUpperCase())
        if (d.storage_location) setStorageLocation(d.storage_location)
        if (d.primary_uses) setPrimaryUses(d.primary_uses)
        if (d.dosage_instructions) setDosageInstructions(d.dosage_instructions)
        if (d.precautions) setPrecautions(d.precautions)
        if (Array.isArray(d.target_diseases)) setTargetDiseases(d.target_diseases)
        if (typeof d.is_daily_routine === 'boolean') setIsDailyRoutine(d.is_daily_routine)
        if (typeof d.is_prescription_required === 'boolean')
          setIsPrescriptionRequired(d.is_prescription_required)

        setScanSuccessSummary(
          `✨ Detected: ${d.medicine_name || 'Medicine'} (${d.salt_composition || 'Active Salts'})${
            d.expiry_date ? ` • Expiry: ${d.expiry_date}` : ''
          }${d.brand_or_manufacturer ? ` • By ${d.brand_or_manufacturer}` : ''}`
        )
      } else {
        setScanError(json.error || 'Failed to analyze medicine photos.')
      }
    } catch (err: any) {
      console.error('Scan error:', err)
      setScanError(err.message || 'Failed to connect to AI vision scanner.')
    } finally {
      setIsAiScanning(false)
    }
  }

  // Single Text AI Auto-Fill from Medicine Name
  const handleAiAutoFill = async () => {
    if (!medicineName.trim()) {
      setAiError('Please enter a medicine name first.')
      return
    }
    setIsAiLoading(true)
    setAiError('')

    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineName }),
      })
      const { success, data, error } = await res.json()

      if (success && data) {
        if (data.salt_composition) setSaltComposition(data.salt_composition)
        if (data.dosage_form) setDosageForm(data.dosage_form.toUpperCase())
        if (data.brand_or_manufacturer) setBrandOrManufacturer(data.brand_or_manufacturer)
        if (data.primary_uses) setPrimaryUses(data.primary_uses)
        if (data.dosage_instructions) setDosageInstructions(data.dosage_instructions)
        if (data.target_diseases) setTargetDiseases(data.target_diseases)
      } else {
        setAiError(error || 'Failed to auto-fill details.')
      }
    } catch (e) {
      setAiError('Failed to connect to AI service.')
    } finally {
      setIsAiLoading(false)
    }
  }

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveError('')

    try {
      const isEdit = !!initialData?.id
      const endpoint = isEdit ? `/api/medicines/${initialData.id}` : '/api/medicines'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: medicineName.trim(),
          brand_or_manufacturer: brandOrManufacturer.trim() || null,
          salt_composition: saltComposition.trim(),
          dosage_form: dosageForm,
          strength: strength.trim() || null,
          quantity: Number(quantity),
          unit,
          expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
          manufacture_date: manufactureDate ? new Date(manufactureDate).toISOString() : null,
          batch_number: batchNumber.trim() || null,
          storage_location: storageLocation,
          family_member_id: familyMemberId || null,
          primary_uses: primaryUses.trim() || null,
          dosage_instructions: dosageInstructions.trim() || null,
          precautions: precautions.trim() || null,
          target_diseases: targetDiseases,
          is_prescription_required: isPrescriptionRequired,
          is_daily_routine: isDailyRoutine,
        }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const errorData = await res.json()
        setSaveError('Failed to save medicine: ' + (errorData.error || 'Server error'))
      }
    } catch (err) {
      setSaveError('Network error while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="bg-white w-full rounded-2xl sm:rounded-3xl shadow-sm border border-[#2F4858]/15 overflow-hidden flex flex-col">
      {/* Header */}
      <CardHeader className="p-4 sm:p-6 border-b border-[#2F4858]/15 bg-[#F8FDFB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-[#2F4858] flex items-center justify-center text-[#DDFBEF] shadow-sm shrink-0">
            <Pill className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg sm:text-xl font-black text-[#2F4858]">
              {initialData?.id ? 'Edit Medicine Details' : 'Add Medicine to Family Cabinet'}
            </CardTitle>
            <CardDescription className="text-xs text-[#2F4858]/70 font-semibold mt-0.5">
              AI Multi-Photo Vision Scanner & Smart Expiry / Safety Guardian
            </CardDescription>
          </div>
        </div>

        {/* Choice Toggle: AI Photo Scan vs Manual Entry */}
        {!initialData?.id && (
          <div className="flex items-center bg-[#DDFBEF]/60 p-1 rounded-xl border border-[#B7EED8] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setEntryMode('SCAN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                entryMode === 'SCAN'
                  ? 'bg-[#2F4858] text-[#DDFBEF] shadow-xs'
                  : 'text-[#2F4858] hover:bg-[#DDFBEF]'
              }`}
            >
              <Camera className="size-3.5" />
              <span>📸 AI Photo Scan</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('MANUAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                entryMode === 'MANUAL'
                  ? 'bg-[#2F4858] text-[#DDFBEF] shadow-xs'
                  : 'text-[#2F4858] hover:bg-[#DDFBEF]'
              }`}
            >
              <span>✍️ Manual Entry</span>
            </button>
          </div>
        )}
      </CardHeader>

      <div className="p-4 sm:p-6 space-y-6">
        {/* ========================================================================= */}
        {/* OPTION 1: MULTI-IMAGE AI VISION SCANNER SECTION                           */}
        {/* ========================================================================= */}
        {entryMode === 'SCAN' && !initialData?.id && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#DDFBEF]/40 border-2 border-dashed border-[#B7EED8] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                  <Sparkles className="size-4 text-[#2F4858]" />
                  <span>Multi-Photo AI Recognition (Front, Back & Packaging)</span>
                </h3>
                <p className="text-xs font-medium text-[#2F4858]/80">
                  Upload multiple photos to capture brand name, active salts, batch, and expiry date.
                </p>
              </div>

              {/* Upload & Camera Buttons */}
              <div className="flex items-center gap-2 pt-1 sm:pt-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleAddFiles(e.target.files)}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  capture="environment"
                  accept="image/*"
                  onChange={(e) => handleAddFiles(e.target.files)}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white hover:bg-white/80 text-[#2F4858] border-[#2F4858]/20 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 h-9"
                >
                  <UploadCloud className="size-3.5" />
                  <span>Choose Photos</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  className="bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] rounded-xl text-xs font-extrabold shadow-xs cursor-pointer flex items-center gap-1.5 h-9"
                >
                  <Camera className="size-3.5" />
                  <span>Take Photo</span>
                </Button>
              </div>
            </div>

            {/* Uploaded Photos Gallery Preview */}
            {uploadedImages.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {uploadedImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className="relative group rounded-xl overflow-hidden border border-[#2F4858]/20 bg-white shadow-xs flex flex-col"
                    >
                      <div className="relative h-28 w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={img.preview}
                          alt={img.label}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          className="absolute top-1.5 right-1.5 size-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 cursor-pointer"
                          title="Remove photo"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <div className="p-2 bg-white flex items-center justify-between text-[10px] font-bold text-[#2F4858]">
                        <span className="truncate">{img.label}</span>
                        <span className="text-[#2F4858]/60 font-mono">
                          {(img.file.size / 1024).toFixed(0)}KB
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Add More Photos Slot */}
                  {uploadedImages.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-36 rounded-xl border-2 border-dashed border-[#2F4858]/30 hover:border-[#2F4858] bg-white/60 hover:bg-white flex flex-col items-center justify-center text-center p-3 transition-colors cursor-pointer"
                    >
                      <Plus className="size-5 text-[#2F4858]/70 mb-1" />
                      <span className="text-xs font-bold text-[#2F4858]">Add Another Photo</span>
                      <span className="text-[10px] font-semibold text-[#2F4858]/60 mt-0.5">
                        Back / Expiry / Flap
                      </span>
                    </button>
                  )}
                </div>

                {/* Scan Action Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold text-[#2F4858]/70">
                    📸 {uploadedImages.length} photo(s) selected. Click below to let AI read all labels, ingredients, batch, and expiry dates.
                  </p>

                  <Button
                    type="button"
                    onClick={handleScanMedicinePhotos}
                    disabled={isAiScanning}
                    className="w-full sm:w-auto px-6 h-10 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] font-black text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isAiScanning ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-[#DDFBEF]" />
                        <span>Scanning {uploadedImages.length} Photo(s) with Gemini Vision...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        <span>Analyze & Auto-Populate Medicine</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-2">
                <div className="flex justify-center gap-2 text-xs font-bold text-[#2F4858]/70">
                  <span className="p-1.5 px-2.5 rounded-lg bg-white border border-[#2F4858]/10">
                    📸 Photo 1: Front (Brand Name & Strength)
                  </span>
                  <span className="p-1.5 px-2.5 rounded-lg bg-white border border-[#2F4858]/10">
                    📸 Photo 2: Back (Expiry, Batch & Manufacturer)
                  </span>
                </div>
              </div>
            )}

            {scanError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            {scanSuccessSummary && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-start gap-2 shadow-xs animate-in fade-in-50">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p>{scanSuccessSummary}</p>
                  <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                    Review and adjust any fields below, then click "Save Medicine" to complete.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* EDITABLE FORM FIELDS (Common to both AI Scan and Manual Entry)            */}
        {/* ========================================================================= */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* AI Name Auto-Fill Assistant (When in Manual Mode) */}
          {entryMode === 'MANUAL' && (
            <Card className="p-4 rounded-2xl bg-[#DDFBEF]/50 border border-[#B7EED8] shadow-none">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-black text-[#2F4858]">
                    <Sparkles className="size-4 text-[#2F4858]" />
                    <span>AI Pharmacological Auto-Filler</span>
                  </div>
                  <p className="text-[#2F4858]/80 font-medium">
                    Type a brand name (e.g. <em>Augmentin 625, Calpol, Pan-D</em>) and auto-fill active salts, dosage, and uses.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleAiAutoFill}
                  disabled={isAiLoading}
                  className="px-4 h-9 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] font-extrabold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer text-xs"
                >
                  <Sparkles className={`size-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                  <span>{isAiLoading ? 'Analyzing...' : 'Auto-Fill from Name'}</span>
                </Button>
              </div>
            </Card>
          )}

          {aiError && (
            <div className="text-xs text-rose-700 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200">
              {aiError}
            </div>
          )}

          {/* Safety & Allergy Alerts for Selected Member */}
          {allergyConflict && (
            <div className="p-3.5 rounded-xl bg-rose-100 border-2 border-rose-300 text-rose-900 text-xs font-black flex items-center gap-2 shadow-xs">
              <ShieldAlert className="size-5 text-rose-600 shrink-0" />
              <span>{allergyConflict}</span>
            </div>
          )}

          {ageAlert.hasWarning && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2 shadow-xs">
              <AlertTriangle className="size-5 text-amber-600 shrink-0" />
              <span>{ageAlert.message}</span>
            </div>
          )}

          {/* Core Medicine Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="medicineName" className="text-xs font-bold text-[#2F4858]">
                Medicine / Brand Name <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="medicineName"
                type="text"
                required
                disabled={isSaving}
                placeholder="e.g. Augmentin 625 Duo, Calpol 650"
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="saltComposition" className="text-xs font-bold text-[#2F4858]">
                Active Salt / Generic Composition <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="saltComposition"
                type="text"
                required
                disabled={isSaving}
                placeholder="e.g. Amoxicillin 500mg + Potassium Clavulanate 125mg"
                value={saltComposition}
                onChange={(e) => setSaltComposition(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858]"
              />
            </div>
          </div>

          {/* Manufacturer & Strength Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="brandOrManufacturer" className="text-xs font-bold text-[#2F4858]">
                Manufacturer / Pharmaceutical Company
              </Label>
              <Input
                id="brandOrManufacturer"
                type="text"
                disabled={isSaving}
                placeholder="e.g. GlaxoSmithKline, Cipla, Sun Pharma"
                value={brandOrManufacturer}
                onChange={(e) => setBrandOrManufacturer(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dosageForm" className="text-xs font-bold text-[#2F4858]">
                  Dosage Form
                </Label>
                <select
                  id="dosageForm"
                  disabled={isSaving}
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer shadow-xs"
                >
                  {DOSAGE_FORMS.map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="strength" className="text-xs font-bold text-[#2F4858]">
                  Strength
                </Label>
                <Input
                  id="strength"
                  type="text"
                  disabled={isSaving}
                  placeholder="e.g. 625mg, 10mg/5ml"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858]"
                />
              </div>
            </div>
          </div>

          {/* Dates & Batch Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expiryDate" className="text-xs font-bold text-[#2F4858]">
                Expiry Date <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="expiryDate"
                type="date"
                required
                disabled={isSaving}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manufactureDate" className="text-xs font-bold text-[#2F4858]">
                Manufacture Date <span className="text-xs text-[#2F4858]/60">(Optional)</span>
              </Label>
              <Input
                id="manufactureDate"
                type="date"
                disabled={isSaving}
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batchNumber" className="text-xs font-bold text-[#2F4858]">
                Batch / Lot Number
              </Label>
              <Input
                id="batchNumber"
                type="text"
                disabled={isSaving}
                placeholder="e.g. B24098"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858]"
              />
            </div>
          </div>

          {/* Quantity, Unit, and Storage Location */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-xs font-bold text-[#2F4858]">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                required
                disabled={isSaving}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit" className="text-xs font-bold text-[#2F4858]">
                Unit
              </Label>
              <select
                id="unit"
                disabled={isSaving}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer shadow-xs"
              >
                {QUANTITY_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="storageLocation" className="text-xs font-bold text-[#2F4858]">
                Storage Location in Home
              </Label>
              <select
                id="storageLocation"
                disabled={isSaving}
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer shadow-xs"
              >
                {STORAGE_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Family Member Assignment */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/15">
            <div className="flex items-center justify-between">
              <Label htmlFor="familyMemberId" className="text-xs font-black uppercase text-[#2F4858]">
                Assign to Family Member Profile
              </Label>
              {memberAgeInfo && (
                <Badge className={`text-[10px] font-black px-2 py-0.5 rounded-full ${memberAgeInfo.badgeColor}`}>
                  Age: {memberAgeInfo.formatted} • {memberAgeInfo.lifeStageLabel}
                </Badge>
              )}
            </div>

            <select
              id="familyMemberId"
              disabled={isSaving}
              value={familyMemberId}
              onChange={(e) => setFamilyMemberId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer shadow-xs"
            >
              <option value="">Household / Shared Use</option>
              {familyMembers.map((member: FamilyMember) => {
                const age = calculateAge(member.date_of_birth || member.birth_date)
                return (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.relationship}
                    {age ? ` • ${age.formatted}` : ''})
                  </option>
                )
              })}
            </select>
          </div>

          <Separator className="bg-[#2F4858]/10" />

          {/* Clinical Uses & Dosage Instructions */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="primaryUses" className="text-xs font-bold text-[#2F4858]">
                Primary Uses / Indications
              </Label>
              <Textarea
                id="primaryUses"
                disabled={isSaving}
                placeholder="What condition or symptom is this medicine prescribed for?"
                value={primaryUses}
                onChange={(e) => setPrimaryUses(e.target.value)}
                rows={2}
                className="rounded-xl border-[#2F4858]/20 bg-white text-xs font-medium text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dosageInstructions" className="text-xs font-bold text-[#2F4858]">
                Dosage & Administration Instructions
              </Label>
              <Textarea
                id="dosageInstructions"
                disabled={isSaving}
                placeholder="e.g. Take 1 tablet twice daily after food with water. Complete full 5-day course."
                value={dosageInstructions}
                onChange={(e) => setDosageInstructions(e.target.value)}
                rows={2}
                className="rounded-xl border-[#2F4858]/20 bg-white text-xs font-medium text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="precautions" className="text-xs font-bold text-[#2F4858]">
                Precautions & Warnings
              </Label>
              <Textarea
                id="precautions"
                disabled={isSaving}
                placeholder="e.g. Avoid alcohol. May cause mild drowsiness. Do not exceed prescribed dose."
                value={precautions}
                onChange={(e) => setPrecautions(e.target.value)}
                rows={2}
                className="rounded-xl border-[#2F4858]/20 bg-white text-xs font-medium text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858] resize-none"
              />
            </div>
          </div>

          {/* Checkboxes: Daily Routine & Rx Required */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label
              htmlFor="isDailyRoutine"
              className="p-3 rounded-xl border border-[#2F4858]/15 bg-[#F8FDFB] flex items-center gap-2.5 cursor-pointer hover:bg-[#DDFBEF]/30 transition-colors"
            >
              <input
                id="isDailyRoutine"
                type="checkbox"
                disabled={isSaving}
                checked={isDailyRoutine}
                onChange={(e) => setIsDailyRoutine(e.target.checked)}
                className="size-4 rounded border-[#2F4858]/30 text-[#2F4858] focus:ring-[#2F4858] cursor-pointer"
              />
              <span className="text-xs font-bold text-[#2F4858]">
                Taken Daily (Routine / Chronic Medication)
              </span>
            </label>

            <label
              htmlFor="isPrescriptionRequired"
              className="p-3 rounded-xl border border-[#2F4858]/15 bg-[#F8FDFB] flex items-center gap-2.5 cursor-pointer hover:bg-[#DDFBEF]/30 transition-colors"
            >
              <input
                id="isPrescriptionRequired"
                type="checkbox"
                disabled={isSaving}
                checked={isPrescriptionRequired}
                onChange={(e) => setIsPrescriptionRequired(e.target.checked)}
                className="size-4 rounded border-[#2F4858]/30 text-[#2F4858] focus:ring-[#2F4858] cursor-pointer"
              />
              <span className="text-xs font-bold text-[#2F4858]">
                Doctor Prescription Required (Rx)
              </span>
            </label>
          </div>

          {saveError && (
            <div className="text-xs text-rose-700 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200">
              {saveError}
            </div>
          )}

          <Separator className="bg-[#2F4858]/10" />

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="rounded-xl text-xs font-bold text-[#2F4858] hover:bg-[#DDFBEF]/50 h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-11 px-8 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin text-[#DDFBEF]" />
                  <span>Saving to Cabinet...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Save Medicine to Cabinet</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}
