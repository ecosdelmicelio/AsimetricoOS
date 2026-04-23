'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { db } from '@/shared/lib/supabase/db'

export async function getTallerData(tallerId: string) {
  const supabase = db(await createClient())
  
  // 1. Datos del taller
  const { data: taller } = await supabase
    .from('terceros')
    .select('*')
    .eq('id', tallerId)
    .single()

  // 2. Resumen de Calidad (Últimos 30 días)
  const { data: insp } = await supabase
    .from('inspecciones')
    .select(`
      id,
      resultado,
      cantidad_inspeccionada,
      cantidad_segundas,
      cantidad_rechazadas,
      created_at,
      op:ordenes_produccion!inner(codigo, taller_id)
    `)
    .eq('op.taller_id', tallerId)
    .order('created_at', { ascending: false })

  // 3. OPs en curso y pendientes (WIP)
  const { data: ops } = await supabase
    .from('ordenes_produccion')
    .select(`
      *,
      productos:op_detalle(
        cantidad_asignada,
        producto:productos(nombre, referencia)
      ),
      servicios:op_servicios(
        tarifa_unitaria,
        cantidad_por_unidad
      )
    `)
    .eq('taller_id', tallerId)
    .not('estado', 'in', '("liquidada","entregada")')
    .order('created_at', { ascending: false })

  // Calcular métricas WIP
  let totalWIPUnits = 0
  let expectedBilling = 0

  const opsProcessed = (ops || []).map((op: any) => {
    const units = (op.productos as any[])?.reduce((acc: number, curr: any) => acc + (curr.cantidad_asignada || 0), 0) || 0
    const serviceCostPerUnit = (op.servicios as any[])?.reduce((acc: number, curr: any) => acc + (Number(curr.tarifa_unitaria) * Number(curr.cantidad_por_unidad)), 0) || 0
    
    totalWIPUnits += units
    expectedBilling += (units * serviceCostPerUnit)

    return {
      ...op,
      total_unidades: units,
      valor_proyectado: units * serviceCostPerUnit
    }
  })

  // 4. Materiales en tránsito hacia el taller
  let materialesEnTransito: any[] = []
  if (taller?.bodega_taller_id) {
    const { data: traslados } = await supabase
      .from('traslados')
      .select(`
        id,
        codigo,
        fecha_traslado,
        items:traslado_items(
          cantidad,
          unidad,
          producto:productos(nombre),
          material:materiales(nombre)
        )
      `)
      .eq('bodega_destino', taller.bodega_taller_id)
      .eq('estado', 'pendiente')
    
    materialesEnTransito = traslados || []
  }

  // 5. Liquidaciones (Estado de Pagos)
  const { data: liquidaciones } = await supabase
    .from('liquidaciones')
    .select(`
      *,
      op:ordenes_produccion(codigo)
    `)
    .in('op_id', opsProcessed.map(o => o.id).concat(insp.map(i => i.op?.id).filter(Boolean)))
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    taller,
    inspecciones: insp || [],
    ops: opsProcessed,
    materiales: materialesEnTransito,
    liquidaciones: liquidaciones || [],
    stats: {
      totalWIPUnits,
      expectedBilling,
      pendingCount: opsProcessed.length,
      capacidadDiaria: taller?.capacidad_diaria || 0
    }
  }
}

export async function reportarHitoProduccion(data: {
  op_id: string;
  hito: 'corte' | 'confeccion' | 'terminado' | 'empaque';
  cantidad: number;
  notas?: string;
}) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('hitos_produccion')
    .insert({
      op_id: data.op_id,
      hito: data.hito,
      cantidad: data.cantidad,
      notas: data.notas,
      reportado_por: user?.id
    })

  if (error) throw error

  // Opcional: Actualizar estado de la OP automáticamente
  if (data.hito === 'confeccion') {
    await supabase.from('ordenes_produccion').update({ estado: 'en_confeccion' }).eq('id', data.op_id)
  }

  revalidatePath('/taller')
  return { success: true }
}
