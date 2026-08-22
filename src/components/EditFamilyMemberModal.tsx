'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Edit3, UserRound, Calendar, ShieldAlert, Activity, Loader2, Save } from 'lucide-react'
import { calculateAge } from '@/lib/utils/ageCalculator'
import { createClient } from '@/lib/supabase/client'

interface EditFamilyMemberModalProps {
  member: {
    id: string
    full_name: string
    relationship: string
    date_of_birth?: string | null
    birth_date?: string | null
    gender?: string
    allergies?: string[]
    chronic_conditions?: string[]
    notes?: string | null
  }
  trigger?: React.ReactNode
}

export function EditFamilyMemberModal({ member, trigger }: EditFamilyMemberModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState(member.full_name || '')
  const [relationship, setRelationship] = useState(member.relationship || 'Self')
  const [dateOfBirth, setDateOfBirth] = useState(member.date_of_birth || member.birth_date || '')
  const [gender, setGender] = useState(member.gender || 'UNDISCLOSED')
  const [allergies, setAllergies] = useState(member.allergies?.join(', ') || '')
  const [conditions, setConditions] = useState(member.chronic_conditions?.join(', ') || '')
  const [notes, setNotes] = useState(member.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const ageInfo = calculateAge(dateOfBirth)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()
      const allergiesArr = allergies
        ? allergies.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      const conditionsArr = conditions
        ? conditions.split(',').map((s) => s.trim()).filter(Boolean)
        : []

      const { error } = await supabase
        .from('family_members')
        .update({
          full_name: fullName.trim(),
          relationship: relationship,
          date_of_birth: dateOfBirth || null,
          gender: gender,
          allergies: allergiesArr,
          chronic_conditions: conditionsArr,
          notes: notes.trim() || null,
        })
        .eq('id', member.id)

      if (error) {
        console.error('Error updating member:', error)
        setErrorMessage(error.message)
        setIsSaving(false)
        return
      }

      setOpen(false)
      setIsSaving(false)
      router.refresh()
    } catch (err: any) {
      console.error('Failed to update member:', err)
      setErrorMessage(err.message || 'Failed to update profile')
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
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-extrabold bg-[#DDFBEF]/50 text-[#2F4858] border-[#B7EED8] hover:bg-[#DDFBEF] flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Edit3 className="size-3.5" />
          <span>Edit Profile</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[96vw] sm:w-[92vw] sm:max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 bg-white border border-[#2F4858]/15 rounded-2xl sm:rounded-3xl shadow-2xl text-[#2F4858]">
          <DialogHeader className="pb-3 border-b border-[#2F4858]/10">
            <div className="flex items-center gap-3">
              <div className="size-10 sm:size-11 rounded-2xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center shadow-sm shrink-0">
                <UserRound className="size-5 sm:size-6" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-[#2F4858]">
                  Edit Profile: {member.full_name}
                </DialogTitle>
                <p className="text-xs font-semibold text-[#2F4858]/70">
                  Update birthdate, allergies, chronic conditions, and age-aware guardian settings.
                </p>
              </div>
            </div>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            {/* Full Name */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">Full Name *</Label>
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-bold text-[#2F4858]"
              />
            </div>

            {/* Relationship & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#2F4858]">Relationship *</Label>
                <select
                  required
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-[#F8FDFB] text-xs font-bold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer"
                >
                  <option value="Self">Self</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child (Son / Daughter)</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Sibling">Sibling (Brother / Sister)</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Other">Other Family Member</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#2F4858]">Gender</Label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#2F4858]/20 bg-[#F8FDFB] text-xs font-semibold text-[#2F4858] focus:ring-1 focus:ring-[#2F4858] focus:outline-none cursor-pointer"
                >
                  <option value="UNDISCLOSED">Undisclosed / Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Date of Birth & Dynamic Age Indicator */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#DDFBEF]/40 border border-[#B7EED8] space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
                  <Calendar className="size-4 text-[#2F4858]" />
                  <span>Date of Birth</span>
                </Label>
                {ageInfo && (
                  <Badge className={`text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs ${ageInfo.badgeColor}`}>
                    Age: {ageInfo.formatted} • {ageInfo.lifeStageLabel}
                  </Badge>
                )}
              </div>

              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-10 rounded-xl bg-white border-[#2F4858]/20 text-xs font-bold text-[#2F4858]"
              />
            </div>

            {/* Known Allergies */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858] flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-rose-600" />
                <span>Known Allergies (Comma-separated)</span>
              </Label>
              <Input
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
                className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold text-[#2F4858]"
              />
            </div>

            {/* Chronic Conditions */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858] flex items-center gap-1.5">
                <Activity className="size-3.5 text-[#2F4858]" />
                <span>Chronic Conditions (Comma-separated)</span>
              </Label>
              <Input
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
                className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold text-[#2F4858]"
              />
            </div>

            {/* Personal Health Notes */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2F4858]">Health Notes & Physician Info</Label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Personal medical notes..."
                className="w-full p-2.5 rounded-xl border border-[#2F4858]/20 text-xs font-medium text-[#2F4858] bg-[#F8FDFB] focus:outline-none focus:ring-1 focus:ring-[#2F4858]"
              />
            </div>

            {/* Footer Buttons */}
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
                {isSaving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
