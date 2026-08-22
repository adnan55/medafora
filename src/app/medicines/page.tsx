import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { calculateExpiryStatus } from '@/lib/utils/expiryCalculator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft, Pill, User, Ban } from 'lucide-react'

export default async function MedicinesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: medicines } = await supabase
    .from('medicines')
    .select(`
      *,
      family_members ( full_name )
    `)
    .order('expiry_date', { ascending: true })

  return (
    <div className="min-h-screen bg-[#F8FDFB] p-4 sm:p-8 text-[#2F4858]">
      <main className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#2F4858]/15">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2F4858] tracking-tight">Medicine Alerts</h1>
            <p className="text-xs sm:text-sm font-medium text-[#2F4858]/70 mt-1">Track expirations, dosages, and regulatory safety alerts</p>
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Button render={<Link href="/medicines/new" />} size="sm" className="bg-[#2F4858] text-[#DDFBEF] rounded-xl hover:bg-[#1E313D] text-xs font-extrabold shadow-sm flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-1" />
              Add Medicine
            </Button>
            <Button render={<Link href="/" />} variant="outline" size="sm" className="rounded-xl border-[#2F4858]/20 text-[#2F4858] hover:bg-[#DDFBEF]/50 text-xs font-bold">
              Dashboard
            </Button>
          </div>
        </header>

        <section>
          {medicines && medicines.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicines.map((medicine) => {
                const status = calculateExpiryStatus(medicine.expiry_date)
                return (
                  <Card key={medicine.id} className={`rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between ${medicine.is_banned ? 'border-rose-400 bg-rose-50/50 ring-1 ring-rose-300' : 'border-[#2F4858]/15 bg-white'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h3 className="font-extrabold text-lg text-[#2F4858] leading-tight">{medicine.medicine_name}</h3>
                        {medicine.is_banned && (
                          <Badge variant="destructive" className="text-[10px] font-black uppercase shadow-sm">
                            <Ban className="w-3 h-3 mr-1" />
                            Banned
                          </Badge>
                        )}
                      </div>
                      
                      {medicine.brand_or_manufacturer && (
                        <p className="text-xs text-[#2F4858]/70 mb-1 font-semibold">{medicine.brand_or_manufacturer}</p>
                      )}
                      
                      <p className="text-xs text-[#2F4858] mb-3 font-semibold bg-[#F8FDFB] border border-[#2F4858]/10 p-2 rounded-xl">
                        {medicine.salt_composition || "Unknown Composition"}
                      </p>
                      
                      {/* Tags for target diseases */}
                      {medicine.target_diseases && medicine.target_diseases.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {medicine.target_diseases.map((disease: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="bg-[#DDFBEF] text-[#2F4858] font-bold text-[10px] px-2 py-0.5 rounded-md border-[#B7EED8]">
                              {disease}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="space-y-2 mb-4 text-xs">
                        {medicine.primary_uses && (
                          <div>
                            <p className="text-[10px] font-extrabold text-[#2F4858]/60 uppercase tracking-wider">Uses</p>
                            <p className="text-xs text-[#2F4858]/90 line-clamp-2 font-medium">{medicine.primary_uses}</p>
                          </div>
                        )}
                        
                        {medicine.dosage_instructions && (
                          <div>
                            <p className="text-[10px] font-extrabold text-[#2F4858]/60 uppercase tracking-wider">Dosage</p>
                            <p className="text-xs text-[#2F4858]/90 line-clamp-2 font-medium">{medicine.dosage_instructions}</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-[10px] font-extrabold text-[#2F4858]/60 uppercase tracking-wider">Prescribed To</p>
                          <p className="text-xs font-bold text-[#2F4858] flex items-center gap-1.5 mt-0.5">
                            <User className="w-3.5 h-3.5 text-[#2F4858]/70" />
                            <span>{medicine.family_members?.full_name || 'Household Shared'}</span>
                            <span className="text-[#2F4858]/50 font-normal">({medicine.quantity} left)</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#2F4858]/10 flex items-center justify-between">
                      <Badge variant="outline" className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${status.badgeColor}`}>
                        {status.label}
                      </Badge>
                      <Button render={<Link href={`/medicines/${medicine.id}`} />} variant="link" size="sm" className="p-0 h-auto text-xs font-bold text-[#2F4858] hover:underline">
                        Details →
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="text-center py-12 bg-white rounded-2xl border-dashed border-[#2F4858]/30">
              <CardContent>
                <div className="mx-auto w-12 h-12 rounded-2xl bg-[#DDFBEF] text-[#2F4858] flex items-center justify-center mb-3">
                  <Pill className="w-6 h-6 opacity-70" />
                </div>
                <p className="text-[#2F4858]/80 text-sm font-bold">No medicines in your vault</p>
                <p className="text-[#2F4858]/50 text-xs mt-1">Add one to start tracking expiry and regulatory bans!</p>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  )
}
