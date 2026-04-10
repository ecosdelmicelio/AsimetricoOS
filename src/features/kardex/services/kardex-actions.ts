'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

// ============================================================================
// TIPOS
// ============================================================================

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

export interface SaldoTotalPT {
  producto_id: string
  referencia: string
  nombre: string
  saldo_total: number
  costo_promedio: number | null
  valor_total: number | null
}

export interface SaldoTotalMP {
  material_id: string
  codigo: string
  nombre: string
  unidad: string
  saldo_total: number
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

export interface TrasladoCombinado {
  id: string
  documento_id: string | null
  fecha_movimiento: string
  bodega_origen_id: string
  bodega_origen_nombre: string
  bodega_destino_id: string
  bodega_destino_nombre: string
  material_id?: string
  material_codigo?: string
  material_nombre?: string
  producto_id?: string
  producto_referencia?: string
  producto_nombre?: string
  cantidad: number
  unidad?: string
  usuario: string | null
}

export interface FiltrosHistorial {
  fecha_inicio?: string
  fecha_fin?: string
  busqueda?: string // búsqueda parcial en código/referencia/nombre
  bodega_id?: string
  tipo_movimiento_id?: string
  material_id?: string // para MP
  producto_id?: string // para PT
}

export interface SaldoBin {
  bin_id: string
  bin_codigo: string
  bodega_id: string
  bodega_nombre: string
  producto_id: string
  referencia: string
  nombre: string
  talla: string | null
  saldo: number
  costo_promedio: number | null
  valor_total: number | null
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
 * Obtiene saldos actuales de productos terminados por bodega y talla
 * Soporta filtro opcional por producto_id
 */
export async function getSaldosKardexPT(
  filtros?: { producto_id?: string }
): Promise<SaldoPT[]> {
  const supabase = db(await createClient())

  let query = supabase
    .from('kardex')
    .select(`
      producto_id,
      bodega_id,
      talla,
      cantidad,
      costo_total,
      saldo_ponderado,
      productos (referencia, nombre),
      bodegas (nombre)
    `)
    .not('producto_id', 'is', null)

  if (filtros?.producto_id) {
    query = query.eq('producto_id', filtros.producto_id)
  }

  const { data } = await query.order('fecha_movimiento', { ascending: false }) as {
    data: any[] | null
  }

  if (!data) return []

  const saldos: Record<string, any> = {}

  for (const row of data) {
    const key = `${row.producto_id}-${row.bodega_id}-${row.talla ?? '__null__'}`

    if (!saldos[key]) {
      saldos[key] = {
        producto_id: row.producto_id,
        referencia: row.productos?.referencia,
        nombre: row.productos?.nombre,
        bodega_id: row.bodega_id,
        bodega_nombre: row.bodegas?.nombre,
        talla: row.talla ?? null,
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
 * Historial de movimientos de materias primas
 * Soporta fecha_inicio/fin (default 30 días) y búsqueda parcial
 */
export async function getHistorialKardexMP(filtros?: FiltrosHistorial): Promise<HistorialMP[]> {
  const supabase = db(await createClient())

  // Calcular rango de fechas
  const fechaInicio = filtros?.fecha_inicio
    ? new Date(filtros.fecha_inicio)
    : (() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d
      })()

  const fechaFin = filtros?.fecha_fin ? new Date(filtros.fecha_fin) : new Date()
  fechaFin.setHours(23, 59, 59, 999)

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
      tipo_movimiento_id,
      kardex_tipos_movimiento (id, codigo, nombre),
      materiales (codigo, nombre, unidad),
      bodegas (nombre),
      profiles (full_name)
    `)
    .not('material_id', 'is', null)
    .gte('fecha_movimiento', fechaInicio.toISOString())
    .lte('fecha_movimiento', fechaFin.toISOString())
    .order('fecha_movimiento', { ascending: false })

  if (filtros?.material_id) {
    query = query.eq('material_id', filtros.material_id)
  }
  if (filtros?.bodega_id) {
    query = query.eq('bodega_id', filtros.bodega_id)
  }
  if (filtros?.tipo_movimiento_id) {
    query = query.eq('tipo_movimiento_id', filtros.tipo_movimiento_id)
  }

  const { data } = await query as { data: any[] | null }

  if (!data) return []

  // Aplicar búsqueda parcial en memoria (después de fetch para evitar múltiples queries)
  let results = data.map((row: any) => ({
    id: row.id,
    fecha_movimiento: row.fecha_movimiento,
    material_id: row.material_id,
    codigo: row.materiales?.codigo || '',
    nombre: row.materiales?.nombre || '',
    bodega_id: row.bodega_id,
    bodega_nombre: row.bodegas?.nombre || '',
    tipo_movimiento: row.kardex_tipos_movimiento?.nombre || '',
    cantidad: row.cantidad,
    unidad: row.materiales?.unidad || '',
    costo_unitario: row.costo_unitario,
    costo_total: row.costo_total,
    usuario: row.profiles?.full_name,
  }))

  // Filtro de búsqueda parcial
  if (filtros?.busqueda) {
    const search = filtros.busqueda.toLowerCase()
    results = results.filter(r =>
      r.codigo.toLowerCase().includes(search) ||
      r.nombre.toLowerCase().includes(search)
    )
  }

  return results
}

/**
 * Historial de movimientos de productos terminados
 * Soporta fecha_inicio/fin (default 30 días) y búsqueda parcial
 */
export async function getHistorialKardexPT(filtros?: FiltrosHistorial): Promise<HistorialPT[]> {
  const supabase = db(await createClient())

  // Calcular rango de fechas
  const fechaInicio = filtros?.fecha_inicio
    ? new Date(filtros.fecha_inicio)
    : (() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d
      })()

  const fechaFin = filtros?.fecha_fin ? new Date(filtros.fecha_fin) : new Date()
  fechaFin.setHours(23, 59, 59, 999)

  let query = supabase
    .from('kardex')
    .select(`
      id,
      fecha_movimiento,
      producto_id,
      bodega_id,
      talla,
      cantidad,
      costo_unitario,
      costo_total,
      tipo_movimiento_id,
      kardex_tipos_movimiento (id, codigo, nombre),
      productos (referencia, nombre),
      bodegas (nombre),
      profiles (full_name)
    `)
    .not('producto_id', 'is', null)
    .gte('fecha_movimiento', fechaInicio.toISOString())
    .lte('fecha_movimiento', fechaFin.toISOString())
    .order('fecha_movimiento', { ascending: false })

  if (filtros?.producto_id) {
    query = query.eq('producto_id', filtros.producto_id)
  }
  if (filtros?.bodega_id) {
    query = query.eq('bodega_id', filtros.bodega_id)
  }
  if (filtros?.tipo_movimiento_id) {
    query = query.eq('tipo_movimiento_id', filtros.tipo_movimiento_id)
  }

  const { data } = await query as { data: any[] | null }

  if (!data) return []

  // Aplicar búsqueda parcial en memoria
  let results = data.map((row: any) => ({
    id: row.id,
    fecha_movimiento: row.fecha_movimiento,
    producto_id: row.producto_id,
    referencia: row.productos?.referencia || '',
    nombre: row.productos?.nombre || '',
    talla: row.talla ?? null,
    bodega_id: row.bodega_id,
    bodega_nombre: row.bodegas?.nombre || '',
    tipo_movimiento: row.kardex_tipos_movimiento?.nombre || '',
    cantidad: row.cantidad,
    costo_unitario: row.costo_unitario,
    costo_total: row.costo_total,
    usuario: row.profiles?.full_name,
  }))

  // Filtro de búsqueda parcial
  if (filtros?.busqueda) {
    const search = filtros.busqueda.toLowerCase()
    results = results.filter(r =>
      r.referencia.toLowerCase().includes(search) ||
      r.nombre.toLowerCase().includes(search)
    )
  }

  return results
}

/**
 * Obtiene traslados combinados: agrupa TRASLADO_SALIDA + TRASLADO_ENTRADA
 * con mismo documento_id como una sola fila "bodega_origen → bodega_destino"
 */
export async function getTrasladosCombinados(filtros?: FiltrosHistorial): Promise<TrasladoCombinado[]> {
  const supabase = db(await createClient())

  // Calcular rango de fechas
  const fechaInicio = filtros?.fecha_inicio
    ? new Date(filtros.fecha_inicio)
    : (() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d
      })()

  const fechaFin = filtros?.fecha_fin ? new Date(filtros.fecha_fin) : new Date()
  fechaFin.setHours(23, 59, 59, 999)

  const { data } = await supabase
    .from('kardex')
    .select(`
      id,
      documento_id,
      fecha_movimiento,
      bodega_id,
      material_id,
      producto_id,
      cantidad,
      kardex_tipos_movimiento (codigo, nombre),
      materiales (codigo, nombre, unidad),
      productos (referencia, nombre),
      bodegas (nombre),
      profiles (full_name)
    `)
    .in('kardex_tipos_movimiento.codigo', ['TRASLADO_SALIDA', 'TRASLADO_ENTRADA'])
    .gte('fecha_movimiento', fechaInicio.toISOString())
    .lte('fecha_movimiento', fechaFin.toISOString())
    .order('fecha_movimiento', { ascending: false }) as { data: any[] | null }

  if (!data || data.length === 0) return []

  // Agrupar por documento_id
  const trasladoMap: Record<string, any> = {}

  for (const row of data) {
    const docId = row.documento_id || row.id
    if (!trasladoMap[docId]) {
      trasladoMap[docId] = {
        id: row.id,
        documento_id: row.documento_id,
        fecha_movimiento: row.fecha_movimiento,
        bodega_origen_id: '',
        bodega_origen_nombre: '',
        bodega_destino_id: '',
        bodega_destino_nombre: '',
        material_id: row.material_id,
        material_codigo: row.materiales?.codigo,
        material_nombre: row.materiales?.nombre,
        producto_id: row.producto_id,
        producto_referencia: row.productos?.referencia,
        producto_nombre: row.productos?.nombre,
        cantidad: Math.abs(row.cantidad),
        unidad: row.materiales?.unidad || 'unidades',
        usuario: row.profiles?.full_name,
      }
    }

    // Si es TRASLADO_SALIDA, es origen; si es ENTRADA, es destino
    if (row.kardex_tipos_movimiento?.codigo === 'TRASLADO_SALIDA') {
      trasladoMap[docId].bodega_origen_id = row.bodega_id
      trasladoMap[docId].bodega_origen_nombre = row.bodegas?.nombre
    } else {
      trasladoMap[docId].bodega_destino_id = row.bodega_id
      trasladoMap[docId].bodega_destino_nombre = row.bodegas?.nombre
    }
  }

  let results = Object.values(trasladoMap).filter(
    t => t.bodega_origen_id && t.bodega_destino_id // Solo traslados completos (origen + destino)
  )

  // Filtro de búsqueda parcial
  if (filtros?.busqueda) {
    const search = filtros.busqueda.toLowerCase()
    results = results.filter(t =>
      (t.material_codigo?.toLowerCase().includes(search) || false) ||
      (t.material_nombre?.toLowerCase().includes(search) || false) ||
      (t.producto_referencia?.toLowerCase().includes(search) || false) ||
      (t.producto_nombre?.toLowerCase().includes(search) || false)
    )
  }

  return results as TrasladoCombinado[]
}

/**
 * Obtiene referencias activas de PT para dropdown de búsqueda
 */
export async function getProductosActivos() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('productos')
    .select('id, referencia, nombre, color, precio_base, tallas')
    .eq('estado', 'activo')
    .order('referencia') as { data: any[] | null }
  return data ?? []
}

/**
 * Obtiene materiales activos para dropdown de búsqueda
 */
export async function getMaterialesActivos() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('materiales')
    .select('id, codigo, nombre, unidad')
    .eq('activo', true)
    .order('codigo') as { data: any[] | null }
  return data ?? []
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

/**
 * Obtiene saldos totales por producto (suma todas bodegas y tallas)
 * Usado para badges en el listado de productos
 */
export async function getSaldosTotalesPorProducto(): Promise<Record<string, number>> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('kardex')
    .select('producto_id, cantidad')
    .not('producto_id', 'is', null) as { data: Array<{ producto_id: string; cantidad: number }> | null }

  if (!data) return {}

  const totales: Record<string, number> = {}
  for (const row of data) {
    if (!row.producto_id) continue
    totales[row.producto_id] = (totales[row.producto_id] ?? 0) + row.cantidad
  }
  return totales
}

/**
 * Obtiene saldos totales por producto con costo promedio ponderado y valor total
 * Agrupa todas bodegas y tallas
 */
export async function getSaldosTotalPT(): Promise<SaldoTotalPT[]> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('kardex')
    .select(`
      producto_id,
      cantidad,
      saldo_ponderado,
      productos (referencia, nombre)
    `)
    .not('producto_id', 'is', null)
    .order('fecha_movimiento', { ascending: false }) as {
      data: any[] | null
    }

  if (!data) return []

  // Agrupar por producto_id solamente
  const saldos: Record<string, any> = {}

  for (const row of data) {
    const key = row.producto_id

    if (!saldos[key]) {
      saldos[key] = {
        producto_id: row.producto_id,
        referencia: row.productos?.referencia,
        nombre: row.productos?.nombre,
        saldo_total: 0,
        costo_promedio: 0,
      }
    }

    // Acumular cantidad y usar último CPP conocido
    saldos[key].saldo_total += row.cantidad
    if (row.saldo_ponderado) {
      saldos[key].costo_promedio = row.saldo_ponderado
    }
  }

  // Calcular valor total
  return Object.values(saldos).map((s: any) => ({
    ...s,
    valor_total: s.saldo_total * (s.costo_promedio || 0),
  }))
}

/**
 * Obtiene saldos totales por material con costo promedio ponderado y valor total
 * Agrupa todas bodegas
 */
export async function getSaldosTotalMP(): Promise<SaldoTotalMP[]> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('kardex')
    .select(`
      material_id,
      cantidad,
      saldo_ponderado,
      materiales (codigo, nombre, unidad)
    `)
    .not('material_id', 'is', null)
    .order('fecha_movimiento', { ascending: false }) as {
      data: any[] | null
    }

  if (!data) return []

  // Agrupar por material_id solamente
  const saldos: Record<string, any> = {}

  for (const row of data) {
    const key = row.material_id

    if (!saldos[key]) {
      saldos[key] = {
        material_id: row.material_id,
        codigo: row.materiales?.codigo,
        nombre: row.materiales?.nombre,
        unidad: row.materiales?.unidad,
        saldo_total: 0,
        costo_promedio: 0,
      }
    }

    // Acumular cantidad y usar último CPP conocido
    saldos[key].saldo_total += row.cantidad
    if (row.saldo_ponderado) {
      saldos[key].costo_promedio = row.saldo_ponderado
    }
  }

  // Calcular valor total
  return Object.values(saldos).map((s: any) => ({
    ...s,
    valor_total: s.saldo_total * (s.costo_promedio || 0),
  }))
}

/**
 * Obtiene saldos actuales de productos terminados agrupados por bin
 * Soporta filtro opcional por bodega_id
 */
export async function getSaldosPorBin(bodegaId?: string): Promise<SaldoBin[]> {
  const supabase = db(await createClient())

  const { data, error } = await supabase.rpc('get_saldos_por_bin', {
    p_bodega_id: bodegaId || null,
  }) as { data: any[] | null; error: { message: string } | null }

  if (error) {
    console.error('Error fetching saldos por bin:', error)
    return []
  }

  if (!data) return []

  return data.map(row => ({
    bin_id: row.bin_id,
    bin_codigo: row.bin_codigo,
    bodega_id: row.bodega_id,
    bodega_nombre: row.bodega_nombre,
    producto_id: row.producto_id,
    referencia: row.referencia,
    nombre: row.nombre,
    talla: row.talla ?? null,
    saldo: Number(row.saldo) || 0,
    costo_promedio: row.costo_promedio ? Number(row.costo_promedio) : null,
    valor_total: row.valor_total ? Number(row.valor_total) : null,
  }))
}
