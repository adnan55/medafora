'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, MapPin, Layers, ArrowUpDown } from 'lucide-react'
import { useTransition, useState, useEffect } from 'react'

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function DashboardFilters({ uniqueStorages, uniqueForms }: { uniqueStorages: string[], uniqueForms: string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [q, setQ] = useState(searchParams.get('q') || '')

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilter('q', q)
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'ALL') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    startTransition(() => {
      router.push(`/?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="relative flex-1 group">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2F4858]/50 group-focus-within:text-[#2F4858] transition-colors" />
        <Input
          aria-label="Search by symptom, disease, salt, or medicine name"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by symptom (fever, cough, pain), disease, active salt, or name..."
          className="w-full pl-10 pr-4 h-10 rounded-xl border border-[#2F4858]/20 bg-[#F8FDFB] text-xs font-semibold text-[#2F4858] placeholder:text-[#2F4858]/40 focus-visible:ring-1 focus-visible:ring-[#2F4858] focus-visible:border-[#2F4858]/40 transition-all shadow-sm"
        />
      </div>
      <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
        <Select 
          value={searchParams.get('storage') || 'ALL'} 
          onValueChange={(value) => updateFilter('storage', value ?? 'ALL')}
        >
          <SelectTrigger className="h-10 bg-[#F8FDFB] border border-[#2F4858]/20 rounded-xl px-3 text-xs font-bold text-[#2F4858] w-full sm:w-[170px] shadow-sm focus:ring-1 focus:ring-[#2F4858]">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#2F4858]/70" />
              <SelectValue placeholder="Storage Spots" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#2F4858]/20 bg-[#F8FDFB] shadow-md">
            <SelectItem value="ALL" className="text-xs font-bold focus:bg-[#DDFBEF]/50">All Storage Spots</SelectItem>
            {uniqueStorages.map(s => (
              <SelectItem key={s} value={s} className="text-xs font-semibold focus:bg-[#DDFBEF]/50">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={searchParams.get('form') || 'ALL'} 
          onValueChange={(value) => updateFilter('form', value ?? 'ALL')}
        >
          <SelectTrigger className="h-10 bg-[#F8FDFB] border border-[#2F4858]/20 rounded-xl px-3 text-xs font-bold text-[#2F4858] w-full sm:w-[150px] shadow-sm focus:ring-1 focus:ring-[#2F4858]">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#2F4858]/70" />
              <SelectValue placeholder="Forms" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#2F4858]/20 bg-[#F8FDFB] shadow-md">
            <SelectItem value="ALL" className="text-xs font-bold focus:bg-[#DDFBEF]/50">All Forms</SelectItem>
            {uniqueForms.map(f => (
              <SelectItem key={f} value={f} className="text-xs font-semibold focus:bg-[#DDFBEF]/50">{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={searchParams.get('sort') || 'expiry_asc'} 
          onValueChange={(value) => updateFilter('sort', value ?? 'expiry_asc')}
        >
          <SelectTrigger className="h-10 bg-[#F8FDFB] border border-[#2F4858]/20 rounded-xl px-3 text-xs font-bold text-[#2F4858] w-full sm:w-[180px] shadow-sm focus:ring-1 focus:ring-[#2F4858]">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#2F4858]/70" />
              <SelectValue placeholder="Sort by" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#2F4858]/20 bg-[#F8FDFB] shadow-md">
            <SelectItem value="expiry_asc" className="text-xs font-semibold focus:bg-[#DDFBEF]/50">Expiry (Earliest First)</SelectItem>
            <SelectItem value="expiry_desc" className="text-xs font-semibold focus:bg-[#DDFBEF]/50">Expiry (Latest First)</SelectItem>
            <SelectItem value="name_asc" className="text-xs font-semibold focus:bg-[#DDFBEF]/50">Name (A-Z)</SelectItem>
            <SelectItem value="name_desc" className="text-xs font-semibold focus:bg-[#DDFBEF]/50">Name (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
