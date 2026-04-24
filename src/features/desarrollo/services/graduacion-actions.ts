'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

/**
 * Gradúa un desarrollo creando un producto en el catálogo con las condiciones
 * comerciales definidas durante el proceso de desarrollo.
 *
 * Requiere:
 * - Triple aprobación completa (ops + cliente + director)
 * - Condiciones comerciales con al menos moq_producto y leadtime_total_dias
 */
export async function graduarDesarrollo(desarrolloId: string) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // 1. Cargar el desarrollo con versión y condiciones
  const { data: desarrollo, error: devError } = await supabase
    .from('desarrollo')
    .select(`
      *,
      desarrollo_versiones ( *, desarrollo_condiciones ( * ), desarrollo_condiciones_material ( * ) ),
      desarrollo_condiciones ( * )
    `)
    .eq('id', desarrolloId)
    .single()

  if (devError || !desarrollo) return { error: devError?.message ?? 'Desarrollo no encontrado' }

  if (desarrollo.status === 'graduated') return { error: 'Este desarrollo ya está graduado' }
  if (desarrollo.status === 'cancelled') return { error: 'No se puede graduar un desarrollo cancelado' }

  // 2. Verificar triple aprobación en la última versión
  const versionesOrdenadas = [...(desarrollo.desarrollo_versiones ?? [])].sort(
    (a: { version_n: number }, b: { version_n: number }) => b.version_n - a.version_n
  )
  const ultimaVersion = versionesOrdenadas[0]

  if (!ultimaVersion) return { error: 'No hay versiones para graduar' }
  if (!ultimaVersion.aprobado_ops) return { error: 'Falta aprobación de Operaciones' }
  if (!ultimaVersion.aprobado_cliente) return { error: 'Falta aprobación del Cliente' }
  if (!ultimaVersion.aprobado_director) return { error: 'Falta aprobación del Director de Diseño' }

  // 3. Cargar condiciones comerciales
  const condiciones = (desarrollo.desarrollo_condiciones ?? [])[0]

  // 4. Validación pre-graduación: MOQ y leadtime obligatorios
  if (!condiciones?.moq_producto && !condiciones?.moq_proveedor) {
    return { error: 'Define el MOQ antes de graduar (en la pestaña Condiciones)' }
  }
  if (!condiciones?.leadtime_total_dias) {
    return { error: 'Define el lead time antes de graduar (en la pestaña Condiciones)' }
  }

  // 5. Calcular MOQ para fabricados (máximo de MOQs implícitos por material)
  let moqFinal = condiciones.moq_producto ?? condiciones.moq_proveedor
  if (desarrollo.tipo_producto === 'fabricado') {
    const materialCondiciones = ultimaVersion.desarrollo_condiciones_material ?? []
    if (materialCondiciones.length > 0) {
      const moqImplicitos = materialCondiciones
        .map((m: { moq_implicito_producto: number | null }) => m.moq_implicito_producto ?? 0)
        .filter((v: number) => v > 0)
      if (moqImplicitos.length > 0) {
        moqFinal = Math.max(...moqImplicitos)
      }
    }
  }

  // 6. Generar referencia del producto desde temp_id
  const referencia = `${desarrollo.temp_id}-PROD`

  // 7. Crear el producto
  const { data: producto, error: prodError } = await supabase
    .from('productos')
    .insert({
      referencia,
      nombre:          desarrollo.nombre_proyecto,
      categoria:       desarrollo.categoria_producto,
      tipo_producto:   desarrollo.tipo_producto,
      estado:          'activo',
      minimo_orden:    moqFinal ?? null,
      multiplo_orden:  condiciones.multiplo_orden ?? null,
      leadtime_dias:   condiciones.leadtime_total_dias ?? null,
      tallas:          condiciones.tallas_disponibles ?? ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      precio_base:     condiciones.precio_referencia ?? null,
      // 🏭 Atributos Técnicos/Comerciales Heredados
      nombre_comercial:       desarrollo.nombre_comercial ?? desarrollo.nombre_proyecto,
      subpartida_arancelaria: desarrollo.subpartida_arancelaria ?? null,
      composicion:            desarrollo.composicion ?? null,
      instrucciones_cuidado:  desarrollo.instrucciones_cuidado ?? null,
      requiere_inspeccion:    (ultimaVersion.puntos_criticos_calidad?.length ?? 0) > 0,
    })
    .select('id')
    .single()

  if (prodError || !producto) return { error: prodError?.message ?? 'Error creando producto' }

  // 8. Crear producto_condiciones con detalle extendido
  if (condiciones) {
    await supabase.from('producto_condiciones').insert({
      producto_id:              producto.id,
      proveedor_id:             condiciones.proveedor_id ?? null,
      moq_proveedor:            condiciones.moq_proveedor ?? null,
      moq_unidad:               condiciones.moq_unidad ?? null,
      leadtime_produccion_dias: condiciones.leadtime_produccion_dias ?? null,
      leadtime_envio_dias:      condiciones.leadtime_envio_dias ?? null,
      incoterm:                 condiciones.incoterm ?? null,
      puerto_origen:            condiciones.puerto_origen ?? null,
      moneda:                   condiciones.moneda ?? 'COP',
      precio_negociado:         condiciones.precio_referencia ?? null,
      condiciones_pago:         condiciones.condiciones_pago ?? null,
      empaque_minimo:           condiciones.empaque_minimo ?? null,
      tallas_disponibles:       condiciones.tallas_disponibles ?? null,
      colores_disponibles:      condiciones.colores_disponibles ?? null,
      vigencia_precio:          condiciones.vigencia_precio ?? null,
      activo:                   true,
    })
  }

  // 9. Marcar el desarrollo como graduado y enlazar producto
  await supabase.from('desarrollo').update({
    status:           'graduated',
    producto_final_id: producto.id,
    updated_at:       new Date().toISOString(),
  }).eq('id', desarrolloId)

  // 10. Registrar la transición
  const now = new Date()
  const { data: ultimaTransicion } = await supabase
    .from('desarrollo_transiciones')
    .select('created_at')
    .eq('desarrollo_id', desarrolloId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const duracion = ultimaTransicion
    ? Math.floor((now.getTime() - new Date(ultimaTransicion.created_at).getTime()) / 1000)
    : null

  await supabase.from('desarrollo_transiciones').insert({
    desarrollo_id:      desarrolloId,
    estado_anterior:    desarrollo.status,
    estado_nuevo:       'graduated',
    duracion_fase_seg:  duracion,
    usuario_id:         user.id,
    notas:              `Graduado — Producto creado: ${referencia}`,
  })

  revalidatePath(`/desarrollo/${desarrolloId}`)
  revalidatePath('/desarrollo')
  revalidatePath('/productos')
  return { data: { productoId: producto.id, referencia }, error: null }
}

// ─── STATS PARA DASHBOARDS ────────────────────────────────────────────────────

export async function getDesarrolloStats() {
  const supabase = db(await createClient())

  const { data: desarrollos } = await supabase
    .from('desarrollo')
    .select(`
      id, status, prioridad, tipo_producto, categoria_producto,
      created_at, updated_at, fecha_compromiso,
      desarrollo_versiones ( id, version_n, aprobado_ops, aprobado_cliente, aprobado_director ),
      desarrollo_transiciones ( estado_anterior, estado_nuevo, duracion_fase_seg, created_at ),
      desarrollo_hallazgos ( id, categoria, severidad, resuelto ),
      desarrollo_costos ( monto ),
      terceros ( nombre )
    `)
    .not('status', 'in', '("cancelled")')

  if (!desarrollos) return { data: null }

  const activos = desarrollos.filter((d: { status: string }) =>
    !['graduated', 'cancelled'].includes(d.status)
  )

  // Funnel: count per status
  const statusCounts: Record<string, number> = {}
  for (const d of desarrollos as Array<{ status: string }>) {
    statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1
  }

  // Aging: days since last status change
  const now = Date.now()
  const agingAlerts = activos.filter((d: { desarrollo_transiciones: Array<{ created_at: string }> }) => {
    const lastTransicion = [...(d.desarrollo_transiciones ?? [])].sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
    if (!lastTransicion) return false
    const days = (now - new Date(lastTransicion.created_at).getTime()) / (1000 * 3600 * 24)
    return days > 7
  })

  // Lead time promedio (graduated only)
  const graduados = (desarrollos as Array<{ status: string; desarrollo_transiciones: Array<{ estado_nuevo: string; estado_anterior: string | null; created_at: string }> }>)
    .filter(d => d.status === 'graduated')
  const leadtimes = graduados
    .map(d => {
      const grad = d.desarrollo_transiciones.find(t => t.estado_nuevo === 'graduated')
      const inicio = d.desarrollo_transiciones.find(t => t.estado_anterior === null || t.estado_anterior === '')
      if (!grad || !inicio) return null
      return (new Date(grad.created_at).getTime() - new Date(inicio.created_at).getTime()) / (1000 * 3600 * 24)
    })
    .filter((v): v is number => v !== null)
  const avgLeadtime = leadtimes.length > 0
    ? Math.round(leadtimes.reduce((a, b) => a + b, 0) / leadtimes.length)
    : null

  return {
    data: {
      total:        desarrollos.length,
      activos:      activos.length,
      graduados:    graduados.length,
      statusCounts,
      agingAlerts:  agingAlerts.length,
      avgLeadtimeDias: avgLeadtime,
    }
  }
}
