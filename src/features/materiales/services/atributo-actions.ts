'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { AtributoMP, TipoAtributoMP, MaterialAtributo } from '@/features/materiales/types/atributos'
import { generarAbreviacion } from '@/shared/lib/abreviacion-utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getAtributosMP(): Promise<AtributoMP[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('atributos_mp')
    .select('*')
    .order('tipo', { ascending: true })
    .order('valor', { ascending: true }) as { data: AtributoMP[] | null }
  return data ?? []
}

export async function getAtributosPorTipoMP(tipo: TipoAtributoMP): Promise<AtributoMP[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('atributos_mp')
    .select('*')
    .eq('tipo', tipo)
    .order('valor', { ascending: true }) as { data: AtributoMP[] | null }
  return data ?? []
}

// Longitud estándar de abreviaciones por tipo MP
const LONGITUD_ABREVIACION_MP: Record<TipoAtributoMP, number> = {
  tipo: 2,
  subtipo: 2,
  color: 3,
  diseño: 4,
}

export async function createAtributoMP(
  tipo: TipoAtributoMP,
  valor: string,
  abreviacion?: string,
): Promise<{ data: AtributoMP | null; error?: string }> {
  const supabase = db(await createClient())

  // Auto-generar abreviación si no se proporciona
  const abrGenerada = abreviacion || generarAbreviacion(valor, LONGITUD_ABREVIACION_MP[tipo])

  const { data, error } = await supabase
    .from('atributos_mp')
    .insert({
      tipo,
      valor: valor.trim(),
      abreviacion: abrGenerada,
    })
    .select()
    .single() as { data: AtributoMP | null; error: { message: string } | null }

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      if (error.message.includes('uq_abreviacion')) {
        return { data: null, error: `La abreviación "${abrGenerada}" ya existe para el tipo "${tipo}"` }
      }
      return { data: null, error: `El valor "${valor}" ya existe para el tipo "${tipo}"` }
    }
    return { data: null, error: error.message }
  }

  revalidatePath('/configuracion')
  revalidatePath('/materiales')
  return { data }
}

export async function deleteAtributoMP(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('atributos_mp')
    .delete()
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  revalidatePath('/materiales')
  return {}
}

export async function asociarAtributosAMaterial(
  material_id: string,
  atributos: Record<TipoAtributoMP, string>,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const registros = Object.entries(atributos)
    .filter(([_, atributo_id]) => atributo_id)
    .map(([tipo, atributo_id]) => ({
      material_id,
      atributo_id,
      tipo,
    }))

  if (registros.length === 0) return {}

  const { error } = await supabase
    .from('material_atributos')
    .insert(registros) as { error: { message: string } | null }

  if (error) return { error: error.message }
  return {}
}

/**
 * Valida que una abreviación sea única para un tipo en materiales.
 */
export async function validateAbreviacionMP(
  tipo: TipoAtributoMP,
  abreviacion: string,
  excludeId?: string,
): Promise<{ isValid: boolean; error?: string }> {
  const supabase = db(await createClient())

  let query = supabase
    .from('atributos_mp')
    .select('id')
    .eq('tipo', tipo)
    .eq('abreviacion', abreviacion)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query as { data: Array<{ id: string }> | null; error: { message: string } | null }

  if (error) {
    return { isValid: false, error: error.message }
  }

  const exists = data && data.length > 0
  if (exists) {
    return { isValid: false, error: `La abreviación "${abreviacion}" ya está en uso para el tipo "${tipo}"` }
  }

  return { isValid: true }
}

/**
 * Actualiza la abreviación de un atributo MP.
 */
export async function updateAbreviacionMP(
  id: string,
  abreviacion: string,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('atributos_mp')
    .update({ abreviacion })
    .eq('id', id) as { error: { message: string } | null }

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return { error: `La abreviación "${abreviacion}" ya está en uso` }
    }
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  revalidatePath('/materiales')
  return {}
}

/**
 * Cuenta cuántos materiales usan un atributo MP específico
 */
export async function getAtributoMPUsos(atributoId: string): Promise<number> {
  const supabase = db(await createClient())
  const { count } = await supabase
    .from('material_atributos')
    .select('*', { count: 'exact', head: true })
    .eq('atributo_id', atributoId) as { count: number | null }
  return count ?? 0
}

/**
 * Toggle el estado activo de un atributo MP
 */
export async function toggleAtributoMPActivo(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  // Obtener el estado actual
  const { data: current } = await supabase
    .from('atributos_mp')
    .select('activo')
    .eq('id', id)
    .single() as { data: { activo: boolean } | null }

  const nuevoEstado = !current?.activo

  const { error } = await supabase
    .from('atributos_mp')
    .update({ activo: nuevoEstado })
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  revalidatePath('/materiales')
  return {}
}
