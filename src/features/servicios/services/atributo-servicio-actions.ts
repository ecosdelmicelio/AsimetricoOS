'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { TipoServicioAtributo } from '@/features/servicios/types/servicios'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getTipoServicioAtributos(): Promise<TipoServicioAtributo[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('tipo_servicio_atributos')
    .select('*')
    .eq('activo', true)
    .order('atributo_tipo', { ascending: true })
    .order('nombre', { ascending: true }) as { data: TipoServicioAtributo[] | null }
  return data ?? []
}

export async function getTipos(): Promise<TipoServicioAtributo[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('tipo_servicio_atributos')
    .select('*')
    .eq('atributo_tipo', 'tipo')
    .eq('activo', true)
    .order('nombre', { ascending: true }) as { data: TipoServicioAtributo[] | null }
  return data ?? []
}

export async function getSubtiposPorTipo(tipo_padre_id: string): Promise<TipoServicioAtributo[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('tipo_servicio_atributos')
    .select('*')
    .eq('atributo_tipo', 'subtipo')
    .eq('tipo_padre_id', tipo_padre_id)
    .eq('activo', true)
    .order('nombre', { ascending: true }) as { data: TipoServicioAtributo[] | null }
  return data ?? []
}

export async function getDetallesPorSubtipo(subtipo_padre_id: string): Promise<TipoServicioAtributo[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('tipo_servicio_atributos')
    .select('*')
    .eq('atributo_tipo', 'detalle')
    .eq('subtipo_padre_id', subtipo_padre_id)
    .eq('activo', true)
    .order('nombre', { ascending: true }) as { data: TipoServicioAtributo[] | null }
  return data ?? []
}

export async function createTipoServicioAtributo(
  atributo_tipo: 'tipo' | 'subtipo' | 'detalle',
  nombre: string,
  abreviatura: string,
  tipo_padre_id?: string,
  subtipo_padre_id?: string,
): Promise<{ data: TipoServicioAtributo | null; error?: string }> {
  const supabase = db(await createClient())

  if (!nombre.trim()) {
    return { data: null, error: 'El nombre es obligatorio' }
  }

  if (!abreviatura.trim()) {
    return { data: null, error: 'La abreviatura es obligatoria' }
  }

  if (atributo_tipo === 'subtipo' && !tipo_padre_id) {
    return { data: null, error: 'El tipo padre es obligatorio para subtipos' }
  }

  if (atributo_tipo === 'detalle' && !subtipo_padre_id) {
    return { data: null, error: 'El subtipo padre es obligatorio para detalles' }
  }

  const { data, error } = await supabase
    .from('tipo_servicio_atributos')
    .insert({
      atributo_tipo,
      nombre: nombre.trim(),
      abreviatura: abreviatura.trim().toUpperCase(),
      tipo_padre_id: tipo_padre_id || null,
      subtipo_padre_id: subtipo_padre_id || null,
      activo: true,
    })
    .select()
    .single() as { data: TipoServicioAtributo | null; error: { message: string } | null }

  if (error) {
    return { data: null, error: error.message }
  }

  revalidatePath('/configuracion')
  return { data }
}

export async function updateTipoServicioAtributo(
  id: string,
  updates: {
    nombre?: string
    abreviatura?: string
    activo?: boolean
  },
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const payload: any = {}
  if (updates.nombre !== undefined) payload.nombre = updates.nombre.trim()
  if (updates.abreviatura !== undefined) payload.abreviatura = updates.abreviatura.trim().toUpperCase()
  if (updates.activo !== undefined) payload.activo = updates.activo

  const { error } = await supabase
    .from('tipo_servicio_atributos')
    .update(payload)
    .eq('id', id) as { error: { message: string } | null }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  return {}
}

export async function deleteTipoServicioAtributo(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('tipo_servicio_atributos')
    .delete()
    .eq('id', id) as { error: { message: string } | null }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  return {}
}

export async function toggleTipoServicioAtributoActivo(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { data: atributo } = await supabase
    .from('tipo_servicio_atributos')
    .select('activo')
    .eq('id', id)
    .single() as { data: { activo: boolean } | null }

  if (!atributo) {
    return { error: 'Atributo no encontrado' }
  }

  const { error } = await supabase
    .from('tipo_servicio_atributos')
    .update({ activo: !atributo.activo })
    .eq('id', id) as { error: { message: string } | null }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/configuracion')
  return {}
}
