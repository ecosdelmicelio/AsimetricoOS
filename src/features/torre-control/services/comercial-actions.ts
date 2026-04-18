'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export interface ComercialKPIs {
  ovs_mes: number
  revenue_mes: number
  ticket_promedio: number
  unidades_vendidas_mes: number
  clientes_activos: number
  ovs_sin_op: number
  retention_rate: number
}

export interface PipelineStage {
  estado: string
  label: string
  count: number
  valor: number
}

export interface ClienteRanking {
  nombre: string
  ovs: number
  revenue: number
  unidades: number
  ltv: number
}

export interface DesarrolloSummary {
  activos: number
  en_sampling: number
  pendientes_cliente: number
  top_categorias: { categoria: string; count: number }[]
}

export interface ComercialData {
  kpis: ComercialKPIs
  pipeline: PipelineStage[]
  top_clientes: ClienteRanking[]
  desarrollo: DesarrolloSummary
  ovs_recientes: {
    id: string
    codigo: string
    cliente: string
    total: number
    estado: string
    fecha: string
  }[]
}

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  confirmada: 'Confirmada',
  en_produccion: 'En Producción',
  despachada: 'Despachada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

export async function getComercialData(): Promise<ComercialData> {
  const supabase = db(await createClient())

  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const inicioMesPrevio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString()

  const [
    ovsRes, 
    ovDetalleRes, 
    ovsSinOPRes, 
    desarrollosRes
  ] = await Promise.all([
    // Todas las OVs (last 60 days)
    supabase
      .from('ordenes_venta')
      .select('id, codigo, estado, created_at, total_facturado, fecha_entrega, cliente_id, terceros!cliente_id(id, nombre)')
      .gte('created_at', inicioMesPrevio)
      .order('created_at', { ascending: false }),

    // Detalle de OVs del mes
    supabase
      .from('ov_detalle')
      .select('precio_pactado, cantidad, ordenes_venta!inner(created_at, cliente_id, terceros!cliente_id(nombre))')
      .gte('ordenes_venta.created_at', inicioMes),

    // OVs confirmadas sin OP
    supabase
      .from('ordenes_venta')
      .select('id')
      .eq('estado', 'confirmada'),

    // Desarrollos Activos
    supabase
      .from('desarrollo')
      .select('id, status, categoria_producto')
      .not('status', 'in', '("done", "descartado")')
  ])

  const ovs = ovsRes.data || []
  const ovDetalle = ovDetalleRes.data || []
  const ovsSinOP = ovsSinOPRes.data || []
  const desarrollos = (desarrollosRes as any).data || []

  // ---------- KPIs ----------
  const inicioMesStr = inicioMes.toISOString()
  const ovsMes = ovs.filter((ov: any) => ov.created_at >= inicioMesStr)
  
  // Retention Logic
  const clientesMesPasado = new Set(ovs.filter((ov: any) => ov.created_at < inicioMesStr).map((ov: any) => ov.cliente_id))
  const clientesEsteMes = new Set(ovsMes.map((ov: any) => ov.cliente_id))
  const retenidos = [...clientesEsteMes].filter(id => clientesMesPasado.has(id)).length
  const retentionRate = clientesMesPasado.size > 0 ? (retenidos / clientesMesPasado.size) * 100 : 0

  const revenueMes = ovDetalle.reduce((s: number, d: any) => s + (d.precio_pactado * d.cantidad), 0)
  const unidadesMes = ovDetalle.reduce((s: number, d: any) => s + d.cantidad, 0)
  const ticketPromedio = ovsMes.length > 0 
    ? ovsMes.reduce((s: number, ov: any) => s + (ov.total_facturado || 0), 0) / ovsMes.length 
    : 0

  // Clientes únicos activos
  const clientesUnicos = clientesEsteMes

  // ---------- PIPELINE ----------
  const estadoCounts: Record<string, { count: number; valor: number }> = {}
  const estadoOrden = ['borrador', 'confirmada', 'en_produccion', 'despachada', 'entregada']
  estadoOrden.forEach(e => { estadoCounts[e] = { count: 0, valor: 0 } })
  ovs.forEach((ov: any) => {
    if (estadoCounts[ov.estado]) {
      estadoCounts[ov.estado].count++
      estadoCounts[ov.estado].valor += ov.total_facturado || 0
    }
  })
  const pipeline: PipelineStage[] = estadoOrden.map(estado => ({
    estado,
    label: ESTADO_LABELS[estado] || estado,
    count: estadoCounts[estado]?.count || 0,
    valor: estadoCounts[estado]?.valor || 0,
  }))

  // ---------- TOP CLIENTES ----------
  const clienteMap: Record<string, ClienteRanking> = {}
  
  // Calculate LTV historical
  const ltvMap: Record<string, number> = {}
  ovs.forEach((ov: any) => {
    const nombre = (ov.terceros as any)?.nombre || 'Desconocido'
    ltvMap[nombre] = (ltvMap[nombre] || 0) + (ov.total_facturado || 0)
  })

  ovDetalle.forEach((d: any) => {
    const nombre = d.ordenes_venta?.terceros?.nombre || 'Desconocido'
    if (!clienteMap[nombre]) {
      clienteMap[nombre] = { 
        nombre, 
        ovs: 0, 
        revenue: 0, 
        unidades: 0, 
        ltv: ltvMap[nombre] || 0 
      }
    }
    clienteMap[nombre].revenue += d.precio_pactado * d.cantidad
    clienteMap[nombre].unidades += d.cantidad
  })
  
  // Count OVs per client in current month
  ovsMes.forEach((ov: any) => {
    const nombre = (ov.terceros as any)?.nombre || 'Desconocido'
    if (clienteMap[nombre]) clienteMap[nombre].ovs++
  })

  const topClientes = Object.values(clienteMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  // ---------- OVs RECIENTES ----------
  const ovsRecientes = ovs.slice(0, 10).map((ov: any) => ({
    id: ov.id,
    codigo: ov.codigo,
    cliente: (ov.terceros as any)?.nombre || '—',
    total: ov.total_facturado || 0,
    estado: ov.estado,
    fecha: ov.created_at,
  }))

  // ---------- DESARROLLO SUMMARY ----------
  const devCatMap: Record<string, number> = {}
  desarrollos.forEach((d: any) => {
    const cat = d.categoria_producto || 'Otros'
    devCatMap[cat] = (devCatMap[cat] || 0) + 1
  })
  
  const desarrollo: DesarrolloSummary = {
    activos: desarrollos.length,
    en_sampling: desarrollos.filter((d: any) => d.status === 'sampling').length,
    pendientes_cliente: desarrollos.filter((d: any) => d.status === 'client_approval').length,
    top_categorias: Object.entries(devCatMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([categoria, count]) => ({ categoria, count }))
  }

  return {
    kpis: {
      ovs_mes: ovsMes.length,
      revenue_mes: revenueMes,
      ticket_promedio: ticketPromedio,
      unidades_vendidas_mes: unidadesMes,
      clientes_activos: clientesUnicos.size,
      ovs_sin_op: ovsSinOP.length,
      retention_rate: retentionRate,
    },
    pipeline,
    top_clientes: topClientes,
    desarrollo,
    ovs_recientes: ovsRecientes,
  }
}
