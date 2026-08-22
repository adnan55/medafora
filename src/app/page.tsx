import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { calculateExpiryStatus } from '@/lib/utils/expiryCalculator'
import { Navbar } from '@/components/Navbar'
import { DashboardFilters } from '@/components/DashboardFilters'
import { MedicineDetailsDrawer } from '@/components/MedicineDetailsDrawer'
import { AddMedicalRecordModal } from '@/components/AddMedicalRecordModal'
import { MedicalRecordDetailModal } from '@/components/MedicalRecordDetailModal'
import { LogVitalModal } from '@/components/LogVitalModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Search,
  MapPin,
  Layers,
  ArrowUpDown,
  RotateCcw,
  Pill,
  ShieldAlert,
  Ban,
  Tag,
  User,
  Sparkles,
  ExternalLink,
  Edit3,
  Trash2,
  Users,
  Sun,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Plus,
  FileText,
  Activity,
  HeartPulse,
  Droplet,
  Heart,
  Calendar,
  Building,
  Stethoscope,
  TrendingUp,
  Percent,
  Wind,
  CheckCircle2,
} from 'lucide-react'

export default async function Home({ searchParams }: { searchParams: Promise<{ member?: string, storage?: string, form?: string, sort?: string, q?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const resolvedParams = await searchParams

  let medicines: any[] = []
  let medicalRecords: any[] = []
  let vitalLogs: any[] = []
  let familyMembers: any[] = []
  let uniqueStorages: string[] = []
  let uniqueForms: string[] = []
  const selectedMember = resolvedParams.member || 'ALL'

  if (user) {
    const { data: fData } = await supabase.from('family_members').select('*')
    if (fData) familyMembers = fData

    // Sort order
    let orderCol = 'expiry_date'
    let orderAsc = true
    if (resolvedParams.sort === 'expiry_desc') { orderCol = 'expiry_date'; orderAsc = false }
    if (resolvedParams.sort === 'name_asc') { orderCol = 'medicine_name'; orderAsc = true }
    if (resolvedParams.sort === 'name_desc') { orderCol = 'medicine_name'; orderAsc = false }

    let query = supabase
      .from('medicines')
      .select('*, family_members(id, full_name, relationship, avatar_color)')
      .order(orderCol, { ascending: orderAsc })

    let medRecQuery = supabase
      .from('medical_records')
      .select('*, family_members(id, full_name, relationship)')
      .order('test_date', { ascending: false })

    let vitalQuery = supabase
      .from('vital_logs')
      .select('*, family_members(id, full_name, relationship)')
      .order('recorded_at', { ascending: false })

    // Fetch all for dropdowns before filtering
    const { data: allMeds } = await supabase.from('medicines').select('storage_location, dosage_form').eq('user_id', user.id);
    uniqueStorages = Array.from(new Set(allMeds?.map(m => m.storage_location).filter(Boolean))) as string[];
    uniqueForms = Array.from(new Set(allMeds?.map(m => m.dosage_form).filter(Boolean))) as string[];

    if (selectedMember !== 'ALL') {
      query = query.eq('family_member_id', selectedMember)
      medRecQuery = medRecQuery.eq('family_member_id', selectedMember)
      vitalQuery = vitalQuery.eq('family_member_id', selectedMember)
    }

    if (resolvedParams.storage && resolvedParams.storage !== 'ALL') {
      query = query.eq('storage_location', resolvedParams.storage)
    }

    if (resolvedParams.form && resolvedParams.form !== 'ALL') {
      query = query.eq('dosage_form', resolvedParams.form)
    }

    const [{ data: mData }, { data: recData }, { data: vData }] = await Promise.all([
      query,
      medRecQuery,
      vitalQuery,
    ])

    if (recData) medicalRecords = recData
    if (vData) vitalLogs = vData

    if (mData) {
      if (resolvedParams.q && resolvedParams.q.trim()) {
        const queryTerms = resolvedParams.q.trim().toLowerCase().split(/\s+/).filter(Boolean)
        medicines = mData.filter((med) => {
          const medName = (med.medicine_name || '').toLowerCase()
          const salt = (med.salt_composition || '').toLowerCase()
          const uses = (med.primary_uses || '').toLowerCase()
          const instructions = (med.dosage_instructions || '').toLowerCase()
          const brand = (med.brand_or_manufacturer || '').toLowerCase()
          const notes = (med.notes || '').toLowerCase()
          const storage = (med.storage_location || '').toLowerCase()
          const form = (med.dosage_form || '').toLowerCase()
          const targetDiseases = Array.isArray(med.target_diseases)
            ? med.target_diseases.map((d: string) => String(d).toLowerCase()).join(' ')
            : ''

          const searchableText = `${medName} ${salt} ${uses} ${instructions} ${brand} ${notes} ${storage} ${form} ${targetDiseases}`

          return queryTerms.every((term) => searchableText.includes(term))
        })
      } else {
        medicines = mData
      }
    }
  }

  // Find the selected member object for display
  const currentMemberObj = selectedMember !== 'ALL' ? familyMembers.find(m => m.id === selectedMember) : null;

  // Diagnostic Overview Metrics
  const allBiomarkers = medicalRecords.flatMap(r => Array.isArray(r.biomarkers) ? r.biomarkers : [])
  const abnormalBiomarkers = allBiomarkers.filter(b => b.status === 'HIGH' || b.status === 'CRITICAL' || b.status === 'LOW')
  
  // Group abnormal biomarkers by member
  const abnormalByMember: Record<string, { memberName: string, count: number, names: string[] }> = {}
  medicalRecords.forEach(r => {
    const bms = Array.isArray(r.biomarkers) ? r.biomarkers : []
    const abnormals = bms.filter((b: any) => b.status === 'HIGH' || b.status === 'CRITICAL' || b.status === 'LOW')
    if (abnormals.length > 0) {
      const mName = r.family_members?.full_name?.split(' ')[0] || 'Member'
      if (!abnormalByMember[mName]) {
        abnormalByMember[mName] = { memberName: mName, count: 0, names: [] }
      }
      abnormalByMember[mName].count += abnormals.length
      abnormals.forEach((b: any) => {
        if (b.name && !abnormalByMember[mName].names.includes(b.name)) {
          abnormalByMember[mName].names.push(b.name)
        }
      })
    }
  })

  // Group reports by member
  const reportsByMember: Record<string, number> = {}
  medicalRecords.forEach(r => {
    const mName = r.family_members?.full_name?.split(' ')[0] || 'Member'
    reportsByMember[mName] = (reportsByMember[mName] || 0) + 1
  })

  // Diagnoses with Member attribution
  const diagnosesWithMember = medicalRecords
    .filter(r => r.diagnosis)
    .map(r => ({
      memberName: r.family_members?.full_name?.split(' ')[0] || 'Member',
      diagnosis: r.diagnosis
    }))

  const uniqueDiagnoses = Array.from(
    new Set(medicalRecords.map(r => r.diagnosis).filter(Boolean))
  ) as string[]

  // Key vital sign readings (from vital logs or lab reports)
  const latestGlucose = vitalLogs.find(v => v.vital_type === 'BLOOD_GLUCOSE') ||
    allBiomarkers.find(b => (b.name || '').toLowerCase().includes('glucose') || (b.name || '').toLowerCase().includes('sugar'))

  const latestBP = vitalLogs.find(v => v.vital_type === 'BLOOD_PRESSURE') ||
    allBiomarkers.find(b => (b.name || '').toLowerCase().includes('blood pressure') || (b.name || '').toLowerCase().includes('bp'))

  const latestHbA1c = vitalLogs.find(v => v.vital_type === 'HBA1C') ||
    allBiomarkers.find(b => (b.name || '').toLowerCase().includes('hba1c'))

  const latestCholesterol = vitalLogs.find(v => v.vital_type === 'CHOLESTEROL') ||
    allBiomarkers.find(b => (b.name || '').toLowerCase().includes('cholesterol') || (b.name || '').toLowerCase().includes('lipid'))

  const latestPulse = vitalLogs.find(v => v.vital_type === 'HEART_RATE')
  const latestSpO2 = vitalLogs.find(v => v.vital_type === 'SPO2')

  return (
    <div className="bg-[#F8FDFB] min-h-screen text-[#2F4858] font-sans">
      <Navbar familyMembers={familyMembers} medicines={medicines} />

      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        
        {/* Family Member Quick Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full scrollbar-none pb-2" role="tablist" aria-label="Family members">
          <Button
            render={<Link href="/" />}
            variant={selectedMember === 'ALL' ? 'default' : 'outline'}
            size="sm"
            className={`rounded-xl text-xs font-bold transition-all cursor-pointer h-8 px-3 shrink-0 ${
              selectedMember === 'ALL'
                ? 'bg-[#2F4858] text-[#DDFBEF] hover:bg-[#1E313D] shadow-sm'
                : 'bg-[#DDFBEF]/50 text-[#2F4858] hover:bg-[#DDFBEF] border border-[#2F4858]/10'
            }`}
          >
            <Users className="w-3.5 h-3.5 mr-1" />
            All Family
          </Button>

          {familyMembers.map((member) => {
            const isSelected = selectedMember === member.id;
            return (
              <Button
                render={<Link href={`/?member=${member.id}`} />}
                key={member.id}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={`rounded-xl text-xs font-bold transition-all cursor-pointer h-8 px-3 shrink-0 ${
                  isSelected
                    ? 'bg-[#2F4858] text-[#DDFBEF] hover:bg-[#1E313D] shadow-sm'
                    : 'bg-[#DDFBEF]/50 text-[#2F4858] hover:bg-[#DDFBEF] border border-[#2F4858]/10'
                }`}
              >
                <span className={`w-2 h-2 rounded-full mr-1.5 ${member.allergies?.length > 0 ? 'bg-amber-500' : 'bg-[#B7EED8]'}`} />
                {member.full_name.split(' ')[0]}
              </Button>
            );
          })}

          <Button
            render={<Link href="/family" />}
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs font-bold text-[#2F4858]/80 hover:bg-[#DDFBEF] hover:text-[#2F4858] h-8 px-3 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Manage Profiles
          </Button>
        </div>

        {/* Member Health Profile Banner (When member is selected) */}
        {currentMemberObj && (
          <Card className="rounded-3xl bg-white border-[#2F4858]/15 shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
              <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
                <Avatar className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-[#2F4858]/20 bg-[#DDFBEF] text-[#2F4858] shadow-inner shrink-0">
                  <AvatarFallback className="rounded-2xl bg-[#DDFBEF] text-[#2F4858] font-black text-lg sm:text-xl">
                    {currentMemberObj.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-[#2F4858] truncate">
                      {currentMemberObj.full_name}
                    </h2>
                    <Badge variant="outline" className="bg-[#DDFBEF] text-[#2F4858] font-black border-[#B7EED8] text-[10px] uppercase tracking-wider rounded-full px-2.5">
                      {currentMemberObj.relationship}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                    {currentMemberObj.allergies?.length > 0 ? (
                      <Badge variant="destructive" className="font-bold flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] sm:text-[11px]">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        Allergies: {currentMemberObj.allergies.join(', ')}
                      </Badge>
                    ) : (
                      <span className="text-[#2F4858]/70 font-semibold flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="size-3.5 text-emerald-600" />
                        No recorded allergies
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Action Triggers */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto [&>div]:w-full sm:[&>div]:w-auto [&>div>button]:w-full sm:[&>div>button]:w-auto [&>button]:w-full sm:[&>button]:w-auto">
                <LogVitalModal
                  familyMemberId={currentMemberObj.id}
                  familyMemberName={currentMemberObj.full_name}
                  trigger={
                    <Button size="sm" className="bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1 h-9">
                      <Activity className="size-3.5" />
                      <span>Log Vitals / Sugar</span>
                    </Button>
                  }
                />

                <AddMedicalRecordModal
                  familyMemberId={currentMemberObj.id}
                  familyMemberName={currentMemberObj.full_name}
                  trigger={
                    <Button size="sm" variant="outline" className="bg-white hover:bg-[#DDFBEF]/50 text-[#2F4858] border-[#2F4858]/20 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1 h-9">
                      <Sparkles className="size-3.5 text-[#2F4858]" />
                      <span>Add Lab Report</span>
                    </Button>
                  }
                />

                <Button
                  render={<Link href={`/family/${currentMemberObj.id}`} />}
                  size="sm"
                  variant="outline"
                  className="bg-[#DDFBEF] hover:bg-[#DDFBEF]/80 text-[#2F4858] border-[#B7EED8] rounded-xl text-xs font-extrabold shadow-xs justify-center h-9"
                >
                  <span>Health Hub & Trends →</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AT-A-GLANCE MEDICAL DIAGNOSTICS & CLINICAL OVERVIEW (WITH CLEAR PATIENT ATTRIBUTION) */}
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858] flex items-center gap-2">
              <Activity className="size-4 text-[#2F4858]" />
              <span>
                {currentMemberObj ? `${currentMemberObj.full_name}'s Medical & Clinical Overview` : 'Family Medical Diagnostics & Clinical Overview'}
              </span>
            </h3>
            {currentMemberObj && (
              <Link href={`/family/${currentMemberObj.id}`} className="text-xs font-bold text-[#2F4858] hover:underline flex items-center gap-1">
                <span>Trends →</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Total Reports Card */}
            <Card className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-sm flex flex-col justify-between hover:border-[#2F4858]/40 transition-colors">
              <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">Lab Reports</span>
                <div className="size-6 sm:size-7 rounded-xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center">
                  <FileText className="size-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-black text-[#2F4858] tracking-tight tabular-nums">
                  {medicalRecords.length}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#2F4858]/80 mt-1 flex items-center gap-1 truncate">
                  {medicalRecords.length > 0 ? (
                    currentMemberObj ? (
                      <span>👤 {currentMemberObj.full_name.split(' ')[0]} ({allBiomarkers.length} biomarkers)</span>
                    ) : (
                      <span>👤 {Object.entries(reportsByMember).map(([n, c]) => `${n} (${c})`).join(', ')}</span>
                    )
                  ) : (
                    <span className="text-[#2F4858]/50">No reports uploaded</span>
                  )}
                </div>
              </div>
            </Card>

            {/* Abnormal Biomarkers Alert Card */}
            <Card className={`p-3.5 sm:p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors ${
              abnormalBiomarkers.length > 0
                ? 'bg-rose-50/80 border-rose-200 hover:bg-rose-100/80'
                : 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/80'
            }`}>
              <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  abnormalBiomarkers.length > 0 ? 'text-rose-800' : 'text-emerald-800'
                }`}>
                  Abnormal Flags
                </span>
                <div className={`size-6 sm:size-7 rounded-xl flex items-center justify-center ${
                  abnormalBiomarkers.length > 0 ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                }`}>
                  {abnormalBiomarkers.length > 0 ? <AlertTriangle className="size-3.5 text-rose-700" /> : <ShieldCheck className="size-3.5 text-emerald-700" />}
                </div>
              </div>
              <div>
                <div className={`text-xl sm:text-3xl font-black tracking-tight tabular-nums ${
                  abnormalBiomarkers.length > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {abnormalBiomarkers.length}
                </div>
                <div className={`text-[10px] sm:text-[11px] font-bold mt-1 truncate ${
                  abnormalBiomarkers.length > 0 ? 'text-rose-800' : 'text-emerald-800'
                }`}>
                  {abnormalBiomarkers.length > 0 ? (
                    currentMemberObj ? (
                      <span>⚠️ {currentMemberObj.full_name.split(' ')[0]} ({abnormalBiomarkers.map((b: any) => b.name).filter(Boolean).slice(0, 2).join(', ')})</span>
                    ) : (
                      <span>⚠️ In: {Object.values(abnormalByMember).map(a => `${a.memberName} (${a.count})`).join(', ')}</span>
                    )
                  ) : (
                    <span>All test parameters optimal</span>
                  )}
                </div>
              </div>
            </Card>

            {/* Active Diagnoses Card */}
            <Card className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-sm flex flex-col justify-between hover:border-[#2F4858]/40 transition-colors">
              <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">Diagnoses</span>
                <div className="size-6 sm:size-7 rounded-xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center">
                  <Stethoscope className="size-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-black text-[#2F4858] tracking-tight tabular-nums">
                  {uniqueDiagnoses.length}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#2F4858]/80 mt-1 truncate">
                  {diagnosesWithMember.length > 0 ? (
                    currentMemberObj ? (
                      <span>🩺 {diagnosesWithMember[0].diagnosis}</span>
                    ) : (
                      <span>🩺 {diagnosesWithMember[0].memberName}: {diagnosesWithMember[0].diagnosis}</span>
                    )
                  ) : (
                    <span className="text-[#2F4858]/50">No chronic diagnoses</span>
                  )}
                </div>
              </div>
            </Card>

            {/* At-Home Self Checks Card */}
            <Card className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-sm flex flex-col justify-between hover:border-[#2F4858]/40 transition-colors">
              <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/60">Self-Checks</span>
                <div className="size-6 sm:size-7 rounded-xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center">
                  <HeartPulse className="size-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-3xl font-black text-[#2F4858] tracking-tight tabular-nums">
                  {vitalLogs.length}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#2F4858]/80 mt-1 truncate">
                  {vitalLogs.length > 0 ? (
                    currentMemberObj ? (
                      <span>📊 {vitalLogs[0].name}: {vitalLogs[0].value} {vitalLogs[0].unit}</span>
                    ) : (
                      <span>📊 {vitalLogs[0].family_members?.full_name?.split(' ')[0] || 'Member'}: {vitalLogs[0].name} ({vitalLogs[0].value})</span>
                    )
                  ) : (
                    <span className="text-[#2F4858]/50">Glucometer, BP, Pulse</span>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* LIVE BIOMARKERS QUICK-RADAR RIBBON (WITH MEMBER NAMES) */}
          {(latestGlucose || latestBP || latestPulse || latestHbA1c || latestSpO2 || latestCholesterol) && (
            <Card className="p-3 px-4 rounded-2xl bg-white border border-[#2F4858]/15 shadow-sm">
              <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none py-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/70 shrink-0 flex items-center gap-1">
                  <Activity className="size-3" />
                  <span>
                    {currentMemberObj ? `${currentMemberObj.full_name.split(' ')[0]}'s Vitals Radar:` : 'Family Vitals Radar:'}
                  </span>
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {latestGlucose && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F8FDFB] border border-[#2F4858]/15 text-xs font-bold">
                      <Droplet className="size-3.5 text-rose-600" />
                      {!currentMemberObj && latestGlucose.family_members && (
                        <span className="bg-[#DDFBEF] text-[#2F4858] text-[9px] font-black px-1.5 py-0.5 rounded">
                          {latestGlucose.family_members.full_name.split(' ')[0]}
                        </span>
                      )}
                      <span className="text-[#2F4858]/70 text-[10px]">Sugar:</span>
                      <span className="text-[#2F4858] font-black">{latestGlucose.value} {latestGlucose.unit || 'mg/dL'}</span>
                      {latestGlucose.context && (
                        <span className="text-[9px] px-1 rounded bg-[#DDFBEF] text-[#2F4858] font-bold">
                          {latestGlucose.context.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  )}

                  {latestBP && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F8FDFB] border border-[#2F4858]/15 text-xs font-bold">
                      <Heart className="size-3.5 text-rose-600" />
                      {!currentMemberObj && latestBP.family_members && (
                        <span className="bg-[#DDFBEF] text-[#2F4858] text-[9px] font-black px-1.5 py-0.5 rounded">
                          {latestBP.family_members.full_name.split(' ')[0]}
                        </span>
                      )}
                      <span className="text-[#2F4858]/70 text-[10px]">BP:</span>
                      <span className="text-[#2F4858] font-black">
                        {latestBP.value}{latestBP.value_secondary && `/${latestBP.value_secondary}`} {latestBP.unit || 'mmHg'}
                      </span>
                    </div>
                  )}

                  {latestPulse && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F8FDFB] border border-[#2F4858]/15 text-xs font-bold">
                      <Activity className="size-3.5 text-emerald-600" />
                      {!currentMemberObj && latestPulse.family_members && (
                        <span className="bg-[#DDFBEF] text-[#2F4858] text-[9px] font-black px-1.5 py-0.5 rounded">
                          {latestPulse.family_members.full_name.split(' ')[0]}
                        </span>
                      )}
                      <span className="text-[#2F4858]/70 text-[10px]">Pulse:</span>
                      <span className="text-[#2F4858] font-black">{latestPulse.value} {latestPulse.unit || 'bpm'}</span>
                    </div>
                  )}

                  {latestHbA1c && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F8FDFB] border border-[#2F4858]/15 text-xs font-bold">
                      <Percent className="size-3.5 text-indigo-600" />
                      {!currentMemberObj && latestHbA1c.family_members && (
                        <span className="bg-[#DDFBEF] text-[#2F4858] text-[9px] font-black px-1.5 py-0.5 rounded">
                          {latestHbA1c.family_members.full_name.split(' ')[0]}
                        </span>
                      )}
                      <span className="text-[#2F4858]/70 text-[10px]">HbA1c:</span>
                      <span className="text-[#2F4858] font-black">{latestHbA1c.value} {latestHbA1c.unit || '%'}</span>
                    </div>
                  )}

                  {latestSpO2 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F8FDFB] border border-[#2F4858]/15 text-xs font-bold">
                      <Wind className="size-3.5 text-sky-600" />
                      {!currentMemberObj && latestSpO2.family_members && (
                        <span className="bg-[#DDFBEF] text-[#2F4858] text-[9px] font-black px-1.5 py-0.5 rounded">
                          {latestSpO2.family_members.full_name.split(' ')[0]}
                        </span>
                      )}
                      <span className="text-[#2F4858]/70 text-[10px]">SpO2:</span>
                      <span className="text-[#2F4858] font-black">{latestSpO2.value} {latestSpO2.unit || '%'}</span>
                    </div>
                  )}

                  {latestCholesterol && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F8FDFB] border border-[#2F4858]/15 text-xs font-bold">
                      <HeartPulse className="size-3.5 text-amber-600" />
                      {!currentMemberObj && latestCholesterol.family_members && (
                        <span className="bg-[#DDFBEF] text-[#2F4858] text-[9px] font-black px-1.5 py-0.5 rounded">
                          {latestCholesterol.family_members.full_name.split(' ')[0]}
                        </span>
                      )}
                      <span className="text-[#2F4858]/70 text-[10px]">Lipid:</span>
                      <span className="text-[#2F4858] font-black">{latestCholesterol.value} {latestCholesterol.unit || 'mg/dL'}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Medicine Expiry Urgency Status Grid */}
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#2F4858]/80 flex items-center gap-1.5">
            <Pill className="size-3.5 text-[#2F4858]" />
            <span>Medicine Cabinet & Expiry Urgency Status</span>
          </span>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 rounded-2xl bg-rose-50 border-rose-200 shadow-sm flex flex-col justify-between hover:bg-rose-100 transition-colors cursor-pointer ring-1 ring-transparent">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className="text-rose-800 text-[10px] font-extrabold uppercase tracking-widest bg-white border-rose-200">
                  Expired
                </Badge>
                <AlertTriangle className="w-5 h-5 text-rose-500 opacity-80" />
              </div>
              <div>
                <div className="text-3xl font-black text-rose-700 tracking-tight">
                  {medicines.filter(m => calculateExpiryStatus(m.expiry_date).label === 'Expired').length}
                </div>
                <div className="text-[11px] font-bold text-rose-700/80 mt-0.5">Danger: Dispose safely</div>
              </div>
            </Card>
            
            <Card className="p-4 rounded-2xl bg-amber-50 border-amber-200 shadow-sm flex flex-col justify-between hover:bg-amber-100 transition-colors cursor-pointer ring-1 ring-transparent">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className="text-amber-800 text-[10px] font-extrabold uppercase tracking-widest bg-white border-amber-200">
                  &lt; 15 Days
                </Badge>
                <Clock className="w-5 h-5 text-amber-500 opacity-80" />
              </div>
              <div>
                <div className="text-3xl font-black text-amber-700 tracking-tight">
                  {medicines.filter(m => calculateExpiryStatus(m.expiry_date).label === '< 15 Days').length}
                </div>
                <div className="text-[11px] font-bold text-amber-700/80 mt-0.5">Critical: Renew now</div>
              </div>
            </Card>

            <Card className="p-4 rounded-2xl bg-[#DDFBEF]/50 border-[#B7EED8] shadow-sm flex flex-col justify-between hover:bg-[#DDFBEF]/80 transition-colors cursor-pointer ring-1 ring-transparent">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className="text-[#2F4858] text-[10px] font-extrabold uppercase tracking-widest bg-white border-[#B7EED8]">
                  &lt; 45 Days
                </Badge>
                <RotateCcw className="w-5 h-5 text-[#2F4858] opacity-60" />
              </div>
              <div>
                <div className="text-3xl font-black text-[#2F4858] tracking-tight">
                  {medicines.filter(m => calculateExpiryStatus(m.expiry_date).label === '< 45 Days').length}
                </div>
                <div className="text-[11px] font-bold text-[#2F4858]/70 mt-0.5">Warning: Plan ahead</div>
              </div>
            </Card>

            <Card className="p-4 rounded-2xl bg-emerald-50 border-emerald-200 shadow-sm flex flex-col justify-between hover:bg-emerald-100 transition-colors cursor-pointer ring-1 ring-transparent">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className="text-emerald-800 text-[10px] font-extrabold uppercase tracking-widest bg-white border-emerald-200">
                  &gt; 45 Days
                </Badge>
                <ShieldCheck className="w-5 h-5 text-emerald-500 opacity-80" />
              </div>
              <div>
                <div className="text-3xl font-black text-emerald-700 tracking-tight">
                  {medicines.filter(m => calculateExpiryStatus(m.expiry_date).label === 'Safe').length}
                </div>
                <div className="text-[11px] font-bold text-emerald-700/80 mt-0.5">Safe: Good to consume</div>
              </div>
            </Card>
          </div>
        </div>

        {/* Dashboard Search & Multi-Filters */}
        <Card className="rounded-2xl border-[#2F4858]/15 bg-white shadow-sm">
          <CardContent className="p-4">
            <DashboardFilters 
              uniqueStorages={Array.from(new Set(medicines.map(m => m.storage_location).filter(Boolean))) as string[]}
              uniqueForms={Array.from(new Set(medicines.map(m => m.dosage_form).filter(Boolean))) as string[]}
            />
          </CardContent>
        </Card>

        {/* SECTION 1: Cabinet Medicine Inventory */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858] flex items-center gap-2">
              <Pill className="size-4 text-[#2F4858]" />
              <span>Cabinet Medicine Inventory</span>
              <Badge variant="secondary" className="bg-[#DDFBEF] text-[#2F4858] font-extrabold text-xs">
                {medicines.length}
              </Badge>
            </h3>
            <Button render={<Link href="/medicines/new" />} size="sm" className="bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] font-bold rounded-xl text-xs shadow-sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Medicine
            </Button>
          </div>

          {medicines.length === 0 ? (
            <Card className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#2F4858]/20 shadow-xs">
              <CardContent className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center mx-auto">
                  <Pill className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-[#2F4858]">No medicines found</h3>
                  <p className="text-xs text-[#2F4858]/60 max-w-sm mx-auto font-medium">
                    Try adjusting your filters or search keywords, or add new medications to your cabinet.
                  </p>
                </div>
                <Button render={<Link href="/medicines/new" />} size="sm" className="bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] rounded-xl text-xs font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Medicine
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicines.map((med) => {
                const status = calculateExpiryStatus(med.expiry_date);
                let badgeVariant: "destructive" | "default" | "secondary" | "outline" = "outline";
                let statusColor = 'text-emerald-700 bg-emerald-100 border-emerald-200';
                let dotColor = 'bg-emerald-600';

                if (status.label === 'Expired' || status.label === '< 15 Days') {
                  statusColor = 'text-rose-700 bg-rose-100 border-rose-200';
                  dotColor = 'bg-rose-600';
                  badgeVariant = 'destructive';
                } else if (status.label === '< 45 Days') {
                  statusColor = 'text-amber-700 bg-amber-100 border-amber-200';
                  dotColor = 'bg-amber-600';
                }

                const memberAllergies = currentMemberObj?.allergies || [];
                const hasAllergyConflict = memberAllergies.some((allergy: string) => 
                  med.salt_composition?.toLowerCase().includes(allergy.toLowerCase()) || 
                  med.medicine_name.toLowerCase().includes(allergy.toLowerCase())
                );

                return (
                  <Card 
                    key={med.id}
                    className={`group relative bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
                      med.is_banned 
                        ? 'border-rose-400 ring-1 ring-rose-300' 
                        : hasAllergyConflict
                        ? 'border-amber-400 ring-1 ring-amber-300'
                        : 'border-[#2F4858]/15 hover:border-[#2F4858]/40 shadow-sm'
                    }`}
                  >
                    {/* Top Banner if Banned */}
                    {med.is_banned && (
                      <div className="bg-rose-600 text-white px-3.5 py-1 text-[11px] font-black tracking-wider uppercase flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Ban className="w-3.5 h-3.5" />
                          <span>GOVERNMENT BANNED / RECALLED</span>
                        </div>
                        <span className="text-[10px] opacity-90 font-bold">DO NOT CONSUME</span>
                      </div>
                    )}

                    {/* Main Body */}
                    <CardContent className="p-4 sm:p-5 space-y-3.5">
                      {/* Medicine Header: Name, Strength, Routine */}
                      <div className="space-y-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-base text-[#2F4858] leading-snug group-hover:text-[#1E313D] transition-colors">
                              {med.medicine_name}
                            </h3>
                            {med.strength && (
                              <Badge variant="outline" className="text-xs font-bold text-[#2F4858]/80 bg-[#DDFBEF] border-[#B7EED8] rounded-md px-2 py-0.5 shrink-0">
                                {med.strength}
                              </Badge>
                            )}
                            {med.is_daily_routine && (
                              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                                <Sun className="w-3 h-3" /> Daily
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-[#2F4858]/80 flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-[#2F4858]/60 font-medium">Salt:</span>
                            <span className="bg-[#DDFBEF]/50 px-1.5 py-0.5 rounded text-[#2F4858] border border-[#2F4858]/10 font-bold truncate max-w-full">
                              {med.salt_composition}
                            </span>
                          </p>
                        </div>

                        {/* High-Visibility Expiry & Validity Status Banner */}
                        <div className={`flex items-center justify-between p-2.5 px-3 rounded-xl border text-xs font-bold ${statusColor}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                            <span className="font-black text-xs">{status.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold tabular-nums text-xs">
                            <Clock className="w-3.5 h-3.5 opacity-80" />
                            <span>Exp: {new Date(med.expiry_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Uses & Indications */}
                      <div className="text-xs text-[#2F4858]/90 leading-relaxed bg-[#F8FDFB] p-3 rounded-xl border border-[#2F4858]/15 font-medium">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#2F4858]/70 block mb-1">
                          Primary Uses & Indications:
                        </span>
                        <p className="leading-relaxed">
                          {med.primary_uses || 'General therapeutic use'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#DDFBEF]/50 text-[#2F4858] font-bold border-[#2F4858]/10">
                          <MapPin className="w-3.5 h-3.5 text-[#2F4858]" />
                          <span>{med.storage_location || 'Unassigned'}</span>
                        </Badge>
                        <Badge variant="outline" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#DDFBEF]/50 text-[#2F4858] font-bold border-[#2F4858]/10">
                          <Pill className="w-3.5 h-3.5 text-[#2F4858]" />
                          <span>{med.quantity} {med.unit || 'units'} ({med.dosage_form})</span>
                        </Badge>
                      </div>

                      <div className="pt-2 border-t border-[#2F4858]/10 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {med.family_members ? (
                            <Badge variant="outline" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#DDFBEF]/40 text-[#2F4858] border-[#2F4858]/10">
                              <User className="w-3 h-3" />
                              <span>{med.family_members.full_name.split(' ')[0]}</span>
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-[#2F4858]/50 italic">Household shared</span>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="px-4 py-3 bg-[#F4FCF8] border-t border-[#2F4858]/10 flex items-center justify-between gap-2">
                      <MedicineDetailsDrawer medicine={med} />
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: Diagnostic Lab Reports & Medical Records */}
        <div className="space-y-3.5 pt-6 border-t border-[#2F4858]/15">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858] flex items-center gap-2">
              <FileText className="size-4 text-[#2F4858]" />
              <span>
                {currentMemberObj ? `${currentMemberObj.full_name}'s Medical Reports & Diagnoses` : 'Family Diagnostic Reports & Records'}
              </span>
              <Badge variant="secondary" className="bg-[#DDFBEF] text-[#2F4858] font-extrabold text-xs">
                {medicalRecords.length}
              </Badge>
            </h3>

            <AddMedicalRecordModal
              familyMemberId={currentMemberObj?.id}
              familyMemberName={currentMemberObj?.full_name}
              familyMembers={familyMembers}
              trigger={
                <Button size="sm" variant="outline" className="bg-[#F8FDFB] hover:bg-[#DDFBEF]/50 text-[#2F4858] font-bold border-[#2F4858]/20 rounded-xl text-xs shadow-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Lab Report / Diagnosis
                </Button>
              }
            />
          </div>

          {medicalRecords.length === 0 ? (
            <Card className="text-center py-10 bg-white rounded-2xl border border-dashed border-[#2F4858]/20 shadow-xs">
              <CardContent className="space-y-2 flex flex-col items-center">
                <div className="size-10 rounded-2xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center">
                  <FileText className="size-5 opacity-70" />
                </div>
                <h4 className="font-bold text-xs text-[#2F4858]">No medical reports uploaded for this view</h4>
                <p className="text-[11px] text-[#2F4858]/60 max-w-sm mx-auto font-medium">
                  Upload pathology tests, CBC, lipid panels, or doctor prescriptions to extract biomarkers with AI.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicalRecords.slice(0, 6).map((rec) => {
                const biomarkers = Array.isArray(rec.biomarkers) ? rec.biomarkers : []
                return (
                  <Card key={rec.id} className="bg-white border-[#2F4858]/15 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
                    <CardHeader className="p-4 bg-[#F8FDFB] border-b border-[#2F4858]/10 flex flex-row items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center shrink-0">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-xs font-black text-[#2F4858] truncate">
                            {rec.title}
                          </CardTitle>
                          <CardDescription className="text-[10px] font-semibold text-[#2F4858]/70 truncate">
                            {rec.test_date && <span>{new Date(rec.test_date).toLocaleDateString()}</span>}
                            {rec.hospital_clinic && <span> • {rec.hospital_clinic}</span>}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-extrabold uppercase bg-white text-[#2F4858] border-[#2F4858]/20 shrink-0">
                        {rec.record_type}
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-4 space-y-2.5 text-xs">
                      {rec.diagnosis && (
                        <div className="p-2 rounded-xl bg-[#DDFBEF]/40 border border-[#B7EED8]">
                          <span className="font-black text-[9px] uppercase text-[#2F4858]/70 block">Diagnosis:</span>
                          <span className="font-bold text-[#2F4858] text-xs line-clamp-1">{rec.diagnosis}</span>
                        </div>
                      )}

                      {biomarkers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {biomarkers.slice(0, 3).map((bm: any, idx: number) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                bm.status === 'HIGH' || bm.status === 'CRITICAL'
                                  ? 'bg-red-100 text-red-800 border-red-300 font-black'
                                  : bm.status === 'LOW'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 font-black'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                              }`}
                            >
                              {bm.name}: {bm.value} {bm.unit}
                            </span>
                          ))}
                          {biomarkers.length > 3 && (
                            <span className="text-[10px] font-bold text-[#2F4858]/60 self-center">
                              +{biomarkers.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="px-4 py-3 bg-[#F4FCF8] border-t border-[#2F4858]/10 flex items-center justify-between">
                      <MedicalRecordDetailModal
                        record={rec}
                        familyMemberName={rec.family_members?.full_name || 'Family Member'}
                      />
                      {rec.family_members && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-[#DDFBEF]/40 text-[#2F4858]">
                          {rec.family_members.full_name.split(' ')[0]}
                        </Badge>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: At-Home Vitals & Self-Tests */}
        <div className="space-y-3.5 pt-6 border-t border-[#2F4858]/15 pb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858] flex items-center gap-2">
              <HeartPulse className="size-4 text-[#2F4858]" />
              <span>
                {currentMemberObj ? `${currentMemberObj.full_name}'s At-Home Vitals & Self-Checks` : 'Family At-Home Vitals & Self-Tests'}
              </span>
              <Badge variant="secondary" className="bg-[#DDFBEF] text-[#2F4858] font-extrabold text-xs">
                {vitalLogs.length}
              </Badge>
            </h3>

            <LogVitalModal
              familyMemberId={currentMemberObj?.id}
              familyMemberName={currentMemberObj?.full_name}
              familyMembers={familyMembers}
              trigger={
                <Button size="sm" variant="outline" className="bg-[#F8FDFB] hover:bg-[#DDFBEF]/50 text-[#2F4858] font-bold border-[#2F4858]/20 rounded-xl text-xs shadow-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Log Sugar / BP / Vitals
                </Button>
              }
            />
          </div>

          {vitalLogs.length === 0 ? (
            <Card className="text-center py-10 bg-white rounded-2xl border border-dashed border-[#2F4858]/20 shadow-xs">
              <CardContent className="space-y-2 flex flex-col items-center">
                <div className="size-10 rounded-2xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center">
                  <Activity className="size-5 opacity-70" />
                </div>
                <h4 className="font-bold text-xs text-[#2F4858]">No self-checks logged yet</h4>
                <p className="text-[11px] text-[#2F4858]/60 max-w-sm mx-auto font-medium">
                  Track daily blood sugar, blood pressure, pulse, or body temperature readings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {vitalLogs.slice(0, 8).map((vital) => {
                let statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200'
                if (vital.status === 'HIGH' || vital.status === 'CRITICAL') statusColor = 'bg-rose-100 text-rose-800 border-rose-200'
                else if (vital.status === 'LOW') statusColor = 'bg-amber-100 text-amber-800 border-amber-200'

                return (
                  <Card key={vital.id} className="bg-white border-[#2F4858]/15 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-[#2F4858]/60 truncate">
                          {vital.name}
                        </span>
                        <Badge className={`text-[9px] font-black px-1.5 py-0 ${statusColor}`}>
                          {vital.status}
                        </Badge>
                      </div>
                      <div className="text-xl font-black text-[#2F4858] tabular-nums">
                        {vital.value}{vital.value_secondary && ` / ${vital.value_secondary}`} <span className="text-xs font-semibold text-[#2F4858]/60">{vital.unit}</span>
                      </div>
                      <p className="text-[11px] font-bold text-[#2F4858]/80">
                        {vital.context || 'Home Check'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#2F4858]/10 flex items-center justify-between text-[10px] font-semibold text-[#2F4858]/60">
                      <span>{new Date(vital.recorded_at).toLocaleDateString()}</span>
                      {vital.family_members && <span>{vital.family_members.full_name.split(' ')[0]}</span>}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
