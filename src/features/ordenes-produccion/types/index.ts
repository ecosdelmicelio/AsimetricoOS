import type { Tables } from '@/shared/types/database'

export type OrdenProduccion = Tables<'ordenes_produccion'>
export type OPDetalle = Tables<'op_detalle'>

export type EstadoOP =
  | 'programada'
  | 'en_corte'
  | 'en_confeccion'
  | 'dupro_pendiente'
  | 'en_terminado'
  | 'en_entregas'
  | 'completada'
  | 'cancelada'

// Secuencia de hitos (para progreso visual)
export const SECUENCIA_ESTADOS: EstadoOP[] = [
  'programada',
  'en_corte',
  'en_confeccion',
  'dupro_pendiente',
  'en_terminado',
  'en_entregas',
  'completada',
]

export interface OPConDetalle extends OrdenProduccion {
  terceros: { nombre: string } | null
  ordenes_venta: { codigo: string; terceros: { nombre: string } | null } | null
  op_detalle: (OPDetalle & {
    productos: { nombre: string; referencia: string; color: string | null; origen_usa: boolean } | null
  })[]
}

export interface LineaOP {
  producto_id: string
  producto_nombre: string
  talla: string
  cantidad_asignada: number
}

export interface CreateOPInput {
  ov_id: string
  taller_id: string
  fecha_promesa: string
  notas?: string
  lineas: LineaOP[]
}
