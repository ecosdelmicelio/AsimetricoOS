'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export type EstadoDespacho = 'preparacion' | 'enviado' | 'entregado' | 'cancelado'
export type TipoEnvio = 'interno' | 'externo'

export interface CreateDespachoInput {
  ov_id: string
  transportadora?: string
  guia_seguimiento?: string
  tipo_envio: TipoEnvio
  notas?: string
  total_bultos: number
  lineas: {
    producto_id: string
    talla: string
    cantidad: number
    bin_id?: string
  }[]
}

/**
 * Crea un nuevo despacho y registra los movimientos en Kardex
 */
export async function createDespacho(input: CreateDespachoInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // 1. Crear cabecera de despacho
  const { data: despacho, error: despachoError } = await supabase
    .from('despachos')
    .insert({
      ov_id: input.ov_id,
      transportadora: input.transportadora,
      guia_seguimiento: input.guia_seguimiento,
      tipo_envio: input.tipo_envio,
      notas: input.notas,
      total_bultos: input.total_bultos,
      creado_por: user.id,
      estado: 'preparacion',
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (despachoError || !despacho) return { error: despachoError?.message || 'Error creando despacho' }

  // 2. Insertar líneas de detalle
  const lineasInsert = input.lineas.map(l => ({
    despacho_id: despacho.id,
    producto_id: l.producto_id,
    talla: l.talla,
    cantidad: l.cantidad,
    bin_id: l.bin_id || null,
  }))

  const { error: detallleError } = await supabase.from('despacho_detalle').insert(lineasInsert)
  if (detallleError) return { error: detallleError.message }

  // 3. Registrar en Kardex (SALIDA_VENTA)
  const { data: tipoMov } = await supabase
    .from('kardex_tipos_movimiento')
    .select('id')
    .eq('codigo', 'SALIDA_VENTA')
    .single() as { data: { id: string } | null }

  if (!tipoMov) return { error: 'Tipo de movimiento SALIDA_VENTA no configurado' }

  const { data: bodega } = await supabase
    .from('bodegas')
    .select('id')
    .or('tipo.eq.principal,nombre.ilike.%asimetrico central%')
    .limit(1)
    .maybeSingle() as { data: { id: string } | null }

  if (!bodega) return { error: 'Bodega principal no encontrada' }

  const moves = input.lineas.map(l => ({
    producto_id: l.producto_id,
    talla: l.talla,
    bodega_id: bodega.id,
    tipo_movimiento_id: tipoMov.id,
    documento_tipo: 'despacho',
    documento_id: despacho.id,
    ov_id: input.ov_id,
    bin_id: l.bin_id || null,
    cantidad: -l.cantidad, // Negativo para salida
    unidad: 'unidades',
    costo_unitario: 0, // Se puede poblar con CPP luego
    costo_total: 0,
    fecha_movimiento: new Date().toISOString(),
    registrado_por: user.id,
    notas: `Despacho OV - ${despacho.id.slice(0, 8)}`,
  }))

  const { error: kardexError } = await supabase.from('kardex').insert(moves)
  if (kardexError) return { error: `Error en Kardex: ${kardexError.message}` }

  // 4. Si se usaron Bines completos, marcarlos como 'despachados'
  const binIds = [...new Set(input.lineas.map(l => l.bin_id).filter(Boolean))] as string[]
  if (binIds.length > 0) {
    await supabase.from('bines').update({ estado: 'despachado' }).in('id', binIds)
  }

  revalidatePath(`/ordenes-venta/${input.ov_id}`)
  return { data: despacho.id }
}

/**
 * Obtiene los bines en bodega que contienen productos de esta OV
 */
export async function getBinesDisponiblesParaOV(ovId: string) {
  const supabase = db(await createClient())

  try {
    // 1. Obtener productos de la OV
    const { data: ovDetalle, error: ovError } = await supabase
      .from('ov_detalle')
      .select('producto_id, talla')
      .eq('ov_id', ovId)

    if (ovError || !ovDetalle || ovDetalle.length === 0) {
      console.warn('getBinesDisponiblesParaOV: No se encontraron detalles para la OV', ovId)
      return []
    }

    // 2. Traer TODO el stock que tenga un BIN asociado
    // Nota: Traemos los bines incluso si el estado no es exactamente 'en_bodega' para diagnosticar
    const { data: saldos, error: kError } = await supabase
      .from('kardex')
      .select(`
        bin_id,
        producto_id,
        talla,
        cantidad,
        bines ( id, codigo, estado, bodega_id )
      `)
      .not('bin_id', 'is', null)

    if (kError || !saldos) {
      console.error('getBinesDisponiblesParaOV: Error en Kardex', kError)
      return []
    }

    const binesMap = new Map<string, any>()

    for (const row of saldos) {
      // Validación de seguridad del BIN
      if (!row.bines) continue
      
      // Filtro de estado flexible (case insensitive y permitiendo bines sin estado explícito)
      const estadoBin = (row.bines.estado || '').toLowerCase()
      if (estadoBin !== 'en_bodega' && estadoBin !== '') continue

      // Verificar si el SKU (producto + talla) es parte de esta OV
      // Usamos trim() y toLowerCase() para evitar fallos por espacios o capitalización
      const skusOV = ovDetalle.map((d: any) => `${d.producto_id}:${d.talla?.toString().trim().toLowerCase()}`)
      const currentSku = `${row.producto_id}:${row.talla?.toString().trim().toLowerCase()}`
      
      if (!skusOV.includes(currentSku)) continue

      if (!binesMap.has(row.bin_id)) {
        binesMap.set(row.bin_id, {
          id: row.bin_id,
          codigo: row.bines.codigo,
          items: []
        })
      }

      const bin = binesMap.get(row.bin_id)
      const existing = bin.items.find((i: any) => i.producto_id === row.producto_id && i.talla === row.talla)

      if (existing) {
        existing.cantidad += row.cantidad
      } else {
        bin.items.push({
          producto_id: row.producto_id,
          talla: row.talla,
          cantidad: row.cantidad
        })
      }
    }

    // Retornar bines con saldo positivo real
    const binesResult = Array.from(binesMap.values()).filter(b => {
      const totalBin = b.items.reduce((sum: number, i: any) => sum + i.cantidad, 0)
      return totalBin > 0
    })

    console.log(`getBinesDisponiblesParaOV: Encontrados ${binesResult.length} bines para la OV ${ovId}`)
    return binesResult

  } catch (err) {
    console.error('getBinesDisponiblesParaOV: Error inesperado', err)
    return []
  }
}

/**
 * Obtiene el historial de despachos de una OV
 */
export async function getDespachosByOV(ovId: string) {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('despachos')
    .select('*, despacho_detalle(*, productos(referencia, nombre))')
    .eq('ov_id', ovId)
    .order('fecha_despacho', { ascending: false })
  return data ?? []
}

/**
 * Actualiza el estado de un despacho (preparacion -> enviado -> entregado)
 */
export async function updateEstadoDespacho(id: string, ovId: string, estado: EstadoDespacho) {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('despachos')
    .update({ estado })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/ordenes-venta/${ovId}`)
  return { data: true }
}

/**
 * Obtiene un despacho por ID con todo su detalle y datos de la OV/Cliente
 */
export async function getDespachoById(id: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('despachos')
    .select(`
      *,
      despacho_detalle (
        *,
        productos ( referencia, nombre, color ),
        bines ( codigo )
      ),
      ordenes_venta (
        codigo,
        notas,
        terceros!cliente_id ( nombre, nit, direccion )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('getDespachoById error:', error)
    return { error: error.message, data: null }
  }
  return { data }
}

export interface DespachoListItem {
  id: string
  fecha_despacho: string
  estado: EstadoDespacho
  tipo_envio: TipoEnvio
  transportadora: string | null
  guia_seguimiento: string | null
  total_bultos: number
  notas: string | null
  ov_id: string
  ov_codigo: string
  cliente_nombre: string
  cliente_nit: string | null
  total_unidades: number
  total_valor: number
  despacho_detalle?: any[]
}

/**
 * Obtiene todos los despachos con info de OV y cliente para el dashboard global
 */
export async function getDespachosList(filtros?: {
  estado?: EstadoDespacho
  desde?: string
  hasta?: string
}): Promise<DespachoListItem[]> {
  const supabase = db(await createClient())

  let query = supabase
    .from('despachos')
    .select(`
      id,
      fecha_despacho,
      estado,
      tipo_envio,
      transportadora,
      guia_seguimiento,
      total_bultos,
      notas,
      ov_id,
      despacho_detalle ( *, productos ( nombre, referencia, color ) ),
      ordenes_venta (
        codigo,
        terceros!cliente_id ( nombre, nit ),
        ov_detalle ( producto_id, talla, precio_pactado )
      )
    `)
    .order('fecha_despacho', { ascending: false })

  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado)
  }
  if (filtros?.desde) {
    query = query.gte('fecha_despacho', filtros.desde)
  }
  if (filtros?.hasta) {
    query = query.lte('fecha_despacho', filtros.hasta + 'T23:59:59')
  }

  // 🏆 AUTO-ARCHIVE RULE (15 days)
  if (!filtros?.estado && !filtros?.desde && !filtros?.hasta) {
    const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    query = query.or(`estado.not.in.(entregado,cancelado),updated_at.gte.${cutoff},created_at.gte.${cutoff}`)
  }

  const { data, error } = await query as { data: any[] | null; error: any }

  if (error) {
    console.error('getDespachosList error:', JSON.stringify(error))
    return []
  }
  if (!data) return []

  return data.map(row => {
    // Calcular valor cruzando despacho_detalle con ov_detalle
    const ovDetalle = row.ordenes_venta?.ov_detalle || []
    const priceMap = new Map<string, number>()
    ovDetalle.forEach((d: any) => {
      priceMap.set(`${d.producto_id}-${d.talla}`, d.precio_pactado || 0)
    })
    
    let total_valor = 0
    const detalles = row.despacho_detalle || []
    detalles.forEach((d: any) => {
      total_valor += (d.cantidad || 0) * (priceMap.get(`${d.producto_id}-${d.talla}`) || 0)
    })

    return {
      id: row.id,
      fecha_despacho: row.fecha_despacho,
      estado: row.estado as EstadoDespacho,
      tipo_envio: row.tipo_envio as TipoEnvio,
      transportadora: row.transportadora ?? null,
      guia_seguimiento: row.guia_seguimiento ?? null,
      total_bultos: row.total_bultos || 0,
      notas: row.notas ?? null,
      ov_id: row.ov_id,
      ov_codigo: row.ordenes_venta?.codigo ?? '—',
      cliente_nombre: row.ordenes_venta?.terceros?.nombre ?? '—',
      cliente_nit: row.ordenes_venta?.terceros?.nit ?? null,
      total_unidades: detalles.reduce((sum: number, d: any) => sum + (d.cantidad || 0), 0),
      total_valor,
      despacho_detalle: detalles,
    }
  })
}

/**
 * Obtiene las OPs que tienen producto terminado liquidado pero sin ubicación (Bin)
 */
export async function getColaReciboProduccion() {
  const supabase = db(await createClient())
  
  // 1. Buscar en Kardex entradas de confección/producción sin bin
  const { data, error } = await supabase
    .from('kardex')
    .select(`
      id,
      documento_tipo,
      documento_id,
      producto_id,
      talla,
      cantidad,
      fecha_movimiento,
      productos ( referencia, nombre, color )
    `)
    .in('documento_tipo', ['op', 'entrega'])
    .is('bin_id', null)
    .gt('cantidad', 0)

  if (error) {
    console.error('getColaReciboProduccion error:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Agrupar por OP para la visualización de la cola
  const opIds = [...new Set(data.map((d: any) => d.documento_id))]
  const { data: ops } = await supabase
    .from('ordenes_produccion')
    .select('id, codigo, ov_id, ordenes_venta(codigo, terceros!cliente_id(nombre))')
    .in('id', opIds)

  const opsMap = new Map(ops?.map((o: any) => [o.id, o]))

  const grouped = data.reduce((acc: any[], item: any) => {
    const op = opsMap.get(item.documento_id)
    const opKey = item.documento_id
    
    let opGroup = acc.find(g => g.op_id === opKey)
    if (!opGroup) {
      opGroup = {
        op_id: opKey,
        op_codigo: op?.codigo || 'OP-Desconocida',
        ov_codigo: op?.ordenes_venta?.codigo || 'Stock',
        cliente: op?.ordenes_venta?.terceros?.nombre || 'Interno',
        items: []
      }
      acc.push(opGroup)
    }

    opGroup.items.push({
      kardex_id: item.id,
      producto_id: item.producto_id,
      referencia: item.productos?.referencia,
      nombre: item.productos?.nombre,
      color: item.productos?.color,
      talla: item.talla,
      cantidad: item.cantidad
    })

    return acc
  }, [])

  return grouped
}

/**
 * Recibe producto de producción asignando bines a los registros de Kardex
 */
export async function asignarBinesLote(assignments: { kardex_id: string, bin_id: string }[]) {
  const supabase = db(await createClient())
  
  if (!assignments || assignments.length === 0) {
    return { error: 'No hay items válidos seleccionados para recibir' }
  }

  // Realizar las actualizaciones una por una y verificar impacto
  let updatedCount = 0
  const errors: string[] = []

  for (const a of assignments) {
    const { error, count } = await supabase
      .from('kardex')
      .update({ bin_id: a.bin_id })
      .eq('id', a.kardex_id)
      .select('id', { count: 'exact' })

    if (error) {
      errors.push(`Error en item ${a.kardex_id}: ${error.message}`)
    } else if (count === 0) {
      errors.push(`No se encontró el registro de Kardex con ID ${a.kardex_id}`)
    } else {
      updatedCount++
    }
  }

  if (errors.length > 0) {
    return { error: `Errores en la asignación: ${errors.join(', ')}` }
  }

  if (updatedCount === 0) {
    return { error: 'No se actualizó ningún registro de inventario.' }
  }

  // Revalidación global para asegurar que el WMS y Despachos se sincronicen
  revalidatePath('/', 'layout')
  
  return { data: true }
}

/**
 * Obtiene las OVs que tienen stock listo en Bines para ser despachadas
 */
export async function getColaAlistamientoVentas() {
  const supabase = db(await createClient())

  // 1. Obtener todas las OVs activas (no entregadas/canceladas/completadas)
  const { data: ovs, error: ovError } = await supabase
    .from('ordenes_venta')
    .select(`
      id,
      codigo,
      fecha_pedido,
      terceros!cliente_id ( nombre ),
      ov_detalle ( producto_id, talla, cantidad )
    `)
    .not('estado', 'in', '("entregada","cancelada","completada")')

  if (ovError) {
    console.error('getColaAlistamientoVentas ovError:', ovError)
    return []
  }

  // 2. Obtener el stock total por SKU en bines
  const { data: stockBines } = await supabase
    .from('kardex')
    .select('producto_id, talla, cantidad')
    .not('bin_id', 'is', null)
  
  const stockMap = new Map<string, number>()
  stockBines?.forEach((s: any) => {
    const key = `${s.producto_id}-${s.talla}`
    stockMap.set(key, (stockMap.get(key) || 0) + s.cantidad)
  })

  // 3. Filtrar OVs que tienen al menos algo listo
  const result = (ovs || []).map((ov: any) => {
    const itemsListos = ov.ov_detalle.map((d: any) => {
      const key = `${d.producto_id}-${d.talla}`
      const disponible = stockMap.get(key) || 0
      return {
        ...d,
        disponible: Math.min(disponible, d.cantidad)
      }
    }).filter((i: any) => i.disponible > 0)

    if (itemsListos.length === 0) return null

    return {
      id: ov.id,
      codigo: ov.codigo,
      cliente: ov.terceros?.nombre,
      fecha: ov.fecha_pedido,
      total_items_ov: ov.ov_detalle.length,
      items_listos: itemsListos.length,
      items: itemsListos
    }
  }).filter(Boolean)

  return result
}

/**
 * Obtiene bines disponibles para recibir producto (en bodega principal)
 */
export async function getBinesDisponiblesRecibo() {
  const supabase = db(await createClient())

  const { data: bodega } = await supabase
    .from('bodegas')
    .select('id')
    .or('tipo.eq.principal,nombre.ilike.%asimetrico central%')
    .limit(1)
    .maybeSingle() as { data: { id: string } | null }

  if (!bodega) return []

  const { data: bines } = await supabase
    .from('bines')
    .select('id, codigo, estado')
    .eq('bodega_id', bodega.id)
    .eq('estado', 'en_bodega')
    .order('codigo')

  return bines || []
}

/**
 * Actualiza estado de un despacho desde el dashboard global (sin contexto de OV)
 * Implementa sincronización automática con el estado de la OV
 */
export async function updateEstadoDespachoGlobal(id: string, estado: EstadoDespacho) {
  const supabase = db(await createClient())
  
  // 1. Actualizar el despacho y obtener el ov_id
  const { data: despacho, error } = await supabase
    .from('despachos')
    .update({ estado })
    .eq('id', id)
    .select('ov_id')
    .single() as { data: { ov_id: string } | null; error: any }

  if (error) return { error: error.message }
  if (!despacho) return { error: 'Despacho no encontrado' }

  // 🔄 SINCRONIZACIÓN AUTOMÁTICA CON LA OV
  // Si el despacho avanza, impactamos el estado de la orden madre
  if (estado === 'entregado' || estado === 'enviado') {
    const ovId = despacho.ov_id
    
    // Calcular progreso real de la OV
    // A. Total Pedido
    const { data: detOV } = await supabase
      .from('ov_detalle')
      .select('cantidad')
      .eq('ov_id', ovId)
    
    const totalPedido = detOV?.reduce((sum: number, d: any) => sum + (d.cantidad || 0), 0) || 0

    // B. Total Entregado (Suma de todos los despachos ya 'entregados' para esta OV)
    const { data: entregados } = await supabase
      .from('despacho_detalle')
      .select('cantidad, despachos!inner(estado)')
      .eq('despachos.ov_id', ovId)
      .eq('despachos.estado', 'entregado')
    
    const totalEntregado = entregados?.reduce((sum: number, d: any) => sum + (d.cantidad || 0), 0) || 0

    // C. Determinar Estado Resultante
    let nuevoEstadoOV = 'confirmada'
    if (totalEntregado >= totalPedido && totalPedido > 0) {
      nuevoEstadoOV = 'entregada'
    } else if (totalEntregado > 0 || estado === 'enviado') {
      // Si ya hay algo entregado o al menos algo en ruta, la orden está en proceso de despacho
      nuevoEstadoOV = 'despachada'
    }

    // D. Aplicar cambio en la OV
    await supabase
      .from('ordenes_venta')
      .update({ estado: nuevoEstadoOV })
      .eq('id', ovId)
    
    revalidatePath(`/ordenes-venta/${ovId}`)
  }

  revalidatePath('/despachos')
  return { data: true }
}

/**
 * Recibo rápido: Crea un bin y le asigna TODO lo pendiente de una OP/Entrega
 * No depende de lo que mande el frontend para evitar bines vacíos por serialización
 */
export async function reciboRapidoOP(opId: string, binCodigo: string) {
  const supabase = db(await createClient())
  
  // 1. Buscar bodega principal
  const { data: bodega } = await supabase
    .from('bodegas')
    .select('id')
    .or('tipo.eq.principal,nombre.ilike.%asimetrico central%')
    .limit(1)
    .maybeSingle() as { data: { id: string } | null }

  if (!bodega) return { error: 'Bodega principal no encontrada' }

  // 2. Encontrar una posición
  const { data: pos } = await supabase
    .from('bodega_posiciones')
    .select('id')
    .eq('bodega_id', bodega.id)
    .limit(1)
    .maybeSingle() as { data: { id: string } | null }

  // 3. Crear o verificar el BIN
  let binId: string
  const { data: existingBin } = await supabase
    .from('bines')
    .select('id')
    .eq('codigo', binCodigo)
    .maybeSingle() as { data: { id: string } | null }

  if (existingBin) {
    binId = existingBin.id
  } else {
    const { data: newBin, error: binError } = await supabase
      .from('bines')
      .insert({
        codigo: binCodigo,
        tipo: 'interno',
        bodega_id: bodega.id,
        posicion_id: pos?.id || null,
        estado: 'en_bodega'
      })
      .select('id')
      .single() as { data: { id: string } | null, error: any }
    
    if (binError || !newBin) return { error: 'Error creando bin automático' }
    binId = newBin.id
  }

  // 4. Actualizar KARDEX usando directamente el documento_id (opId)
  // Esto es mucho más seguro que confiar en IDs enviados desde el frontend
  const { error: updateError, count } = await supabase
    .from('kardex')
    .update({ bin_id: binId })
    .eq('documento_id', opId)
    .gt('cantidad', 0)
    .is('bin_id', null)
    .select('id', { count: 'exact' })

  if (updateError) return { error: updateError.message }
  if (!count || count === 0) return { error: 'No se encontraron ítems pendientes para esta operación' }

  revalidatePath('/', 'layout')
  return { data: true }
}
