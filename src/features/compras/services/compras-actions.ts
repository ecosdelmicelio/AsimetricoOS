'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { getBodegaDefault } from '@/shared/lib/bodega-default'
import type {
  OrdenCompra,
  OrdenCompraConDetalle,
  OCListItem,
  EstadoDocumental,
  EstadoGreige,
} from '@/features/compras/types'
import type { Bodega } from '@/features/wms/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

function calcFechaEntrega(fechaOC: string, greige: EstadoGreige): string {
  const d = new Date(fechaOC)
  d.setDate(d.getDate() + (greige === 'en_crudo' ? 15 : 30))
  return d.toISOString().split('T')[0]
}

export async function getOrdenesCompra(): Promise<OCListItem[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('ordenes_compra')
    .select(`
      *, 
      terceros!proveedor_id(nombre), 
      rollos(id),
      ordenes_venta(codigo),
      oc_detalle(cantidad, precio_pactado, productos(referencia, nombre)),
      oc_detalle_mp(cantidad, precio_unitario, materiales(codigo, nombre))
    `)
    .order('created_at', { ascending: false }) as { data: OCListItem[] | null }
  return data ?? []
}

export async function getOrdenCompraById(id: string): Promise<OrdenCompraConDetalle | null> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('ordenes_compra')
    .select(`
      *,
      terceros!proveedor_id(nombre),
      rollos(*, materiales(codigo, nombre, unidad)),
      oc_detalle(*, productos(referencia, nombre, color, precio_base, tallas)),
      oc_detalle_mp(*, materiales(codigo, nombre, unidad))
    `)
    .eq('id', id)
    .single() as { data: OrdenCompraConDetalle | null }
  return data
}

export async function createOrdenCompra(input: {
  proveedor_id?: string
  tipo?: 'materia_prima' | 'producto_terminado'
  estado_greige: EstadoGreige
  estado_documental: EstadoDocumental
  fecha_oc: string
  notas?: string
}): Promise<{ data: OrdenCompra | null; error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()

  const tipo = input.tipo || 'materia_prima'
  const fecha_entrega_est = calcFechaEntrega(input.fecha_oc, input.estado_greige)

  const { data, error } = await supabase
    .from('ordenes_compra')
    .insert({
      proveedor_id:       input.proveedor_id || null,
      tipo:               tipo,
      estado_greige:      input.estado_greige,
      estado_documental:  input.estado_documental,
      fecha_oc:           input.fecha_oc,
      fecha_entrega_est,
      notas:              input.notas?.trim() || null,
      creado_por:         user?.id ?? null,
    })
    .select()
    .single() as { data: OrdenCompra | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }
  revalidatePath('/compras')
  return { data }
}

export async function updateEstadoDocumental(
  id: string,
  estado_documental: EstadoDocumental,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('ordenes_compra')
    .update({ estado_documental })
    .eq('id', id) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath('/compras')
  revalidatePath(`/compras/${id}`)
  return {}
}

export async function addRollo(input: {
  oc_id: string
  material_id: string
  peso_real_kg: number
  rendimiento_real?: number
  notas?: string
}): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('rollos')
    .insert({
      oc_id:            input.oc_id,
      material_id:      input.material_id,
      peso_real_kg:     input.peso_real_kg,
      rendimiento_real: input.rendimiento_real ?? null,
      saldo_kg:         input.peso_real_kg,   // starts full
      notas:            input.notas?.trim() || null,
    }) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath(`/compras/${input.oc_id}`)
  return {}
}

export async function deleteRollo(id: string, oc_id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('rollos')
    .delete()
    .eq('id', id) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath(`/compras/${oc_id}`)
  return {}
}

export async function getProveedores() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('terceros')
    .select('id, nombre')
    .overlaps('tipos', ['proveedor_mp'])
    .eq('estado', 'activo')
    .order('nombre')
  return (data ?? []) as { id: string; nombre: string }[]
}

export async function getMateriales() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('materiales')
    .select('id, codigo, nombre, unidad, es_tela')
    .eq('activo', true)
    .order('nombre')
  return (data ?? []) as { id: string; codigo: string; nombre: string; unidad: string; es_tela: boolean }[]
}

export async function createOCPrendas(input: {
  proveedor_id: string
  fecha_oc: string
  fecha_entrega_est?: string
  notas?: string
  lineas: { producto_id: string; talla: string; cantidad: number; precio_pactado: number }[]
}): Promise<{ data: { id: string } | null; error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()

  // Create the OC record
  const { data: oc, error: ocError } = await supabase
    .from('ordenes_compra')
    .insert({
      proveedor_id: input.proveedor_id,
      estado_greige: 'otros',
      estado_documental: 'en_proceso',
      fecha_oc: input.fecha_oc,
      fecha_entrega_est: input.fecha_entrega_est || input.fecha_oc,
      notas: input.notas?.trim() || null,
      creado_por: user?.id ?? null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (ocError || !oc) return { data: null, error: ocError?.message || 'Error creating OC' }

  // Insert detail lines
  const lineasInsert = input.lineas.map(l => ({
    oc_id: oc.id,
    producto_id: l.producto_id,
    talla: l.talla,
    cantidad: l.cantidad,
    precio_pactado: l.precio_pactado,
  }))

  const { error: lineasError } = await supabase
    .from('oc_detalle')
    .insert(lineasInsert) as { error: { message: string } | null }

  if (lineasError) return { data: null, error: lineasError.message }

  revalidatePath('/compras')
  return { data: { id: oc.id } }
}

export async function createRecepcionOC(input: {
  oc_id: string
  material_id?: string
  producto_id?: string
  talla?: string
  cantidad_recibida: number
  cantidad_esperada?: number
  precio_unitario?: number
  notas?: string
}): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Obtener OC para conocer tipo
  const { data: oc } = await supabase
    .from('ordenes_compra')
    .select('id, tipo')
    .eq('id', input.oc_id)
    .single() as { data: { id: string; tipo: string } | null }

  if (!oc) return { error: 'Orden de compra no encontrada' }

  // 2. Validar que material/producto corresponda al tipo de OC
  if (oc.tipo === 'materia_prima' && !input.material_id) {
    return { error: 'OC de materia prima requiere material_id' }
  }
  if (oc.tipo === 'producto_terminado' && (!input.producto_id || !input.talla)) {
    return { error: 'OC de producto terminado requiere producto_id y talla' }
  }

  // 3. Determinar precio unitario (usa input proporcionado)
  const precioUnitario = input.precio_unitario ?? 0
  const costoTotal = input.cantidad_recibida * precioUnitario

  // 4. Verificar si requiere inspección de calidad
  let requiresInspection = false
  if (input.material_id) {
    const { data: mat } = await supabase.from('materiales').select('requiere_inspeccion').eq('id', input.material_id).single()
    requiresInspection = !!mat?.requiere_inspeccion
  } else if (input.producto_id) {
    const { data: prod } = await supabase.from('productos').select('requiere_inspeccion').eq('id', input.producto_id).single()
    requiresInspection = !!prod?.requiere_inspeccion
  }

  // 5. Crear recepcion_oc (polimórfica)
  const { data: recepcion, error: recepcionError } = await supabase
    .from('recepcion_oc')
    .insert({
      oc_id: input.oc_id,
      material_id: input.material_id ?? null,
      producto_id: input.producto_id ?? null,
      talla: input.talla ?? null,
      cantidad_recibida: input.cantidad_recibida,
      cantidad_esperada: input.cantidad_esperada ?? null,
      precio_unitario: precioUnitario,
      notas: input.notas?.trim() || null,
      recibido_por: user?.id ?? null,
      estado: requiresInspection ? 'en_cuarentena' : 'recibido',
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (recepcionError || !recepcion) return { error: recepcionError?.message || 'Error creando recepción' }

  // 6. Obtener bodega (Cuarentena si requiere inspección, sino Default)
  let targetBodegaId: string
  if (requiresInspection) {
    const { data: bCuarentena } = await supabase
      .from('bodegas')
      .select('id')
      .eq('codigo', 'BOD-CUARENTENA')
      .single() as { data: { id: string } | null }
    if (!bCuarentena) return { error: 'Bodega de Cuarentena no configurada. Por favor crear bodega con código BOD-CUARENTENA.' }
    targetBodegaId = bCuarentena.id
  } else {
    try {
      const bDefault = await getBodegaDefault()
      targetBodegaId = bDefault.id
    } catch (e) {
      return { error: `Error obteniendo bodega default: ${(e as Error).message}` }
    }
  }

  // 7. Buscar tipo de movimiento ENTRADA_OC
  const { data: tipoMov } = await supabase
    .from('kardex_tipos_movimiento')
    .select('id')
    .eq('codigo', 'ENTRADA_OC')
    .limit(1)
    .single() as { data: { id: string } | null }

  if (!tipoMov) return { error: 'Tipo de movimiento ENTRADA_OC no encontrado' }

  // 8. Obtener información para calcular CPP y unidad
  let unidad = 'unidades'
  let saldoPonderado = precioUnitario

  if (oc.tipo === 'materia_prima') {
    const { data: material } = await supabase
      .from('materiales')
      .select('unidad')
      .eq('id', input.material_id)
      .single() as { data: { unidad: string } | null }
    if (!material) return { error: 'Material no encontrado' }
    unidad = material.unidad

    // Calcular CPP (saldo_ponderado) en la bodega destino
    const { data: kardexAnterior } = await supabase
      .from('kardex')
      .select('cantidad, saldo_ponderado')
      .eq('material_id', input.material_id)
      .eq('bodega_id', targetBodegaId)
      .order('fecha_movimiento', { ascending: false })
      .limit(1)
      .single() as { data: { cantidad: number; saldo_ponderado: number } | null }

    if (kardexAnterior && kardexAnterior.saldo_ponderado) {
      const saldoAnterior = kardexAnterior.cantidad
      const precioAnterior = kardexAnterior.saldo_ponderado
      saldoPonderado = (saldoAnterior * precioAnterior + input.cantidad_recibida * precioUnitario) / (saldoAnterior + input.cantidad_recibida)
    } else {
      saldoPonderado = precioUnitario
    }
  }

  // 9. Insertar movimiento kardex
  const { error: kardexError } = await supabase
    .from('kardex')
    .insert({
      material_id: input.material_id ?? null,
      producto_id: input.producto_id ?? null,
      bodega_id: targetBodegaId,
      tipo_movimiento_id: tipoMov.id,
      documento_tipo: 'recepcion_oc',
      documento_id: recepcion.id,
      cantidad: input.cantidad_recibida,
      unidad,
      costo_unitario: precioUnitario,
      costo_total: costoTotal,
      saldo_ponderado: saldoPonderado,
      talla: input.talla ?? null,
      fecha_movimiento: new Date().toISOString(),
      registrado_por: user?.id ?? null,
      notas: `Recepción OC - ${requiresInspection ? '(CUARENTENA) ' : ''}${input.notas ? input.notas.substring(0, 50) : ''}`,
    }) as { error: { message: string } | null }

  if (kardexError) return { error: `Error en kardex: ${kardexError.message}` }

  // 10. Actualizar saldo del material (si es MP y NO está en cuarentena)
  // Nota: Si está en cuarentena, el saldo disponible real no debería aumentar aún
  if (!requiresInspection && oc.tipo === 'materia_prima' && input.material_id) {
    const { error: saldoError } = await supabase
      .rpc('actualizar_saldo_material', {
        p_material_id: input.material_id,
        p_cantidad: input.cantidad_recibida,
      })

    if (saldoError) {
      console.error('Error actualizando saldo:', saldoError)
    }
  }

  revalidatePath(`/compras/${input.oc_id}`)
  return {}
}

export async function getRecepcionesByOC(ocId: string) {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('recepcion_oc')
    .select('*, materiales(codigo, nombre, unidad), productos(referencia, nombre), profiles(full_name)')
    .eq('oc_id', ocId)
    .order('fecha_recepcion', { ascending: false }) as {
      data: Array<{
        id: string
        oc_id: string
        material_id: string | null
        producto_id: string | null
        talla: string | null
        cantidad_recibida: number
        cantidad_esperada: number | null
        precio_unitario: number | null
        notas: string | null
        recibido_por: string | null
        fecha_recepcion: string
        estado: string
        materiales: { codigo: string; nombre: string; unidad: string } | null
        productos: { referencia: string; nombre: string } | null
        profiles: { full_name: string } | null
      }> | null
    }
  return data ?? []
}

export async function revertirRecepcionOC(recepcionId: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Obtener datos de la recepción (ahora incluyendo bin_id)
  const { data: recepcion } = await supabase
    .from('recepcion_oc')
    .select('id, oc_id, material_id, producto_id, talla, cantidad_recibida, precio_unitario, estado, bin_id')
    .eq('id', recepcionId)
    .single() as { data: any | null }

  if (!recepcion) return { error: 'Recepción no encontrada' }
  if (recepcion.estado === 'revertida') return { error: 'Esta recepción ya ha sido revertida' }

  // 2. Marcar recepción como revertida
  const { error: updateError } = await supabase
    .from('recepcion_oc')
    .update({ estado: 'revertida' })
    .eq('id', recepcionId)

  if (updateError) return { error: `Error marcando recepción como revertida: ${updateError.message}` }

  // 3. Obtener tipo de movimiento
  const { data: tipoMov } = await supabase
    .from('kardex_tipos_movimiento')
    .select('id')
    .eq('codigo', 'ENTRADA_OC')
    .single() as { data: { id: string } | null }

  if (!tipoMov) return { error: 'Tipo de movimiento ENTRADA_OC no encontrado' }

  // 4. Buscar el movimiento kardex original para obtener bodega_id y bin_id reales
  const { data: kardexOriginal } = await supabase
    .from('kardex')
    .select('bodega_id, bin_id')
    .eq('documento_tipo', 'recepcion_oc')
    .eq('documento_id', recepcionId)
    .limit(1)
    .single() as { data: { bodega_id: string; bin_id: string | null } | null }

  let bodegaId = kardexOriginal?.bodega_id
  let binId = kardexOriginal?.bin_id ?? recepcion.bin_id ?? null

  // Si no encontramos bodega en kardex original, usar bodega default
  if (!bodegaId) {
    try {
      const bodega = (await getBodegaDefault()) as Bodega
      bodegaId = bodega.id
    } catch (e) {
      return { error: `Error obteniendo bodega default: ${(e as Error).message}` }
    }
  }

  // 5. Crear movimiento kardex inverso (reversión)
  const { error: kardexError } = await supabase
    .from('kardex')
    .insert({
      material_id: recepcion.material_id ?? null,
      producto_id: recepcion.producto_id ?? null,
      bodega_id: bodegaId,
      tipo_movimiento_id: tipoMov.id,
      documento_tipo: 'recepcion_oc',
      documento_id: recepcion.id,
      cantidad: -recepcion.cantidad_recibida,
      unidad: recepcion.material_id ? 'kg' : 'unidades',
      costo_unitario: recepcion.precio_unitario ?? 0,
      costo_total: -(recepcion.cantidad_recibida * (recepcion.precio_unitario ?? 0)),
      saldo_ponderado: 0,
      bin_id: binId,
      talla: recepcion.talla ?? null,
      fecha_movimiento: new Date().toISOString(),
      registrado_por: user?.id ?? null,
      notas: `Reversión de recepción ${recepcionId}`,
    }) as { error: { message: string } | null }

  if (kardexError) return { error: `Error creando movimiento de reversión: ${kardexError.message}` }

  revalidatePath(`/compras/${recepcion.oc_id}`)
  return {}
}

/**
 * Crear recepción OC con múltiples bins
 */
export async function crearRecepcionesOCConBins(
  recepciones: Array<{
    ocId: string
    bodegaId: string
    items: Array<{
      producto_id?: string
      material_id?: string
      talla: string
      cantidad: number
      precio_unitario?: number
      bin_id?: string
    }>
  }>,
  usuarioId?: string
) {
  const supabase = db(await createClient())
  const { crearBin, getContenidoBin } = await import('@/features/bines/services/bines-actions')
  const { data: { user } } = await supabase.auth.getUser()

  // Obtener tipo de movimiento ENTRADA_OC
  const { data: tipoMov } = await supabase
    .from('kardex_tipos_movimiento')
    .select('id')
    .eq('codigo', 'ENTRADA_OC')
    .single() as { data: { id: string } | null }

  if (!tipoMov) {
    throw new Error('Tipo de movimiento ENTRADA_OC no encontrado')
  }

  const resultados: Array<{ binId: string; contenido: any }> = []

  for (const recepcion of recepciones) {
    // 0. Verificar si algún ítem requiere inspección
    let batchRequiresInspection = false
    for (const item of recepcion.items) {
      if (item.material_id) {
        const { data: mat } = await supabase.from('materiales').select('requiere_inspeccion').eq('id', item.material_id).single()
        if (mat?.requiere_inspeccion) { batchRequiresInspection = true; break; }
      } else if (item.producto_id) {
        const { data: prod } = await supabase.from('productos').select('requiere_inspeccion').eq('id', item.producto_id).single()
        if (prod?.requiere_inspeccion) { batchRequiresInspection = true; break; }
      }
    }

    let targetBodegaId = recepcion.bodegaId
    if (batchRequiresInspection) {
      const { data: bCuarentena } = await supabase.from('bodegas').select('id').eq('codigo', 'BOD-CUARENTENA').single()
      if (bCuarentena) targetBodegaId = bCuarentena.id
    }

    // Generar el Auto-Lote Encriptado (Basado en la OC y fecha de recepción)
    const { data: ocInfo } = await supabase.from('ordenes_compra').select('codigo').eq('id', recepcion.ocId).single()
    const baseCode = ocInfo ? ocInfo.codigo.substring(0, 5) : 'OCXXX'
    const today = new Date()
    const cryptoHash = Math.random().toString(36).substring(2, 5).toUpperCase()
    const loteInterno = `${baseCode}-${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}-${cryptoHash}`

    // Si la recepción viene con un bin_id global o en el primer item, lo usamos
    const firstBinId = recepcion.items[0]?.bin_id
    let commonBin: any = null
    
    if (!firstBinId) {
      commonBin = await crearBin(targetBodegaId, undefined, 'interno', false)
    }

    const inserts = recepcion.items.map(item => ({
      oc_id: recepcion.ocId,
      producto_id: item.producto_id || null,
      material_id: item.material_id || null,
      talla: item.talla,
      cantidad_recibida: item.cantidad,
      precio_unitario: item.precio_unitario ?? 0,
      bin_id: item.bin_id || commonBin?.id,
      recibido_por: usuarioId,
      fecha_recepcion: today.toISOString(),
      lote_interno: loteInterno,
      lote_proveedor: (item as any).lote_proveedor || null,
      estado: batchRequiresInspection ? 'en_cuarentena' : 'recibido',
    }))

    const { data: recepciones_creadas, error } = await supabase
      .from('recepcion_oc')
      .insert(inserts)
      .select('id, producto_id, material_id, talla, cantidad_recibida, precio_unitario, lote_interno, lote_proveedor') as {
        data: Array<{ id: string; producto_id: string | null; material_id: string | null; talla: string; cantidad_recibida: number; precio_unitario: number, lote_interno?: string, lote_proveedor?: string }> | null
        error: { message: string } | null
      }

    if (error || !recepciones_creadas) {
      throw new Error(`Error creando recepción: ${error?.message || 'Sin datos'}`)
    }

    const selectedBinId = inserts[0].bin_id
    
    // Generar kardex ENTRADA_OC persistiendo el rastreo del Lote
    const movimientosKardex = recepciones_creadas.map(rec => ({
      producto_id: rec.producto_id || null,
      material_id: (rec as any).material_id || null,
      bodega_id: targetBodegaId,
      tipo_movimiento_id: tipoMov.id,
      documento_tipo: 'recepcion_oc',
      documento_id: rec.id,
      cantidad: rec.cantidad_recibida,
      unidad: 'unidades',
      costo_unitario: rec.precio_unitario ?? 0,
      costo_total: (rec.cantidad_recibida * (rec.precio_unitario ?? 0)),
      lote_interno: rec.lote_interno,
      saldo_ponderado: rec.precio_unitario ?? 0,
      bin_id: selectedBinId,
      talla: rec.talla,
      fecha_movimiento: new Date().toISOString(),
      registrado_por: user?.id ?? null,
      notas: `Recepción OC - ${batchRequiresInspection ? '(CUARENTENA) ' : ''}Bin ${selectedBinId}`,
    }))

    const { error: kardexError } = await supabase
      .from('kardex')
      .insert(movimientosKardex) as { error: { message: string } | null }

    if (kardexError) {
      throw new Error(`Error creando movimientos kardex: ${kardexError.message}`)
    }

    const contenido = await getContenidoBin(selectedBinId || '')
    if (contenido) {
      resultados.push({
        binId: selectedBinId || '',
        contenido,
      })
    }
    
    // Auto-check status inteligente basado en cantidades pactadas vs recibidas
    await autoCheckOCStatus(recepcion.ocId)
  }

  revalidatePath('/compras')
  revalidatePath('/wms')
  return resultados
}

export async function autoCheckOCStatus(ocId: string): Promise<void> {
  const supabase = db(await createClient())
  
  // 1. Obtener cantidades esperadas
  const { data: pt } = await supabase.from('oc_detalle').select('cantidad').eq('oc_id', ocId)
  const { data: mp } = await supabase.from('oc_detalle_mp').select('cantidad').eq('oc_id', ocId)
  
  const expectedPT = (pt || []).reduce((sum: number, row: any) => sum + Number(row.cantidad), 0)
  const expectedMP = (mp || []).reduce((sum: number, row: any) => sum + Number(row.cantidad), 0)
  const totalExpected = expectedPT + expectedMP

  // 2. Obtener cantidades recibidas (excluyendo revertidas)
  const { data: receivedData } = await supabase
    .from('recepcion_oc')
    .select('cantidad_recibida')
    .eq('oc_id', ocId)
    .neq('estado', 'revertida')
    
  const totalReceived = (receivedData || []).reduce((sum: number, row: any) => sum + Number(row.cantidad_recibida), 0)

  // 3. Evaluar y actualizar
  const newStatus = totalReceived >= totalExpected ? 'completada' : 'en_proceso'
  
  await supabase
    .from('ordenes_compra')
    .update({ estado_documental: newStatus })
    .eq('id', ocId)
}

export async function updateOCStatus(id: string, estado: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('ordenes_compra')
    .update({ estado_documental: estado })
    .eq('id', id)
  
  if (error) return { error: error.message }
  revalidatePath('/wms')
  revalidatePath('/compras')
  return {}
}

/**
 * Obtener bodega principal (usa getBodegaDefault)
 * @deprecated Use getBodegaDefault from @/shared/lib/bodega-default instead
 */
export async function getBodegaPrincipal(): Promise<{ id: string; nombre: string }> {
  const bodega: Bodega = await getBodegaDefault()
  return { id: bodega.id, nombre: bodega.nombre }
}

/**
 * Insertar líneas de detalle para OC de PT
 */
export async function insertOCDetalles(ocId: string, lineas: any[]) {
  const supabase = db(await createClient())

  const inserts = lineas.map(linea => ({
    oc_id: ocId,
    producto_id: linea.producto_id,
    talla: linea.talla,
    cantidad: linea.cantidad,
    precio_pactado: linea.precio_pactado || 0,
  }))

  const { error } = await supabase
    .from('oc_detalle')
    .insert(inserts)

  if (error) {
    console.error('Error inserting OC details:', error)
    throw new Error(`Error agregando líneas: ${error.message}`)
  }
}

/**
 * Insertar líneas de detalle para OC de Materia Prima
 */
export async function insertOCDetallesMp(ocId: string, lineas: any[]) {
  const supabase = db(await createClient())

  const inserts = lineas.map(linea => ({
    oc_id: ocId,
    material_id: linea.material_id,
    cantidad: linea.cantidad,
    precio_unitario: linea.precio_unitario || 0,
  }))

  const { error } = await supabase
    .from('oc_detalle_mp')
    .insert(inserts)

  if (error) {
    console.error('Error inserting OC MP details:', error)
    throw new Error(`Error agregando líneas: ${error.message}`)
  }
}
