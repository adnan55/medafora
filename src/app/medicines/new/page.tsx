import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AIEnrichmentForm } from '@/components/AIEnrichmentForm'
import { Navbar } from '@/components/Navbar'
import { ArrowLeft } from 'lucide-react'

export default async function NewMedicinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch family members for the dropdown
  const { data: familyMembers } = await supabase
    .from('family_members')
    .select('id, full_name, relationship')

  if (!familyMembers || familyMembers.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FDFB] text-[#2F4858] p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#2F4858]/20 max-w-md text-center space-y-4">
          <h2 className="text-xl font-extrabold text-[#2F4858]">No Family Members Found</h2>
          <p className="text-[#2F4858]/70 text-sm font-medium">You must add a family member before you can add medicines to their cabinet.</p>
          <Link href="/family" className="inline-block px-5 py-2.5 bg-[#2F4858] text-[#DDFBEF] rounded-xl hover:bg-[#1E313D] text-xs font-bold shadow-sm transition-all">
            Go to Family Profiles
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FDFB] text-[#2F4858] pb-12">
      <Navbar familyMembers={familyMembers} medicines={[]} />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2F4858]/70 hover:text-[#2F4858] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <AIEnrichmentForm familyMembers={familyMembers} />
      </main>
    </div>
  )
}
