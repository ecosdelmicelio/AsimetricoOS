import type { Tables } from '@/shared/types/database'

export type OrdenProduccion = Tables<'ordenes_produccion'>
export type OPDetalle = Tables<'op_detalle'>

export type EstadoOP =
  | 'programada'
  | 'en_corte'
  | 'en_confeccion'
  | 'dupro_pendiente'
  | 'en_terminado'
  | 'entregada'
  | 'liquidada'
  | 'cancelada'

// Secuencia de hitos (para progreso visual)
export const SECUENCIA_ESTADOS: EstadoOP[] = [
  'programada',
  'en_corte',
  'en_confeccion',
  'dupro_pendiente',
  'en_terminado',
  'entregada',
  'liquidada',
]

export interface OPServicio {
  id: string
  op_id: string
  servicio_id: string
  tarifa_unitaria: number
  cantidad_por_unidad: number
  servicios_operativos?: { nombre: string; tipo_proceso: string; codigo: string }
}

export interface ReporteInsumo {
  id: string
  op_id: string
  material_id: string
  cantidad_usada: number
  desperdicio: number
  notas: string | null
  created_at: string
  updated_at: string
  materiales?: { nombre: string; unidad_medida: string }
}

export interface LiquidacionOP {
  id: string
  op_id: string
  costo_tela: number
  costo_insumos: number
  costo_servicios: number
  costo_total: number
  cantidad_entregada: number
  cpp: number | null
  estado: 'borrador' | 'aprobada'
  aprobado_por: string | null
  fecha_aprobacion: string | null
  created_at: string
}

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
  servicios?: { servicio_id: string; tarifa_unitaria: number }[]
}

export interface OPProgressLine {
  producto_id: string
  referencia: string
  nombre: string
  color: string | null
  talla: string
  programado: number
  cortado: number
  confeccionado: number
  entregado: number
}
