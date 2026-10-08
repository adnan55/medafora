'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteMedicine(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  
  const { data, error } = await supabase
    .from('medicines')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')

  if (error || data?.length !== 1) {
    console.error('Failed to delete medicine', error)
    return { success: false, error: 'Failed to delete medicine' }
  }

  revalidatePath('/')
  revalidatePath('/family')
  return { success: true }
}
