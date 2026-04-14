'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

const FASES = ['draft', 'ops_review', 'sampling', 'fitting', 'client_review', 'approved', 'graduated'] as const

export interface DashboardGeneralData {
  funnel: { status: string; count: number }[]
  cancelados: number
  agingItems: { temp_id: string; nombre_proyecto: string; status: string; diasSinMovimiento: number }[]
  avgLeadtimeDias: number | null
  totalActivos: number
  totalGraduados: number
  totalCancelados: number
  hitRateByCliente: { clienteNombre: string; total: number; graduados: number; pct: number }[]
  proximosVencer: { temp_id: string; nombre_proyecto: string; fecha_compromiso: string; diasRestantes: number }[]
  versionesPromedio: number | null
}

export async function getDashboardGeneral(): Promise<{ data: DashboardGeneralData | null; error: string | null }> {
  const supabase = db(await createClient())

  const { data: desarrollos, error } = await supabase
    .from('desarrollo')
    .select(`
      id, temp_id, nombre_proyecto, status, fecha_compromiso,
      terceros ( nombre ),
      desarrollo_versiones ( id, version_n ),
      desarrollo_transiciones ( estado_nuevo, created_at )
    `)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  if (!desarrollos) return { data: null, error: null }

  const now = Date.now()

  // Funnel count
  const funnel = FASES.map(s => ({
    status: s,
    count: desarrollos.filter((d: { status: string }) => d.status === s).length,
  }))

  const cancelados = desarrollos.filter((d: { status: string }) => d.status === 'cancelled').length

  // Aging: días sin cambio de estado
  type DesarrolloRow = {
    temp_id: string
    nombre_proyecto: string
    status: string
    fecha_compromiso: string | null
    terceros: { nombre: string } | null
    desarrollo_versiones: Array<{ id: string; version_n: number }>
    desarrollo_transiciones: Array<{ estado_nuevo: string; created_at: string }>
  }
  const activos = (desarrollos as DesarrolloRow[]).filter(
    d => !['graduated', 'cancelled'].includes(d.status)
  )

  const agingItems = activos
    .map(d => {
      const sorted = [...d.desarrollo_transiciones].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const last = sorted[0]
      const diasSinMovimiento = last
        ? Math.floor((now - new Date(last.created_at).getTime()) / (1000 * 3600 * 24))
        : 0
      return { temp_id: d.temp_id, nombre_proyecto: d.nombre_proyecto, status: d.status, diasSinMovimiento }
    })
    .filter(d => d.diasSinMovimiento > 7)
    .sort((a, b) => b.diasSinMovimiento - a.diasSinMovimiento)

  // Lead time promedio (graduated)
  const graduados = (desarrollos as DesarrolloRow[]).filter(d => d.status === 'graduated')
  const leadtimes = graduados
    .map(d => {
      const transiciones = [...d.desarrollo_transiciones].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      const primera = transiciones[0]
      const ultima = [...transiciones].reverse()[0]
      if (!primera || !ultima) return null
      return (new Date(ultima.created_at).getTime() - new Date(primera.created_at).getTime()) / (1000 * 3600 * 24)
    })
    .filter((v): v is number => v !== null)
  const avgLeadtimeDias = leadtimes.length > 0
    ? Math.round(leadtimes.reduce((a, b) => a + b, 0) / leadtimes.length)
    : null

  // Hit rate por cliente
  type ClienteMap = Record<string, { total: number; graduados: number; nombre: string }>
  const clienteMap: ClienteMap = {}
  for (const d of desarrollos as DesarrolloRow[]) {
    const nombre = d.terceros?.nombre ?? 'Interno'
    if (!clienteMap[nombre]) clienteMap[nombre] = { total: 0, graduados: 0, nombre }
    clienteMap[nombre].total++
    if (d.status === 'graduated') clienteMap[nombre].graduados++
  }
  const hitRateByCliente = Object.values(clienteMap)
    .map(c => ({ clienteNombre: c.nombre, total: c.total, graduados: c.graduados, pct: Math.round((c.graduados / c.total) * 100) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Próximos a vencer (activos con fecha_compromiso en los próximos 14 días)
  const proximosVencer = activos
    .filter(d => d.fecha_compromiso)
    .map(d => ({
      temp_id: d.temp_id,
      nombre_proyecto: d.nombre_proyecto,
      fecha_compromiso: d.fecha_compromiso!,
      diasRestantes: Math.ceil((new Date(d.fecha_compromiso!).getTime() - now) / (1000 * 3600 * 24)),
    }))
    .filter(d => d.diasRestantes <= 14)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .slice(0, 5)

  // Versiones promedio por desarrollo
  const totalVersiones = (desarrollos as DesarrolloRow[]).reduce((acc, d) => acc + (d.desarrollo_versiones?.length ?? 0), 0)
  const versionesPromedio = desarrollos.length > 0
    ? Math.round((totalVersiones / desarrollos.length) * 10) / 10
    : null

  return {
    data: {
      funnel,
      cancelados,
      agingItems,
      avgLeadtimeDias,
      totalActivos: activos.length,
      totalGraduados: graduados.length,
      totalCancelados: cancelados,
      hitRateByCliente,
      proximosVencer,
      versionesPromedio,
    },
    error: null,
  }
}

export interface DashboardOpsData {
  bandejaOpsReview: Array<{
    id: string
    temp_id: string
    nombre_proyecto: string
    tipo_producto: string
    prioridad: string
    fecha_compromiso: string | null
    diasEnFase: number
    versionActual: number
    tieneViabilidad: boolean
  }>
  statsViabilidad: { aprobados: number; conReservas: number; rechazados: number }
  promedioEvaluacionDias: number | null
}

export async function getDashboardOps(): Promise<{ data: DashboardOpsData | null; error: string | null }> {
  const supabase = db(await createClient())

  const { data: opsReview, error } = await supabase
    .from('desarrollo')
    .select(`
      id, temp_id, nombre_proyecto, tipo_producto, prioridad, fecha_compromiso,
      desarrollo_versiones ( version_n ),
      desarrollo_transiciones ( estado_nuevo, created_at ),
      desarrollo_viabilidad_ops ( veredicto )
    `)
    .eq('status', 'ops_review')
    .order('fecha_compromiso', { ascending: true, nullsFirst: false })

  if (error) return { data: null, error: error.message }

  const now = Date.now()
  type OpsRow = {
    id: string; temp_id: string; nombre_proyecto: string
    tipo_producto: string; prioridad: string; fecha_compromiso: string | null
    desarrollo_versiones: Array<{ version_n: number }>
    desarrollo_transiciones: Array<{ estado_nuevo: string; created_at: string }>
    desarrollo_viabilidad_ops: Array<{ veredicto: string }>
  }

  const bandejaOpsReview = (opsReview as OpsRow[]).map(d => {
    const transicionAOps = [...d.desarrollo_transiciones]
      .filter(t => t.estado_nuevo === 'ops_review')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    const diasEnFase = transicionAOps
      ? Math.floor((now - new Date(transicionAOps.created_at).getTime()) / (1000 * 3600 * 24))
      : 0
    const versionActual = Math.max(...d.desarrollo_versiones.map(v => v.version_n), 1)
    const tieneViabilidad = (d.desarrollo_viabilidad_ops?.length ?? 0) > 0
    return { id: d.id, temp_id: d.temp_id, nombre_proyecto: d.nombre_proyecto, tipo_producto: d.tipo_producto, prioridad: d.prioridad, fecha_compromiso: d.fecha_compromiso, diasEnFase, versionActual, tieneViabilidad }
  })

  // Stats viabilidad histórica
  const { data: viabilidades } = await supabase
    .from('desarrollo_viabilidad_ops')
    .select('veredicto')

  const statsViabilidad = {
    aprobados:   (viabilidades ?? []).filter((v: { veredicto: string }) => v.veredicto === 'aprobado').length,
    conReservas: (viabilidades ?? []).filter((v: { veredicto: string }) => v.veredicto === 'aprobado_con_reservas').length,
    rechazados:  (viabilidades ?? []).filter((v: { veredicto: string }) => v.veredicto === 'rechazado').length,
  }

  // Tiempo promedio en ops_review (transitioned out)
  const { data: transOps } = await supabase
    .from('desarrollo_transiciones')
    .select('duracion_fase_seg')
    .eq('estado_anterior', 'ops_review')
    .not('duracion_fase_seg', 'is', null)

  const duraciones = (transOps ?? []).map((t: { duracion_fase_seg: number }) => t.duracion_fase_seg)
  const promedioEvaluacionDias = duraciones.length > 0
    ? Math.round(duraciones.reduce((a: number, b: number) => a + b, 0) / duraciones.length / 3600 / 24)
    : null

  return { data: { bandejaOpsReview, statsViabilidad, promedioEvaluacionDias }, error: null }
}
