'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { AtributoPT, TipoAtributo } from '@/features/productos/types/atributos'
import { generarAbreviacion } from '@/shared/lib/abreviacion-utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getAtributosPT(): Promise<AtributoPT[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('atributos_pt')
    .select('*')
    .order('tipo', { ascending: true })
    .order('valor', { ascending: true }) as { data: AtributoPT[] | null }
  return data ?? []
}

export async function getAtributosPorTipo(tipo: TipoAtributo): Promise<AtributoPT[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('atributos_pt')
    .select('*')
    .eq('tipo', tipo)
    .order('valor', { ascending: true }) as { data: AtributoPT[] | null }
  return data ?? []
}

// Longitud estándar de abreviaciones por tipo
const LONGITUD_ABREVIACION: Record<TipoAtributo, number> = {
  genero: 1,
  tipo: 2,
  fit: 1,
  color: 3,
  diseno: 4,
  superior: 2,
  inferior: 2,
  capsula: 2,
}

export async function createAtributoPT(
  tipo: TipoAtributo,
  valor: string,
  abreviacion?: string,
): Promise<{ data: AtributoPT | null; error?: string }> {
  const supabase = db(await createClient())

  // Auto-generar abreviación si no se proporciona
  const abrGenerada = abreviacion || generarAbreviacion(valor, LONGITUD_ABREVIACION[tipo])

  const { data, error } = await supabase
    .from('atributos_pt')
    .insert({
      tipo,
      valor: valor.trim(),
      abreviacion: abrGenerada,
    })
    .select()
    .single() as { data: AtributoPT | null; error: { message: string } | null }

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
  revalidatePath('/catalogo/nuevo')
  return { data }
}

export async function deleteAtributoPT(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('atributos_pt')
    .delete()
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  revalidatePath('/catalogo/nuevo')
  return {}
}

export async function getAtributosProducto(
  producto_id: string,
): Promise<Record<TipoAtributo, string>> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('producto_atributos')
    .select('tipo, atributo_id')
    .eq('producto_id', producto_id) as { data: Array<{ tipo: TipoAtributo; atributo_id: string }> | null }

  const result: Record<TipoAtributo, string> = {
    tipo: '',
    fit: '',
    superior: '',
    inferior: '',
    capsula: '',
    diseno: '',
    color: '',
    genero: '',
  }

  if (data) {
    data.forEach(row => {
      result[row.tipo] = row.atributo_id
    })
  }

  return result
}

export async function asociarAtributosAProducto(
  producto_id: string,
  atributos: Record<TipoAtributo, string>,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  // Eliminar atributos anteriores
  await supabase
    .from('producto_atributos')
    .delete()
    .eq('producto_id', producto_id)

  // Insertar nuevas relaciones
  const registros = Object.entries(atributos)
    .filter(([_, atributo_id]) => atributo_id) // Solo si hay valor
    .map(([tipo, atributo_id]) => ({
      producto_id,
      atributo_id,
      tipo,
    }))

  if (registros.length === 0) return {}

  const { error } = await supabase
    .from('producto_atributos')
    .insert(registros) as { error: { message: string } | null }

  if (error) return { error: error.message }
  return {}
}

/**
 * Valida que una abreviación sea única para un tipo.
 * Usado en validación client-side y confirmación server.
 */
export async function validateAbreviacionPT(
  tipo: TipoAtributo,
  abreviacion: string,
  excludeId?: string,
): Promise<{ isValid: boolean; error?: string }> {
  const supabase = db(await createClient())

  let query = supabase
    .from('atributos_pt')
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
 * Actualiza la abreviación de un atributo existente.
 */
export async function updateAbreviacionPT(
  id: string,
  abreviacion: string,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('atributos_pt')
    .update({ abreviacion })
    .eq('id', id) as { error: { message: string } | null }

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return { error: `La abreviación "${abreviacion}" ya está en uso` }
    }
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  revalidatePath('/catalogo/nuevo')
  return {}
}

/**
 * Cuenta cuántos productos usan un atributo PT específico
 */
export async function getAtributoPTUsos(atributoId: string): Promise<number> {
  const supabase = db(await createClient())
  const { count } = await supabase
    .from('producto_atributos')
    .select('*', { count: 'exact', head: true })
    .eq('atributo_id', atributoId) as { count: number | null }
  return count ?? 0
}

/**
 * Toggle el estado activo de un atributo PT
 */
export async function toggleAtributoPTActivo(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  // Obtener el estado actual
  const { data: current } = await supabase
    .from('atributos_pt')
    .select('activo')
    .eq('id', id)
    .single() as { data: { activo: boolean } | null }

  const nuevoEstado = !current?.activo

  const { error } = await supabase
    .from('atributos_pt')
    .update({ activo: nuevoEstado })
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  revalidatePath('/catalogo/nuevo')
  return {}
}
