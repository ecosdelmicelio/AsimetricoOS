import type { Tables } from '@/shared/types/database'

export interface CarteraItem {
  id: string
  tipo: 'ingreso' | 'egreso'
  codigo: string
  tercero_nombre: string
  total_facturado: number
  total_pagado: number
  saldo_pendiente: number
  estado_pago: 'pendiente' | 'parcial' | 'pagada' | string
  fecha_vencimiento: string | null
  documento_tipo: 'ov' | 'oc'
}

export interface FinanzasSummary {
  total_ingresos: number
  total_egresos: number
  balance: number
  pagos_recientes: Tables<'pagos'>[]
}
