'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(s: unknown): any { return s }

export interface Socio {
  id: string
  nombre: string
  aporte: number
  porcentaje_propiedad: number
  porcentaje_utilidades: number
  created_at: string
}

export async function getSocios() {
  const supabase = db(await createClient())
  const { data } = await supabase.from('socios').select('*').order('aporte', { ascending: false })
  return data as Socio[] || []
}

export async function createSocio(input: Omit<Socio, 'id' | 'created_at'>) {
  const supabase = db(await createClient())
  const { data, error } = await supabase.from('socios').insert(input).select().single()
  
  if (!error) {
    const socios = await getSocios()
    const totalCapital = socios.reduce((sum, s) => sum + Number(s.aporte), 0)
    await supabase.from('balance_config').update({ valor: totalCapital }).eq('clave', 'capital_social')
  }

  revalidatePath('/configuracion')
  revalidatePath('/finanzas')
  return { data, error: error?.message }
}

export async function updateSocio(id: string, input: Partial<Omit<Socio, 'id' | 'created_at'>>) {
  const supabase = db(await createClient())
  const { error } = await supabase.from('socios').update(input).eq('id', id)
  
  if (!error && input.aporte !== undefined) {
    const socios = await getSocios()
    const totalCapital = socios.reduce((sum, s) => sum + Number(s.aporte), 0)
    await supabase.from('balance_config').update({ valor: totalCapital }).eq('clave', 'capital_social')
  }

  revalidatePath('/configuracion')
  revalidatePath('/finanzas')
  return { error: error?.message }
}

export async function deleteSocio(id: string) {
  const supabase = db(await createClient())
  const { error } = await supabase.from('socios').delete().eq('id', id)

  if (!error) {
    const socios = await getSocios()
    const totalCapital = socios.reduce((sum, s) => sum + Number(s.aporte), 0)
    await supabase.from('balance_config').update({ valor: totalCapital }).eq('clave', 'capital_social')
  }

  revalidatePath('/configuracion')
  revalidatePath('/finanzas')
}
