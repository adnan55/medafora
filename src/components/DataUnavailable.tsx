'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
export function DataUnavailable({ message = 'Your records could not be loaded. Please retry.' }: { message?: string }) {
  const router = useRouter()
  return <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3">
    <h2 className="text-lg font-bold text-amber-950">Records unavailable</h2><p className="text-sm text-amber-950">{message}</p>
    <Button variant="outline" onClick={() => router.refresh()}>Retry loading records</Button>
  </div>
}
