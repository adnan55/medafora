'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteFamilyMember } from '@/app/actions/family'
import { useRouter } from 'next/navigation'

interface DeleteFamilyMemberButtonProps {
  memberId: string
  memberName: string
}

export function DeleteFamilyMemberButton({
  memberId,
  memberName,
}: DeleteFamilyMemberButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (
      !confirm(
        `Are you sure you want to delete ${memberName}'s profile?\n\nThis will also remove their assigned medical records, vitals history, and cabinet links.`
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteFamilyMember(memberId)
      router.refresh()
    } catch (err) {
      console.error('Failed to delete member:', err)
      alert('Failed to delete profile. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      type="button"
      disabled={isDeleting}
      onClick={handleDelete}
      className="h-8 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 hover:border-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
      title={`Delete ${memberName}'s profile`}
    >
      {isDeleting ? (
        <Loader2 className="size-3.5 animate-spin text-rose-600" />
      ) : (
        <Trash2 className="size-3.5 text-rose-600" />
      )}
      <span className="text-[11px] font-bold">Delete</span>
    </button>
  )
}
