'use client'

import Link from 'next/link'
import Image from 'next/image'
import { 
  Pill, 
  ShieldAlert, 
  Users, 
  Plus, 
  Trash2, 
  FileText,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddMedicalRecordModal } from '@/components/AddMedicalRecordModal'

export interface FamilyMember {
  id: string;
  full_name: string;
  relationship: string;
  [key: string]: any;
}

export interface Medicine {
  id: string;
  medicine_name: string;
  is_banned: boolean;
  [key: string]: any;
}

export function Navbar({ familyMembers = [], medicines = [] }: { familyMembers: FamilyMember[], medicines: Medicine[] }) {
  const bannedCount = medicines.filter(m => m.is_banned).length;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#2F4858]/15 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand Identity */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Medafora Logo"
              width={40}
              height={40}
              className="size-10 object-contain"
              priority
            />
            <div>
              <span className="font-extrabold text-lg text-[#2F4858] tracking-tight leading-tight block">
                Medafora
              </span>
              <p className="text-[11px] font-medium text-[#2F4858]/70 hidden sm:block">
                Family Medicine & Safety Guardian
              </p>
            </div>
          </Link>

          {/* Top Actions with shadcn Buttons */}
          <div className="flex items-center gap-2">
            
            {/* Safety & Ban Scanner Trigger */}
            <Button
              render={<Link href="/safety" />}
              variant="outline"
              size="sm"
              className={`relative rounded-xl text-xs font-bold transition-all ${
                bannedCount > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-800 animate-pulse hover:bg-rose-100'
                  : 'bg-white border-[#2F4858]/15 text-[#2F4858] hover:bg-[#DDFBEF]/50 shadow-sm'
              }`}
              title="Regulatory Ban & Recall Scanner"
            >
              <ShieldAlert className={`w-4 h-4 ${bannedCount > 0 ? 'text-rose-600' : 'text-[#2F4858]'}`} />
              <span className="hidden md:inline">Ban Scanner</span>
              {bannedCount > 0 && (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-600 ml-1"></span>
                  <span className="sr-only">{bannedCount} banned medicines found</span>
                </>
              )}
            </Button>

            {/* Manage Family Members */}
            <Button
              render={<Link href="/family" />}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold bg-white border-[#2F4858]/15 text-[#2F4858] hover:bg-[#DDFBEF]/50 shadow-sm"
              title="Manage Family Profiles & Allergies"
            >
              <Users className="w-4 h-4 text-[#2F4858]" />
              <span className="hidden lg:inline">Family Profiles</span>
            </Button>

            {/* Add Medical Reports / Diagnostics Button */}
            <AddMedicalRecordModal
              familyMembers={familyMembers}
              trigger={
                <Button
                  size="sm"
                  className="rounded-xl text-xs font-extrabold bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="size-3.5 text-[#DDFBEF]" />
                  <span className="hidden sm:inline">Add Medical Reports / Diagnostics</span>
                  <span className="sm:hidden">Add Report</span>
                </Button>
              }
            />

          </div>
        </div>
      </div>
    </header>
  );
}
