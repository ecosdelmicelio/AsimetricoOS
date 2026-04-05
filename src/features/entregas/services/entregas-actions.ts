'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { CreateEntregaInput, EntregaConDetalle } from '@/features/entregas/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function createEntrega(input: CreateEntregaInput & { reporte_corte_id?: string }) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Si está vinculado a un corte específico, validar cantidad
  let cantidad_cortada = 0
  if (input.reporte_corte_id) {
    const { data: reporte } = await supabase
      .from('reporte_corte')
      .select('cantidad_total_cortada')
      .eq('id', input.reporte_corte_id)
      .single() as { data: { cantidad_total_cortada: number | null } | null }

    cantidad_cortada = reporte?.cantidad_total_cortada || 0

    // Sumar entregas previas del mismo corte
    const { data: entregas_prev } = await supabase
      .from('entregas')
      .select('entrega_detalle(cantidad_entregada)')
      .eq('reporte_corte_id', input.reporte_corte_id) as {
        data: { entrega_detalle: { cantidad_entregada: number }[] }[] | null
      }

    const cantidad_ya_entregada = entregas_prev
      ?.reduce((sum, e) => sum + e.entrega_detalle.reduce((s, d) => s + d.cantidad_entregada, 0), 0) || 0

    // Validar que no se intente entregar más de lo cortado
    const cantidad_a_entregar = input.lineas.reduce((sum, l) => sum + l.cantidad_entregada, 0)
    if (cantidad_ya_entregada + cantidad_a_entregar > cantidad_cortada) {
      return {
        error: `No puedes entregar ${cantidad_ya_entregada + cantidad_a_entregar} uds. Solo se cortaron ${cantidad_cortada}. Ya entregadas: ${cantidad_ya_entregada}`,
      }
    }
  }

  // Auto-incrementar numero_entrega por OP
  const { data: last } = await supabase
    .from('entregas')
    .select('numero_entrega')
    .eq('op_id', input.op_id)
    .order('numero_entrega', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { numero_entrega: number } | null }

  const numero_entrega = (last?.numero_entrega ?? 0) + 1

  // Calcular totales
  const cantidad_entregada = input.lineas.reduce((sum, l) => sum + l.cantidad_entregada, 0)
  const cantidad_faltante = cantidad_cortada > 0 ? Math.max(0, cantidad_cortada - cantidad_entregada) : 0
  const es_faltante = cantidad_faltante > 0

  // Generar BIN único para esta entrega
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const bin_codigo = `BIN-E${numero_entrega}-${fecha}`

  // 1. Crear cabecera
  const { data: entrega, error: entError } = await supabase
    .from('entregas')
    .insert({
      op_id: input.op_id,
      reporte_corte_id: input.reporte_corte_id || null,
      numero_entrega,
      fecha_entrega: input.fecha_entrega,
      notas: input.notas ?? null,
      estado: 'recibida',
      bin_codigo,
      cantidad_cortada,
      cantidad_entregada,
      cantidad_faltante,
      es_faltante,
    })
    .select('id, numero_entrega')
    .single() as { data: { id: string; numero_entrega: number } | null; error: { message: string } | null }

  if (entError || !entrega) return { error: entError?.message ?? 'Error creando entrega' }

  // 2. Insertar líneas de detalle
  const lineas = input.lineas
    .filter(l => l.cantidad_entregada > 0)
    .map(l => ({
      entrega_id: entrega.id,
      producto_id: l.producto_id,
      talla: l.talla,
      cantidad_entregada: l.cantidad_entregada,
    }))

  if (lineas.length === 0) return { error: 'Agrega al menos una unidad' }

  const { error: detError } = await supabase
    .from('entrega_detalle')
    .insert(lineas) as { error: { message: string } | null }

  if (detError) return { error: detError.message }

  revalidatePath(`/ordenes-produccion/${input.op_id}`)
  return { data: { id: entrega.id, numero_entrega: entrega.numero_entrega } }
}

export async function getEntregaById(entregaId: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('entregas')
    .select('id, op_id, numero_entrega, entrega_detalle ( cantidad_entregada )')
    .eq('id', entregaId)
    .single() as {
      data: { id: string; op_id: string; numero_entrega: number; entrega_detalle: { cantidad_entregada: number }[] } | null
      error: { message: string } | null
    }
  if (error || !data) return null
  const totalUnidades = data.entrega_detalle.reduce((s, d) => s + d.cantidad_entregada, 0)
  return { id: data.id, op_id: data.op_id, numero_entrega: data.numero_entrega, totalUnidades }
}

export async function getEntregasByOP(opId: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('entregas')
    .select(`
      *,
      entrega_detalle ( *, productos ( nombre, referencia, color ) )
    `)
    .eq('op_id', opId)
    .order('numero_entrega', { ascending: true }) as {
      data: EntregaConDetalle[] | null
      error: { message: string } | null
    }

  if (error) return { error: error.message, data: [] as EntregaConDetalle[] }
  return { data: data ?? [] }
}

export async function resolverFRI(
  entregaId: string,
  opId: string,
  resultado: 'aceptada' | 'rechazada',
  notas?: string,
) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const now = new Date().toISOString()

  // 1. Crear y cerrar la inspección FRI en un solo insert
  const { error: inspeccionError } = await supabase
    .from('inspecciones')
    .insert({
      op_id: opId,
      entrega_id: entregaId,
      tipo: 'fri',
      resultado,
      inspector_id: user.id,
      notas: notas ?? null,
      timestamp_inicio: now,
      timestamp_cierre: now,
    }) as { error: { message: string } | null }

  if (inspeccionError) return { error: inspeccionError.message }

  // 2. Actualizar estado de la entrega
  const { error: entError } = await supabase
    .from('entregas')
    .update({ estado: resultado })
    .eq('id', entregaId) as { error: { message: string } | null }

  if (entError) return { error: entError.message }

  // 3. Si fue aceptada, verificar si la OP puede completarse
  if (resultado === 'aceptada') {
    await checkAutoCompleteOP(supabase, opId)
  }

  revalidatePath(`/ordenes-produccion/${opId}`)
  return { data: true }
}

async function checkAutoCompleteOP(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  opId: string,
) {
  // Total unidades de la OP
  const { data: opDetalles } = await supabase
    .from('op_detalle')
    .select('cantidad_asignada')
    .eq('op_id', opId) as { data: { cantidad_asignada: number }[] | null }

  const totalOP = (opDetalles ?? []).reduce((s: number, d: { cantidad_asignada: number }) => s + d.cantidad_asignada, 0)

  // Total unidades en entregas aceptadas
  const { data: entregasAceptadas } = await supabase
    .from('entregas')
    .select('entrega_detalle ( cantidad_entregada )')
    .eq('op_id', opId)
    .eq('estado', 'aceptada') as {
      data: { entrega_detalle: { cantidad_entregada: number }[] }[] | null
    }

  const totalAceptado = (entregasAceptadas ?? []).reduce(
    (s: number, e: { entrega_detalle: { cantidad_entregada: number }[] }) =>
      s + e.entrega_detalle.reduce((ss: number, d: { cantidad_entregada: number }) => ss + d.cantidad_entregada, 0),
    0,
  )

  if (totalAceptado >= totalOP && totalOP > 0) {
    await supabase
      .from('ordenes_produccion')
      .update({ estado: 'completada' })
      .eq('id', opId)
      .eq('estado', 'en_entregas')
  }
}
