'use server'

import { createClient } from '@/shared/lib/supabase/server'
import type { TallerDashboardData, TallerMesStats } from '@/features/taller/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

const ESTADOS_ACTIVOS = ['programada', 'en_corte', 'en_confeccion', 'dupro_pendiente', 'en_terminado', 'en_entregas']

async function getMesStats(
  supabase: ReturnType<typeof db>,
  taller_id: string,
  mesOffset: number,  // 0 = mes actual, -1 = mes anterior
): Promise<TallerMesStats> {
  const inicio = new Date()
  inicio.setDate(1)
  inicio.setHours(0, 0, 0, 0)
  inicio.setMonth(inicio.getMonth() + mesOffset)
  const fin = new Date(inicio)
  fin.setMonth(fin.getMonth() + 1)

  const { data: ops } = await supabase
    .from('ordenes_produccion')
    .select('id, estado, op_detalle(cantidad_asignada), ov_id')
    .eq('taller_id', taller_id)
    .gte('created_at', inicio.toISOString())
    .lt('created_at', fin.toISOString()) as {
      data: {
        id: string
        estado: string
        ov_id: string | null
        op_detalle: { cantidad_asignada: number }[]
      }[] | null
    }

  const opsList = ops ?? []
  const unidades = opsList.reduce(
    (s, op) => s + op.op_detalle.reduce((ss, d) => ss + d.cantidad_asignada, 0),
    0,
  )
  const ops_completadas = opsList.filter(op => op.estado === 'completada').length

  // Valor: sum ov_detalle.precio_pactado * cantidad por cada OV única
  const ovIds = [...new Set(opsList.map(op => op.ov_id).filter(Boolean))] as string[]
  let valor_cop = 0
  if (ovIds.length > 0) {
    const { data: ovd } = await supabase
      .from('ov_detalle')
      .select('precio_pactado, cantidad, ov_id')
      .in('ov_id', ovIds) as {
        data: { precio_pactado: number; cantidad: number; ov_id: string }[] | null
      }
    valor_cop = (ovd ?? []).reduce((s, r) => s + r.precio_pactado * r.cantidad, 0)
  }

  return { unidades, valor_cop, ops_completadas }
}

export async function getTallerDashboard(taller_id: string): Promise<TallerDashboardData | null> {
  const supabase = db(await createClient())

  // 1. Taller info
  const { data: taller } = await supabase
    .from('terceros')
    .select('id, nombre, estado, capacidad_diaria, lead_time_dias')
    .eq('id', taller_id)
    .single() as {
      data: {
        id: string; nombre: string; estado: string
        capacidad_diaria: number | null; lead_time_dias: number | null
      } | null
    }

  if (!taller) return null

  // 2. Stats mes actual y anterior en paralelo
  const [mes_actual, mes_anterior] = await Promise.all([
    getMesStats(supabase, taller_id, 0),
    getMesStats(supabase, taller_id, -1),
  ])

  // 3. OPs activas
  const { data: opsActivas } = await supabase
    .from('ordenes_produccion')
    .select(`
      id, codigo, estado, fecha_promesa,
      op_detalle(cantidad_asignada),
      ordenes_venta(terceros!cliente_id(nombre))
    `)
    .eq('taller_id', taller_id)
    .in('estado', ESTADOS_ACTIVOS)
    .order('fecha_promesa', { ascending: true }) as {
      data: {
        id: string; codigo: string; estado: string; fecha_promesa: string
        op_detalle: { cantidad_asignada: number }[]
        ordenes_venta: { terceros: { nombre: string } | null } | null
      }[] | null
    }

  const ops_activas = (opsActivas ?? []).map(op => ({
    id:            op.id,
    codigo:        op.codigo,
    estado:        op.estado,
    fecha_promesa: op.fecha_promesa,
    cliente:       op.ordenes_venta?.terceros?.nombre ?? '—',
    unidades:      op.op_detalle.reduce((s, d) => s + d.cantidad_asignada, 0),
  }))

  // 4. Calidad KPIs (últimos 90 días)
  const desde90 = new Date()
  desde90.setDate(desde90.getDate() - 90)

  const { data: inspRows } = await supabase
    .from('inspecciones')
    .select('resultado, cantidad_segundas, ordenes_produccion!inner(taller_id)')
    .eq('ordenes_produccion.taller_id', taller_id)
    .neq('resultado', 'pendiente')
    .gte('timestamp_cierre', desde90.toISOString()) as {
      data: {
        resultado: string
        cantidad_segundas: number | null
        ordenes_produccion: { taller_id: string }
      }[] | null
    }

  const insp = inspRows ?? []
  const total_cerradas = insp.length
  const aceptadas = insp.filter(i => i.resultado === 'aceptada' || i.resultado === 'segundas').length
  const rechazadas = insp.filter(i => i.resultado === 'rechazada').length
  const prendas_segundas = insp.reduce((s, i) => s + (i.cantidad_segundas ?? 0), 0)
  const ftt = total_cerradas > 0 ? Math.round((aceptadas / total_cerradas) * 100) : 0
  const tasa_rechazo = total_cerradas > 0 ? Math.round((rechazadas / total_cerradas) * 100) : 0

  // Top defectos
  const { data: defRows } = await supabase
    .from('novedades_calidad')
    .select(`
      tipo_defecto_id,
      tipos_defecto(codigo, descripcion),
      inspecciones!inner(op_id, ordenes_produccion!inner(taller_id))
    `)
    .eq('inspecciones.ordenes_produccion.taller_id', taller_id) as {
      data: {
        tipo_defecto_id: string
        tipos_defecto: { codigo: string; descripcion: string } | null
        inspecciones: { op_id: string; ordenes_produccion: { taller_id: string } }
      }[] | null
    }

  const conteo = new Map<string, { codigo: string; descripcion: string; veces: number }>()
  for (const row of defRows ?? []) {
    if (!row.tipo_defecto_id || !row.tipos_defecto) continue
    const prev = conteo.get(row.tipo_defecto_id)
    if (prev) prev.veces += 1
    else conteo.set(row.tipo_defecto_id, { codigo: row.tipos_defecto.codigo, descripcion: row.tipos_defecto.descripcion, veces: 1 })
  }
  const top_defectos = [...conteo.values()].sort((a, b) => b.veces - a.veces).slice(0, 5)

  // 5. Puntualidad: OPs completadas en últimos 90 días, comparar timestamp_cierre vs fecha_promesa
  const { data: histRows } = await supabase
    .from('historial_estados')
    .select('entidad_id, timestamp_cambio')
    .eq('entidad', 'op')
    .eq('estado_nuevo', 'completada')
    .gte('timestamp_cambio', desde90.toISOString()) as {
      data: { entidad_id: string; timestamp_cambio: string }[] | null
    }

  // Get fecha_promesa for these OPs
  const completadaIds = (histRows ?? []).map(h => h.entidad_id)
  let puntualidad = 0
  if (completadaIds.length > 0) {
    const { data: opsPuntual } = await supabase
      .from('ordenes_produccion')
      .select('id, fecha_promesa')
      .eq('taller_id', taller_id)
      .in('id', completadaIds) as {
        data: { id: string; fecha_promesa: string }[] | null
      }

    if (opsPuntual && opsPuntual.length > 0) {
      const onTimeCount = opsPuntual.filter(op => {
        const cierre = histRows?.find(h => h.entidad_id === op.id)
        if (!cierre) return false
        return new Date(cierre.timestamp_cambio) <= new Date(op.fecha_promesa)
      }).length
      puntualidad = Math.round((onTimeCount / opsPuntual.length) * 100)
    }
  }

  return {
    taller,
    mes_actual,
    mes_anterior,
    calidad: { ftt, tasa_rechazo, total_cerradas, prendas_segundas, top_defectos },
    puntualidad,
    ops_activas,
  }
}
