'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMedicine } from '@/app/actions/medicine'
import { Button } from './ui/button'
export function DeleteMedicineButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function remove() {
    if (pending || !window.confirm('Delete ' + name + ' from your cabinet?')) return
    setPending(true); setError('')
    try {
      const result = await deleteMedicine(id)
      if (!result.success) throw new Error(result.error || 'Deletion failed.')
      router.push('/'); router.refresh()
    } catch { setError('Medicine could not be deleted. Please retry.') }
    finally { setPending(false) }
  }
  return <div><Button variant="outline" disabled={pending} onClick={remove}>{pending ? 'Deleting…' : 'Delete medicine'}</Button>{error && <p role="alert" className="text-rose-900 mt-2">{error}</p>}</div>
}
