'use client'
import { useRef, useState } from 'react'
import { calculateAge } from '@/lib/utils/ageCalculator'
import { buildEmergencyCard, type EmergencyMember, type EmergencyMedicine } from '@/lib/utils/emergencyCard'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { QRCodeSVG } from 'qrcode.react'

interface Props { member: EmergencyMember & { date_of_birth?: string | null; birth_date?: string | null }; medicines: EmergencyMedicine[] }
export function EmergencyCardModal({ member, medicines }: Props) {
  const qr = useRef<SVGSVGElement>(null)
  const [open, setOpen] = useState(false)
  const [generated, setGenerated] = useState('')
  const [error, setError] = useState('')
  const card = buildEmergencyCard(member, medicines, calculateAge(member.date_of_birth || member.birth_date)?.formatted || 'Unknown', generated)
  function printCard() {
    const popup = window.open('', '_blank', 'width=800,height=700')
    if (!popup) { setError('Allow a print window, or download the complete text card below.'); return }
    popup.document.title = 'Medafora emergency card'
    const style = popup.document.createElement('style')
    style.textContent = 'body{font:16px system-ui;line-height:1.6;margin:24px;color:#172f3d} pre{white-space:pre-wrap;overflow-wrap:anywhere} svg{width:220px;height:220px} @media print{pre{break-inside:auto}}'
    popup.document.head.append(style)
    const heading = popup.document.createElement('h1'); heading.textContent = 'Emergency records — Medafora'
    const pre = popup.document.createElement('pre'); pre.textContent = card.fullText
    popup.document.body.append(heading)
    if (qr.current) popup.document.body.append(qr.current.cloneNode(true))
    popup.document.body.append(pre)
    popup.document.close(); popup.focus(); popup.print()
  }
  function download() {
    const url = URL.createObjectURL(new Blob([card.fullText], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.download = 'Emergency_Card_' + member.full_name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.txt'
    link.href = url; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <>
    <Button variant="outline" onClick={() => { setGenerated(new Date().toISOString()); setError(''); setOpen(true) }}>Emergency card</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6 min-w-0">
        <DialogHeader><DialogTitle>Emergency records for {member.full_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">The QR contains readable records without an internet connection. Cabinet items are not a verified treatment list.</p></DialogHeader>
        {card.qrText ? <QRCodeSVG ref={qr} value={card.qrText} size={220} level="M" marginSize={4}
          className="mx-auto w-full max-w-[220px] h-auto" title="Emergency record QR code" /> :
          <p role="status" className="text-amber-950 bg-amber-50 p-3 rounded-lg">Essential details exceed QR capacity. Use the full printed or downloaded card.</p>}
        {card.qrText && card.omitted > 0 && <p role="status" className="text-amber-950 bg-amber-50 p-3 rounded-lg">{card.omitted} cabinet items do not fit in the QR. All allergies, conditions and the timestamp are retained. The full card below includes every item.</p>}
        <details><summary className="cursor-pointer font-semibold py-2">Preview encoded QR contents</summary><pre className="whitespace-pre-wrap break-words text-sm">{card.qrText || 'QR unavailable'}</pre></details>
        <section><h2 className="text-lg font-bold mb-2">Full printable card</h2><pre className="whitespace-pre-wrap break-words font-sans text-sm">{card.fullText}</pre></section>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2"><Button onClick={printCard}>Print full card / save PDF</Button><Button variant="outline" onClick={download}>Download full text</Button></div>
      </DialogContent>
    </Dialog>
  </>
}
