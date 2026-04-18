'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getBalanceConfig() {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('balance_config')
    .select('*')
  
  if (error) {
    console.error('Error fetching balance config:', error)
    return []
  }
  return data || []
}

export async function getActivosFijos() {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('activos_fijos')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching activos fijos:', error)
    return []
  }
  return data || []
}
