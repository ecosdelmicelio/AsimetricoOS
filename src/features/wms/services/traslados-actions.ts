'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Traslado } from '@/features/wms/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

/**
 * Generar código único para traslado (TRS-YYYYMMDD-XXXX)
 */
async function generarCodigoTraslado(): Promise<string> {
  const fecha = new Date()
  const yyyymmdd = fecha.toISOString().split('T')[0].replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  return `TRS-${yyyymmdd}-${random}`
}

export async function crearTraslado(input: {
  bodega_origen_id: string
  bodega_destino_id: string
  items: Array<{
    producto_id?: string
    material_id?: string
    bin_id?: string
    talla?: string
    cantidad: number
    unidad: string
  }>
  notas?: string
}): Promise<{ data: Traslado | null; error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Validar bodegas
  if (input.bodega_origen_id === input.bodega_destino_id) {
    return { data: null, error: 'Bodega origen y destino no pueden ser iguales' }
  }

  const [{ data: bodegaOrigen }, { data: bodegaDestino }] = await Promise.all([
    supabase
      .from('bodegas')
      .select('id')
      .eq('id', input.bodega_origen_id)
      .single(),
    supabase
      .from('bodegas')
      .select('id')
      .eq('id', input.bodega_destino_id)
      .single(),
  ])

  if (!bodegaOrigen || !bodegaDestino) {
    return { data: null, error: 'Una o ambas bodegas no existen' }
  }

  // 2. Crear registro de traslado
  const codigo = await generarCodigoTraslado()

  const { data: traslado, error: trasladoError } = await supabase
    .from('traslados')
    .insert({
      codigo,
      bodega_origen: input.bodega_origen_id,
      bodega_destino: input.bodega_destino_id,
      estado: 'pendiente',
      notas: input.notas?.trim() || null,
      registrado_por: user?.id ?? null,
      fecha_traslado: new Date().toISOString(),
    })
    .select('*')
    .single() as { data: Traslado | null; error: { message: string } | null }

  if (trasladoError || !traslado) {
    return { data: null, error: trasladoError?.message || 'Error creando traslado' }
  }

  // 3. Insertar traslado_items
  const itemsInsert = input.items.map(item => ({
    traslado_id: traslado.id,
    producto_id: item.producto_id || null,
    material_id: item.material_id || null,
    bin_id: item.bin_id || null,
    talla: item.talla || null,
    cantidad: item.cantidad,
    unidad: item.unidad,
    costo_unitario: null,
  }))

  const { error: itemsError } = await supabase
    .from('traslado_items')
    .insert(itemsInsert) as { error: { message: string } | null }

  if (itemsError) {
    // Rollback del traslado
    await supabase.from('traslados').delete().eq('id', traslado.id)
    return { data: null, error: `Error insertando items: ${itemsError.message}` }
  }

  revalidatePath('/wms')
  return { data: traslado }
}

export async function confirmarTraslado(
  trasladoId: string,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Obtener traslado con items
  const { data: traslado } = await supabase
    .from('traslados')
    .select('*, traslado_items(*)')
    .eq('id', trasladoId)
    .single() as any

  if (!traslado) return { error: 'Traslado no encontrado' }
  if (traslado.estado !== 'pendiente') {
    return { error: 'Solo se pueden confirmar traslados pendientes' }
  }

  // 2. Obtener tipos de movimiento
  const [{ data: tipoSalida }, { data: tipoEntrada }] = await Promise.all([
    supabase
      .from('kardex_tipos_movimiento')
      .select('id')
      .eq('codigo', 'SALIDA_TRASLADO')
      .single(),
    supabase
      .from('kardex_tipos_movimiento')
      .select('id')
      .eq('codigo', 'ENTRADA_TRASLADO')
      .single(),
  ])

  if (!tipoSalida || !tipoEntrada) {
    return { error: 'Tipos de movimiento SALIDA_TRASLADO o ENTRADA_TRASLADO no encontrados' }
  }

  // 3. Generar movimientos kardex (SALIDA en origen, ENTRADA en destino)
  const movimientos = traslado.traslado_items.flatMap((item: any) => [
    {
      producto_id: item.producto_id || null,
      material_id: item.material_id || null,
      bodega_id: traslado.bodega_origen,
      tipo_movimiento_id: tipoSalida.id,
      documento_tipo: 'traslado',
      documento_id: traslado.id,
      cantidad: -item.cantidad, // negativa para salida
      unidad: item.unidad,
      costo_unitario: item.costo_unitario || 0,
      costo_total: -(item.cantidad * (item.costo_unitario || 0)),
      saldo_ponderado: 0,
      bin_id: item.bin_id || null,
      talla: item.talla || null,
      fecha_movimiento: new Date().toISOString(),
      registrado_por: user?.id ?? null,
      notas: `Traslado ${traslado.codigo} - Salida`,
    },
    {
      producto_id: item.producto_id || null,
      material_id: item.material_id || null,
      bodega_id: traslado.bodega_destino,
      tipo_movimiento_id: tipoEntrada.id,
      documento_tipo: 'traslado',
      documento_id: traslado.id,
      cantidad: item.cantidad, // positiva para entrada
      unidad: item.unidad,
      costo_unitario: item.costo_unitario || 0,
      costo_total: item.cantidad * (item.costo_unitario || 0),
      saldo_ponderado: 0,
      bin_id: null, // No asignar bin en destino automáticamente
      talla: item.talla || null,
      fecha_movimiento: new Date().toISOString(),
      registrado_por: user?.id ?? null,
      notas: `Traslado ${traslado.codigo} - Entrada`,
    },
  ])

  const { error: kardexError } = await supabase
    .from('kardex')
    .insert(movimientos) as { error: { message: string } | null }

  if (kardexError) {
    return { error: `Error creando movimientos kardex: ${kardexError.message}` }
  }

  // 4. Actualizar estado a completado
  const { error: updateError } = await supabase
    .from('traslados')
    .update({ estado: 'completado' })
    .eq('id', trasladoId) as { error: { message: string } | null }

  if (updateError) {
    return { error: `Error actualizando traslado: ${updateError.message}` }
  }

  revalidatePath('/wms')
  return {}
}

export async function getTraslados(bodegaId?: string): Promise<Traslado[]> {
  const supabase = db(await createClient())

  let query = supabase
    .from('traslados')
    .select('*')
    .order('created_at', { ascending: false })

  if (bodegaId) {
    // Traslados que involucren esta bodega (origen o destino)
    query = supabase
      .from('traslados')
      .select('*')
      .or(
        `bodega_origen.eq.${bodegaId},bodega_destino.eq.${bodegaId}`,
      )
      .order('created_at', { ascending: false })
  }

  const { data } = await query as { data: Traslado[] | null }

  return data ?? []
}

export async function cancelarTraslado(trasladoId: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('traslados')
    .update({ estado: 'cancelado' })
    .eq('id', trasladoId)
    .eq('estado', 'pendiente') as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/wms')
  return {}
}
