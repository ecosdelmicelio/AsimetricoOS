'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Liquidacion, LiquidacionConOP, OPCompletadaSinLiquidacion, CreateLiquidacionInput } from '@/features/liquidacion/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getLiquidaciones(): Promise<LiquidacionConOP[]> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('liquidaciones')
    .select(`
      *,
      ordenes_produccion(
        codigo,
        terceros!taller_id(nombre),
        ordenes_venta(codigo, terceros!cliente_id(nombre))
      ),
      profiles:aprobado_por(full_name)
    `)
    .order('created_at', { ascending: false }) as { data: LiquidacionConOP[] | null }

  return data ?? []
}

export async function getLiquidacionById(id: string): Promise<LiquidacionConOP | null> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('liquidaciones')
    .select(`
      *,
      ordenes_produccion(
        codigo,
        terceros!taller_id(nombre),
        ordenes_venta(codigo, terceros!cliente_id(nombre))
      ),
      profiles:aprobado_por(full_name)
    `)
    .eq('id', id)
    .single() as { data: LiquidacionConOP | null }

  return data
}

export async function getOPsCompletadasSinLiquidacion(): Promise<OPCompletadaSinLiquidacion[]> {
  const supabase = db(await createClient())

  // Get IDs of OPs that already have a FULL liquidacion (entrega_id null = liquidación total de la OP)
  const { data: liquidacionOPs } = await supabase
    .from('liquidaciones')
    .select('op_id')
    .is('entrega_id', null) as { data: { op_id: string }[] | null }

  const opIdsConLiquidacion = (liquidacionOPs ?? []).map(l => l.op_id)

  const { data: ops } = await supabase
    .from('ordenes_produccion')
    .select(`
      id, codigo, fecha_promesa,
      terceros!taller_id(nombre),
      ordenes_venta(codigo, terceros!cliente_id(nombre))
    `)
    .eq('estado', 'completada')
    .order('fecha_promesa', { ascending: false }) as {
      data: {
        id: string; codigo: string; fecha_promesa: string
        terceros: { nombre: string } | null
        ordenes_venta: { codigo: string; terceros: { nombre: string } | null } | null
      }[] | null
    }

  const opsSinLiquidacion = (ops ?? []).filter(op => !opIdsConLiquidacion.includes(op.id))

  // Estimate penalidades from rejected inspections
  const { data: novedades } = await supabase
    .from('novedades_calidad')
    .select(`
      cantidad_afectada, inspeccion_id,
      tipos_defecto(puntos_penalidad),
      inspecciones!inner(op_id)
    `)
    .in('inspecciones.op_id', opsSinLiquidacion.map(op => op.id)) as {
      data: {
        cantidad_afectada: number
        tipos_defecto: { puntos_penalidad: number } | null
        inspecciones: { op_id: string }
      }[] | null
    }

  // Group penalidades by op_id
  const penalidadesPorOP: Record<string, number> = {}
  ;(novedades ?? []).forEach(n => {
    const op_id = n.inspecciones?.op_id
    if (!op_id) return
    const puntos = (n.tipos_defecto?.puntos_penalidad ?? 0) * n.cantidad_afectada
    penalidadesPorOP[op_id] = (penalidadesPorOP[op_id] ?? 0) + puntos
  })

  return opsSinLiquidacion.map(op => ({
    id: op.id,
    codigo: op.codigo,
    taller: op.terceros?.nombre ?? '—',
    cliente: op.ordenes_venta?.terceros?.nombre ?? '—',
    ov_codigo: op.ordenes_venta?.codigo ?? '—',
    fecha_promesa: op.fecha_promesa,
    penalidades_estimadas: penalidadesPorOP[op.id] ?? 0,
  }))
}

export async function getOPCompletadaById(op_id: string): Promise<OPCompletadaSinLiquidacion | null> {
  const supabase = db(await createClient())

  const { data: op } = await supabase
    .from('ordenes_produccion')
    .select(`
      id, codigo, fecha_promesa,
      terceros!taller_id(nombre),
      ordenes_venta(codigo, terceros!cliente_id(nombre))
    `)
    .eq('id', op_id)
    .eq('estado', 'completada')
    .single() as {
      data: {
        id: string; codigo: string; fecha_promesa: string
        terceros: { nombre: string } | null
        ordenes_venta: { codigo: string; terceros: { nombre: string } | null } | null
      } | null
    }

  if (!op) return null

  // Estimate penalidades
  const { data: novedades } = await supabase
    .from('novedades_calidad')
    .select(`
      cantidad_afectada,
      tipos_defecto(puntos_penalidad),
      inspecciones!inner(op_id)
    `)
    .eq('inspecciones.op_id', op_id) as {
      data: {
        cantidad_afectada: number
        tipos_defecto: { puntos_penalidad: number } | null
      }[] | null
    }

  const penalidades = (novedades ?? []).reduce((sum, n) => {
    return sum + (n.tipos_defecto?.puntos_penalidad ?? 0) * n.cantidad_afectada
  }, 0)

  return {
    id: op.id,
    codigo: op.codigo,
    taller: op.terceros?.nombre ?? '—',
    cliente: op.ordenes_venta?.terceros?.nombre ?? '—',
    ov_codigo: op.ordenes_venta?.codigo ?? '—',
    fecha_promesa: op.fecha_promesa,
    penalidades_estimadas: penalidades,
  }
}

export async function createLiquidacion(input: CreateLiquidacionInput): Promise<{ data: Liquidacion | null; error?: string }> {
  const supabase = db(await createClient())

  const costo_total = input.costo_servicio_taller - input.penalidades_calidad
  const costo_unitario_final = input.unidades_aprobadas > 0
    ? costo_total / input.unidades_aprobadas
    : 0

  const { data, error } = await supabase
    .from('liquidaciones')
    .insert({
      op_id: input.op_id,
      entrega_id: input.entrega_id ?? null,
      costo_servicio_taller: input.costo_servicio_taller,
      penalidades_calidad: input.penalidades_calidad,
      costo_total,
      unidades_aprobadas: input.unidades_aprobadas,
      costo_unitario_final,
      notas: input.notas ?? null,
      estado: 'pendiente',
    })
    .select()
    .single() as { data: Liquidacion | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }
  revalidatePath('/liquidacion')
  return { data }
}

export async function getLiquidacionesByOP(opId: string): Promise<{ id: string; entrega_id: string | null }[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('liquidaciones')
    .select('id, entrega_id')
    .eq('op_id', opId) as { data: { id: string; entrega_id: string | null }[] | null }
  return data ?? []
}

export async function aprobarLiquidacion(liquidacion_id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('liquidaciones')
    .update({
      estado: 'aprobada',
      aprobado_por: user?.id ?? null,
      fecha_aprobacion: new Date().toISOString(),
    })
    .eq('id', liquidacion_id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/liquidacion')
  revalidatePath(`/liquidacion/${liquidacion_id}`)
  return {}
}
