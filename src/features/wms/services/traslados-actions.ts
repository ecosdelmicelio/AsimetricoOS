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
  tipo: 'entre_bodegas' | 'bin_completo' | 'bin_a_bin'
  bodega_origen_id: string
  bodega_destino_id: string
  bin_origen_id?: string
  bin_destino_id?: string
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
  if (input.bodega_origen_id === input.bodega_destino_id && input.tipo === 'entre_bodegas') {
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

  // 2. Validar bins si aplica
  if (input.tipo !== 'entre_bodegas' && input.bin_origen_id) {
    const { data: binOrigen } = await supabase
      .from('bines')
      .select('bodega_id')
      .eq('id', input.bin_origen_id)
      .single() as any

    if (!binOrigen || binOrigen.bodega_id !== input.bodega_origen_id) {
      return { data: null, error: 'Bin origen no pertenece a bodega origen' }
    }
  }

  if (input.tipo === 'bin_a_bin' && input.bin_destino_id) {
    const { data: binDestino } = await supabase
      .from('bines')
      .select('bodega_id')
      .eq('id', input.bin_destino_id)
      .single() as any

    if (!binDestino || binDestino.bodega_id !== input.bodega_destino_id) {
      return { data: null, error: 'Bin destino no pertenece a bodega destino' }
    }
  }

  // 3. Crear registro de traslado
  const codigo = await generarCodigoTraslado()

  const { data: traslado, error: trasladoError } = await supabase
    .from('traslados')
    .insert({
      codigo,
      tipo: input.tipo,
      bodega_origen: input.bodega_origen_id,
      bodega_destino: input.bodega_destino_id,
      bin_origen_id: input.bin_origen_id || null,
      bin_destino_id: input.bin_destino_id || null,
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

  // 4. Insertar traslado_items (solo si no es bin_completo)
  if (input.tipo !== 'bin_completo' && input.items.length > 0) {
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
      await supabase.from('traslados').delete().eq('id', traslado.id)
      return { data: null, error: `Error insertando items: ${itemsError.message}` }
    }
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

  // 2. Obtener tipos de movimiento necesarios
  const tiposMovimiento = await Promise.all([
    supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'SALIDA_TRASLADO').single(),
    supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'ENTRADA_TRASLADO').single(),
    supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'TRASLADO_BIN_COMPLETO_SALIDA').single(),
    supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'REASIGNACION_BIN_SALIDA').single(),
    supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'REASIGNACION_BIN_ENTRADA').single(),
  ])

  const tipos = {
    salidaTraslado: tiposMovimiento[0].data?.id,
    entradaTraslado: tiposMovimiento[1].data?.id,
    trasladoBinCompletoSalida: tiposMovimiento[2].data?.id,
    reasignacionBinSalida: tiposMovimiento[3].data?.id,
    reasignacionBinEntrada: tiposMovimiento[4].data?.id,
  }

  let movimientos: any[] = []

  // 3. Generar movimientos kardex según tipo de traslado
  if (traslado.tipo === 'entre_bodegas') {
    // Entre Bodegas: SALIDA_TRASLADO + ENTRADA_TRASLADO
    if (!tipos.salidaTraslado || !tipos.entradaTraslado) {
      return { error: 'Tipos de movimiento SALIDA_TRASLADO o ENTRADA_TRASLADO no encontrados' }
    }

    movimientos = traslado.traslado_items.flatMap((item: any) => [
      {
        producto_id: item.producto_id || null,
        material_id: item.material_id || null,
        bodega_id: traslado.bodega_origen,
        tipo_movimiento_id: tipos.salidaTraslado,
        documento_tipo: 'traslado',
        documento_id: traslado.id,
        cantidad: -item.cantidad,
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
        tipo_movimiento_id: tipos.entradaTraslado,
        documento_tipo: 'traslado',
        documento_id: traslado.id,
        cantidad: item.cantidad,
        unidad: item.unidad,
        costo_unitario: item.costo_unitario || 0,
        costo_total: item.cantidad * (item.costo_unitario || 0),
        saldo_ponderado: 0,
        bin_id: null,
        talla: item.talla || null,
        fecha_movimiento: new Date().toISOString(),
        registrado_por: user?.id ?? null,
        notas: `Traslado ${traslado.codigo} - Entrada`,
      },
    ])
  } else if (traslado.tipo === 'bin_completo') {
    // Bin Completo: obtener todos los items del bin, generar movimientos y actualizar bodega_id del bin
    if (!tipos.trasladoBinCompletoSalida || !tipos.entradaTraslado) {
      return { error: 'Tipos de movimiento no encontrados para bin completo' }
    }

    const { data: itemsEnBin } = await supabase
      .from('kardex')
      .select('*')
      .eq('bin_id', traslado.bin_origen_id)
      .eq('bodega_id', traslado.bodega_origen) as any

    if (!itemsEnBin || itemsEnBin.length === 0) {
      return { error: 'El bin origen no contiene items' }
    }

    movimientos = itemsEnBin.flatMap((item: any) => [
      {
        producto_id: item.producto_id || null,
        material_id: item.material_id || null,
        bodega_id: traslado.bodega_origen,
        tipo_movimiento_id: tipos.trasladoBinCompletoSalida,
        documento_tipo: 'traslado',
        documento_id: traslado.id,
        cantidad: -item.cantidad,
        unidad: item.unidad,
        costo_unitario: item.costo_unitario || 0,
        costo_total: -(item.cantidad * (item.costo_unitario || 0)),
        saldo_ponderado: 0,
        bin_id: traslado.bin_origen_id,
        talla: item.talla || null,
        fecha_movimiento: new Date().toISOString(),
        registrado_por: user?.id ?? null,
        notas: `Traslado Bin Completo ${traslado.codigo} - Salida`,
      },
      {
        producto_id: item.producto_id || null,
        material_id: item.material_id || null,
        bodega_id: traslado.bodega_destino,
        tipo_movimiento_id: tipos.entradaTraslado,
        documento_tipo: 'traslado',
        documento_id: traslado.id,
        cantidad: item.cantidad,
        unidad: item.unidad,
        costo_unitario: item.costo_unitario || 0,
        costo_total: item.cantidad * (item.costo_unitario || 0),
        saldo_ponderado: 0,
        bin_id: traslado.bin_destino_id || null,
        talla: item.talla || null,
        fecha_movimiento: new Date().toISOString(),
        registrado_por: user?.id ?? null,
        notas: `Traslado Bin Completo ${traslado.codigo} - Entrada`,
      },
    ])

    // Actualizar bodega_id del bin
    const { error: binError } = await supabase
      .from('bines')
      .update({ bodega_id: traslado.bodega_destino })
      .eq('id', traslado.bin_origen_id) as any

    if (binError) {
      return { error: `Error actualizando bin: ${binError.message}` }
    }
  } else if (traslado.tipo === 'bin_a_bin') {
    // Bin a Bin: items específicos de traslado_items, REASIGNACION movimientos
    if (!tipos.reasignacionBinSalida || !tipos.reasignacionBinEntrada) {
      return { error: 'Tipos de movimiento REASIGNACION no encontrados' }
    }

    movimientos = traslado.traslado_items.flatMap((item: any) => [
      {
        producto_id: item.producto_id || null,
        material_id: item.material_id || null,
        bodega_id: traslado.bodega_origen,
        tipo_movimiento_id: tipos.reasignacionBinSalida,
        documento_tipo: 'traslado',
        documento_id: traslado.id,
        cantidad: -item.cantidad,
        unidad: item.unidad,
        costo_unitario: item.costo_unitario || 0,
        costo_total: -(item.cantidad * (item.costo_unitario || 0)),
        saldo_ponderado: 0,
        bin_id: traslado.bin_origen_id || null,
        talla: item.talla || null,
        fecha_movimiento: new Date().toISOString(),
        registrado_por: user?.id ?? null,
        notas: `Traslado Bin a Bin ${traslado.codigo} - Salida`,
      },
      {
        producto_id: item.producto_id || null,
        material_id: item.material_id || null,
        bodega_id: traslado.bodega_destino,
        tipo_movimiento_id: tipos.reasignacionBinEntrada,
        documento_tipo: 'traslado',
        documento_id: traslado.id,
        cantidad: item.cantidad,
        unidad: item.unidad,
        costo_unitario: item.costo_unitario || 0,
        costo_total: item.cantidad * (item.costo_unitario || 0),
        saldo_ponderado: 0,
        bin_id: traslado.bin_destino_id || null,
        talla: item.talla || null,
        fecha_movimiento: new Date().toISOString(),
        registrado_por: user?.id ?? null,
        notas: `Traslado Bin a Bin ${traslado.codigo} - Entrada`,
      },
    ])
  }

  if (movimientos.length === 0) {
    return { error: 'No se generaron movimientos kardex' }
  }

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
