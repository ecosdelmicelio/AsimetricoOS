'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getSocios() {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('socios')
    .select('*')
    .order('nombre', { ascending: true })
  
  if (error) {
    console.error('Error fetching socios:', error)
    return []
  }
  return data || []
}
