'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getEmpleados() {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('empleados')
    .select('*')
    .order('nombre', { ascending: true })
  
  if (error) {
    console.error('Error fetching empleados:', error)
    return []
  }
  return data || []
}

export async function getParafiscalesConfig() {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('ajustes_sistema')
    .select('id, valor, descripcion')
    .like('id', 'para_%')
  
  if (error) {
    console.error('Error fetching parafiscales config:', error)
    return []
  }
  return data || []
}
