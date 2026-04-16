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
 * Actualiza estado de un despacho desde el dashboard global (sin contexto de OV)
 */
export async function updateEstadoDespachoGlobal(id: string, estado: EstadoDespacho) {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('despachos')
    .update({ estado })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/despachos')
  return { data: true }
}
