'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShieldAlert, Users, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { AddMedicalRecordModal } from '@/components/AddMedicalRecordModal';

import type { MemberRecord } from '@/lib/types/records';
import { usePathname } from 'next/navigation';

export function Navbar({ familyMembers = [], medicines = [], alertsCount, warningsUnavailable = false }: { familyMembers?: MemberRecord[]; medicines?: { id: string; is_banned?: boolean | null }[]; alertsCount?: number; warningsUnavailable?: boolean }) {
  const bannedCount = alertsCount ?? medicines.filter(m => m.is_banned).length
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#2F4858]/15 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">

          {/* Logo & Brand Identity */}
          <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <Image
              src="/logo.png"
              alt="Medfora Logo"
              width={40}
              height={40}
              className="size-10 object-contain"
              priority
            />
            <div>
              <span className="font-extrabold text-lg text-[#2F4858] tracking-tight leading-tight block">
                Medfora
              </span>
              <p className="text-[11px] font-medium text-[#2F4858]/70 hidden sm:block">
                Family Medicine & Safety Guardian
              </p>
            </div>
          </Link>

          {/* Top Actions with shadcn Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">

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
              title="Regulatory Ban & Recall Scanner" aria-label={warningsUnavailable ? "Ban Scanner — warnings unavailable" : "Ban Scanner"} aria-current={pathname === "/safety" ? "page" : undefined}
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
              title="Manage Family Profiles & Allergies" aria-label="Family Profiles" aria-current={pathname.startsWith("/family") ? "page" : undefined}
            >
              <Users className="w-4 h-4 text-[#2F4858]" />
              <span className="hidden lg:inline">Family Profiles</span>
            </Button>

            <Button render={<Link href="/account" />} variant="ghost" size="sm" aria-label="Account" title="Account" className="rounded-xl text-xs font-bold"><UserRound className="size-4 sm:hidden" /><span className="hidden sm:inline">Account</span></Button>
            {/* Add Medical Reports / Diagnostics Button */}
            <AddMedicalRecordModal
              familyMembers={familyMembers}
              trigger={
                <Button
                  size="sm"
                  aria-label="Add Medical Reports / Diagnostics" title="Add Medical Reports / Diagnostics"
                  className="rounded-xl text-xs font-extrabold bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="size-3.5 text-[#DDFBEF]" />
                  <span className="hidden lg:inline">Add Medical Reports / Diagnostics</span>
                  <span className="hidden sm:inline lg:hidden">Add Report</span>
                </Button>
              }
            />

          </div>
        </div>
      </div>
    </header>
  );
}
