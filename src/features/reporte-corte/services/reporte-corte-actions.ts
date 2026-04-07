'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { CreateReporteCorteInput, ReporteCorteCompleto } from '@/features/reporte-corte/types'
import { getBOMProducto } from '@/features/productos/services/bom-actions'
import { getPorcentajeMaximoCorte } from '@/shared/services/config-service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export interface MaterialConsolidado {
  material_id: string
  material_nombre: string
  material_unidad: string
  consumo_estimado: number
  referencias_que_usan: Array<{
    referencia: string
    color: string | null
    cantidad_asignada: number
    cantidad_real_cortada?: number
    consumo_por_unidad: number
    consumo_total: number
  }>
}

export async function getTotalAsignadoOP(opId: string): Promise<number> {
  const supabase = db(await createClient())

  const { data: lineas, error } = await supabase
    .from('op_detalle')
    .select('cantidad_asignada')
    .eq('op_id', opId) as {
      data: Array<{ cantidad_asignada: number }> | null
      error: { message: string } | null
    }

  if (error || !lineas) {
    console.error('Error al obtener total asignado:', error?.message)
    return 0
  }

  return lineas.reduce((sum, l) => sum + l.cantidad_asignada, 0)
}

export async function getSumaCortesPrevios(opId: string) {
  const supabase = db(await createClient())

  // Obtener todos los reportes previos de esta OP
  const { data: reportes, error } = await supabase
    .from('reporte_corte')
    .select(`
      id,
      fecha,
      cantidad_total_cortada
    `)
    .eq('op_id', opId)
    .order('fecha', { ascending: false }) as {
      data: Array<{
        id: string
        fecha: string
        cantidad_total_cortada: number | null
      }> | null
      error: { message: string } | null
    }

  if (error) {
    console.error('Error al obtener cortes previos:', error.message)
    return { totalCortado: 0, detalleReportes: [] }
  }

  if (!reportes || reportes.length === 0) {
    return { totalCortado: 0, detalleReportes: [] }
  }

  // Calcular total cortado y construir detalle
  const detalleReportes = reportes.map(r => ({
    id: r.id,
    fecha: r.fecha,
    cantidad_total: r.cantidad_total_cortada || 0,
  }))

  const totalCortado = detalleReportes.reduce((sum, r) => sum + r.cantidad_total, 0)

  return { totalCortado, detalleReportes }
}

export async function consolidarMaterialesDelCorte(
  referenciasAgrupadas: Array<{
    referencia: string
    color: string | null
    producto_id: string
    totalUds: number
  }>,
) {
  try {
    // Map para consolidar por material_id
    const materialesMap = new Map<string, MaterialConsolidado>()

    // Para cada referencia, fetch su BOM
    const productosUnicos = [...new Set(referenciasAgrupadas.map(r => r.producto_id))]

    for (const productoId of productosUnicos) {
      const bom = await getBOMProducto(productoId)

      // Para cada material en el BOM que sea reportable en corte
      for (const linea of bom.materiales) {
        // Filtrar solo materiales marcados como reportables en corte
        if (!linea.reportable_en_corte) continue

        const material = linea.materiales

        // Encontrar todas las referencias que usan este producto
        const referenciasDelProducto = referenciasAgrupadas.filter(r => r.producto_id === productoId)

        for (const ref of referenciasDelProducto) {
          const key = material.id
          const consumoPorUnidad = linea.cantidad
          const consumoTotal = consumoPorUnidad * ref.totalUds

          if (!materialesMap.has(key)) {
            materialesMap.set(key, {
              material_id: material.id,
              material_nombre: material.nombre,
              material_unidad: material.unidad,
              consumo_estimado: 0,
              referencias_que_usan: [],
            })
          }

          const matConsolidado = materialesMap.get(key)!
          matConsolidado.consumo_estimado += consumoTotal
          matConsolidado.referencias_que_usan.push({
            referencia: ref.referencia,
            color: ref.color,
            cantidad_asignada: ref.totalUds, // Esto ya es lo real cortado según el map
            cantidad_real_cortada: ref.totalUds,
            consumo_por_unidad: consumoPorUnidad,
            consumo_total: consumoTotal,
          })
        }
      }
    }

    return {
      materiales: Array.from(materialesMap.values()),
      error: null,
    }
  } catch (err) {
    return {
      materiales: [],
      error: `Error consolidando materiales: ${err instanceof Error ? err.message : 'Desconocido'}`,
    }
  }
}

export async function createReporteCorte(input: CreateReporteCorteInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // VALIDACIÓN: Verificar límite del porcentaje máximo (solo para nuevo flujo con consumo_materiales)
  if (input.bodega_id && input.cantidad_total_cortada !== undefined) {
    const totalAsignado = await getTotalAsignadoOP(input.op_id)
    const { totalCortado: totalCortadoPrevio } = await getSumaCortesPrevios(input.op_id)
    const totalNuevo = totalCortadoPrevio + input.cantidad_total_cortada
    const porcentajeMaximo = await getPorcentajeMaximoCorte()
    const maximoPermitido = totalAsignado * (porcentajeMaximo / 100)

    if (totalNuevo > maximoPermitido) {
      return {
        error: `No puedes cortar ${totalNuevo} uds. Máximo permitido: ${maximoPermitido.toFixed(2)} uds (${porcentajeMaximo}% de ${totalAsignado}). Ya cortadas: ${totalCortadoPrevio}.`,
      }
    }
  }

  // 1. Crear cabecera
  const { data: reporte, error: repError } = await supabase
    .from('reporte_corte')
    .insert({
      op_id: input.op_id,
      fecha: input.fecha,
      reportado_por: user.id,
      notas: input.notas ?? null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (repError || !reporte) return { error: repError?.message ?? 'Error creando reporte' }

  // 2. Nuevo flujo: consumo_materiales
  if (input.consumo_materiales && input.consumo_materiales.length > 0 && input.bodega_id && input.cantidad_total_cortada !== undefined) {
    // Actualizar reporte con cantidad_total_cortada
    await supabase
      .from('reporte_corte')
      .update({ cantidad_total_cortada: input.cantidad_total_cortada })
      .eq('id', reporte.id)

    // Insertar consumos de materiales
    const materialesInsert = input.consumo_materiales.map(m => ({
      reporte_id: reporte.id,
      material_id: m.material_id,
      metros_usados: m.metros_usados,
      desperdicio_kg: m.desperdicio_kg,
      material_devuelto_kg: m.material_devuelto_kg,
    }))

    const { error: matError } = await supabase
      .from('reporte_corte_material')
      .insert(materialesInsert) as { error: { message: string } | null }

    if (matError) return { error: `Error insertando materiales: ${matError.message}` }

    // 2.1 Insertar detalle de prendas cortadas (reporte_corte_linea)
    if (input.referencias_cortadas_detalle && input.referencias_cortadas_detalle.length > 0) {
      // Primero crear un "tendido" ficticio o consolidado para el nuevo flujo para colgar las líneas
      const { data: tendidoConsolidado, error: tcError } = await supabase
        .from('reporte_corte_corte')
        .insert({
          reporte_id: reporte.id,
          color: 'CONSOLIDADO',
          metros_usados: input.consumo_materiales.reduce((sum, m) => sum + m.metros_usados, 0),
          peso_desperdicio_kg: input.consumo_materiales.reduce((sum, m) => sum + m.desperdicio_kg, 0),
        })
        .select('id')
        .single() as { data: { id: string } | null; error: { message: string } | null }

      if (!tcError && tendidoConsolidado) {
        const lineasDetalle = input.referencias_cortadas_detalle.map(d => ({
          tendido_id: tendidoConsolidado.id,
          producto_id: d.producto_id,
          talla: d.talla,
          cantidad_cortada: d.cantidad_cortada,
          color: d.color ?? null,
        }))

        await supabase.from('reporte_corte_linea').insert(lineasDetalle)
      }
    }

    // 2b. Auto-Kardex: registrar movimientos SALIDA_CORTE y DEVOLUCION_CORTE
    try {
      // Obtener tipos de movimiento (bodega ya viene del input)
      const [{ data: tipoSalida }, { data: tipoDev }] = await Promise.all([
        supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'SALIDA_CORTE').maybeSingle(),
        supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'DEVOLUCION_CORTE').maybeSingle(),
      ])

      if (!tipoSalida?.id) {
        console.error('Tipo movimiento SALIDA_CORTE no encontrado')
      } else if (!tipoDev?.id) {
        console.error('Tipo movimiento DEVOLUCION_CORTE no encontrado')
      } else {
        // Obtener materiales para unidades y rendimiento
        const { data: materiales } = await supabase
          .from('materiales')
          .select('id, unidad, rendimiento_kg')
          .in('id', input.consumo_materiales.map(m => m.material_id)) as { data: any[] | null }

        const matMap = materiales?.reduce((acc, m) => { acc[m.id] = m; return acc }, {}) || {}

        // Preparar movimientos kardex para inserts
        const movimientosKardex = []

        for (const consumo of input.consumo_materiales) {
          const mat = matMap[consumo.material_id]
          if (!mat) continue

          // SALIDA_CORTE: consumo de metros/kg
          if (consumo.metros_usados > 0) {
            let cantidadSalida = consumo.metros_usados
            let unidadSalida = 'metros'

            // Si es metros y hay rendimiento, convertir a kg
            if (mat.unidad === 'metros' && mat.rendimiento_kg) {
              cantidadSalida = consumo.metros_usados / mat.rendimiento_kg
              unidadSalida = 'kg'
            } else if (mat.unidad !== 'metros') {
              unidadSalida = mat.unidad
            }

            movimientosKardex.push({
              material_id: consumo.material_id,
              bodega_id: input.bodega_id,
              tipo_movimiento_id: tipoSalida.id,
              documento_tipo: 'corte',
              documento_id: reporte.id,
              cantidad: -Math.abs(cantidadSalida), // negativo para salida
              unidad: unidadSalida,
              fecha_movimiento: new Date().toISOString(),
              registrado_por: user?.id ?? null,
            })
          }

          // DEVOLUCION_CORTE: material devuelto
          if (consumo.material_devuelto_kg > 0) {
            movimientosKardex.push({
              material_id: consumo.material_id,
              bodega_id: input.bodega_id,
              tipo_movimiento_id: tipoDev.id,
              documento_tipo: 'corte',
              documento_id: reporte.id,
              cantidad: consumo.material_devuelto_kg, // positivo para entrada
              unidad: 'kg',
              fecha_movimiento: new Date().toISOString(),
              registrado_por: user?.id ?? null,
            })
          }
        }

        // Insertar todos los movimientos de una vez
        if (movimientosKardex.length > 0) {
          const { error: kardexError } = await supabase
            .from('kardex')
            .insert(movimientosKardex) as { error: { message: string } | null }

          if (kardexError) {
              console.error(`Error en kardex: ${kardexError.message}`)
              // No retornamos error aquí para evitar bloquear la transición de estado de la OP
          }
        }
      }
    } catch (err) {
      // Log error pero continúa - no bloquear el corte por error de kardex
      console.error('Error auto-kardex en corte:', err)
    }
  }

  // 3. Flujo antiguo: tendidos (para compatibilidad)
  if (input.tendidos && input.tendidos.length > 0) {
    for (const t of input.tendidos) {
      const { data: tendido, error: tError } = await supabase
        .from('reporte_corte_corte')
        .insert({
          reporte_id: reporte.id,
          color: t.color,
          metros_usados: t.metros_usados,
          peso_desperdicio_kg: t.peso_desperdicio_kg,
        })
        .select('id')
        .single() as { data: { id: string } | null; error: { message: string } | null }

      if (tError || !tendido) return { error: tError?.message ?? 'Error creando tendido' }

      const lineas = t.lineas
        .filter(l => l.cantidad_cortada > 0)
        .map(l => ({
          tendido_id: tendido.id,
          producto_id: l.producto_id,
          color: l.color ?? null,
          material_id: l.material_id ?? null,
          talla: l.talla,
          cantidad_cortada: l.cantidad_cortada,
          metros_usados: l.metros_usados ?? 0,
          desperdicio_kg: l.desperdicio_kg ?? 0,
          material_devuelto_kg: l.material_devuelto_kg ?? 0,
        }))

      if (lineas.length > 0) {
        const { error: lError } = await supabase
          .from('reporte_corte_linea')
          .insert(lineas) as { error: { message: string } | null }
        if (lError) return { error: lError.message }
      }
    }
  }

  // Transición automática: en_corte → en_confeccion
  await supabase
    .from('ordenes_produccion')
    .update({ estado: 'en_confeccion' })
    .eq('id', input.op_id)
    .eq('estado', 'en_corte')

  revalidatePath(`/ordenes-produccion/${input.op_id}`)
  return { data: { id: reporte.id } }
}

export async function updateReporteCorte(reporteId: string, input: CreateReporteCorteInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Actualizar cabecera del reporte
  const { error: updateError } = await supabase
    .from('reporte_corte')
    .update({
      fecha: input.fecha,
      notas: input.notas ?? null,
      cantidad_total_cortada: input.cantidad_total_cortada ?? null,
    })
    .eq('id', reporteId) as { error: { message: string } | null }

  if (updateError) return { error: `Error actualizando reporte: ${updateError.message}` }

  // Eliminar materiales anteriores
  const { error: deleteMatError } = await supabase
    .from('reporte_corte_material')
    .delete()
    .eq('reporte_id', reporteId) as { error: { message: string } | null }

  if (deleteMatError) return { error: `Error eliminando materiales anteriores: ${deleteMatError.message}` }

  // Insertar nuevos materiales
  if (input.consumo_materiales && input.consumo_materiales.length > 0) {
    const materialesInsert = input.consumo_materiales.map(m => ({
      reporte_id: reporteId,
      material_id: m.material_id,
      metros_usados: m.metros_usados,
      desperdicio_kg: m.desperdicio_kg,
      material_devuelto_kg: m.material_devuelto_kg,
    }))

    const { error: matError } = await supabase
      .from('reporte_corte_material')
      .insert(materialesInsert) as { error: { message: string } | null }

    if (matError) return { error: `Error insertando nuevos materiales: ${matError.message}` }

    // 2b. Auto-Kardex: registrar nuevos movimientos (los anteriores fueron borrados físicamente o deberían compensarse)
    // En este caso, como borramos reporte_corte_material, lo ideal es que el kardex también sea consistente.
    // Para simplificar y dado que el usuario quiere estabilidad, replicamos el registro de movimientos como en create.
    if (input.bodega_id) {
      try {
        const [{ data: tipoSalida }, { data: tipoDev }] = await Promise.all([
          supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'SALIDA_CORTE').maybeSingle(),
          supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'DEVOLUCION_CORTE').maybeSingle(),
        ])

        if (tipoSalida?.id && tipoDev?.id) {
          const { data: materiales } = await supabase
            .from('materiales')
            .select('id, unidad, rendimiento_kg')
            .in('id', input.consumo_materiales.map(m => m.material_id)) as { data: any[] | null }

          const matMap = materiales?.reduce((acc, m) => { acc[m.id] = m; return acc }, {}) || {}
          const movimientosKardex = []

          for (const consumo of input.consumo_materiales) {
            const mat = matMap[consumo.material_id]
            if (!mat) continue

            if (consumo.metros_usados > 0) {
              let cantidadSalida = consumo.metros_usados
              let unidadSalida = 'metros'
              if (mat.unidad === 'metros' && mat.rendimiento_kg) {
                cantidadSalida = consumo.metros_usados / mat.rendimiento_kg
                unidadSalida = 'kg'
              } else if (mat.unidad !== 'metros') {
                unidadSalida = mat.unidad
              }

              movimientosKardex.push({
                material_id: consumo.material_id,
                bodega_id: input.bodega_id,
                tipo_movimiento_id: tipoSalida.id,
                documento_tipo: 'corte',
                documento_id: reporteId,
                cantidad: -Math.abs(cantidadSalida),
                unidad: unidadSalida,
                fecha_movimiento: new Date().toISOString(),
                registrado_por: user?.id ?? null,
              })
            }

            if (consumo.material_devuelto_kg > 0) {
              movimientosKardex.push({
                material_id: consumo.material_id,
                bodega_id: input.bodega_id,
                tipo_movimiento_id: tipoDev.id,
                documento_tipo: 'corte',
                documento_id: reporteId,
                cantidad: consumo.material_devuelto_kg,
                unidad: 'kg',
                fecha_movimiento: new Date().toISOString(),
                registrado_por: user?.id ?? null,
              })
            }
          }

          if (movimientosKardex.length > 0) {
            // Primero eliminamos movimientos previos de este documento en el kardex para evitar duplicidad al actualizar
            await supabase.from('kardex').delete().eq('documento_id', reporteId).eq('documento_tipo', 'corte')
            
            const { error: kardexError } = await supabase
              .from('kardex')
              .insert(movimientosKardex) as { error: { message: string } | null }

            if (kardexError) {
              console.error(`Error en kardex (update): ${kardexError.message}`)
            }
          }
        }
      } catch (err) {
        console.error('Error auto-kardex en update corte:', err)
      }
    }
  }

  revalidatePath(`/ordenes-produccion/${input.op_id}`)
  return { data: { id: reporteId } }
}


export async function getReporteCortePorOP(opId: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('reporte_corte')
    .select(`
      *,
      profiles ( full_name ),
      reporte_corte_corte (
        *,
        reporte_corte_linea ( *, productos ( nombre, referencia, color ) )
      ),
      reporte_corte_material (
        *
      )
    `)
    .eq('op_id', opId)
    .order('created_at', { ascending: false }) as { data: ReporteCorteCompleto[] | null; error: { message: string } | null }

  if (error) return { error: error.message, data: null }
  // Retornar el más reciente para compatibilidad, pero ahora es un array
  return { data: data && data.length > 0 ? data[0] : null, dataAll: data }
}
