'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { crearNotificacion } from '@/shared/services/notification-actions'
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

  // Fetch OP info to determine if it has an OV and a client
  const { data: opData } = await supabase
    .from('ordenes_produccion')
    .select('ov_id, codigo, ordenes_venta(terceros!cliente_id(nombre))')
    .eq('id', input.op_id)
    .single() as { data: any }

  let prefix = 'ASI'
  if (opData?.ordenes_venta?.terceros?.nombre) {
    const clientName = opData.ordenes_venta.terceros.nombre.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '')
    // Take up to 6 characters of the client's first word, fallback to ASI if empty
    prefix = clientName.substring(0, 6) || 'ASI'
  }

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
      bin_codigo: null,
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

  await supabase
    .from('ordenes_produccion')
    .update({ estado: 'entregada' })
    .eq('id', input.op_id)
    .eq('estado', 'en_terminado')

  // 3. Notificar al Orquestador
  await crearNotificacion({
    profile_role: 'orquestador',
    titulo: '🚚 Nuevo Despacho de Taller',
    mensaje: `El taller ha enviado ${cantidad_entregada} unidades de la OP-${opData.codigo}. Pendiente inspección.`,
    data: { op_id: input.op_id, entrega_id: entrega.id }
  })

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

  // 3. Si fue aceptada, ingresar al inventario (Kardex + Bines)
  if (resultado === 'aceptada') {
    // 3.1. Obtener datos de la entrega para el Kardex
    const { data: entregaData } = await supabase
      .from('entregas')
      .select('*, ordenes_produccion(ov_id), entrega_detalle(*)')
      .eq('id', entregaId)
      .single() as { data: any }

    if (entregaData) {
      // 3.2. Buscar bodega (principal o central)
      const { data: bodega } = await supabase
        .from('bodegas')
        .select('id')
        .or('tipo.eq.principal,nombre.ilike.%asimetrico central%')
        .limit(1)
        .maybeSingle() as { data: { id: string } | null }

      if (bodega) {
        const { data: tipoMov } = await supabase
          .from('kardex_tipos_movimiento')
          .select('id')
          .eq('codigo', 'ENTRADA_PRODUCCION')
          .maybeSingle() as { data: { id: string } | null }

        if (tipoMov) {
          const kardexInserts = entregaData.entrega_detalle.map((l: any) => ({
            producto_id: l.producto_id,
            talla: l.talla,
            bodega_id: bodega.id,
            tipo_movimiento_id: tipoMov.id,
            documento_tipo: 'entrega',
            documento_id: entregaId,
            ov_id: entregaData.ordenes_produccion?.ov_id,
            bin_id: null,
            cantidad: l.cantidad_entregada,
            unidad: 'unidades',
            costo_unitario: 0,
            costo_total: 0,
            fecha_movimiento: now,
            registrado_por: user.id,
            notas: `Entregado por Taller - Pendiente Recibo`,
          }))

          const { error: kError } = await supabase.from('kardex').insert(kardexInserts)
          if (kError) console.error('Error en Kardex:', kError)
        }
      }
    }

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

  // Estado se actualiza cuando se liquida, no automáticamente en entregas
}
