'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Posicion } from '@/features/wms/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function getPosicionesByBodega(bodegaId: string): Promise<(Posicion & { bines_count: number })[]> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('bodega_posiciones')
    .select(`
      *,
      bines:bines(count)
    `)
    .eq('bodega_id', bodegaId)
    .order('codigo') as { data: any[] | null; error: any }

  if (error) {
    console.error('Error fetching posiciones:', error)
    return []
  }

  return (data ?? []).map(p => ({
    ...p,
    bines_count: p.bines?.[0]?.count ?? 0
  }))
}

export async function crearPosicion(input: {
  bodega_id: string
  nombre: string
  codigo?: string
  capacidad_bines?: number
}): Promise<{ data: Posicion | null; error?: string }> {
  const supabase = db(await createClient())
  
  // Si no hay código, generarlo desde el nombre
  const codigo = input.codigo || input.nombre
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
    .replace(/[^A-Z0-9-]/g, '') // Quitar caracteres especiales

  const { data, error } = await supabase
    .from('bodega_posiciones')
    .insert({
      bodega_id: input.bodega_id,
      codigo,
      nombre: input.nombre.trim(),
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
  input: Partial<{ codigo: string; nombre: string; capacidad_bines: number }>
): Promise<{ data: Posicion | null; error?: string }> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('bodega_posiciones')
    .update({
      codigo: input.codigo?.trim().toUpperCase(),
      nombre: input.nombre?.trim(),
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

/**
 * Sugiere la posición más adecuada dentro de una bodega.
 * Criterio: Posición con más espacio disponible (capacidad - ocupación).
 */
export async function getSugerenciaPosicion(bodegaId: string): Promise<{ data: Posicion | null; error?: string }> {
  const supabase = db(await createClient())
  
  // Obtenemos todas las posiciones con su conteo de bines
  const posiciones = await getPosicionesByBodega(bodegaId)
  
  if (posiciones.length === 0) {
    return { data: null, error: 'No hay posiciones configuradas en esta bodega' }
  }

  // Encontrar la que tiene más espacio
  const sugerencia = posiciones
    .filter(p => p.bines_count < p.capacidad_bines)
    .sort((a, b) => {
      const espacioA = a.capacidad_bines - a.bines_count
      const espacioB = b.capacidad_bines - b.bines_count
      return espacioB - espacioA // Descendente por espacio
    })[0]

  return { data: sugerencia || null }
}
