'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Posicion } from '@/features/wms/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function getPosicionesByBodega(bodegaId: string): Promise<Posicion[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('bodega_posiciones')
    .select('*')
    .eq('bodega_id', bodegaId)
    .order('codigo') as { data: Posicion[] | null }
  return data ?? []
}

export async function crearPosicion(input: {
  bodega_id: string
  codigo: string
  capacidad_bines?: number
}): Promise<{ data: Posicion | null; error?: string }> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('bodega_posiciones')
    .insert({
      bodega_id: input.bodega_id,
      codigo: input.codigo.trim().toUpperCase(),
      capacidad_bines: input.capacidad_bines ?? 4,
    })
    .select()
    .single() as { data: Posicion | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }
  
  revalidatePath('/wms')
  return { data }
}

export async function actualizarPosicion(
  id: string,
  input: Partial<{ codigo: string; capacidad_bines: number }>
): Promise<{ data: Posicion | null; error?: string }> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('bodega_posiciones')
    .update({
      codigo: input.codigo?.trim().toUpperCase(),
      capacidad_bines: input.capacidad_bines,
    })
    .eq('id', id)
    .select()
    .single() as { data: Posicion | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }
  
  revalidatePath('/wms')
  return { data }
}

export async function eliminarPosicion(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('bodega_posiciones')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/wms')
  return {}
}
