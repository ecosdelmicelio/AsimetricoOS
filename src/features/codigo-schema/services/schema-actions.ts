'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { CodigoSchema, CodigoSegmentoValor, EntidadSchema, TipoSegmento } from '@/features/codigo-schema/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

const ENTIDAD_TABLA: Record<EntidadSchema, string> = {
  producto: 'productos',
  material: 'materiales',
  servicio: 'servicios_operativos',
}

export async function getSchemaByEntidad(entidad: EntidadSchema): Promise<CodigoSchema | null> {
  const supabase = db(await createClient())
  const { data: schema } = await supabase
    .from('codigo_schemas')
    .select('*')
    .eq('entidad', entidad)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!schema) return null

  const [segmentosResult, countResult] = await Promise.all([
    supabase
      .from('codigo_segmentos')
      .select('*, valores:codigo_segmento_valores(*)')
      .eq('schema_id', schema.id)
      .order('orden', { ascending: true }),
    supabase
      .from(ENTIDAD_TABLA[entidad])
      .select('id', { count: 'exact', head: true })
      .eq('schema_id', schema.id),
  ])

  return {
    ...schema,
    bloqueado: (schema.finalizado as boolean) || (countResult.count ?? 0) > 0,
    segmentos: (segmentosResult.data ?? []).map((s: { valores?: unknown[] } & Record<string, unknown>) => ({
      ...s,
      valores: (s.valores ?? []),
    })),
  } as CodigoSchema
}

export async function createSchema(input: {
  entidad: EntidadSchema
  nombre: string
}): Promise<{ data: CodigoSchema | null; error?: string }> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('codigo_schemas')
    .insert({ entidad: input.entidad, nombre: input.nombre })
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath('/configuracion')
  return { data: { ...data, segmentos: [] } as CodigoSchema }
}

export async function updateSchema(
  id: string,
  nombre: string,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('codigo_schemas')
    .update({ nombre: nombre.trim() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return {}
}

export async function addSegmento(
  schema_id: string,
  input: {
    clave: string
    etiqueta: string
    longitud: number
    tipo: TipoSegmento
  },
): Promise<{ data?: { id: string; orden: number }; error?: string }> {
  const supabase = db(await createClient())

  // Compute next orden server-side to avoid UNIQUE(schema_id, orden) conflicts
  const { data: existing } = await supabase
    .from('codigo_segmentos')
    .select('orden')
    .eq('schema_id', schema_id)
    .order('orden', { ascending: false })
    .limit(1)
  const orden = ((existing?.[0]?.orden as number | undefined) ?? 0) + 1

  const { data, error } = await supabase
    .from('codigo_segmentos')
    .insert({
      schema_id,
      clave:    input.clave.toUpperCase().trim(),
      etiqueta: input.etiqueta.trim(),
      longitud: input.longitud,
      tipo:     input.tipo,
      orden,
    })
    .select('id, orden')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return { data: { id: (data as { id: string; orden: number }).id, orden: (data as { id: string; orden: number }).orden } }
}

export async function addValor(
  segmento_id: string,
  input: { valor: string; etiqueta: string },
): Promise<{ data?: CodigoSegmentoValor; error?: string }> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('codigo_segmento_valores')
    .insert({
      segmento_id,
      valor:    input.valor.toUpperCase().trim(),
      etiqueta: input.etiqueta.trim(),
    })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  revalidatePath('/productos/nuevo')
  return { data: data as CodigoSegmentoValor }
}

export async function updateValor(
  id: string,
  etiqueta: string,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('codigo_segmento_valores')
    .update({ etiqueta: etiqueta.trim() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return {}
}

export async function getNextRef(segmento_id: string): Promise<number> {
  const supabase = db(await createClient())
  const { data } = await supabase.rpc('next_ref_numero', { p_segmento_id: segmento_id })
  return (data as number) ?? 1
}

export async function updateSegmento(
  id: string,
  input: {
    clave: string
    etiqueta: string
    longitud: number
    tipo: TipoSegmento
  },
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('codigo_segmentos')
    .update({
      clave:    input.clave.toUpperCase().trim(),
      etiqueta: input.etiqueta.trim(),
      longitud: input.longitud,
      tipo:     input.tipo,
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return {}
}

export async function deleteSegmento(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('codigo_segmentos')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return {}
}

export async function finalizarSchema(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('codigo_schemas')
    .update({ finalizado: true })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return {}
}

export async function swapSegmentosOrden(segAId: string, segBId: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { data: segs } = await supabase
    .from('codigo_segmentos')
    .select('id, orden')
    .in('id', [segAId, segBId])

  if (!segs || segs.length !== 2) return { error: 'Segmentos no encontrados' }

  const a = segs.find((s: { id: string; orden: number }) => s.id === segAId) as { id: string; orden: number }
  const b = segs.find((s: { id: string; orden: number }) => s.id === segBId) as { id: string; orden: number }

  const tempOrden = Math.max(a.orden, b.orden) + 9999

  await supabase.from('codigo_segmentos').update({ orden: tempOrden }).eq('id', segAId)
  await supabase.from('codigo_segmentos').update({ orden: a.orden }).eq('id', segBId)
  await supabase.from('codigo_segmentos').update({ orden: b.orden }).eq('id', segAId)

  revalidatePath('/configuracion')
  return {}
}
