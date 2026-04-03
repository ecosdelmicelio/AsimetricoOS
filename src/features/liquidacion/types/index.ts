export type EstadoLiquidacion = 'pendiente' | 'aprobada'

export interface Liquidacion {
  id: string
  op_id: string
  entrega_id: string | null
  costo_servicio_taller: number
  penalidades_calidad: number
  costo_total: number | null
  unidades_aprobadas: number
  costo_unitario_final: number | null
  estado: EstadoLiquidacion
  aprobado_por: string | null
  fecha_aprobacion: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface LiquidacionConOP extends Liquidacion {
  ordenes_produccion: {
    codigo: string
    terceros: { nombre: string } | null
    ordenes_venta: { codigo: string; terceros: { nombre: string } | null } | null
  } | null
  profiles?: { full_name: string } | null
}

export interface OPCompletadaSinLiquidacion {
  id: string
  codigo: string
  taller: string
  cliente: string
  ov_codigo: string
  fecha_promesa: string
  penalidades_estimadas: number
}

export interface CreateLiquidacionInput {
  op_id: string
  entrega_id?: string
  costo_servicio_taller: number
  penalidades_calidad: number
  unidades_aprobadas: number
  notas?: string
}
