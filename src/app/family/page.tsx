import { createClient } from '@/lib/supabase/server';
import Link from 'next/link'
import { redirect } from 'next/navigation';
import { DataUnavailable } from '@/components/DataUnavailable';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus, Edit3, ShieldAlert, Sparkles } from 'lucide-react';
import { DeleteFamilyMemberButton } from '@/components/DeleteFamilyMemberButton';
import { EditFamilyMemberModal } from '@/components/EditFamilyMemberModal';
import { calculateAge } from '@/lib/utils/ageCalculator';

export default async function FamilyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [familyResult, medicineResult, reportResult] = await Promise.all([
    supabase.from('family_members').select('*', { count: 'exact' }).order('created_at', { ascending: true }).range(0, 999),
    supabase.from('medicines').select('id, family_member_id, is_banned', { count: 'exact' }).order('id').range(0, 999),
    supabase.from('medical_records').select('id, family_member_id', { count: 'exact' }).order('id').range(0, 999),
  ])
  const familyMembers = familyResult.data
  const medicines = medicineResult.data
  const medicalRecords = reportResult.data
  const incomplete = (familyResult.count || 0) > (familyMembers?.length || 0) || (medicineResult.count || 0) > (medicines?.length || 0) || (reportResult.count || 0) > (medicalRecords?.length || 0)
  if (familyResult.error || medicineResult.error || reportResult.error) return <><Navbar familyMembers={familyMembers || []} medicines={medicines || []} warningsUnavailable /><main id="main-content" tabIndex={-1} className="page-shell"><h1 className="text-2xl font-bold">Family profiles</h1><DataUnavailable /></main></>

  return (
    <div className="bg-[#F8FDFB] min-h-screen text-[#2F4858]">
      <Navbar familyMembers={familyMembers || []} medicines={medicines || []} warningsUnavailable={incomplete} />

      <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-[#2F4858] tracking-tight">Family Profiles</h1>
            <p className="text-xs font-semibold text-muted-foreground mt-1">Manage medicine cabinets, age-specific safety, and AI-analyzed health records</p>
          </div>
          <Button render={<Link href="/family/new" />} size="sm" className="bg-[#2F4858] text-[#DDFBEF] rounded-xl hover:bg-[#1E313D] text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4 mr-1" />
            <span>Add Member</span>
          </Button>
        </header>

        {incomplete && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">This overview includes up to 1,000 profiles, medicines and reports. Counts and warnings shown here may be incomplete. Open a profile or the paginated cabinet and alerts pages to review its records.</p>}
        {familyMembers && familyMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-8">
            {familyMembers.map((member) => {
              const memberMeds = medicines?.filter(m => m.family_member_id === member.id) || [];
              const memberRecords = medicalRecords?.filter(r => r.family_member_id === member.id) || [];
              const ageInfo = calculateAge(member.date_of_birth || member.birth_date);

              return (
                <Card key={member.id} className="bg-white border-[#2F4858]/15 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center justify-between">
                  <div className="flex flex-col items-center w-full">
                    <Avatar className="w-16 h-16 rounded-2xl border border-[#2F4858]/20 bg-[#DDFBEF]/50 text-[#2F4858] mb-3 shadow-inner">
                      <AvatarFallback className="bg-[#DDFBEF] text-[#2F4858] font-black text-xl">
                        {member.avatar_initials || member.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="font-extrabold text-[#2F4858] leading-tight text-base">{member.full_name}</h3>
                    
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5 mb-2.5">
                      <Badge variant="outline" className="text-sm bg-[#DDFBEF] text-[#2F4858] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold border-[#B7EED8]">
                        {member.relationship}
                      </Badge>
                      {ageInfo ? (
                        <Badge className={`text-sm font-black px-2 py-0.5 rounded-full ${ageInfo.badgeColor}`}>
                          {ageInfo.formatted} • {ageInfo.lifeStageLabel}
                        </Badge>
                      ) : (
                        <EditFamilyMemberModal
                          member={member}
                          trigger={
                            <span className="text-sm font-bold text-muted-foreground hover:text-[#2F4858] underline cursor-pointer">
                              + Set DOB
                            </span>
                          }
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                      {member.allergies && member.allergies.length > 0 && (
                        <Badge variant="destructive" className="text-sm font-bold">
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          {member.allergies.length} Allergies
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-sm font-bold bg-[#F8FDFB] text-[#2F4858] border-[#2F4858]/15">
                        {memberRecords.length} Lab Records
                      </Badge>
                      <Badge variant="outline" className="text-sm font-bold bg-[#F8FDFB] text-[#2F4858] border-[#2F4858]/15">
                        {memberMeds.length} Medicines
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-[#2F4858]/10 w-full flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <Button render={<Link href={`/family/${member.id}`} />} size="sm" className="bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] rounded-xl text-xs font-extrabold flex-1 shadow-sm flex items-center justify-center gap-1">
                        <Sparkles className="size-3.5 text-[#DDFBEF]" />
                        <span>View health records →</span>
                      </Button>

                      <EditFamilyMemberModal
                        member={member}
                        trigger={
                          <Button aria-label={'Edit profile for ' + member.full_name} size="icon-sm" variant="outline" className="rounded-xl border-[#2F4858]/20 text-[#2F4858] hover:bg-[#DDFBEF]/50 cursor-pointer" title="Edit Profile">
                            <Edit3 className="size-3.5" />
                          </Button>
                        }
                      />

                      <DeleteFamilyMemberButton
                        memberId={member.id}
                        memberName={member.full_name}
                      />
                    </div>

                    <Link href={`/?member=${member.id}`} className="text-sm font-bold text-muted-foreground hover:text-[#2F4858] hover:underline text-center">
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
                <Users className="text-muted-foreground w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-[#2F4858]">No family members yet</h3>
              <p className="text-muted-foreground mt-1 mb-6 text-xs font-medium max-w-sm mx-auto">
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
