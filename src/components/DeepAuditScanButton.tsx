'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCw, Info } from 'lucide-react'

export function DeepAuditScanButton({ runAuditAction }: { runAuditAction: () => Promise<{ completed: boolean; message: string }> }) {
  const [isPending, startTransition] = useTransition()
  const [completed, setCompleted] = useState(false)
  const [message, setMessage] = useState('')

  const handleClick = () => {
    if (isPending) return
    setCompleted(false)
    setMessage('')
    startTransition(async () => {
      try { const result = await runAuditAction(); setMessage(result.message); setCompleted(result.completed) }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Scan unavailable') }
    })
  }

  return (
    <div className="space-y-2"><Button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="shrink-0 px-4 py-2.5 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-[#2F4858] disabled:opacity-70"
    >
      {isPending ? (
        <>
          <RotateCw className="w-4 h-4 text-[#DDFBEF] animate-spin" />
          <span>Requesting regulatory screen…</span>
        </>
      ) : completed ? (
        <>
          <Info className="w-4 h-4 text-[#DDFBEF]" />
          <span>Screen attempt finished</span>
        </>
      ) : (
        <>
          <RotateCw className="w-4 h-4 text-[#DDFBEF]" />
          <span>Request regulatory screen</span>
        </>
      )}
    </Button>{message && <p role="status" className="text-xs font-medium">{message}</p>}</div>
  )
}
