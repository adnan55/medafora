'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Heart,
  Droplet,
  Percent,
  Weight,
  Thermometer,
  Wind,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createVitalLog } from '@/app/actions/vitals'

interface LogVitalModalProps {
  familyMemberId?: string
  familyMemberName?: string
  familyMembers?: Array<{ id: string; full_name: string; relationship?: string }>
  defaultType?: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const VITAL_PRESETS = [
  {
    type: 'BLOOD_GLUCOSE',
    name: 'Blood Glucose',
    icon: Droplet,
    unit: 'mg/dL',
    placeholder: 'e.g. 105',
    contexts: ['Fasting', 'Post-Meal (2h)', 'Before Meal', 'Bedtime', 'Random'],
    normalRange: 'Fasting: 70 - 99 mg/dL | Post-meal: < 140 mg/dL',
  },
  {
    type: 'BLOOD_PRESSURE',
    name: 'Blood Pressure',
    icon: Heart,
    unit: 'mmHg',
    placeholder: '120',
    placeholderSecondary: '80',
    contexts: ['Resting', 'Morning', 'Evening', 'Post-Exercise'],
    normalRange: 'Systolic: 90 - 120 | Diastolic: 60 - 80 mmHg',
  },
  {
    type: 'HEART_RATE',
    name: 'Pulse / Heart Rate',
    icon: Activity,
    unit: 'bpm',
    placeholder: '72',
    contexts: ['Resting', 'After Exercise', 'Morning'],
    normalRange: 'Normal Resting: 60 - 100 bpm',
  },
  {
    type: 'HBA1C',
    name: 'HbA1c (Glycated Hb)',
    icon: Percent,
    unit: '%',
    placeholder: '5.6',
    contexts: ['Quarterly Lab Check', 'Home Fingerprick'],
    normalRange: 'Normal: < 5.7% | Pre-diabetes: 5.7 - 6.4% | Diabetes: ≥ 6.5%',
  },
  {
    type: 'SPO2',
    name: 'Oxygen Saturation',
    icon: Wind,
    unit: '%',
    placeholder: '98',
    contexts: ['Resting', 'Post-Walk', 'When Short of Breath'],
    normalRange: 'Normal: 95 - 100% | Low: < 95%',
  },
  {
    type: 'WEIGHT',
    name: 'Body Weight',
    icon: Weight,
    unit: 'kg',
    placeholder: '68.5',
    contexts: ['Morning Fasting', 'Evening'],
    normalRange: 'Track daily/weekly trend',
  },
  {
    type: 'TEMPERATURE',
    name: 'Body Temperature',
    icon: Thermometer,
    unit: '°F',
    placeholder: '98.6',
    contexts: ['Oral', 'Forehead Scan', 'Axillary'],
    normalRange: 'Normal: 97.8 - 99.1 °F',
  },
]

export function LogVitalModal({
  familyMemberId,
  familyMemberName,
  familyMembers,
  defaultType = 'BLOOD_GLUCOSE',
  trigger,
  onSuccess,
}: LogVitalModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Member selection state
  const [selectedMemberId, setSelectedMemberId] = useState(
    familyMemberId || (familyMembers && familyMembers.length > 0 ? familyMembers[0].id : '')
  )
  const currentMember = familyMembers?.find(m => m.id === selectedMemberId)
  const activeMemberName = familyMemberName || currentMember?.full_name || 'Family Member'
  
  const [selectedType, setSelectedType] = useState(defaultType)
  const currentPreset = VITAL_PRESETS.find(p => p.type === selectedType) || VITAL_PRESETS[0]

  const [value, setValue] = useState('')
  const [valueSecondary, setValueSecondary] = useState('')
  const [context, setContext] = useState(currentPreset.contexts[0])
  const [recordedDate, setRecordedDate] = useState(new Date().toISOString().split('T')[0])
  const [recordedTime, setRecordedTime] = useState(new Date().toTimeString().slice(0, 5))
  const [notes, setNotes] = useState('')
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSelectPreset = (type: string) => {
    setSelectedType(type)
    const preset = VITAL_PRESETS.find(p => p.type === type) || VITAL_PRESETS[0]
    setContext(preset.contexts[0])
    setValue('')
    setValueSecondary('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value || isNaN(Number(value))) {
      setSaveError('Please enter a valid numeric value.')
      return
    }

    if (selectedType === 'BLOOD_PRESSURE' && (!valueSecondary || isNaN(Number(valueSecondary)))) {
      setSaveError('Please enter both Systolic and Diastolic blood pressure values.')
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      const combinedDateTime = new Date(`${recordedDate}T${recordedTime || '12:00'}:00`).toISOString()

      const res = await createVitalLog({
        family_member_id: selectedMemberId,
        vital_type: selectedType,
        name: currentPreset.name,
        value: Number(value),
        value_secondary: valueSecondary ? Number(valueSecondary) : undefined,
        unit: currentPreset.unit,
        context,
        recorded_at: combinedDateTime,
        notes,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to log vital.')
      }

      // Reset
      setValue('')
      setValueSecondary('')
      setNotes('')
      setOpen(false)
      router.refresh()
      onSuccess?.()
    } catch (err: any) {
      setSaveError(err.message || 'Error saving vital sign.')
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
          <span>Log At-Home Vitals / Sugar / BP</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[96vw] sm:max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 bg-white border border-[#2F4858]/15 rounded-2xl sm:rounded-3xl shadow-2xl text-[#2F4858]">
        <DialogHeader className="pb-4 border-b border-[#2F4858]/10">
          <div className="flex items-center gap-3">
            <div className="size-10 sm:size-11 rounded-2xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center shadow-sm shrink-0">
              <Activity className="size-5 sm:size-6" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-[#2F4858]">
                Log Vital Sign for {activeMemberName}
              </DialogTitle>
              <p className="text-xs font-semibold text-[#2F4858]/70">
                Record at-home glucometer readings, blood pressure, pulse, or body vitals.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Member Selector if multiple family members provided */}
        {familyMembers && familyMembers.length > 1 && (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mt-2">
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

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Preset Buttons Grid */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-wider text-[#2F4858]/70">
              Select Measurement Type
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {VITAL_PRESETS.map((preset) => {
                const Icon = preset.icon
                const isSelected = selectedType === preset.type
                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handleSelectPreset(preset.type)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2F4858] text-[#DDFBEF] border-[#2F4858] shadow-sm scale-[1.02]'
                        : 'bg-[#F8FDFB] text-[#2F4858] border-[#2F4858]/15 hover:border-[#2F4858]/40'
                    }`}
                  >
                    <Icon className={`size-4 ${isSelected ? 'text-[#DDFBEF]' : 'text-[#2F4858]'}`} />
                    <div>
                      <p className="text-xs font-extrabold truncate">{preset.name.split(' ')[0]}</p>
                      <p className={`text-[10px] font-bold opacity-80 ${isSelected ? 'text-[#DDFBEF]' : 'text-[#2F4858]/60'}`}>
                        {preset.unit}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reading Input Fields */}
          <div className="p-4 rounded-2xl bg-[#DDFBEF]/40 border border-[#B7EED8] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#2F4858] tracking-wider">
                {currentPreset.name} Measurement
              </span>
              <span className="text-xs font-bold text-[#2F4858]/70">
                Unit: <span className="text-[#2F4858] font-black">{currentPreset.unit}</span>
              </span>
            </div>

            {selectedType === 'BLOOD_PRESSURE' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-[#2F4858]">Systolic (Upper)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      required
                      placeholder="120"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="h-11 rounded-xl bg-white border-[#2F4858]/20 text-base font-black text-[#2F4858] pr-12"
                    />
                    <span className="absolute right-3 top-3 text-[10px] font-bold text-[#2F4858]/60">SYS</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-[#2F4858]">Diastolic (Lower)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      required
                      placeholder="80"
                      value={valueSecondary}
                      onChange={(e) => setValueSecondary(e.target.value)}
                      className="h-11 rounded-xl bg-white border-[#2F4858]/20 text-base font-black text-[#2F4858] pr-12"
                    />
                    <span className="absolute right-3 top-3 text-[10px] font-bold text-[#2F4858]/60">DIA</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-[#2F4858]">Enter Reading Value ({currentPreset.unit})</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    required
                    placeholder={currentPreset.placeholder}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-11 rounded-xl bg-white border-[#2F4858]/20 text-base font-black text-[#2F4858] pr-16"
                  />
                  <span className="absolute right-3 top-3 text-xs font-black text-[#2F4858]/60">
                    {currentPreset.unit}
                  </span>
                </div>
              </div>
            )}

            <div className="text-[11px] font-semibold text-[#2F4858]/80 flex items-center gap-1.5 pt-1">
              <Info className="size-3.5 text-[#2F4858] shrink-0" />
              <span>{currentPreset.normalRange}</span>
            </div>
          </div>

          {/* Context Pills (e.g. Fasting vs Post-Meal) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#2F4858]">Measurement Context / Timing</Label>
            <div className="flex flex-wrap gap-2">
              {currentPreset.contexts.map((ctx) => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setContext(ctx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    context === ctx
                      ? 'bg-[#2F4858] text-[#DDFBEF] border-[#2F4858]'
                      : 'bg-white text-[#2F4858] border-[#2F4858]/20 hover:bg-[#DDFBEF]/30'
                  }`}
                >
                  {ctx}
                </button>
              ))}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">Date</Label>
              <Input
                type="date"
                value={recordedDate}
                onChange={(e) => setRecordedDate(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">Time</Label>
              <Input
                type="time"
                value={recordedTime}
                onChange={(e) => setRecordedTime(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-[#2F4858]">Notes / Symptoms (Optional)</Label>
            <Input
              placeholder="e.g. Felt dizzy in morning, checked after 30 min brisk walk"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-medium"
            />
          </div>

          {saveError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {saveError}
            </div>
          )}

          {/* Submit */}
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
              {isSaving ? 'Logging Vital...' : 'Save Vital Reading'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
