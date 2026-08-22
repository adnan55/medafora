'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteFamilyMember(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete family member', error)
    throw new Error('Failed to delete family member')
  }

  redirect('/family')
}
