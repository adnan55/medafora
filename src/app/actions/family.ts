'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteFamilyMember(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  
  const { data, error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')

  if (error || data?.length !== 1) {
    console.error('Failed to delete family member', error)
    throw new Error('Failed to delete family member')
  }

  revalidatePath('/family')
  revalidatePath('/')
  return { success: true }
}
