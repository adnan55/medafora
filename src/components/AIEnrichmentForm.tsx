'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  X, 
  Sparkles, 
  Pill,
  Save
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const STORAGE_OPTIONS = [
  'Bedroom Cabinet',
  'Bathroom Mirror Box',
  'Kitchen Pantry Top Shelf',
  'Refrigerator Door (2-8°C)',
  'First-Aid Kit (Travel)',
  'Office Desk Drawer',
  'Living Room Sideboard',
];

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
];

const QUANTITY_UNITS = [
  'TABLETS',
  'CAPSULES',
  'STRIPS',
  'BOTTLE (ML)',
  'TUBE (G)',
  'SACHETS',
  'VIALS',
  'PUFFS / DOSES',
];

interface FamilyMember {
  id: string;
  full_name: string;
  relationship: string;
}

interface MedicineData {
  id?: string;
  medicine_name?: string;
  salt_composition?: string;
  dosage_form?: string;
  strength?: string;
  quantity?: number;
  unit?: string;
  expiry_date?: string;
  manufacture_date?: string;
  storage_location?: string;
  family_member_id?: string;
  primary_uses?: string;
  dosage_instructions?: string;
  target_diseases?: string[];
  is_daily_routine?: boolean;
}

export function AIEnrichmentForm({ 
  familyMembers, 
  initialData 
}: { 
  familyMembers: FamilyMember[], 
  initialData?: MedicineData 
}) {
  const router = useRouter()
  
  const [medicineName, setMedicineName] = useState(initialData?.medicine_name || '')
  const [saltComposition, setSaltComposition] = useState(initialData?.salt_composition || '')
  const [dosageForm, setDosageForm] = useState(initialData?.dosage_form || 'TABLET')
  const [strength, setStrength] = useState(initialData?.strength || '')
  const [quantity, setQuantity] = useState(initialData?.quantity || 10)
  const [unit, setUnit] = useState(initialData?.unit || 'TABLETS')
  const [expiryDate, setExpiryDate] = useState(initialData?.expiry_date || '')
  const [manufactureDate, setManufactureDate] = useState(initialData?.manufacture_date || '')
  const [storageLocation, setStorageLocation] = useState(initialData?.storage_location || 'Bedroom Cabinet')
  const [familyMemberId, setFamilyMemberId] = useState(initialData?.family_member_id || '')
  const [primaryUses, setPrimaryUses] = useState(initialData?.primary_uses || '')
  const [dosageInstructions, setDosageInstructions] = useState(initialData?.dosage_instructions || '')
  const [targetDiseases, setTargetDiseases] = useState<string[]>(initialData?.target_diseases || [])
  const [isDailyRoutine, setIsDailyRoutine] = useState(initialData?.is_daily_routine || false)
  
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleAiAutoFill = async () => {
    if (!medicineName.trim()) {
      setAiError('Please enter a medicine name first.');
      return;
    }
    setIsAiLoading(true);
    setAiError('');

    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineName })
      })
      const { success, data, error } = await res.json()
      
      if (success && data) {
        setSaltComposition(data.salt_composition || '')
        setDosageForm(data.dosage_form?.toUpperCase() || 'TABLET')
        setPrimaryUses(data.primary_uses || '')
        setDosageInstructions(data.dosage_instructions || '')
        setTargetDiseases(data.target_diseases || [])
      } else {
        setAiError(error || 'Failed to auto-fill details.')
      }
    } catch (e) {
      setAiError('Failed to connect to AI service.')
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveError('')

    try {
      const isEdit = !!initialData?.id;
      const endpoint = isEdit ? `/api/medicines/${initialData.id}` : '/api/medicines';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: medicineName,
          salt_composition: saltComposition,
          dosage_form: dosageForm,
          strength,
          quantity: Number(quantity),
          unit,
          expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
          manufacture_date: manufactureDate ? new Date(manufactureDate).toISOString() : null,
          storage_location: storageLocation,
          family_member_id: familyMemberId || null,
          primary_uses: primaryUses,
          dosage_instructions: dosageInstructions,
          target_diseases: targetDiseases,
          is_prescription_required: false,
          is_daily_routine: isDailyRoutine
        })
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const errorData = await res.json()
        setSaveError('Failed to save medicine: ' + errorData.error)
      }
    } catch (err) {
      setSaveError('Network error while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="bg-white w-full rounded-2xl shadow-sm border-[#2F4858]/20 overflow-hidden flex flex-col">
      {/* Header */}
      <CardHeader className="p-5 border-b border-[#2F4858]/15 bg-[#F8FDFB] flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2F4858] flex items-center justify-center text-[#DDFBEF] shadow-sm shrink-0">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-extrabold text-[#2F4858]">
              {initialData?.id ? 'Edit Medicine in Cabinet' : 'Add Medicine to Family Cabinet'}
            </CardTitle>
            <CardDescription className="text-xs text-[#2F4858]/70 font-medium">
              Track expiry, active salts, storage zones, and cross-member allergy risks.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Content Form */}
      <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
        
        {/* AI Auto-Enrichment Banner */}
        <Card className="p-4 rounded-xl bg-[#DDFBEF]/60 border-[#B7EED8] shadow-none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-[#2F4858]">
                <Sparkles className="w-4 h-4 text-[#2F4858]" />
                <span>AI Pharmacological Auto-Filler</span>
              </div>
              <p className="text-[#2F4858]/80 font-medium">
                Type the brand or generic name (e.g. Augmentin 625, Dolo 650, Pan 40) and click Auto-Fill.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAiAutoFill}
              disabled={isAiLoading}
              className="px-3.5 py-1.5 h-9 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] font-extrabold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer border border-[#2F4858] text-xs"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Analyzing Drug...' : 'Auto-Fill Details'}</span>
            </Button>
          </div>
        </Card>

        {aiError && (
          <div className="text-xs text-rose-700 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200">
            {aiError}
          </div>
        )}

        {/* Core Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="medicineName" className="text-xs font-bold text-[#2F4858]">
              Medicine / Brand Name <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="medicineName"
              type="text"
              required
              disabled={isAiLoading || isSaving}
              placeholder="e.g. Augmentin 625 Duo, Dolo 650"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858]"
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
              disabled={isAiLoading || isSaving}
              placeholder="e.g. Amoxicillin (500mg) + Clavulanic Acid"
              value={saltComposition}
              onChange={(e) => setSaltComposition(e.target.value)}
              className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858]"
            />
          </div>
        </div>

        {/* Form & Strength & Expiry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dosageForm" className="text-xs font-bold text-[#2F4858]">Dosage Form</Label>
            <select
              id="dosageForm"
              disabled={isAiLoading || isSaving}
              value={dosageForm}
              onChange={(e) => setDosageForm(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {DOSAGE_FORMS.map(form => (
                <option key={form} value={form}>{form}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="strength" className="text-xs font-bold text-[#2F4858]">Strength</Label>
            <Input
              id="strength"
              type="text"
              disabled={isAiLoading || isSaving}
              placeholder="e.g. 500mg"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858]"
            />
          </div>

          <div className="col-span-2 sm:col-span-2 space-y-1.5">
            <Label htmlFor="expiryDate" className="text-xs font-bold text-[#2F4858]">
              Expiry Date <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="expiryDate"
              type="date"
              required
              disabled={isAiLoading || isSaving}
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858]"
            />
          </div>
        </div>

        {/* Quantity & Storage Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="quantity" className="text-xs font-bold text-[#2F4858]">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              required
              disabled={isAiLoading || isSaving}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="h-10 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unit" className="text-xs font-bold text-[#2F4858]">Unit</Label>
            <select
              id="unit"
              disabled={isAiLoading || isSaving}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {QUANTITY_UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-2 space-y-1.5">
            <Label htmlFor="storageLocation" className="text-xs font-bold text-[#2F4858]">Storage Location</Label>
            <select
              id="storageLocation"
              disabled={isAiLoading || isSaving}
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-white text-xs font-bold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {STORAGE_OPTIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Family Member Assignment */}
        <div className="space-y-1.5">
          <Label htmlFor="familyMemberId" className="text-xs font-bold text-[#2F4858]">
            Assign to Family Member <span className="text-xs font-medium text-[#2F4858]/60">(Optional)</span>
          </Label>
          <select
            id="familyMemberId"
            disabled={isAiLoading || isSaving}
            value={familyMemberId}
            onChange={(e) => setFamilyMemberId(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-[#F8FDFB] text-xs font-bold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <option value="">Household / Shared Use</option>
            {familyMembers.map((member: FamilyMember) => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.relationship})
              </option>
            ))}
          </select>
        </div>

        <Separator className="bg-[#2F4858]/10" />

        {/* Clinical Use & Instructions */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="primaryUses" className="text-xs font-bold text-[#2F4858]">
              Primary Uses / Indications
            </Label>
            <Textarea
              id="primaryUses"
              disabled={isAiLoading || isSaving}
              placeholder="What is this medication primarily used for?"
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
              disabled={isAiLoading || isSaving}
              placeholder="e.g. 1 tablet twice daily after meals"
              value={dosageInstructions}
              onChange={(e) => setDosageInstructions(e.target.value)}
              rows={2}
              className="rounded-xl border-[#2F4858]/20 bg-white text-xs font-medium text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858] resize-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="isDailyRoutine" className="flex items-center gap-2 cursor-pointer group">
            <input 
              id="isDailyRoutine"
              type="checkbox"
              disabled={isAiLoading || isSaving}
              checked={isDailyRoutine}
              onChange={(e) => setIsDailyRoutine(e.target.checked)}
              className="w-4 h-4 rounded border-[#2F4858]/30 text-[#2F4858] focus:ring-[#2F4858] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs font-bold text-[#2F4858] group-hover:text-[#1E313D] transition-colors">
              Taken Daily (Routine / Chronic Medication)
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
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="rounded-xl text-xs font-bold text-[#2F4858] hover:bg-[#DDFBEF]/50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="h-10 px-6 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Medicine</span>
              </>
            )}
          </Button>
        </div>

      </form>
    </Card>
  )
}
