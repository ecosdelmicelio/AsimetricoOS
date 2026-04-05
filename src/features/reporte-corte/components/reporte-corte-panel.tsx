import { createClient } from '@/shared/lib/supabase/server'
import type { ReporteCorteCompleto } from '@/features/reporte-corte/types'
import { ReporteCortePanelClient } from './reporte-corte-panel-client'
import type { LineaOPSimple } from './reporte-corte-form'

interface Props {
  opId: string
  estadoActual: string
  reporte: ReporteCorteCompleto | null
  reportes?: ReporteCorteCompleto[] | null
  lineasOP: LineaOPSimple[]
}

export async function ReporteCorteePanel({ opId, estadoActual, reporte, reportes, lineasOP }: Props) {
  const supabase = await createClient()

  // Obtener bodega_taller_id: desde la OP, con fallback al tercero (taller)
  const { data: op } = await supabase
    .from('ordenes_produccion')
    .select('bodega_taller_id, taller_id')
    .eq('id', opId)
    .single() as { data: { bodega_taller_id: string | null; taller_id: string } | null }

  let bodegaTallerId = op?.bodega_taller_id ?? null
  if (!bodegaTallerId && op?.taller_id) {
    const { data: tercero } = await supabase
      .from('terceros')
      .select('bodega_taller_id')
      .eq('id', op.taller_id)
      .single() as { data: { bodega_taller_id: string | null } | null }
    bodegaTallerId = tercero?.bodega_taller_id ?? null
    // Backfill para evitar la consulta extra en el futuro
    if (bodegaTallerId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as unknown as any)
        .from('ordenes_produccion')
        .update({ bodega_taller_id: bodegaTallerId })
        .eq('id', opId)
    }
  }

  // Mostrar solo si hay reporte existente o si la OP está en corte
  if (!reporte && estadoActual !== 'en_corte') return null

  return (
    <ReporteCortePanelClient
      opId={opId}
      estadoActual={estadoActual}
      reporte={reporte}
      reportes={reportes || []}
      lineasOP={lineasOP}
      bodegaTallerId={bodegaTallerId}
    />
  )
}
