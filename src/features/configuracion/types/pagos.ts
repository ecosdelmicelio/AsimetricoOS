import type { Tables } from '@/shared/types/database'

export type Pago = Tables<'pagos'>

export type MetodoPago = 'transferencia' | 'efectivo' | 'cheque' | 'credito' | 'otro'
export type TipoDocumentoPago = 'ov' | 'oc' | 'gasto' | 'otro'

export interface CreatePagoInput {
  tipo: 'ingreso' | 'egreso'
  documento_tipo: TipoDocumentoPago
  documento_id?: string
  tercero_id: string
  monto: number
  metodo_pago: MetodoPago
  referencia_bancaria?: string
  fecha_pago: string
  notas?: string
}
