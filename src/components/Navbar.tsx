'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { AddMedicalRecordModal } from './AddMedicalRecordModal'
import { Button } from './ui/button'

export interface FamilyMember { id: string; full_name: string; relationship?: string | null }
export interface Medicine { id: string; is_banned?: boolean | null }

export function Navbar({ familyMembers = [], medicines = [], warningsUnavailable = false, alertsCount }: {
  familyMembers: FamilyMember[]; medicines: Medicine[]; warningsUnavailable?: boolean; alertsCount?: number
}) {
  const pathname = usePathname()
  const params = useSearchParams()
  const bannedCount = alertsCount ?? medicines.filter(m => m.is_banned).length
  const links = [
    { href: '/', label: 'Cabinet', active: pathname === '/' && params.get('view') !== 'reports' || pathname.startsWith('/medicines') },
    { href: '/family', label: 'Family', active: pathname.startsWith('/family') },
    { href: '/?view=reports#reports', label: 'Reports', active: pathname === '/' && params.get('view') === 'reports' },
    { href: '/safety', label: bannedCount ? 'Alerts (' + bannedCount + ')' : 'Alerts', active: pathname === '/safety' },
    { href: '/account', label: 'Account', active: pathname === '/account' },
  ]
  return <header className="border-b bg-white sticky top-0 z-30">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Medafora cabinet">
          <Image src="/logo.png" alt="" width={36} height={36} priority />
          <span className="text-xl font-bold">Medafora</span>
        </Link>
        {familyMembers.length > 0 ? <AddMedicalRecordModal familyMembers={familyMembers} trigger={<Button size="sm">Add report</Button>} /> :
          <Link href="/family/new" className="text-sm font-semibold underline">Add family member</Link>}
      </div>
      <nav aria-label="Main navigation" className="flex flex-wrap gap-1">
        {links.map(link => <Link key={link.href} href={link.href} aria-current={link.active ? 'page' : undefined}
          className={'rounded-lg px-3 py-2 text-sm font-semibold min-h-10 ' + (link.active ? 'bg-[#2F4858] text-white' : 'hover:bg-[#DDFBEF] text-[#2F4858]') + (link.href === '/safety' && bannedCount ? ' ring-2 ring-rose-600' : '')}>{link.label}</Link>)}
      </nav>
      {warningsUnavailable && <p role="status" className="text-sm text-amber-900">The cabinet alert count is incomplete or unavailable. Open Alerts to review the records.</p>}
    </div>
  </header>
}
