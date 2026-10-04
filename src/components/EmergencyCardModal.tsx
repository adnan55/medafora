'use client'

import React, { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QrCode, ShieldPlus, HeartPulse, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface EmergencyCardModalProps {
  member: any
  medicines: any[]
}

export function EmergencyCardModal({ member, medicines }: EmergencyCardModalProps) {
  const qrRef = useRef<SVGSVGElement>(null)

  // Construct standard emergency info
  const ageString = member.date_of_birth ? `${new Date().getFullYear() - new Date(member.date_of_birth).getFullYear()} yrs` : 'Unknown'
  
  const activeMeds = medicines
    .map(m => `- ${m.medicine_name} (${m.salt_composition})`)
    .join('\n') || 'None recorded'

  const allergies = member.allergies?.length > 0 
    ? member.allergies.join(', ')
    : 'No known allergies'

  const emergencyData = `EMERGENCY MEDICAL INFO
Name: ${member.full_name}
Age: ${ageString}
Blood Group: ${member.blood_group || 'Unknown'}
Gender: ${member.gender || 'Unknown'}

ALLERGIES:
${allergies}

CURRENT MEDICATIONS:
${activeMeds}

Chronic Conditions:
${member.chronic_conditions?.join(', ') || 'None recorded'}

Provided by Medfora Health Guardian`

  const handleDownload = () => {
    if (!qrRef.current) return
    const svgData = new XMLSerializer().serializeToString(qrRef.current)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width + 40
      canvas.height = img.height + 40
      if (ctx) {
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 20, 20)
      }
      const pngFile = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.download = `Emergency_Card_${member.full_name.replace(/\s+/g, '_')}.png`
      downloadLink.href = `${pngFile}`
      downloadLink.click()
    }
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }

  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-800 rounded-xl font-bold flex items-center gap-1.5 h-9 px-3">
        <ShieldPlus className="w-4 h-4" />
        <span className="hidden sm:inline">Emergency Card</span>
        <span className="sm:hidden">QR</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white border-[#2F4858]/15 rounded-3xl p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-black text-[#2F4858] flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-500" />
            Emergency QR Card
          </DialogTitle>
          <p className="text-sm font-medium text-[#2F4858]/70">
            Scan this code to instantly view life-saving medical data without needing internet access.
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center bg-[#F8FDFB] p-6 rounded-2xl border border-[#2F4858]/10 space-y-5">
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#2F4858]/10">
            <QRCodeSVG 
              value={emergencyData} 
              size={220} 
              level="M"
              ref={qrRef}
              includeMargin={false}
              fgColor="#1E313D"
            />
          </div>

          <div className="text-center space-y-1 w-full px-4">
            <h3 className="font-extrabold text-[#2F4858] text-lg">{member.full_name}</h3>
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              {member.blood_group ? `Blood Group: ${member.blood_group}` : 'Medical ID Code'}
            </p>
            <p className="text-xs font-medium text-[#2F4858]/70 mt-2">
              Contains active prescriptions, allergies, and chronic conditions.
            </p>
          </div>

        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={handleDownload} className="w-full bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] rounded-xl font-bold gap-2">
            <Download className="w-4 h-4" />
            Download & Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  )
}
