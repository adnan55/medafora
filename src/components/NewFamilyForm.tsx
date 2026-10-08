'use client'

import { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'
import { ArrowLeft, UserRound, ShieldAlert, Activity, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateAge } from '@/lib/utils/ageCalculator';
import { createClient } from '@/lib/supabase/client';

export default function NewFamilyForm() {
  const formId = useId()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [relationship, setRelationship] = useState('Self')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('UNDISCLOSED')
  const [allergies, setAllergies] = useState('')
  const [conditions, setConditions] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const ageInfo = calculateAge(dateOfBirth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const allergiesArr = allergies
        ? allergies.split(',').map((s) => s.trim()).filter(Boolean)
        : []
      const conditionsArr = conditions
        ? conditions.split(',').map((s) => s.trim()).filter(Boolean)
        : []

      const { error } = await supabase.from('family_members').insert([
        {
          user_id: user.id,
          full_name: fullName.trim(),
          relationship: relationship,
          date_of_birth: dateOfBirth || null,
          gender: gender,
          allergies: allergiesArr,
          chronic_conditions: conditionsArr,
          notes: notes.trim() || null,
        },
      ])

      if (error) {
        console.error('Error inserting family member:', error)
        setErrorMessage(error.message)
        setIsSaving(false)
        return
      }

      router.push('/family')
      router.refresh()
    } catch (err: unknown) {
      console.error('Failed to save profile:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save family member')
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FDFB] text-[#2F4858] pb-12">

      <main id="main-content" tabIndex={-1} className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <Link
          href="/family"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground hover:text-[#2F4858] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Family Profiles</span>
        </Link>

        <header className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#2F4858]/15">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center shadow-sm shrink-0">
              <UserRound className="size-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#2F4858]">Add Family Member</h1>
              <p className="text-muted-foreground font-medium text-xs sm:text-sm mt-0.5">
                Record the birth date, allergies and medical history for this family member.
              </p>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div id={formId + '-error'} role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        <form aria-describedby={errorMessage ? formId + '-error' : undefined}
          onSubmit={handleSubmit}
          className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#2F4858]/15 space-y-4 sm:space-y-5"
        ><fieldset disabled={isSaving} className="contents">
          {/* Full Name */}
          <div className="space-y-1">
            <Label htmlFor={formId + "-field-1"} className="text-xs font-bold text-[#2F4858]">Full Name *</Label>
            <Input aria-label="Full Name *" id={formId + "-field-1"}
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Orhan Khan"
              className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-bold text-[#2F4858]"
            />
          </div>

          {/* Relationship & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label htmlFor={formId + "-field-2"} className="text-xs font-bold text-[#2F4858]">Relationship *</Label>
              <select aria-label="Relationship *" id={formId + "-field-2"}
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
              <Label htmlFor={formId + "-field-3"} className="text-xs font-bold text-[#2F4858]">Gender (Optional)</Label>
              <select aria-label="Gender (Optional)" id={formId + "-field-3"}
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

          {/* Date of Birth & Dynamic Age Display */}
          <div className="p-4 rounded-2xl bg-[#DDFBEF]/40 border border-[#B7EED8] space-y-2.5">
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

            <Input aria-label="date Of Birth" id={formId + "-field-4"}
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="h-10 rounded-xl bg-white border-[#2F4858]/20 text-xs font-bold text-[#2F4858]"
            />
            <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
              💡 Setting birthdate enables automatic age calculations, pediatric vs. geriatric medication safety checks, and age-tailored AI diagnostic recommendations.
            </p>
          </div>

          {/* Known Allergies */}
          <div className="space-y-1">
            <Label htmlFor={formId + "-field-5"} className="text-xs font-bold text-[#2F4858] flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-rose-600" />
              <span>Known Drug / Food Allergies (Comma-separated)</span>
            </Label>
            <Input aria-label="Known Drug / Food Allergies (Comma-separated)" id={formId + "-field-5"}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
              className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold text-[#2F4858]"
            />
          </div>

          {/* Chronic Conditions */}
          <div className="space-y-1">
            <Label htmlFor={formId + "-field-6"} className="text-xs font-bold text-[#2F4858] flex items-center gap-1.5">
              <Activity className="size-3.5 text-[#2F4858]" />
              <span>Chronic Medical Conditions (Comma-separated)</span>
            </Label>
            <Input aria-label="Chronic Medical Conditions (Comma-separated)" id={formId + "-field-6"}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
              className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold text-[#2F4858]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor={formId + "-field-7"} className="text-xs font-bold text-[#2F4858]">Personal Health Notes / Physician Info</Label>
            <textarea aria-label="Personal Health Notes / Physician Info" id={formId + "-field-7"}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Primary Care Physician: Dr. Sharma, blood group O+, prefers syrup over tablets"
              className="w-full p-3 rounded-xl border border-[#2F4858]/20 text-xs font-medium text-[#2F4858] bg-[#F8FDFB] focus:outline-none focus:ring-1 focus:ring-[#2F4858]"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full h-11 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] font-extrabold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Creating Profile...' : 'Save Family Member Profile'}
            </Button>
          </div>
        </fieldset></form>
      </main>
    </div>
  )
}
