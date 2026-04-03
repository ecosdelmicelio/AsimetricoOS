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
}

export interface OVPendiente {
  id: string
  codigo: string
  cliente: string
  fecha_entrega: string
  unidades: number
}

export interface TorreData {
  kpis: {
    ops_activas: number
    ops_en_riesgo: number
    ops_completadas_mes: number
    ops_en_calidad: number
    ovs_pendientes: number
    ovs_activas: number
  }
  ops_activas: OPResumen[]
  ovs_pendientes: OVPendiente[]
  ranking_talleres: TallerRanking[]
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

  // Fecha inicio del mes actual
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)

  const [opsResult, ovsResult] = await Promise.all([
    // Todas las OPs (no canceladas)
    supabase
      .from('ordenes_produccion')
      .select('id, codigo, estado, fecha_promesa, created_at, taller_id, ov_id, terceros!taller_id(nombre), ordenes_venta(codigo, terceros!cliente_id(nombre))')
      .neq('estado', 'cancelada')
      .order('fecha_promesa', { ascending: true }) as Promise<{
        data: {
          id: string
          codigo: string
          estado: string
          fecha_promesa: string
          created_at: string | null
          taller_id: string
          terceros: { nombre: string } | null
          ordenes_venta: { codigo: string; terceros: { nombre: string } | null } | null
        }[] | null
        error: { message: string } | null
      }>,

    // OVs confirmadas (sin OP aún — su estado sigue siendo 'confirmada')
    supabase
      .from('ordenes_venta')
      .select('id, codigo, estado, fecha_entrega, terceros!cliente_id(nombre), ov_detalle(cantidad)')
      .eq('estado', 'confirmada')
      .order('created_at', { ascending: false }) as Promise<{
        data: {
          id: string
          codigo: string
          estado: string
          fecha_entrega: string
          terceros: { nombre: string } | null
          ov_detalle: { cantidad: number }[]
        }[] | null
        error: unknown
      }>,
  ])

  const todasOPs = opsResult.data ?? []
  const todasOVs = ovsResult.data ?? []

  // Clasificar OPs
  const ESTADOS_ACTIVOS = ['programada', 'en_corte', 'en_confeccion', 'dupro_pendiente', 'en_terminado', 'en_entregas']
  const ESTADOS_CALIDAD = ['dupro_pendiente']

  const opsActivas = todasOPs.filter(op => ESTADOS_ACTIVOS.includes(op.estado))
  const opsCompletadasMes = todasOPs.filter(op =>
    op.estado === 'completada' &&
    op.created_at &&
    new Date(op.created_at) >= inicioMes
  )
  const opsEnCalidad = todasOPs.filter(op => ESTADOS_CALIDAD.includes(op.estado))

  // Mapear OPs activas con riesgo
  const opsResumen: OPResumen[] = opsActivas.map(op => {
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

  const opsEnRiesgo = opsResumen.filter(op => op.riesgo !== 'ok')

  // OVs pendientes de OP
  const ovsPendientes: OVPendiente[] = todasOVs.map(ov => ({
    id: ov.id,
    codigo: ov.codigo,
    cliente: ov.terceros?.nombre ?? '—',
    fecha_entrega: ov.fecha_entrega,
    unidades: ov.ov_detalle?.reduce((s: number, d: { cantidad: number }) => s + d.cantidad, 0) ?? 0,
  }))

  // Ranking de talleres
  const tallerMap: Record<string, TallerRanking> = {}

  todasOPs.forEach(op => {
    const tid = op.taller_id
    const nombre = op.terceros?.nombre ?? '—'
    if (!tallerMap[tid]) {
      tallerMap[tid] = { id: tid, nombre, completadas: 0, activas: 0, enRiesgo: 0 }
    }
    if (op.estado === 'completada') {
      tallerMap[tid].completadas++
    } else if (ESTADOS_ACTIVOS.includes(op.estado)) {
      tallerMap[tid].activas++
      const { riesgo } = calcularRiesgo(op.fecha_promesa)
      if (riesgo !== 'ok') tallerMap[tid].enRiesgo++
    }
  })

  const ranking = Object.values(tallerMap).sort((a, b) => b.completadas - a.completadas)

  return {
    kpis: {
      ops_activas: opsActivas.length,
      ops_en_riesgo: opsEnRiesgo.length,
      ops_completadas_mes: opsCompletadasMes.length,
      ops_en_calidad: opsEnCalidad.length,
      ovs_pendientes: ovsPendientes.length,
      ovs_activas: todasOVs.filter(ov => ov.estado === 'en_produccion').length,
    },
    ops_activas: opsResumen,
    ovs_pendientes: ovsPendientes,
    ranking_talleres: ranking,
  }
}
