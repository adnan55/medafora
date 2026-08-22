import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { FamilyMemberHealthHub } from '@/components/FamilyMemberHealthHub'

export default async function FamilyMemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch Member Details
  const { data: member } = await supabase
    .from('family_members')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (!member) {
    notFound()
  }

  // Fetch Medical Records
  const { data: medicalRecords } = await supabase
    .from('medical_records')
    .select('*')
    .eq('family_member_id', resolvedParams.id)
    .order('test_date', { ascending: false })

  // Fetch At-Home Vital Logs
  const { data: vitalLogs } = await supabase
    .from('vital_logs')
    .select('*')
    .eq('family_member_id', resolvedParams.id)
    .order('recorded_at', { ascending: true })

  // Fetch Medicines assigned to this member
  const { data: medicines } = await supabase
    .from('medicines')
    .select('*')
    .eq('family_member_id', resolvedParams.id)

  // Fetch all family members for navbar
  const { data: allMembers } = await supabase
    .from('family_members')
    .select('*')
    .order('created_at', { ascending: true })

  const { data: allMedicines } = await supabase
    .from('medicines')
    .select('*')

  return (
    <div className="bg-[#F8FDFB] min-h-screen text-[#2F4858] pb-16">
      <Navbar familyMembers={allMembers || []} medicines={allMedicines || []} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/family"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2F4858]/70 hover:text-[#2F4858] transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back to All Family Profiles</span>
          </Link>

          <Link
            href={`/?member=${member.id}`}
            className="text-xs font-bold text-[#2F4858] hover:underline"
          >
            Filter Cabinet on Dashboard →
          </Link>
        </div>

        <FamilyMemberHealthHub
          member={member}
          medicalRecords={medicalRecords || []}
          vitalLogs={vitalLogs || []}
          medicines={medicines || []}
        />
      </main>
    </div>
  )
}
