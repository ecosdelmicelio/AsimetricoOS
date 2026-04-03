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

    // Nota: Las líneas OP se actualizarían en el flujo de entregas
    // Por ahora solo registramos el consumo de materiales
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
