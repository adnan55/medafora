import Link from 'next/link'
import { recordedDate } from '@/lib/utils/recordReadings'

interface Props {
  medicine: { medicine_name: string; is_banned?: boolean | null; last_safety_check?: string | null; last_regulatory_screen?: string | null }
}

export function RegulatoryRecordStatus({ medicine }: Props) {
  return <section className="rounded-xl border bg-slate-50 p-3 space-y-2 text-sm">
    <h2 className="font-bold">Recorded regulatory screening</h2>
    <p>{medicine.is_banned ? 'A regulatory warning is recorded for this item.' : medicine.last_safety_check ? 'A successful screening response is recorded. No current clearance is established.' : 'No successful screening response is recorded. Status is unassessed.'}</p>
    <dl className="space-y-1">
      <div><dt className="inline font-semibold">Last attempt: </dt><dd className="inline">{recordedDate(medicine.last_regulatory_screen)}</dd></div>
      <div><dt className="inline font-semibold">Last successful response: </dt><dd className="inline">{recordedDate(medicine.last_safety_check)}</dd></div>
    </dl>
    <p className="text-muted-foreground">Screening is requested on demand and can have incomplete source coverage. Review the dated source notices and their applicability; a response does not establish suitability for use.</p>
    <Link className="inline-flex min-h-11 items-center underline" href={'/safety?q=' + encodeURIComponent(medicine.medicine_name)}>View screening records and coverage</Link>
  </section>
}
