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

export async function getPosicionesByZona(zonaId: string): Promise<(Posicion & { bines_count: number })[]> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('bodega_posiciones')
    .select(`
      *,
      bines:bines(count)
    `)
    .eq('zona_id', zonaId)
    .order('codigo') as { data: any[] | null; error: any }

  if (error) {
    console.error('Error fetching posiciones por zona:', error)
    return []
  }

  return (data ?? []).map(p => ({
    ...p,
    bines_count: p.bines?.[0]?.count ?? 0
  }))
}

export async function crearPosicion(input: {
  bodega_id: string
  zona_id?: string
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
      zona_id: input.zona_id,
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

/**
 * Sugiere posiciones basadas en afinidad (productos similares en la misma zona).
 */
export async function getSugerenciaPosicionInteligente(
  bodegaId: string, 
  binId: string
): Promise<{ data: string[]; error?: string }> {
  try {
    const supabase = db(await createClient())
    
    // 1. Obtener contenido del bin actual
    const { getContenidoBin } = await import('@/features/bines/services/bines-actions')
    const contenido = await getContenidoBin(binId)
    if (!contenido || contenido.items.length === 0) {
      return { data: [] }
    }

    const itemPrincipal = contenido.items[0]
    
    // 2. Obtener categorías del contenido actual
    const { data: productosBin } = await supabase
      .from('productos')
      .select('id, categoria')
      .in('id', contenido.items.map(i => i.producto_id)) as { data: any[] | null }

    const categorias = Array.from(new Set((productosBin || []).map(p => p.categoria).filter(Boolean)))
    const productIds = (productosBin || []).map(p => p.id)

    // 3. Buscar otros bines que tengan productos de la misma categoría o la misma referencia
    let query = supabase
      .from('recepcion_oc')
      .select('bin_id')
      .eq('bodega_id', bodegaId)
      .neq('bin_id', binId)

    if (categorias.length > 0) {
      // Búsqueda por misma categoría o mismas referencias exactas
      query = query.or(`producto_id.in.(${productIds.join(',')})`) // Prioridad 1: referencias exactas
    }

    const { data: binesSimilares } = await query.limit(30) as { data: any[] | null }

    if (!binesSimilares || binesSimilares.length === 0) {
      // Fallback: Si no hay afinidad exacta, buscar por categorías enlazadas si es posible
      const sug = await getSugerenciaPosicion(bodegaId)
      return { data: sug.data ? [sug.data.id] : [] }
    }

    // 4. Extraer las posiciones de esos bines
    const binIds = binesSimilares.map(b => b.bin_id)
    const { data: posSimilares } = await supabase
      .from('bines')
      .select(`
        posicion_id,
        bodega_posiciones!inner(capacidad_bines, bines:bines(count))
      `)
      .in('id', binIds) as { data: any[] | null }

    const suggestedPosIds = Array.from(new Set(
      (posSimilares || [])
        .filter(p => {
          const cap = p.bodega_posiciones?.capacidad_bines || 4
          const occ = p.bodega_posiciones?.bines?.[0]?.count || 0
          return occ < cap
        })
        .map(p => p.posicion_id)
        .filter(Boolean)
    ))
    
    return { data: suggestedPosIds as string[] }
  } catch (err: any) {
    return { error: err.message, data: [] }
  }
}
