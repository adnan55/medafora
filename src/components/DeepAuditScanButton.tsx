'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCw, ShieldCheck } from 'lucide-react'

export function DeepAuditScanButton({ runAuditAction }: { runAuditAction: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition()
  const [completed, setCompleted] = useState(false)

  const handleClick = () => {
    setCompleted(false)
    startTransition(async () => {
      await runAuditAction()
      setCompleted(true)
      setTimeout(() => setCompleted(false), 4000)
    })
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="shrink-0 px-4 py-2.5 rounded-xl bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-[#2F4858] disabled:opacity-70"
    >
      {isPending ? (
        <>
          <RotateCw className="w-4 h-4 text-[#DDFBEF] animate-spin" />
          <span>Scanning with AI Agent...</span>
        </>
      ) : completed ? (
        <>
          <ShieldCheck className="w-4 h-4 text-[#DDFBEF]" />
          <span>Audit Complete!</span>
        </>
      ) : (
        <>
          <RotateCw className="w-4 h-4 text-[#DDFBEF]" />
          <span>Run Deep Audit Scan</span>
        </>
      )}
    </Button>
  )
}
