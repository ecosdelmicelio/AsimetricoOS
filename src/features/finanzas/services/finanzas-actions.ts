'use server'

import { createClient } from '@/shared/lib/supabase/server'
import type { CarteraItem, FinanzasSummary } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getFinanzasCartera() {
  const supabase = db(await createClient())

  // 1. Obtener OVs pendientes (cuentas por cobrar)
  const { data: ovs, error: ovError } = await supabase
    .from('ordenes_venta')
    .select(`
      id,
      codigo,
      total_facturado,
      total_pagado,
      estado_pago,
      fecha_vencimiento,
      terceros:cliente_id ( nombre )
    `)
    .neq('estado_pago', 'pagada')
    .order('fecha_vencimiento', { ascending: true })

  // 2. Obtener OCs pendientes (cuentas por pagar)
  const { data: ocs, error: ocError } = await supabase
    .from('ordenes_compra')
    .select(`
      id,
      codigo,
      total_facturado,
      total_pagado,
      estado_pago,
      fecha_vencimiento,
      terceros:proveedor_id ( nombre )
    `)
    .neq('estado_pago', 'pagada')
    .order('fecha_vencimiento', { ascending: true })

  if (ovError || ocError) {
    console.error('Error fetching cartera:', ovError || ocError)
    return { data: [], error: 'Error al cargar la cartera' }
  }

  // Combinar y transformar
  const cartera: CarteraItem[] = [
    ...(ovs || []).map((ov: any) => ({
      id: ov.id,
      tipo: 'ingreso' as const,
      codigo: ov.codigo,
      tercero_nombre: (ov.terceros as any)?.nombre || 'Cliente Desconocido',
      total_facturado: ov.total_facturado || 0,
      total_pagado: ov.total_pagado || 0,
      saldo_pendiente: (ov.total_facturado || 0) - (ov.total_pagado || 0),
      estado_pago: ov.estado_pago || 'pendiente',
      fecha_vencimiento: ov.fecha_vencimiento,
      documento_tipo: 'ov' as const
    })),
    ...(ocs || []).map((oc: any) => ({
      id: oc.id,
      tipo: 'egreso' as const,
      codigo: oc.codigo,
      tercero_nombre: (oc.terceros as any)?.nombre || 'Proveedor Desconocido',
      total_facturado: oc.total_facturado || 0,
      total_pagado: oc.total_pagado || 0,
      saldo_pendiente: (oc.total_facturado || 0) - (oc.total_pagado || 0),
      estado_pago: oc.estado_pago || 'pendiente',
      fecha_vencimiento: oc.fecha_vencimiento,
      documento_tipo: 'oc' as const
    }))
  ]

  // Ordenar por vencimiento general
  cartera.sort((a, b) => {
    if (!a.fecha_vencimiento) return 1
    if (!b.fecha_vencimiento) return -1
    return new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
  })

  return { data: cartera, error: null }
}

export async function getFinanzasSummary() {
  const supabase = db(await createClient())

  // Calculamos ingresos y egresos de la tabla de pagos directamente
  const { data: pagos, error } = await supabase
    .from('pagos')
    .select('*')
    .order('fecha_pago', { ascending: false })
    .limit(50)

  if (error) return { data: null, error: error.message }

  const ingresos = (pagos || [])
    .filter((p: any) => p.tipo === 'ingreso')
    .reduce((acc: number, p: any) => acc + (p.monto || 0), 0)

  const egresos = (pagos || [])
    .filter((p: any) => p.tipo === 'egreso')
    .reduce((acc: number, p: any) => acc + (p.monto || 0), 0)

  const summary: FinanzasSummary = {
    total_ingresos: ingresos,
    total_egresos: egresos,
    balance: ingresos - egresos,
    pagos_recientes: pagos || []
  }

  return { data: summary, error: null }
}
