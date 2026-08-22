'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteMedicine(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('medicines')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete medicine', error)
    throw new Error('Failed to delete medicine')
  }

  // Redirect to dashboard after successful deletion
  redirect('/')
}
