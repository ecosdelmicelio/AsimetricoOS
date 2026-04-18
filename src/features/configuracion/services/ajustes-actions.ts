'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getAjustes() {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('ajustes_sistema')
    .select('*')
    .order('id')

  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

export async function updateAjuste(id: string, valor: any) {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('ajustes_sistema')
    .update({ 
      valor,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/configuracion')
  revalidatePath('/desarrollo')
  return { error: null }
}
