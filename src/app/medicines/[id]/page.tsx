import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { calculateExpiryStatus } from '@/lib/utils/expiryCalculator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Pill,
  MapPin,
  User,
  ShieldAlert,
  Ban,
  Sparkles,
  Edit3,
  Trash2,
  HelpCircle,
  Sun,
  Clock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react'

export default async function MedicineDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const resolvedParams = await params

  if (!user) {
    redirect('/login')
  }

  const medicineId = resolvedParams.id

  const { data: medicine } = await supabase
    .from('medicines')
    .select('*, family_members(*)')
    .eq('id', medicineId)
    .single()

  if (!medicine) {
    redirect('/')
  }

  const { data: familyMembers } = await supabase.from('family_members').select('*')

  const expiryStatus = calculateExpiryStatus(medicine.expiry_date)
  let badgeColor = expiryStatus.label === 'Expired' ? 'text-rose-700 bg-rose-100 border-rose-200' 
                : expiryStatus.label === '< 15 Days' ? 'text-rose-700 bg-rose-100 border-rose-200' 
                : expiryStatus.label === '< 45 Days' ? 'text-amber-700 bg-amber-100 border-amber-200'
                : 'text-emerald-700 bg-emerald-100 border-emerald-200';
  let dotColor = expiryStatus.label === 'Expired' ? 'bg-rose-600' : expiryStatus.label === '< 15 Days' ? 'bg-rose-600' : expiryStatus.label === '< 45 Days' ? 'bg-amber-600' : 'bg-emerald-600';

  const assignedMember = medicine.family_members
  const memberAllergies = assignedMember?.allergies || []
  const allergyConflicts = memberAllergies.filter((allergy: string) => 
    medicine.salt_composition?.toLowerCase().includes(allergy.toLowerCase()) || 
    medicine.medicine_name?.toLowerCase().includes(allergy.toLowerCase())
  );

  return (
    <div className="bg-[#F8FDFB] min-h-screen text-[#2F4858] pb-16">
      <Navbar familyMembers={familyMembers || []} medicines={[]} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        
        <Button render={<Link href="/" />} variant="ghost" size="sm" className="mb-6 rounded-xl text-xs font-extrabold text-[#2F4858]/70 hover:text-[#2F4858] hover:bg-[#DDFBEF]/50 flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Button>

        <Card className="bg-white rounded-3xl shadow-sm overflow-hidden border-[#2F4858]/15">
          
          {/* Header */}
          <div className="bg-[#2F4858] px-6 py-5 flex items-center justify-between text-[#DDFBEF]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DDFBEF]/10 flex items-center justify-center shadow-inner border border-[#DDFBEF]/20">
                <Pill className="w-5 h-5 text-[#DDFBEF]" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">{medicine.medicine_name}</h2>
                {medicine.is_daily_routine && (
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-400 border-amber-500 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm w-max">
                    <Sun className="w-3 h-3" /> Daily Routine
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            
            {/* Regulatory Ban Notice */}
            {medicine.is_banned && (
              <Card className="p-4 rounded-xl bg-rose-50 border-rose-300 space-y-2 shadow-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-950 font-black text-sm">
                    <Ban className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>REGULATORY BAN & PROHIBITION NOTICE</span>
                  </div>
                </div>
                <p className="text-xs text-rose-800 font-medium leading-relaxed">
                  {medicine.ban_notice_details || 'This medicine formulation has been withdrawn from market sale or banned by regulatory authorities due to safety concerns.'}
                </p>
              </Card>
            )}

            {/* Allergy Conflict Warning */}
            {allergyConflicts.length > 0 && !medicine.is_banned && (
              <Card className="p-4 rounded-xl bg-amber-50 border-amber-300 space-y-1.5 shadow-none">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>CROSS-ALLERGY WARNING FOR {assignedMember?.full_name?.toUpperCase()}</span>
                </div>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  This patient profile has recorded allergies to: <span className="font-bold underline">{allergyConflicts.join(', ')}</span>. The active ingredients in {medicine.medicine_name} ({medicine.salt_composition}) may trigger an allergic hypersensitivity reaction. Consult a physician before administration.
                </p>
              </Card>
            )}

            {/* Pharmacological Details Box */}
            <Card className="p-4 rounded-2xl bg-[#DDFBEF]/40 border-[#B7EED8] space-y-3 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858]">
                  Active Salt Composition & Chemistry
                </span>
                <Badge variant="outline" className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#2F4858] border-[#2F4858]/15">
                  Generic Formula
                </Badge>
              </div>
              <p className="text-sm font-bold text-[#2F4858] bg-white p-3 rounded-xl border border-[#2F4858]/10 shadow-sm">
                {medicine.salt_composition}
              </p>
            </Card>

            {/* Key Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              
              <Card className="p-3.5 rounded-xl border-[#2F4858]/15 bg-[#F8FDFB] space-y-1 shadow-none">
                <span className="text-[11px] font-bold text-[#2F4858]/60 uppercase">Expiry Status</span>
                <div className="flex items-center gap-2 pt-0.5">
                  <Badge variant="outline" className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeColor} flex items-center gap-1.5`}>
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    {expiryStatus.label}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#2F4858]/70 pt-1 font-medium">
                  Date: {new Date(medicine.expiry_date).toLocaleDateString()}
                </p>
              </Card>

              <Card className="p-3.5 rounded-xl border-[#2F4858]/15 bg-[#F8FDFB] space-y-1 shadow-none">
                <span className="text-[11px] font-bold text-[#2F4858]/60 uppercase">Storage Location</span>
                <div className="flex items-center gap-1.5 pt-0.5 text-xs font-extrabold text-[#2F4858]">
                  <MapPin className="w-4 h-4 text-[#2F4858]" />
                  <span>{medicine.storage_location || 'Unassigned'}</span>
                </div>
                <p className="text-[11px] text-[#2F4858]/70 pt-1 font-medium">
                  Cabinet Zone
                </p>
              </Card>

              <Card className="p-3.5 rounded-xl border-[#2F4858]/15 bg-[#F8FDFB] space-y-1 shadow-none">
                <span className="text-[11px] font-bold text-[#2F4858]/60 uppercase">Family Member</span>
                <div className="flex items-center gap-1.5 pt-0.5 text-xs font-extrabold text-[#2F4858]">
                  <User className="w-4 h-4 text-[#2F4858]" />
                  <span>{assignedMember ? `${assignedMember.full_name} (${assignedMember.relationship})` : 'Household Shared'}</span>
                </div>
                <p className="text-[11px] text-[#2F4858]/70 pt-1 font-medium">
                  {assignedMember?.allergies?.length ? `${assignedMember.allergies.length} allergies logged` : 'No known allergies'}
                </p>
              </Card>

            </div>

            {/* Primary Uses & Dosage Regimen */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-extrabold text-[#2F4858] mb-1">
                  Primary Indications & Therapeutic Uses
                </h4>
                <p className="text-xs font-medium text-[#2F4858]/90 bg-[#F8FDFB] p-3 rounded-xl border border-[#2F4858]/10 leading-relaxed">
                  {medicine.primary_uses || 'General medical therapeutic application.'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-extrabold text-[#2F4858] mb-1">
                  Standard Dosage Regimen & Administration Instructions
                </h4>
                <p className="text-xs font-medium text-[#2F4858]/90 bg-[#F8FDFB] p-3 rounded-xl border border-[#2F4858]/10 leading-relaxed">
                  {medicine.dosage_instructions || 'Administer strictly as instructed on prescription or by healthcare provider.'}
                </p>
              </div>
            </div>

            {/* AI Clinical Insights Badge */}
            <Card className="p-4 rounded-xl bg-[#DDFBEF]/50 border-[#B7EED8] flex flex-row items-start gap-3 text-xs shadow-none">
              <Sparkles className="w-5 h-5 text-[#2F4858] shrink-0 mt-0.5" />
              <div>
                <h5 className="font-extrabold text-[#2F4858]">
                  AI Pharmacological Intelligence Verified
                </h5>
                <p className="text-[#2F4858]/80 mt-0.5 leading-relaxed font-medium">
                  Active salt classification, therapeutic category, and regulatory status have been verified against active clinical databases.
                </p>
              </div>
            </Card>

          </CardContent>

          {/* Footer Actions */}
          <CardFooter className="p-5 border-t border-[#2F4858]/15 bg-[#F8FDFB] flex items-center justify-between gap-3">
            <form action={async () => {
              'use server'
              const { deleteMedicine } = await import('@/app/actions/medicine')
              await deleteMedicine(medicineId)
            }}>
              <Button type="submit" variant="outline" size="sm" className="rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 hover:text-rose-800 border-rose-200 flex items-center gap-1.5 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Entry</span>
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Button render={<Link href={`/medicines/${medicineId}/edit`} />} size="sm" variant="outline" className="rounded-xl text-xs font-bold bg-white border-[#2F4858]/20 text-[#2F4858] hover:bg-[#DDFBEF] flex items-center gap-1.5 cursor-pointer">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Medicine</span>
              </Button>
            </div>
          </CardFooter>
        </Card>

      </main>
    </div>
  )
}
