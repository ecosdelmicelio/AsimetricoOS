'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { LineaOV, OrdenVenta, OVConDetalle, HistorialEstado, OVDashboardStats, OVProgressLine, OVMilestone, ProductionSubState } from '@/features/ordenes-venta/types'
export interface OVFilters {
  estado?: string
  fechaInicio?: string
  fechaFin?: string
}

export interface CreateOVInput {
  cliente_id: string
  fecha_entrega: string
  notas?: string
  lineas: LineaOV[]
}

// Cast helper: Supabase's typed client can't infer new tables until types are
// regenerated and the TS cache is cleared. We explicitly cast query results instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function createOrdenVenta(input: CreateOVInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // 1. Crear cabecera OV
  const { data: ov, error: ovError } = await supabase
    .from('ordenes_venta')
    .insert({
      cliente_id: input.cliente_id,
      fecha_entrega: input.fecha_entrega,
      notas: input.notas ?? null,
      creado_por: user.id,
      estado: 'borrador',
    })
    .select('id, codigo')
    .single() as { data: Pick<OrdenVenta, 'id' | 'codigo'> | null; error: { message: string } | null }

  if (ovError || !ov) return { error: ovError?.message ?? 'Error creando OV' }

  // 2. Insertar líneas de detalle
  const detalles = input.lineas.map(l => ({
    ov_id: ov.id,
    producto_id: l.producto_id,
    talla: l.talla,
    cantidad: l.cantidad,
    precio_pactado: l.precio_pactado,
  }))

  const { error: detError } = await supabase.from('ov_detalle').insert(detalles) as {
    error: { message: string } | null
  }
  if (detError) return { error: detError.message }

  revalidatePath('/ordenes-venta')
  return { data: { id: ov.id, codigo: ov.codigo } }
}

export async function updateOrdenVenta(id: string, input: CreateOVInput) {
  const supabase = db(await createClient())
  
  // 1. Validar que la OV exista y esté en borrador
  const { data: currentOV, error: fetchError } = await supabase
    .from('ordenes_venta')
    .select('estado')
    .eq('id', id)
    .single() as { data: { estado: string } | null; error: { message: string } | null }

  if (fetchError || !currentOV) return { error: 'Orden no encontrada' }
  if (currentOV.estado !== 'borrador') return { error: 'Solo se pueden editar órdenes en estado borrador' }

  // 2. Actualizar cabecera
  const { error: ovError } = await supabase
    .from('ordenes_venta')
    .update({
      cliente_id: input.cliente_id,
      fecha_entrega: input.fecha_entrega,
      notas: input.notas ?? null,
    })
    .eq('id', id) as { error: { message: string } | null }

  if (ovError) return { error: ovError.message }

  // 3. Reemplazar líneas de detalle
  // Primero borramos las actuales
  const { error: delError } = await supabase
    .from('ov_detalle')
    .delete()
    .eq('ov_id', id) as { error: { message: string } | null }

  if (delError) return { error: delError.message }

  // Luego insertamos las nuevas
  const detalles = input.lineas.map(l => ({
    ov_id: id,
    producto_id: l.producto_id,
    talla: l.talla,
    cantidad: l.cantidad,
    precio_pactado: l.precio_pactado,
  }))

  const { error: detError } = await supabase.from('ov_detalle').insert(detalles) as {
    error: { message: string } | null
  }
  if (detError) return { error: detError.message }

  revalidatePath('/ordenes-venta')
  revalidatePath(`/ordenes-venta/${id}`)
  return { data: true }
}

export async function updateEstadoOV(id: string, estado: string) {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('ordenes_venta')
    .update({ estado })
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/ordenes-venta')
  revalidatePath(`/ordenes-venta/${id}`)
  return { data: true }
}

export async function cancelOrdenVenta(id: string) {
  const supabase = db(await createClient())

  // 1. Validar si tiene despachos (no se puede cancelar si ya se envió algo)
  const { count: despachoCount } = await supabase
    .from('despachos')
    .select('*', { count: 'exact', head: true })
    .eq('ov_id', id)
    .neq('estado', 'cancelado')

  if (despachoCount && despachoCount > 0) {
    return { error: 'No se puede cancelar una orden que tiene despachos activos. Debes cancelar los despachos primero.' }
  }

  // 2. Validar si tiene OPs ya liquidadas o completadas
  const { count: opCount } = await supabase
    .from('ordenes_produccion')
    .select('*', { count: 'exact', head: true })
    .eq('ov_id', id)
    .in('estado', ['completada', 'liquidada'])

  if (opCount && opCount > 0) {
    return { error: 'No se puede cancelar una orden con producción terminada o liquidada.' }
  }

  // 3. Proceder con la cancelación
  const { error } = await supabase
    .from('ordenes_venta')
    .update({ estado: 'cancelada' })
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  // Cancel associated OPs if they aren't finished
  await supabase
    .from('ordenes_produccion')
    .update({ estado: 'cancelada' })
    .eq('ov_id', id)
    .not('estado', 'in', '("completada", "liquidada", "cancelada")')

  revalidatePath('/ordenes-venta')
  revalidatePath(`/ordenes-venta/${id}`)
  revalidatePath('/ordenes-produccion')
  return { data: true }
}

export async function getOrdenesVenta(filters?: OVFilters) {
  const supabase = db(await createClient())

  let query = supabase
    .from('ordenes_venta')
    .select(`
      *,
      terceros!cliente_id ( nombre ),
      ov_detalle ( producto_id, talla, cantidad, precio_pactado ),
      ordenes_produccion (
        id, codigo, estado,
        op_detalle ( producto_id, talla, cantidad_asignada )
      ),
      despachos (
        id, estado,
        despacho_detalle ( producto_id, talla, cantidad )
      )
    `)

  if (filters?.estado && filters.estado !== 'todas') {
    query = query.eq('estado', filters.estado)
  }
  if (filters?.fechaInicio) {
    query = query.gte('fecha_entrega', filters.fechaInicio)
  }
  if (filters?.fechaFin) {
    query = query.lte('fecha_entrega', filters.fechaFin)
  }

  // 🏆 AUTO-ARCHIVE RULE (15 days)
  if (!filters?.estado && !filters?.fechaInicio && !filters?.fechaFin) {
      const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      query = query.or(`estado.not.in.(completada,entregada,cancelada),updated_at.gte.${cutoff},created_at.gte.${cutoff}`)
  }

  const { data, error } = await query.order('created_at', { ascending: false }) as {
    data: (OrdenVenta & {
      terceros: { nombre: string } | null
      ov_detalle: { producto_id: string; talla: string; cantidad: number; precio_pactado: number }[]
      ordenes_produccion: { id: string; codigo: string; estado: string; op_detalle: { producto_id: string; talla: string; cantidad_asignada: number }[] }[]
      despachos: { id: string; estado: string; despacho_detalle: { producto_id: string; talla: string; cantidad: number }[] }[]
    })[] | null
    error: { message: string } | null
  }

  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}


export async function getOrdenVentaById(id: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('ordenes_venta')
    .select('*, terceros!cliente_id ( nombre ), ov_detalle ( *, productos ( nombre, referencia, color, origen_usa ) )')
    .eq('id', id)
    .single() as { data: OVConDetalle | null; error: { message: string } | null }

  if (error) return { error: error.message, data: null }
  return { data }
}

export async function getClientes() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('terceros')
    .select('id, nombre')
    .overlaps('tipos', ['cliente'])
    .eq('estado', 'activo')
    .order('nombre')
  return (data ?? []) as { id: string; nombre: string }[]
}

export async function getProductos() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('productos')
    .select('id, nombre, referencia, precio_base, categoria, origen_usa')
    .eq('estado', 'activo')
    .order('nombre')
  return (data ?? []) as {
    id: string
    nombre: string
    referencia: string
    precio_base: number | null
    categoria: string
    origen_usa: boolean
  }[]
}

export async function getHistorialOV(ovId: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('historial_estados')
    .select('*, profiles ( full_name )')
    .eq('entidad', 'ov')
    .eq('entidad_id', ovId)
    .order('timestamp_cambio', { ascending: true }) as {
      data: HistorialEstado[] | null
      error: { message: string } | null
    }

  if (error) return { error: error.message, data: [] as HistorialEstado[] }
  return { data: data ?? [] }
}

export async function getOVDashboardStats(): Promise<OVDashboardStats> {
  const supabase = db(await createClient())
  
  // 1. OVs con sus detalles (sin historial_estados — FK polimórfica no compatible con PostgREST)
  const { data: ovs } = await supabase
    .from('ordenes_venta')
    .select('id, estado, created_at, ov_detalle(cantidad, precio_pactado, producto_id, talla)')
    .neq('estado', 'cancelada') as { 
      data: { 
        id: string
        estado: string
        created_at: string
        ov_detalle: { cantidad: number; precio_pactado: number; producto_id: string; talla: string }[]
      }[] | null 
    }

  let totalSolicitado = 0
  let unidadesPedidas = 0
  let ordenesActivas = 0
  let ordenesAgingCount = 0
  let unidadesAging = 0

  const now = new Date()
  const AGING_DAYS = 30

  ovs?.forEach(ov => {
    // OV es activa hasta que se entrega al cliente
    const isActive = ov.estado !== 'entregada'
    if (isActive) ordenesActivas++
    
    const totalUnitsOV = ov.ov_detalle.reduce((s, d) => s + d.cantidad, 0)
    
    ov.ov_detalle.forEach(det => {
      unidadesPedidas += det.cantidad
      totalSolicitado += det.cantidad * det.precio_pactado
    })

    // Aging: OVs no entregadas con más de 30 días desde su creación
    if (isActive && ov.created_at) {
      const daysSince = Math.ceil((now.getTime() - new Date(ov.created_at).getTime()) / (1000 * 3600 * 24))
      if (daysSince > AGING_DAYS) {
        ordenesAgingCount++
        unidadesAging += totalUnitsOV
      }
    }
  })

  // 2. Unidades y valor entregado (despachos confirmados)
  const { data: despachos } = await supabase
    .from('despacho_detalle')
    .select('cantidad, producto_id, talla, despachos!inner(ov_id)') as { 
      data: { cantidad: number; producto_id: string; talla: string; despachos: { ov_id: string } }[] | null 
    }

  let unidadesEntregadas = 0
  let totalEntregado = 0

  const preciosMap = new Map<string, number>()
  ovs?.forEach(ov => {
    ov.ov_detalle.forEach(det => {
      preciosMap.set(`${ov.id}-${det.producto_id}-${det.talla}`, det.precio_pactado)
    })
  })

  despachos?.forEach(d => {
    unidadesEntregadas += d.cantidad
    const price = preciosMap.get(`${d.despachos.ov_id}-${d.producto_id}-${d.talla}`) || 0
    totalEntregado += d.cantidad * price
  })

  return {
    totalSolicitado,
    totalEntregado,
    unidadesPedidas,
    unidadesEntregadas,
    ordenesActivas,
    ordenesAgingCount,
    unidadesAging,
  }
}

export async function getOVProgressSummary(ovId: string): Promise<OVProgressLine[]> {
  const supabase = db(await createClient())

  // 1. Pedido (OV Detalle)
  const { data: ovDetalle } = await supabase
    .from('ov_detalle')
    .select('*, productos(nombre, referencia, color)')
    .eq('ov_id', ovId) as { data: any[] | null }

  // 2. Producido (Recibido del Taller)
  const { data: opIds } = await supabase
    .from('ordenes_produccion')
    .select('id')
    .eq('ov_id', ovId)
    .neq('estado', 'cancelada') as { data: { id: string }[] | null }

  let entregadoTaller: any[] = []
  if (opIds && opIds.length > 0) {
    const { data } = await supabase
      .from('entrega_detalle')
      .select('producto_id, talla, cantidad_entregada, entregas!inner(op_id)')
      .in('entregas.op_id', opIds.map((o: { id: string }) => o.id))
    entregadoTaller = data ?? []
  }

  // 3. Despachado (Salida de Bodega)
  const { data: despachos } = await supabase
    .from('despacho_detalle')
    .select('producto_id, talla, cantidad, despachos!inner(ov_id)')
    .eq('despachos.ov_id', ovId) as { data: any[] | null }

  // 4. Consolidar
  const lines: OVProgressLine[] = (ovDetalle || []).map(det => {
    const producido = entregadoTaller
      .filter(e => e.producto_id === det.producto_id && e.talla === det.talla)
      .reduce((sum, e) => sum + e.cantidad_entregada, 0)
    
    const despachado = (despachos || [])
      .filter(d => d.producto_id === det.producto_id && d.talla === det.talla)
      .reduce((sum, d) => sum + d.cantidad, 0)

    return {
      producto_id: det.producto_id,
      referencia: det.productos?.referencia || '',
      nombre: det.productos?.nombre || '',
      color: det.productos?.color || null,
      talla: det.talla,
      pedido: det.cantidad,
      producido,
      despachado,
      pendiente: Math.max(0, det.cantidad - despachado)
    }
  })

  return lines
}

export async function getOVMilestones(ovId: string): Promise<OVMilestone[]> {
  const supabase = db(await createClient())
  
  // 1. Obtener historial base de la OV
  const { data: historial } = await supabase
    .from('historial_estados')
    .select('*')
    .eq('entidad', 'ov')
    .eq('entidad_id', ovId)
    .order('timestamp_cambio', { ascending: true }) as { data: any[] | null }

  // 2. Obtener hitos de producción (OPs)
  const { data: ops } = await supabase
    .from('ordenes_produccion')
    .select('id, estado, created_at')
    .eq('ov_id', ovId)
    .neq('estado', 'cancelada') as { data: any[] | null }

  // 3. Obtener hitos de logística (Despachos)
  const { data: despachos } = await supabase
    .from('despachos')
    .select('id, estado, created_at')
    .eq('ov_id', ovId)
    .neq('estado', 'cancelado') as { data: any[] | null }

  // Mapeo de fechas por estado
  const milestoneDates: Record<string, string> = {}
  
  // El primer borrador es la fecha de creación de la OV
  const { data: ov } = await supabase.from('ordenes_venta').select('created_at').eq('id', ovId).single()
  if (ov) milestoneDates['borrador'] = ov.created_at

  historial?.forEach(h => {
    milestoneDates[h.estado_nuevo] = h.timestamp_cambio
  })

  // Si hay OPs, el hito de producción es la creación de la primera OP si no hay historial
  if (ops && ops.length > 0 && !milestoneDates['en_produccion']) {
    milestoneDates['en_produccion'] = ops[0].created_at
  }
  
  // Si hay despachos, el hito de despachada es la creación del primer despacho si no hay historial
  if (despachos && despachos.length > 0 && !milestoneDates['despachada']) {
    milestoneDates['despachada'] = despachos[0].created_at
  }

  const steps = [
    { id: 'borrador', label: 'Borrador' },
    { id: 'confirmada', label: 'Confirmada' },
    { id: 'en_produccion', label: 'Producción' },
    { id: 'despachada', label: 'Despachada' },
    { id: 'entregada', label: 'Entregada' }
  ]

  const confirmationDate = milestoneDates['confirmada'] ? new Date(milestoneDates['confirmada']) : null
  let prevDate = milestoneDates['borrador'] ? new Date(milestoneDates['borrador']) : null

  return steps.map(step => {
    const stepDateStr = milestoneDates[step.id]
    const stepDate = stepDateStr ? new Date(stepDateStr) : null
    const completed = !!stepDate
    
    let daysSinceStart = 0
    let daysBetweenSteps = 0

    if (stepDate && confirmationDate && step.id !== 'borrador') {
      daysSinceStart = Math.max(0, Math.ceil((stepDate.getTime() - confirmationDate.getTime()) / (1000 * 3600 * 24)))
    }

    if (stepDate && prevDate) {
      daysBetweenSteps = Math.max(0, Math.ceil((stepDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24)))
    }

    if (stepDate) prevDate = stepDate

    // Sub-estados para Producción
    let subStates: ProductionSubState[] = []
    if (step.id === 'en_produccion' && ops && ops.length > 0) {
      // Simplificamos los estados de las OPs como sub-estados
      const uniqueStates = [...new Set(ops.map(o => o.estado))]
      subStates = uniqueStates.map(s => ({
        estado: s.replace('_', ' ').toUpperCase(),
        timestamp: ops.find(o => o.estado === s)?.created_at || ''
      }))
    }

    return {
      id: step.id,
      label: step.label,
      completed,
      date: stepDateStr,
      daysSinceStart: completed ? daysSinceStart : undefined,
      daysBetweenSteps: completed ? daysBetweenSteps : undefined,
      subStates: subStates.length > 0 ? subStates : undefined
    }
  })
}
