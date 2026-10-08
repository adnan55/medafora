import Link from 'next/link'
import { calculateExpiryStatus } from '@/lib/utils/expiryCalculator'
import { expiryPresentation } from '@/lib/utils/statusPresentation'
import type { MedicineRecord } from '@/lib/types/records'
import { MedicineDetailsDrawer } from './MedicineDetailsDrawer'

export function MedicineSummary({ medicine }: { medicine: MedicineRecord }) {
  const expiry = calculateExpiryStatus(medicine.expiry_date)
  return <article className={'rounded-2xl border bg-white p-5 space-y-3 min-w-0 ' + (medicine.is_banned ? 'border-rose-500' : '')}>
    <h3 className="text-lg font-bold break-words"><Link href={'/medicines/' + medicine.id} className="underline decoration-slate-300 underline-offset-4">{medicine.medicine_name}</Link></h3>
    {medicine.is_banned && <p className="rounded-lg bg-rose-50 p-2 text-rose-900 font-semibold">Recorded regulatory warning — review details before use</p>}
    <p className="text-sm break-words">{medicine.salt_composition || 'Composition not recorded'}</p>
    <p className={'inline-block rounded-lg border px-2 py-1 text-sm ' + expiryPresentation[expiry.urgency].badge}>{expiry.label}</p>
    <dl className="text-sm space-y-2">
      <div><dt className="font-semibold">Assigned to</dt><dd>{medicine.family_members?.full_name || 'Household shared'}</dd></div>
      <div><dt className="font-semibold">Storage</dt><dd className="break-words">{medicine.storage_location || 'Not recorded'}</dd></div>
      <div><dt className="font-semibold">Quantity recorded</dt><dd>{medicine.quantity ?? 'Unknown'} {medicine.unit || ''}</dd></div>
    </dl>
    <MedicineDetailsDrawer medicine={medicine} />
  </article>
}
