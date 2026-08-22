import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AIEnrichmentForm } from '@/components/AIEnrichmentForm'
import { Navbar } from '@/components/Navbar'
import { ArrowLeft } from 'lucide-react'

export default async function EditMedicinePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const resolvedParams = await params

  if (!user) {
    redirect('/login')
  }

  // Fetch family members for the dropdown
  const { data: familyMembers } = await supabase
    .from('family_members')
    .select('id, full_name, relationship')

  // Fetch the medicine to edit
  const { data: medicine } = await supabase
    .from('medicines')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (!medicine) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#F8FDFB] text-[#2F4858] pb-12">
      <Navbar familyMembers={familyMembers || []} medicines={[]} />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link href={`/medicines/${medicine.id}`} className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2F4858]/70 hover:text-[#2F4858] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Details</span>
        </Link>

        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-[#2F4858]/20">
          <div>
            <h1 className="text-2xl font-black text-[#2F4858]">Edit Medicine</h1>
            <p className="text-[#2F4858]/70 font-medium text-sm mt-1">Update details for {medicine.medicine_name}</p>
          </div>
        </header>

        <AIEnrichmentForm familyMembers={familyMembers || []} initialData={medicine} />
      </main>
    </div>
  )
}
