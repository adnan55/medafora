import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, Plus, Edit3, Trash2, ShieldAlert } from 'lucide-react'
import { DeleteFamilyMemberButton } from '@/components/DeleteFamilyMemberButton'

export default async function FamilyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: familyMembers } = await supabase
    .from('family_members')
    .select('*')
    .order('created_at', { ascending: true })

  const { data: medicines } = await supabase.from('medicines').select('*')
  const { data: medicalRecords } = await supabase.from('medical_records').select('id, family_member_id')

  return (
    <div className="bg-[#F8FDFB] min-h-screen text-[#2F4858]">
      <Navbar familyMembers={familyMembers || []} medicines={medicines || []} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-[#2F4858] tracking-tight">Family Profiles</h1>
            <p className="text-xs font-semibold text-[#2F4858]/70 mt-1">Manage medicine cabinets, medical histories, and AI-analyzed lab reports</p>
          </div>
          <Button render={<Link href="/family/new" />} size="sm" className="bg-[#2F4858] text-[#DDFBEF] rounded-xl hover:bg-[#1E313D] text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4 mr-1" />
            <span>Add Member</span>
          </Button>
        </header>

        {familyMembers && familyMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-8">
            {familyMembers.map((member) => {
              const memberMeds = medicines?.filter(m => m.family_member_id === member.id) || [];
              const memberRecords = medicalRecords?.filter(r => r.family_member_id === member.id) || [];
              return (
                <Card key={member.id} className="bg-white border-[#2F4858]/15 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center justify-between">
                  <div className="flex flex-col items-center w-full">
                    <Avatar className="w-16 h-16 rounded-2xl border border-[#2F4858]/20 bg-[#DDFBEF]/50 text-[#2F4858] mb-3 shadow-inner">
                      <AvatarFallback className="bg-[#DDFBEF] text-[#2F4858] font-black text-xl">
                        {member.avatar_initials || member.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="font-extrabold text-[#2F4858] leading-tight text-base">{member.full_name}</h3>
                    
                    <Badge variant="outline" className="text-[10px] bg-[#DDFBEF] text-[#2F4858] px-2.5 py-0.5 rounded-full mt-1.5 mb-2 uppercase tracking-wider font-bold border-[#B7EED8]">
                      {member.relationship}
                    </Badge>

                    <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                      {member.allergies && member.allergies.length > 0 && (
                        <Badge variant="destructive" className="text-[10px] font-bold">
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          {member.allergies.length} Allergies
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] font-bold bg-[#F8FDFB] text-[#2F4858] border-[#2F4858]/15">
                        {memberRecords.length} Reports / Records
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-bold bg-[#F8FDFB] text-[#2F4858] border-[#2F4858]/15">
                        {memberMeds.length} Medicines
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-[#2F4858]/10 w-full flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <Button render={<Link href={`/family/${member.id}`} />} size="sm" className="bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] rounded-xl text-xs font-extrabold flex-1 shadow-sm flex items-center justify-center gap-1">
                        <span>Health & Lab Records →</span>
                      </Button>

                      <DeleteFamilyMemberButton
                        memberId={member.id}
                        memberName={member.full_name}
                      />
                    </div>

                    <Link href={`/?member=${member.id}`} className="text-[11px] font-bold text-[#2F4858]/70 hover:text-[#2F4858] hover:underline text-center">
                      Filter Medicines Cabinet ({memberMeds.length})
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="text-center py-16 bg-white rounded-2xl border-dashed border-[#2F4858]/30">
            <CardContent className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#F8FDFB] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#2F4858]/10">
                <Users className="text-[#2F4858]/50 w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-[#2F4858]">No family members yet</h3>
              <p className="text-[#2F4858]/70 mt-1 mb-6 text-xs font-medium max-w-sm mx-auto">
                Add your family members to start tracking their medicines and checking for allergy conflicts.
              </p>
              <Button render={<Link href="/family/new" />} size="sm" className="bg-[#2F4858] text-[#DDFBEF] rounded-xl font-extrabold text-xs hover:bg-[#1E313D] shadow-sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Family Member
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
