'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export interface SaldoMP {
  material_id: string
  codigo: string
  nombre: string
  bodega_id: string
  bodega_nombre: string
  unidad: string
  saldo: number
  costo_promedio: number | null
  valor_total: number | null
}

export interface SaldoPT {
  producto_id: string
  referencia: string
  nombre: string
  bodega_id: string
  bodega_nombre: string
  talla: string
  saldo: number
  costo_promedio: number | null
  valor_total: number | null
}

export interface HistorialMP {
  id: string
  fecha_movimiento: string
  material_id: string
  codigo: string
  nombre: string
  bodega_id: string
  bodega_nombre: string
  tipo_movimiento: string
  cantidad: number
  unidad: string
  costo_unitario: number | null
  costo_total: number | null
  usuario: string | null
}

export interface HistorialPT {
  id: string
  fecha_movimiento: string
  producto_id: string
  referencia: string
  nombre: string
  talla: string | null
  bodega_id: string
  bodega_nombre: string
  tipo_movimiento: string
  cantidad: number
  costo_unitario: number | null
  costo_total: number | null
  usuario: string | null
}

/**
 * Obtiene saldos actuales de materias primas por bodega
 * Agrupa por material + bodega y suma cantidades para calcular CPP
 */
export async function getSaldosKardexMP(): Promise<SaldoMP[]> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('kardex')
    .select(`
      material_id,
      bodega_id,
      cantidad,
      costo_total,
      saldo_ponderado,
      materiales (codigo, nombre, unidad),
      bodegas (nombre)
    `)
    .not('material_id', 'is', null)
    .order('fecha_movimiento', { ascending: false }) as {
      data: any[] | null
    }

  if (!data) return []

  // Agrupar por material_id + bodega_id y calcular saldos
  const saldos: Record<string, any> = {}

  for (const row of data) {
    const key = `${row.material_id}-${row.bodega_id}`

    if (!saldos[key]) {
      saldos[key] = {
        material_id: row.material_id,
        codigo: row.materiales?.codigo,
        nombre: row.materiales?.nombre,
        bodega_id: row.bodega_id,
        bodega_nombre: row.bodegas?.nombre,
        unidad: row.materiales?.unidad,
        saldo: 0,
        costo_promedio: 0,
        valor_total: 0,
      }
    }

    // Acumular cantidad y usar último CPP conocido
    saldos[key].saldo += row.cantidad
    if (row.saldo_ponderado) {
      saldos[key].costo_promedio = row.saldo_ponderado
    }
  }

  // Calcular valor total
  return Object.values(saldos).map((s: any) => ({
    ...s,
    valor_total: s.saldo * (s.costo_promedio || 0),
  }))
}

/**
 * Obtiene saldos actuales de productos terminados por bodega
 */
export async function getSaldosKardexPT(): Promise<SaldoPT[]> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('kardex')
    .select(`
      producto_id,
      bodega_id,
      cantidad,
      costo_total,
      saldo_ponderado,
      productos (referencia, nombre),
      bodegas (nombre)
    `)
    .not('producto_id', 'is', null)
    .order('fecha_movimiento', { ascending: false }) as {
      data: any[] | null
    }

  if (!data) return []

  // Nota: Aquí necesitaríamos la talla, pero kardex no almacena talla para PT
  // Por ahora agrupamos solo por producto + bodega
  // En Fase 2, se puede almacenar talla en kardex también
  const saldos: Record<string, any> = {}

  for (const row of data) {
    const key = `${row.producto_id}-${row.bodega_id}`

    if (!saldos[key]) {
      saldos[key] = {
        producto_id: row.producto_id,
        referencia: row.productos?.referencia,
        nombre: row.productos?.nombre,
        bodega_id: row.bodega_id,
        bodega_nombre: row.bodegas?.nombre,
        talla: null, // Será null por ahora, ver nota arriba
        saldo: 0,
        costo_promedio: 0,
        valor_total: 0,
      }
    }

    saldos[key].saldo += row.cantidad
    if (row.saldo_ponderado) {
      saldos[key].costo_promedio = row.saldo_ponderado
    }
  }

  return Object.values(saldos).map((s: any) => ({
    ...s,
    valor_total: s.saldo * (s.costo_promedio || 0),
  }))
}

/**
 * Historial de movimientos de materias primas (últimos 30 días)
 */
export async function getHistorialKardexMP(filtros?: {
  material_id?: string
  bodega_id?: string
  tipo_movimiento_codigo?: string
}): Promise<HistorialMP[]> {
  const supabase = db(await createClient())

  const hace30Dias = new Date()
  hace30Dias.setDate(hace30Dias.getDate() - 30)

  let query = supabase
    .from('kardex')
    .select(`
      id,
      fecha_movimiento,
      material_id,
      bodega_id,
      cantidad,
      costo_unitario,
      costo_total,
      kardex_tipos_movimiento (codigo, nombre),
      materiales (codigo, nombre, unidad),
      bodegas (nombre),
      profiles (full_name)
    `)
    .not('material_id', 'is', null)
    .gte('fecha_movimiento', hace30Dias.toISOString())
    .order('fecha_movimiento', { ascending: false })

  if (filtros?.material_id) {
    query = query.eq('material_id', filtros.material_id)
  }
  if (filtros?.bodega_id) {
    query = query.eq('bodega_id', filtros.bodega_id)
  }
  if (filtros?.tipo_movimiento_codigo) {
    // Nota: necesitaremos hacer un filtro por tipo_movimiento_id después
  }

  const { data } = await query as { data: any[] | null }

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    fecha_movimiento: row.fecha_movimiento,
    material_id: row.material_id,
    codigo: row.materiales?.codigo,
    nombre: row.materiales?.nombre,
    bodega_id: row.bodega_id,
    bodega_nombre: row.bodegas?.nombre,
    tipo_movimiento: row.kardex_tipos_movimiento?.nombre,
    cantidad: row.cantidad,
    unidad: row.materiales?.unidad,
    costo_unitario: row.costo_unitario,
    costo_total: row.costo_total,
    usuario: row.profiles?.full_name,
  }))
}

/**
 * Historial de movimientos de productos terminados (últimos 30 días)
 */
export async function getHistorialKardexPT(filtros?: {
  producto_id?: string
  bodega_id?: string
  tipo_movimiento_codigo?: string
}): Promise<HistorialPT[]> {
  const supabase = db(await createClient())

  const hace30Dias = new Date()
  hace30Dias.setDate(hace30Dias.getDate() - 30)

  let query = supabase
    .from('kardex')
    .select(`
      id,
      fecha_movimiento,
      producto_id,
      bodega_id,
      cantidad,
      costo_unitario,
      costo_total,
      kardex_tipos_movimiento (codigo, nombre),
      productos (referencia, nombre),
      bodegas (nombre),
      profiles (full_name)
    `)
    .not('producto_id', 'is', null)
    .gte('fecha_movimiento', hace30Dias.toISOString())
    .order('fecha_movimiento', { ascending: false })

  if (filtros?.producto_id) {
    query = query.eq('producto_id', filtros.producto_id)
  }
  if (filtros?.bodega_id) {
    query = query.eq('bodega_id', filtros.bodega_id)
  }

  const { data } = await query as { data: any[] | null }

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    fecha_movimiento: row.fecha_movimiento,
    producto_id: row.producto_id,
    referencia: row.productos?.referencia,
    nombre: row.productos?.nombre,
    talla: null, // Ver nota en getSaldosKardexPT
    bodega_id: row.bodega_id,
    bodega_nombre: row.bodegas?.nombre,
    tipo_movimiento: row.kardex_tipos_movimiento?.nombre,
    cantidad: row.cantidad,
    costo_unitario: row.costo_unitario,
    costo_total: row.costo_total,
    usuario: row.profiles?.full_name,
  }))
}

/**
 * Obtiene todas las bodegas para filtros
 */
export async function getBodegas() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('bodegas')
    .select('id, nombre, tipo')
    .eq('activo', true)
    .order('nombre') as { data: any[] | null }
  return data ?? []
}

/**
 * Obtiene todos los tipos de movimiento para filtros
 */
export async function getTiposMovimientoKardex() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('kardex_tipos_movimiento')
    .select('id, codigo, nombre, categoria')
    .eq('activo', true)
    .order('codigo') as { data: any[] | null }
  return data ?? []
}
