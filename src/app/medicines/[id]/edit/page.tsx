import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { AIEnrichmentForm } from '@/components/AIEnrichmentForm'
import { CabinetNav } from '@/components/CabinetNav'
import { DataUnavailable } from '@/components/DataUnavailable'
import { ArrowLeft } from 'lucide-react'

export default async function EditMedicinePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const resolvedParams = await params

  if (!user) {
    redirect('/login')
  }

  const [familyResult, medicineResult] = await Promise.all([
    supabase.from('family_members').select('id, full_name, relationship, date_of_birth, allergies').eq('user_id', user.id),
    supabase.from('medicines').select('*').eq('id', resolvedParams.id).eq('user_id', user.id).maybeSingle(),
  ])
  if (medicineResult.error?.code === '22P02') notFound()
  if (familyResult.error || medicineResult.error) return <><CabinetNav /><main id="main-content" tabIndex={-1} className="page-shell"><h1 className="text-2xl font-bold">Edit medicine</h1><DataUnavailable /></main></>
  const medicine = medicineResult.data
  const familyMembers = familyResult.data
  if (!medicine) notFound()

  return (
    <div className="min-h-screen bg-[#F8FDFB] text-[#2F4858] pb-12">
      <CabinetNav />
      
      <main id="main-content" tabIndex={-1} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Edit medicine</h1>
        <Link href={`/medicines/${medicine.id}`} className="inline-flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground hover:text-[#2F4858] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Details</span>
        </Link>

        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-[#2F4858]/20">
          <div>
            <p className="text-muted-foreground font-medium text-sm mt-1">Update details for {medicine.medicine_name}</p>
          </div>
        </header>

        <AIEnrichmentForm key={medicine.id} familyMembers={familyMembers || []} initialData={medicine} />
      </main>
    </div>
  )
}
