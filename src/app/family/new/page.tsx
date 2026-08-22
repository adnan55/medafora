'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { ArrowLeft, UserRound, ShieldAlert, Activity, Calendar, Heart, FileText, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { calculateAge } from '@/lib/utils/ageCalculator'
import { createClient } from '@/lib/supabase/client'

export default function NewFamilyMemberPage() {
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
    } catch (err: any) {
      console.error('Failed to save profile:', err)
      setErrorMessage(err.message || 'Failed to save family member')
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FDFB] text-[#2F4858] pb-12">
      <Navbar familyMembers={[]} medicines={[]} />

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <Link
          href="/family"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2F4858]/70 hover:text-[#2F4858] transition-colors"
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
              <p className="text-[#2F4858]/70 font-medium text-xs sm:text-sm mt-0.5">
                Set birthdate, medical history, and age-aware clinical guardian profile.
              </p>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#2F4858]/15 space-y-4 sm:space-y-5"
        >
          {/* Full Name */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-[#2F4858]">Full Name *</Label>
            <Input
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
              <Label className="text-xs font-bold text-[#2F4858]">Gender (Optional)</Label>
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

            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="h-10 rounded-xl bg-white border-[#2F4858]/20 text-xs font-bold text-[#2F4858]"
            />
            <p className="text-[11px] font-semibold text-[#2F4858]/70 leading-relaxed">
              💡 Setting birthdate enables automatic age calculations, pediatric vs. geriatric medication safety checks, and age-tailored AI diagnostic recommendations.
            </p>
          </div>

          {/* Known Allergies */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-[#2F4858] flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-rose-600" />
              <span>Known Drug / Food Allergies (Comma-separated)</span>
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
              <span>Chronic Medical Conditions (Comma-separated)</span>
            </Label>
            <Input
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
              className="h-10 rounded-xl border-[#2F4858]/20 text-xs font-semibold text-[#2F4858]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-[#2F4858]">Personal Health Notes / Physician Info</Label>
            <textarea
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
        </form>
      </main>
    </div>
  )
}
