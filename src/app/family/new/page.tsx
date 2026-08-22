import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { ArrowLeft, UserRound, ShieldAlert, Activity } from 'lucide-react'
import { FloatingLabel } from '@/components/shadcn-space/label/label-06'

export default async function NewFamilyMemberPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  async function addFamilyMember(formData: FormData) {
    'use server'
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    
    if (!user) return

    const fullName = formData.get('full_name') as string
    const relationship = formData.get('relationship') as string
    const allergiesStr = formData.get('allergies') as string
    const conditionsStr = formData.get('conditions') as string

    const allergies = allergiesStr ? allergiesStr.split(',').map(s => s.trim()) : []
    const conditions = conditionsStr ? conditionsStr.split(',').map(s => s.trim()) : []
    
    const { error } = await supabaseServer.from('family_members').insert([
      { 
        user_id: user.id,
        full_name: fullName,
        relationship: relationship,
        allergies: allergies,
        chronic_conditions: conditions
      }
    ])

    if (error) {
      console.error("Error inserting family member:", error)
      throw new Error(error.message)
    }

    redirect('/family')
  }

  return (
    <div className="min-h-screen bg-[#F8FDFB] text-[#2F4858] pb-12">
      <Navbar familyMembers={[]} medicines={[]} />
      
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link href="/family" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2F4858]/70 hover:text-[#2F4858] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Family Profiles</span>
        </Link>

        <header className="bg-white p-6 rounded-2xl shadow-sm border border-[#2F4858]/20">
          <h1 className="text-2xl font-black text-[#2F4858]">Add Family Member</h1>
          <p className="text-[#2F4858]/70 font-medium text-sm mt-1">Create a profile to manage their medicines and allergies.</p>
        </header>

        <form action={addFamilyMember} className="bg-white p-6 rounded-2xl shadow-sm border border-[#2F4858]/20 space-y-6">
          <div className="pt-1">
            <FloatingLabel
              id="full_name"
              name="full_name"
              label="Full Name"
              icon={<UserRound className="size-4" />}
              required
              containerClassName="max-w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2F4858] mb-1.5">Relationship</label>
            <select 
              required
              name="relationship"
              className="w-full px-4 py-2.5 rounded-xl border border-[#2F4858]/20 bg-[#F8FDFB] text-xs font-semibold focus:ring-2 focus:ring-[#2F4858] focus:outline-none cursor-pointer"
            >
              <option value="Self">Self</option>
              <option value="Spouse">Spouse</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Child">Child</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="pt-1">
            <FloatingLabel
              id="allergies"
              name="allergies"
              label="Known Allergies (e.g. Penicillin, Peanuts - Optional)"
              icon={<ShieldAlert className="size-4" />}
              containerClassName="max-w-full"
            />
          </div>

          <div className="pt-1">
            <FloatingLabel
              id="conditions"
              name="conditions"
              label="Chronic Conditions (e.g. Asthma, Hypertension - Optional)"
              icon={<Activity className="size-4" />}
              containerClassName="max-w-full"
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full px-6 py-3 bg-[#2F4858] text-[#DDFBEF] font-extrabold rounded-xl hover:bg-[#1E313D] transition-colors shadow-sm cursor-pointer text-sm"
            >
              Save Profile
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
