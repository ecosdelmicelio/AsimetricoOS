'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Zona } from '@/features/wms/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function getZonasByBodega(bodegaId: string): Promise<Zona[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('bodega_zonas')
    .select('*')
    .eq('bodega_id', bodegaId)
    .order('nombre') as { data: Zona[] | null }
  return data ?? []
}

export async function crearZona(input: {
  bodega_id: string
  nombre: string
  codigo?: string
}): Promise<{ data: Zona | null; error?: string }> {
  const supabase = db(await createClient())
  
  // Normalizar código si no viene
  const codigo = input.codigo || input.nombre
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9-]/g, '')

  const { data, error } = await supabase
    .from('bodega_zonas')
    .insert({
      bodega_id: input.bodega_id,
      codigo,
      nombre: input.nombre.trim(),
    })
    .select()
    .single() as { data: Zona | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }
  
  revalidatePath('/wms')
  return { data }
}

export async function eliminarZona(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('bodega_zonas')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/wms')
  return {}
}

/**
 * Agrupa posiciones existentes bajo una zona.
 */
export async function asignarPosicionesAZona(
  zonaId: string, 
  posicionIds: string[]
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  
  const { error } = await supabase
    .from('bodega_posiciones')
    .update({ zona_id: zonaId })
    .in('id', posicionIds)

  if (error) {
    console.error('Error agrupando posiciones:', error)
    return { error: (error as any).message }
  }

  revalidatePath('/wms')
  return {}
}
