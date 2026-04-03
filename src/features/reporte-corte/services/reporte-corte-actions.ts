'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { CreateReporteCorteInput, ReporteCorteCompleto } from '@/features/reporte-corte/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function createReporteCorte(input: CreateReporteCorteInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

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
  if (input.consumo_materiales && input.consumo_materiales.length > 0) {
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

    // 2b. Auto-Kardex: registrar movimientos SALIDA_CORTE y DEVOLUCION_CORTE
    try {
      // Buscar bodega principal y tipos de movimiento
      const [{ data: bodega }, { data: tipoSalida }, { data: tipoDev }] = await Promise.all([
        supabase.from('bodegas').select('id').eq('tipo', 'principal').limit(1).single(),
        supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'SALIDA_CORTE').limit(1).single(),
        supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'DEVOLUCION_CORTE').limit(1).single(),
      ])

      if (!bodega?.id) return { error: 'Bodega principal no encontrada' }
      if (!tipoSalida?.id) return { error: 'Tipo movimiento SALIDA_CORTE no encontrado' }
      if (!tipoDev?.id) return { error: 'Tipo movimiento DEVOLUCION_CORTE no encontrado' }

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
            bodega_id: bodega.id,
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
            bodega_id: bodega.id,
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

        if (kardexError) return { error: `Error en kardex: ${kardexError.message}` }
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
        .from('reporte_corte_tendido')
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

  revalidatePath(`/ordenes-produccion/${input.op_id}`)
  return { data: { id: reporte.id } }
}

export async function getReporteCortePorOP(opId: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('reporte_corte')
    .select(`
      *,
      profiles ( full_name ),
      reporte_corte_tendido (
        *,
        reporte_corte_linea ( *, productos ( nombre, referencia, color ) )
      )
    `)
    .eq('op_id', opId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: ReporteCorteCompleto | null; error: { message: string } | null }

  if (error) return { error: error.message, data: null }
  return { data }
}
