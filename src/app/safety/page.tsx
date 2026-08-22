import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ShieldAlert, 
  RotateCw, 
  Search, 
  AlertTriangle,
  Ban,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'

export default async function SafetyAuditLogPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedParams = searchParams ? await searchParams : {}

  // Fetch all medicines
  const { data: medicines } = await supabase
    .from('medicines')
    .select('*')
    
  const bannedMeds = medicines?.filter(m => m.is_banned) || []

  // Fetch audit logs
  let { data: logs } = await supabase
    .from('safety_audit_logs')
    .select('*, medicines(medicine_name, salt_composition)')
    .order('checked_at', { ascending: false })
    .limit(50)
    
  if (resolvedParams.q) {
    const q = resolvedParams.q.toLowerCase()
    logs = logs?.filter(log => 
      log.medicines?.medicine_name?.toLowerCase().includes(q) ||
      log.medicines?.salt_composition?.toLowerCase().includes(q) ||
      log.summary?.toLowerCase().includes(q)
    ) || null
  }

  const { data: familyMembers } = await supabase.from('family_members').select('*')

  return (
    <div className="bg-[#F8FDFB] min-h-screen text-[#2F4858]">
      <Navbar familyMembers={familyMembers || []} medicines={medicines || []} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[#2F4858] flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-[#2F4858]" />
              Regulatory Safety & Ban Scanner
            </h2>
            <p className="text-xs text-[#2F4858]/70 font-semibold max-w-2xl">
              Medafora continuously cross-references your medicine cabinet against CDSCO, FDA, and global regulatory gazette notices to detect prohibited or irrational drug combinations.
            </p>
          </div>
          <form action={async () => {
            'use server'
            const { runSafetyAudit } = await import('@/app/actions/safety')
            await runSafetyAudit()
          }}>
            <Button
              type="submit"
              className="shrink-0 px-4 py-2.5 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-[#2F4858]"
            >
              <RotateCw className="w-4 h-4 text-[#DDFBEF]" />
              <span>Run Deep Audit Scan</span>
            </Button>
          </form>
        </div>

        {/* Action Required: Found Banned Meds */}
        {bannedMeds.length > 0 && (
          <Card className="rounded-2xl bg-rose-50 border-2 border-rose-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Ban className="w-32 h-32 text-rose-600" />
            </div>
            
            <CardHeader className="relative z-10 pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="font-black uppercase tracking-wider text-xs px-2.5 py-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  Critical Hazard Detected
                </Badge>
              </div>
              <CardDescription className="text-xs text-rose-900 font-bold mt-1">
                {bannedMeds.length} medicine(s) in your cabinet have been flagged as BANNED by regulatory authorities.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
              {bannedMeds.map((med) => (
                <Card key={med.id} className="p-3 bg-white rounded-xl border border-rose-200 text-xs space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#2F4858] line-clamp-1">{med.medicine_name}</span>
                    <Badge variant="destructive" className="text-[10px] font-black uppercase">
                      BANNED
                    </Badge>
                  </div>
                  <p className="text-[#2F4858] font-bold line-clamp-1">{med.salt_composition}</p>
                  <p className="text-[#2F4858]/80 leading-relaxed line-clamp-2">
                    {med.ban_notice_details || 'Prohibited by government regulatory order.'}
                  </p>
                  <Button render={<Link href={`/medicines/${med.id}`} />} variant="link" size="sm" className="p-0 h-auto text-[11px] font-bold text-[#2F4858] hover:underline pt-1">
                    View full details & batch info →
                  </Button>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Audit Logs Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-8">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <Button size="sm" className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-[#2F4858] text-[#DDFBEF] hover:bg-[#1E313D] shadow-sm">
              All Log Records
            </Button>
          </div>
          <form method="GET" className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#2F4858]/50" />
            <Input
              type="text"
              name="q"
              defaultValue={resolvedParams.q || ''}
              placeholder="Search audit trail..."
              className="pl-8 pr-3 h-9 rounded-xl border-[#2F4858]/20 bg-white text-xs font-semibold text-[#2F4858] focus-visible:ring-1 focus-visible:ring-[#2F4858] w-full sm:w-60 shadow-sm"
            />
          </form>
        </div>

        {/* Audit Logs Trail Table with shadcn Table */}
        <Card className="rounded-2xl border-[#2F4858]/15 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-[#F8FDFB] text-[#2F4858]/70 uppercase text-[10px] font-extrabold border-b border-[#2F4858]/15">
              <TableRow>
                <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Medicine & Salt</TableHead>
                <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Scan Date</TableHead>
                <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Verdict</TableHead>
                <TableHead className="px-4 py-3 font-extrabold text-[#2F4858]">Regulatory Findings & Notice</TableHead>
                <TableHead className="px-4 py-3 text-right font-extrabold text-[#2F4858]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#2F4858]/10 text-xs">
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-[#DDFBEF]/20 transition-colors">
                    <TableCell className="px-4 py-3 font-semibold text-[#2F4858]">
                      <p className="font-extrabold">{log.medicines?.medicine_name}</p>
                      <p className="text-[11px] text-[#2F4858]/80 font-medium truncate max-w-[200px]">
                        {log.medicines?.salt_composition}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-[#2F4858]/70 whitespace-nowrap font-medium">
                      {new Date(log.checked_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {log.result_status === 'BANNED' ? (
                        <Badge variant="destructive" className="font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                          BANNED
                        </Badge>
                      ) : log.result_status === 'WARNING' ? (
                        <Badge variant="outline" className="font-bold text-[10px] bg-amber-100 text-amber-800 border-amber-200 px-2 py-0.5 rounded-full">
                          WARNING
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-bold text-[10px] bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8] px-2 py-0.5 rounded-full">
                          CLEARED
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-[#2F4858]/90 max-w-md">
                      <p className="line-clamp-2">{log.summary}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                      <Button render={<Link href={`/medicines/${log.medicine_id}`} />} variant="ghost" size="sm" className="text-xs font-bold text-[#2F4858] hover:bg-[#DDFBEF] rounded-lg">
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-8 text-center text-[#2F4858]/50 text-xs font-medium">
                    No audit logs found. Run a deep scan to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Educational Knowledge Card */}
        <Card className="rounded-2xl bg-[#F8FDFB] border-[#2F4858]/15 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#2F4858]" />
              <span>Why Do Drug Regulators Ban Fixed-Dose Combinations (FDCs)?</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#2F4858]/80 leading-relaxed font-medium">
              Regulatory bodies (such as CDSCO Section 26A and US FDA) periodically prohibit irrational drug cocktails that combine active salts without synergistic clinical benefit, or where one drug masks the symptoms of toxicity caused by another. Medafora continuously tracks these gazette notices to safeguard your family.
            </p>
          </CardContent>
        </Card>

      </main>
    </div>
  )
}
