'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { ServicioOperativo, TipoProceso } from '@/features/servicios/types/servicios'
import { ABREVIATURAS_TIPO_PROCESO } from '@/features/servicios/types/servicios'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getServiciosOperativos(): Promise<ServicioOperativo[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('servicios_operativos')
    .select('*')
    .order('tipo_proceso', { ascending: true })
    .order('codigo', { ascending: true }) as { data: ServicioOperativo[] | null }
  return data ?? []
}

export async function getServiciosPorTipo(tipo: TipoProceso): Promise<ServicioOperativo[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('servicios_operativos')
    .select('*')
    .eq('tipo_proceso', tipo)
    .order('codigo', { ascending: true }) as { data: ServicioOperativo[] | null }
  return data ?? []
}

/**
 * Genera el próximo número consecutivo para un tipo de proceso
 */
async function getProximoConsecutivo(tipo: TipoProceso): Promise<number> {
  const supabase = db(await createClient())
  const abr = ABREVIATURAS_TIPO_PROCESO[tipo]

  const { data, error } = await supabase
    .from('servicios_operativos')
    .select('codigo')
    .eq('tipo_proceso', tipo)
    .order('codigo', { ascending: false })
    .limit(1) as { data: Array<{ codigo: string }> | null; error: any }

  if (error || !data || data.length === 0) {
    return 1
  }

  // Extraer número del código (ej: CO-001 → 001 → 1)
  const ultimoCodigo = data[0].codigo
  const numStr = ultimoCodigo.split('-')[1] ?? '000'
  const num = parseInt(numStr, 10)
  return num + 1
}

/**
 * Genera un código como TP-NNN (tipo + 3 dígitos)
 */
function generarCodigo(tipo: TipoProceso, consecutivo: number): string {
  const abr = ABREVIATURAS_TIPO_PROCESO[tipo]
  const numStr = String(consecutivo).padStart(3, '0')
  return `${abr}-${numStr}`
}

export async function createServicioOperativo(
  tipo: TipoProceso,
  nombre: string,
  tarifaUnitaria: number,
  descripcion?: string,
  ejecutor?: string,
): Promise<{ data: ServicioOperativo | null; error?: string }> {
  const supabase = db(await createClient())

  // Generar código automáticamente
  const consecutivo = await getProximoConsecutivo(tipo)
  const codigo = generarCodigo(tipo, consecutivo)

  const { data, error } = await supabase
    .from('servicios_operativos')
    .insert({
      codigo,
      nombre: nombre.trim(),
      tipo_proceso: tipo,
      tarifa_unitaria: tarifaUnitaria,
      descripcion: descripcion?.trim() || null,
      ejecutor: ejecutor?.trim() || null,
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
    ejecutor?: string | null
    activo?: boolean
  },
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const payload: any = {}
  if (updates.nombre !== undefined) payload.nombre = updates.nombre.trim()
  if (updates.tarifa_unitaria !== undefined) payload.tarifa_unitaria = updates.tarifa_unitaria
  if (updates.descripcion !== undefined) payload.descripcion = updates.descripcion?.trim() || null
  if (updates.ejecutor !== undefined) payload.ejecutor = updates.ejecutor?.trim() || null
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

  // Obtener estado actual
  const { data: servicios } = await supabase
    .from('servicios_operativos')
    .select('activo')
    .eq('id', id)
    .single() as { data: { activo: boolean } | null }

  if (!servicios) {
    return { error: 'Servicio no encontrado' }
  }

  const { error } = await supabase
    .from('servicios_operativos')
    .update({ activo: !servicios.activo })
    .eq('id', id) as { error: { message: string } | null }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  return {}
}
