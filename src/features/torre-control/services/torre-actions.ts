'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export interface OPResumen {
  id: string
  codigo: string
  estado: string
  fecha_promesa: string
  created_at: string | null
  taller: string
  ov_codigo: string
  cliente: string
  diasRestantes: number
  riesgo: 'ok' | 'alerta' | 'critico'
}

export interface TallerRanking {
  id: string
  nombre: string
  completadas: number
  activas: number
  enRiesgo: number
  capacidad: number
  carga_pct: number
  wip_value: number
}

export interface OVPendiente {
  id: string
  codigo: string
  cliente: string
  fecha_entrega: string
  unidades: number
}

export interface LeadTimeData {
  tipo: 'produccion' | 'materia_prima' | 'comercializado'
  categoria: string
  promedio: number // Dias
}

export interface DefectoRanking {
  tipo: string
  count: number
}

export interface QualityData {
  tasaAprobacion: number
  defectosTop: DefectoRanking[]
  novedadesAbiertas: number
  novedadesCerradas: number
}

export interface TorreData {
  kpis: {
    ops_activas: number
    ops_en_riesgo: number
    ops_completadas_mes: number
    ops_en_calidad: number
    ovs_pendientes: number
    ovs_activas: number
    wip_valor_total: number
  }
  ops_activas: OPResumen[]
  ovs_pendientes: OVPendiente[]
  ranking_talleres: TallerRanking[]
  lead_times: LeadTimeData[]
  calidad: QualityData
  innovation_mix: {
    new_revenue: number
    core_revenue: number
    pct: number
  }
}

function calcularRiesgo(fechaPromesa: string): { diasRestantes: number; riesgo: OPResumen['riesgo'] } {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const promesa = new Date(fechaPromesa)
  promesa.setHours(0, 0, 0, 0)
  const diasRestantes = Math.ceil((promesa.getTime() - hoy.getTime()) / 86_400_000)

  let riesgo: OPResumen['riesgo'] = 'ok'
  if (diasRestantes <= 0) riesgo = 'critico'
  else if (diasRestantes <= 4) riesgo = 'alerta'

  return { diasRestantes, riesgo }
}

export async function getTorreData(): Promise<TorreData> {
  const supabase = db(await createClient())

  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  inicioMes.setHours(0, 0, 0, 0)

  const [
    opsResult, 
    ovsResult, 
    inspeccionesResult, 
    novedadesResult, 
    ocsResult, 
    kardexResult,
    ovDetalleGlobalRes
  ] = await Promise.all([
    // OPs (not cancelled)
    supabase
      .from('ordenes_produccion')
      .select('id, codigo, estado, fecha_promesa, created_at, updated_at, taller_id, ov_id, terceros!taller_id(nombre, capacidad_diaria), ordenes_venta(codigo, total_facturado, terceros!cliente_id(nombre)), op_detalle(cantidad, producto_id, productos(categoria))')
      .neq('estado', 'cancelada')
      .order('fecha_promesa', { ascending: true }),

    // OVs confirmed
    supabase
      .from('ordenes_venta')
      .select('id, codigo, estado, fecha_entrega, created_at, terceros!cliente_id(nombre), ov_detalle(cantidad)')
      .eq('estado', 'confirmada')
      .order('created_at', { ascending: false }),

    // Quality Inspections
    supabase
      .from('inspecciones')
      .select('*'),

    // Quality Findings
    supabase
      .from('novedades_calidad')
      .select('*'),

    // OCs for Supply LeadTimes
    supabase
      .from('ordenes_compra')
      .select('id, codigo, tipo, created_at, fecha_oc'),

    // Kardex for Supply actual receipt dates
    supabase
      .from('kardex')
      .select('oc_id, created_at, fecha_movimiento')
      .not('oc_id', 'is', null),

    // OV Detalle for Innovation Mix
    supabase
      .from('ov_detalle')
      .select('precio_pactado, cantidad, productos(created_at)')
  ])

  const todasOPs = opsResult.data ?? []
  const todasOVs = ovsResult.data ?? []
  const inspecciones = inspeccionesResult.data ?? []
  const novedades = novedadesResult.data ?? []
  const todasOCs = ocsResult.data ?? []
  const kardex = kardexResult.data ?? []
  const ovDetalleGlobal = (ovDetalleGlobalRes as any).data ?? []

  // ---------- KPIs ----------
  const ESTADOS_ACTIVOS = ['programada', 'en_corte', 'en_confeccion', 'dupro_pendiente', 'en_terminado', 'entregada']
  const ESTADOS_CALIDAD = ['dupro_pendiente']

  const opsActivas = todasOPs.filter((op: any) => ESTADOS_ACTIVOS.includes(op.estado))
  const opsCompletadasMes = todasOPs.filter((op: any) =>
    op.estado === 'liquidada' &&
    op.updated_at &&
    new Date(op.updated_at) >= inicioMes
  )
  const opsEnCalidad = todasOPs.filter((op: any) => ESTADOS_CALIDAD.includes(op.estado))

  const opsResumen: OPResumen[] = opsActivas.map((op: any) => {
    const { diasRestantes, riesgo } = calcularRiesgo(op.fecha_promesa)
    return {
      id: op.id,
      codigo: op.codigo,
      estado: op.estado,
      fecha_promesa: op.fecha_promesa,
      created_at: op.created_at,
      taller: op.terceros?.nombre ?? '—',
      ov_codigo: op.ordenes_venta?.codigo ?? '—',
      cliente: op.ordenes_venta?.terceros?.nombre ?? '—',
      diasRestantes,
      riesgo,
    }
  })

  // WIP Value calculation (Proxy: Sum of total_facturado associated via OV)
  const wipTotal = opsActivas.reduce((acc, op: any) => acc + (op.ordenes_venta?.total_facturado || 0), 0)

  const ovsPendientes: OVPendiente[] = todasOVs.map((ov: any) => ({
    id: ov.id,
    codigo: ov.codigo,
    cliente: ov.terceros?.nombre ?? '—',
    fecha_entrega: ov.fecha_entrega,
    unidades: ov.ov_detalle?.reduce((s: number, d: any) => s + d.cantidad, 0) ?? 0,
  }))

  // Ranking Talleres + Load %
  const tallerMap: Record<string, TallerRanking> = {}
  todasOPs.forEach((op: any) => {
    const tid = op.taller_id
    if (!tid) return
    const nombre = op.terceros?.nombre ?? '—'
    const capDiaria = op.terceros?.capacidad_diaria || 0
    const capMensual = capDiaria * 22 // Asumiendo 22 días hábiles
    
    if (!tallerMap[tid]) {
      tallerMap[tid] = { id: tid, nombre, completadas: 0, activas: 0, enRiesgo: 0, capacidad: capMensual, carga_pct: 0, wip_value: 0 }
    }
    
    if (op.estado === 'liquidada') {
      tallerMap[tid].completadas++
    } else if (ESTADOS_ACTIVOS.includes(op.estado)) {
      tallerMap[tid].activas++
      tallerMap[tid].wip_value += (op.ordenes_venta?.total_facturado || 0)
      
      const { riesgo } = calcularRiesgo(op.fecha_promesa)
      if (riesgo !== 'ok') tallerMap[tid].enRiesgo++
      
      // Calcular carga (Unidades actuales / Capacidad)
      const udsActivas = op.op_detalle?.reduce((s: number, d: any) => s + (d.cantidad || 0), 0) || 0
      if (tallerMap[tid].capacidad > 0) {
        tallerMap[tid].carga_pct += (udsActivas / tallerMap[tid].capacidad) * 100
      }
    }
  })
  const ranking = Object.values(tallerMap).sort((a, b) => b.completadas - a.completadas)

  // ---------- LEAD TIMES ----------
  const leadTimes: LeadTimeData[] = []
  const prodStats: Record<string, { totalDays: number; count: number }> = {}
  todasOPs.filter((op: any) => op.estado === 'liquidada' && op.created_at && op.updated_at).forEach((op: any) => {
    const cat = op.op_detalle?.[0]?.productos?.categoria || 'General'
    const days = (new Date(op.updated_at).getTime() - new Date(op.created_at).getTime()) / 86_400_000
    if (!prodStats[cat]) prodStats[cat] = { totalDays: 0, count: 0 }
    prodStats[cat].totalDays += days
    prodStats[cat].count++
  })
  Object.entries(prodStats).forEach(([cat, s]) => {
    leadTimes.push({ tipo: 'produccion', categoria: cat, promedio: Math.round(s.totalDays / s.count) })
  })

  // Supply LeadTimes
  const supplyStats: Record<string, { totalDays: number; count: number }> = {
    'materia_prima': { totalDays: 0, count: 0 },
    'producto_terminado': { totalDays: 0, count: 0 }
  }
  todasOCs.forEach((oc: any) => {
    const receipts = kardex.filter((k: any) => k.oc_id === oc.id)
    if (receipts.length > 0) {
      const firstReceipt = receipts.sort((a, b) => new Date(a.fecha_movimiento || a.created_at).getTime() - new Date(b.fecha_movimiento || b.created_at).getTime())[0]
      const receiptDate = new Date(firstReceipt.fecha_movimiento || firstReceipt.created_at)
      const ocDate = new Date(oc.fecha_oc || oc.created_at)
      const days = (receiptDate.getTime() - ocDate.getTime()) / 86_400_000
      if (supplyStats[oc.tipo]) {
        supplyStats[oc.tipo].totalDays += days
        supplyStats[oc.tipo].count++
      }
    }
  })
  if (supplyStats['materia_prima'].count > 0) {
    leadTimes.push({ tipo: 'materia_prima', categoria: 'Insumos / Telas', promedio: Math.round(supplyStats['materia_prima'].totalDays / supplyStats['materia_prima'].count) })
  }
  if (supplyStats['producto_terminado'].count > 0) {
    leadTimes.push({ tipo: 'comercializado', categoria: 'Compra Directa', promedio: Math.round(supplyStats['producto_terminado'].totalDays / supplyStats['producto_terminado'].count) })
  }

  // ---------- CALIDAD ----------
  const novedadesCriticas = novedades.filter((n: any) => n.severidad === 'critica')
  const tasaAprobacion = inspecciones.length > 0 
    ? ((inspecciones.length - novedadesCriticas.length) / inspecciones.length) * 100 
    : 100
  const defectoMap: Record<string, number> = {}
  novedades.forEach((n: any) => {
    const tipo = n.tipo_defecto || 'Otro'
    defectoMap[tipo] = (defectoMap[tipo] || 0) + 1
  })
  const calidad: QualityData = {
    tasaAprobacion,
    defectosTop: Object.entries(defectoMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([tipo,count])=>({tipo,count})),
    novedadesAbiertas: novedades.filter((n: any) => n.estado === 'abierta').length,
    novedadesCerradas: novedades.filter((n: any) => n.estado === 'cerrada').length
  }

  // ---------- INNOVATION MIX ----------
  const hace6Meses = new Date()
  hace6Meses.setMonth(hace6Meses.getMonth() - 6)
  let newRevenue = 0
  let coreRevenue = 0
  ovDetalleGlobal.forEach((d: any) => {
    const pDate = new Date(d.productos?.created_at || 0)
    const val = (d.precio_pactado || 0) * (d.cantidad || 0)
    if (pDate >= hace6Meses) newRevenue += val
    else coreRevenue += val
  })
  
  return {
    kpis: {
      ops_activas: opsActivas.length,
      ops_en_riesgo: opsResumen.filter(op => op.riesgo !== 'ok').length,
      ops_completadas_mes: opsCompletadasMes.length,
      ops_en_calidad: opsEnCalidad.length,
      ovs_pendientes: ovsPendientes.length,
      ovs_activas: todasOVs.filter((ov: any) => ov.estado === 'en_produccion').length,
      wip_valor_total: wipTotal,
    },
    ops_activas: opsResumen,
    ovs_pendientes: ovsPendientes,
    ranking_talleres: ranking,
    lead_times: leadTimes,
    calidad,
    innovation_mix: {
      new_revenue: newRevenue,
      core_revenue: coreRevenue,
      pct: (newRevenue / (newRevenue + coreRevenue || 1)) * 100
    }
  }
}
