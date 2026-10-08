import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link'
import { CabinetNav } from '@/components/CabinetNav';
import { expiryPresentation } from '@/lib/utils/statusPresentation';
import { DataUnavailable } from '@/components/DataUnavailable';
import { DeleteMedicineButton } from '@/components/DeleteMedicineButton';
import { RegulatoryRecordStatus } from '@/components/RegulatoryRecordStatus';
import { calculateExpiryStatus } from '@/lib/utils/expiryCalculator';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Pill, MapPin, User, ShieldAlert, Ban, Sparkles, Edit3, Sun, Clock, Thermometer, FlaskConical, Package, Building2, CalendarDays, Hash, BookOpen, AlertCircle } from 'lucide-react';

export default async function MedicineDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const resolvedParams = await params

  if (!user) redirect('/login')

  const medicineId = resolvedParams.id

  const { data: medicine, error: medicineError } = await supabase
    .from('medicines')
    .select('*, family_members(*)')
    .eq('id', medicineId)
    .single()

  if (medicineError?.code === '22P02') notFound()
  if (medicineError && medicineError.code !== 'PGRST116') return <><CabinetNav /><main id="main-content" tabIndex={-1} className="page-shell"><DataUnavailable /></main></>
  if (!medicine) notFound()


  const expiryStatus = calculateExpiryStatus(medicine.expiry_date)
  
  const ec = expiryPresentation[expiryStatus.urgency]

  const assignedMember = medicine.family_members
  const memberAllergies = assignedMember?.allergies || []
  const allergyConflicts = memberAllergies.filter((allergy: string) =>
    medicine.salt_composition?.toLowerCase().includes(allergy.toLowerCase()) ||
    medicine.medicine_name?.toLowerCase().includes(allergy.toLowerCase())
  )

  // Format expiry date human-friendly
  const expiryFormatted = medicine.expiry_date
    ? new Date(medicine.expiry_date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'Not recorded'

  return (
    <div className="bg-[#F8FDFB] min-h-screen text-[#2F4858] pb-16">
      <CabinetNav />

      <main id="main-content" tabIndex={-1} className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        
        <Button render={<Link href="/" />} variant="ghost" size="sm" className="rounded-xl text-xs font-extrabold text-muted-foreground hover:text-[#2F4858] hover:bg-[#DDFBEF]/50 flex items-center gap-1.5 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        {/* ── HEADER CARD ── */}
        <Card className="bg-white rounded-3xl shadow-sm overflow-hidden border-[#2F4858]/15">
          <div className="bg-[#2F4858] px-6 py-5 text-[#DDFBEF]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#DDFBEF]/10 flex items-center justify-center border border-[#DDFBEF]/20 shrink-0">
                  <Pill className="w-5 h-5 text-[#DDFBEF]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-black tracking-tight leading-tight break-words">{medicine.medicine_name}</h1>
                  {medicine.brand_or_manufacturer && (
                    <p className="text-xs text-[#DDFBEF]/70 font-medium mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {medicine.brand_or_manufacturer}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {medicine.is_daily_routine && (
                  <Badge variant="outline" className="text-sm font-black uppercase tracking-wider text-amber-900 bg-amber-400 border-amber-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Sun className="w-3 h-3" /> Daily
                  </Badge>
                )}
                <Badge variant="outline" className={`text-sm font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${ec.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ec.dot}`} />
                  {expiryStatus.label}
                </Badge>
              </div>
            </div>
          </div>

          <CardContent className="p-5 sm:p-6 space-y-5">

            {/* ── BAN NOTICE ── */}
            {medicine.is_banned && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-rose-900">Regulatory Ban Notice</p>
                  <p className="text-xs text-rose-800 font-medium mt-1 leading-relaxed">
                    {medicine.ban_notice_details || 'A regulatory warning is recorded. Review the source notice and its applicability before use; no clearance is established.'}
                  </p>
                </div>
              </div>
            )}

            {/* ── ALLERGY WARNING ── */}
            {allergyConflicts.length > 0 && !medicine.is_banned && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-amber-900">Allergy Conflict — {assignedMember?.full_name}</p>
                  <p className="text-xs text-amber-800 font-medium mt-1 leading-relaxed">
                    This person has a recorded allergy to <span className="font-bold">{allergyConflicts.join(', ')}</span>. The active ingredients in this medicine may trigger an allergic reaction. Consult a doctor before giving this medicine.
                  </p>
                </div>
              </div>
            )}

            {/* ── QUICK INFO GRID ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              <div className="col-span-2 sm:col-span-2 p-3.5 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/10 space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                  <FlaskConical className="w-3 h-3" /> Active Ingredients
                </div>
                <p className="text-xs font-bold text-[#2F4858] leading-snug">
                  {medicine.salt_composition || 'Not recorded'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/10 space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                  <Package className="w-3 h-3" /> Form
                </div>
                <p className="text-xs font-bold text-[#2F4858]">
                  {medicine.dosage_form || 'Tablet'}
                  {medicine.strength ? ` · ${medicine.strength}` : ''}
                </p>
              </div>

              <div className={`p-3.5 rounded-2xl border space-y-1 ${ec.bg}`}>
                <div className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="w-3 h-3" /> Expires
                </div>
                <p className="text-xs font-bold text-[#2F4858]">{expiryFormatted}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/10 space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="w-3 h-3" /> Stored At
                </div>
                <p className="text-xs font-bold text-[#2F4858]">{medicine.storage_location || 'Unspecified'}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/10 space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                  <User className="w-3 h-3" /> For
                </div>
                <p className="text-xs font-bold text-[#2F4858] truncate">
                  {assignedMember ? assignedMember.full_name : 'Shared'}
                </p>
                {assignedMember?.relationship && (
                  <p className="text-sm text-muted-foreground font-medium">{assignedMember.relationship}</p>
                )}
              </div>

              {medicine.batch_number && (
                <div className="p-3.5 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                    <Hash className="w-3 h-3" /> Batch No.
                  </div>
                  <p className="text-xs font-bold text-[#2F4858]">{medicine.batch_number}</p>
                </div>
              )}

            </div>

            <Separator className="bg-[#2F4858]/10" />

            {/* ── WHAT IT'S USED FOR ── */}
            {medicine.primary_uses && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#2F4858] uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5" />
                  What This Medicine Is For
                </div>
                <p className="text-sm text-[#2F4858]/90 leading-relaxed font-medium bg-[#F8FDFB] p-4 rounded-2xl border border-[#2F4858]/10">
                  {medicine.primary_uses}
                </p>
              </div>
            )}

            {/* ── HOW TO TAKE IT ── */}
            {medicine.dosage_instructions && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#2F4858] uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  How to Take It
                </div>
                <p className="text-sm text-[#2F4858]/90 leading-relaxed font-medium bg-[#F8FDFB] p-4 rounded-2xl border border-[#2F4858]/10">
                  {medicine.dosage_instructions}
                </p>
              </div>
            )}

            {/* ── PRECAUTIONS ── */}
            {medicine.precautions && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#2F4858] uppercase tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Important Precautions
                </div>
                <p className="text-sm text-[#2F4858]/90 leading-relaxed font-medium bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  {medicine.precautions}
                </p>
              </div>
            )}

            {/* ── ALLERGIES ── */}
            {assignedMember?.allergies?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#2F4858] uppercase tracking-wider">
                  <Thermometer className="w-3.5 h-3.5" />
                  Known Allergies for {assignedMember.full_name}
                </div>
                <div className="flex flex-wrap gap-2">
                  {assignedMember.allergies.map((a: string) => (
                    <Badge key={a} variant="outline" className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${allergyConflicts.includes(a) ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-[#F8FDFB] text-[#2F4858] border-[#2F4858]/20'}`}>
                      {a}
                      {allergyConflicts.includes(a) && ' ⚠'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <RegulatoryRecordStatus medicine={medicine} />
            {/* Recorded information provenance */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#DDFBEF]/50 border border-[#B7EED8]">
              <Sparkles className="w-4 h-4 text-[#2F4858] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-extrabold text-[#2F4858]">Recorded cabinet information</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Composition and instructions may include AI extraction or manual entry. Check the original label and prescription. Regulatory screening does not establish suitability for use.
                </p>
              </div>
            </div>

          </CardContent>

          {/* ── FOOTER ACTIONS ── */}
          <CardFooter className="p-5 border-t border-[#2F4858]/10 bg-[#F8FDFB] flex items-center justify-between gap-3">
            <DeleteMedicineButton id={medicineId} name={medicine.medicine_name} />
            <Button render={<Link href={`/medicines/${medicineId}/edit`} />} size="sm" variant="outline" className="rounded-xl text-xs font-bold bg-white border-[#2F4858]/20 text-[#2F4858] hover:bg-[#DDFBEF] flex items-center gap-1.5 cursor-pointer">
              <Edit3 className="w-3.5 h-3.5" />
              Edit Medicine
            </Button>
          </CardFooter>
        </Card>

      </main>
    </div>
  )
}
