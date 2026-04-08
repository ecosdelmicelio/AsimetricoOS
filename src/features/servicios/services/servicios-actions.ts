'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { ServicioOperativo, TipoServicioAtributo } from '@/features/servicios/types/servicios'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getServiciosOperativos(): Promise<ServicioOperativo[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('servicios_operativos')
    .select(`
      *,
      atributo1:atributo1_id(*),
      atributo2:atributo2_id(*)
    `)
    .order('codigo', { ascending: true }) as { data: ServicioOperativo[] | null }
  return data ?? []
}

export async function getServiciosEjecutores() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('terceros')
    .select('id, nombre')
    .in('tipo', ['proveedor_mp', 'satelite'])
    .eq('estado', 'activo')
    .order('nombre', { ascending: true }) as { data: Array<{ id: string; nombre: string }> | null }
  return data ?? []
}

/**
 * Genera el próximo número consecutivo para un tipo de servicio
 */
async function getProximoConsecutivo(atributo1_id: string): Promise<number> {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('servicios_operativos')
    .select('codigo')
    .eq('atributo1_id', atributo1_id)
    .order('codigo', { ascending: false })
    .limit(1) as { data: Array<{ codigo: string }> | null; error: any }

  if (error || !data || data.length === 0) {
    return 1
  }

  // Extraer número del código (ej: CO-RCT-001 → 001 → 1)
  const ultimoCodigo = data[0].codigo
  const partes = ultimoCodigo.split('-')
  const numStr = partes[partes.length - 1] ?? '000'
  const num = parseInt(numStr, 10)
  return num + 1
}

/**
 * Genera un código como ABR1-ABR2-NNN (abreviaturas + 3 dígitos)
 */
function generarCodigo(abr1: string, abr2: string, consecutivo: number): string {
  const numStr = String(consecutivo).padStart(3, '0')
  return `${abr1.toUpperCase()}-${abr2.toUpperCase()}-${numStr}`
}

export async function createServicioOperativo(
  atributo1_id: string,
  atributo2_id: string,
  nombre: string,
  tarifaUnitaria: number,
  descripcion?: string,
  ejecutor_id?: string,
): Promise<{ data: ServicioOperativo | null; error?: string }> {
  const supabase = db(await createClient())

  // Obtener abreviaturas de los atributos
  const { data: atributos } = await supabase
    .from('tipo_servicio_atributos')
    .select('*')
    .in('id', [atributo1_id, atributo2_id]) as { data: TipoServicioAtributo[] | null }

  if (!atributos || atributos.length !== 2) {
    return { data: null, error: 'Atributos inválidos' }
  }

  const atributo1 = atributos.find(a => a.id === atributo1_id)
  const atributo2 = atributos.find(a => a.id === atributo2_id)

  if (!atributo1 || !atributo2) {
    return { data: null, error: 'Atributos inválidos' }
  }

  // Generar código automáticamente
  const consecutivo = await getProximoConsecutivo(atributo1_id)
  const codigo = generarCodigo(atributo1.abreviatura, atributo2.abreviatura, consecutivo)

  const { data, error } = await supabase
    .from('servicios_operativos')
    .insert({
      codigo,
      nombre: nombre.trim(),
      atributo1_id,
      atributo2_id,
      tarifa_unitaria: tarifaUnitaria,
      descripcion: descripcion?.trim() || null,
      ejecutor_id: ejecutor_id || null,
      activo: true,
    })
    .select()
    .single() as { data: ServicioOperativo | null; error: { message: string } | null }

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/configuracion')
  return { data }
}

export async function updateServicioOperativo(
  id: string,
  updates: {
    nombre?: string
    tarifa_unitaria?: number
    descripcion?: string | null
    ejecutor_id?: string | null
    activo?: boolean
  },
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const payload: any = {}
  if (updates.nombre !== undefined) payload.nombre = updates.nombre.trim()
  if (updates.tarifa_unitaria !== undefined) payload.tarifa_unitaria = updates.tarifa_unitaria
  if (updates.descripcion !== undefined) payload.descripcion = updates.descripcion?.trim() || null
  if (updates.ejecutor_id !== undefined) payload.ejecutor_id = updates.ejecutor_id || null
  if (updates.activo !== undefined) payload.activo = updates.activo

  const { error } = await supabase
    .from('servicios_operativos')
    .update(payload)
    .eq('id', id) as { error: { message: string } | null }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  return {}
}

export async function deleteServicioOperativo(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('servicios_operativos')
    .delete()
    .eq('id', id) as { error: { message: string } | null }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  return {}
}

export async function toggleServicioActivo(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { data: servicio } = await supabase
    .from('servicios_operativos')
    .select('activo')
    .eq('id', id)
    .single() as { data: { activo: boolean } | null }

  if (!servicio) {
    return { error: 'Servicio no encontrado' }
  }

  const { error } = await supabase
    .from('servicios_operativos')
    .update({ activo: !servicio.activo })
    .eq('id', id) as { error: { message: string } | null }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  return {}
}
