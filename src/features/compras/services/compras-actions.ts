'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  OrdenCompra,
  OrdenCompraConDetalle,
  OCListItem,
  EstadoDocumental,
  EstadoGreige,
} from '@/features/compras/types'

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
    .select('*, terceros!proveedor_id(nombre), rollos(id)')
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
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (recepcionError || !recepcion) return { error: recepcionError?.message || 'Error creando recepción' }

  // 6. Buscar bodega principal
  const { data: bodega } = await supabase
    .from('bodegas')
    .select('id')
    .eq('tipo', 'principal')
    .limit(1)
    .single() as { data: { id: string } | null }

  if (!bodega) return { error: 'Bodega principal no encontrada' }

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
  let materialesData = null

  if (oc.tipo === 'materia_prima') {
    const { data: material } = await supabase
      .from('materiales')
      .select('unidad')
      .eq('id', input.material_id)
      .single() as { data: { unidad: string } | null }
    if (!material) return { error: 'Material no encontrado' }
    unidad = material.unidad

    // Calcular CPP (saldo_ponderado)
    const { data: kardexAnterior } = await supabase
      .from('kardex')
      .select('cantidad, saldo_ponderado')
      .eq('material_id', input.material_id)
      .eq('bodega_id', bodega.id)
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
      bodega_id: bodega.id,
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
      notas: `Recepción OC - ${input.notas ? input.notas.substring(0, 50) : ''}`,
    }) as { error: { message: string } | null }

  if (kardexError) return { error: `Error en kardex: ${kardexError.message}` }

  // 10. Actualizar saldo del material (si es MP)
  if (oc.tipo === 'materia_prima' && input.material_id) {
    const { error: saldoError } = await supabase
      .rpc('actualizar_saldo_material', {
        p_material_id: input.material_id,
        p_cantidad: input.cantidad_recibida,
      })

    if (saldoError) {
      console.error('Error actualizando saldo:', saldoError)
      // No bloqueamos si hay error en el saldo, continuamos
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

  // 1. Obtener datos de la recepción
  const { data: recepcion } = await supabase
    .from('recepcion_oc')
    .select('id, oc_id, material_id, producto_id, talla, cantidad_recibida, precio_unitario, estado')
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

  // 3. Obtener bodega principal y tipo de movimiento
  const { data: bodega } = await supabase
    .from('bodegas')
    .select('id')
    .eq('tipo', 'principal')
    .limit(1)
    .single() as { data: { id: string } | null }

  if (!bodega) return { error: 'Bodega principal no encontrada' }

  const { data: tipoMov } = await supabase
    .from('kardex_tipos_movimiento')
    .select('id')
    .eq('codigo', 'ENTRADA_OC')
    .limit(1)
    .single() as { data: { id: string } | null }

  if (!tipoMov) return { error: 'Tipo de movimiento ENTRADA_OC no encontrado' }

  // 4. Crear movimiento kardex inverso (reversión)
  const { error: kardexError } = await supabase
    .from('kardex')
    .insert({
      material_id: recepcion.material_id ?? null,
      producto_id: recepcion.producto_id ?? null,
      bodega_id: bodega.id,
      tipo_movimiento_id: tipoMov.id,
      documento_tipo: 'recepcion_oc',
      documento_id: recepcion.id,
      cantidad: -recepcion.cantidad_recibida, // cantidad negativa para revertir
      unidad: recepcion.material_id ? 'kg' : 'unidades', // simplificado
      costo_unitario: recepcion.precio_unitario ?? 0,
      costo_total: -(recepcion.cantidad_recibida * (recepcion.precio_unitario ?? 0)),
      saldo_ponderado: 0,
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
      producto_id: string
      talla: string
      cantidad: number
    }>
  }>,
  usuarioId?: string
) {
  const supabase = db(await createClient())
  const { crearBin, getContenidoBin } = await import('@/features/bines/services/bines-actions')

  const resultados: Array<{ binId: string; contenido: any }> = []

  for (const recepcion of recepciones) {
    const bin = await crearBin(recepcion.bodegaId, 'interno')

    const inserts = recepcion.items.map(item => ({
      oc_id: recepcion.ocId,
      producto_id: item.producto_id,
      talla: item.talla,
      cantidad_recibida: item.cantidad,
      bin_id: bin.id,
      recibido_por: usuarioId,
      fecha_recepcion: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('recepcion_oc')
      .insert(inserts)

    if (error) {
      throw new Error(`Error creando recepción: ${error.message}`)
    }

    const contenido = await getContenidoBin(bin.id)
    if (contenido) {
      resultados.push({
        binId: bin.id,
        contenido,
      })
    }
  }

  return resultados
}

/**
 * Obtener bodega principal (Asimetrico Central)
 */
export async function getBodegaPrincipal() {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('bodegas')
    .select('id, nombre')
    .eq('tipo', 'principal')
    .limit(1)
    .single() as { data: any }

  return data
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
