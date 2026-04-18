import type { Tables } from '@/shared/types/database'
export { TALLAS_STANDARD } from '@/shared/constants/tallas'
export type { Talla } from '@/shared/constants/tallas'

export type OrdenVenta = Tables<'ordenes_venta'>
export type OVDetalle = Tables<'ov_detalle'>
export type Producto = Tables<'productos'>

export interface HistorialEstado {
  id: string
  entidad: string
  entidad_id: string
  estado_anterior: string | null
  estado_nuevo: string
  timestamp_cambio: string
  notas: string | null
  cambiado_por: string | null
  profiles: { full_name: string } | null
}

export type EstadoOV = 'borrador' | 'confirmada' | 'en_produccion' | 'terminada' | 'despachada' | 'entregada' | 'completada' | 'cancelada'
export type EstadoPago = 'pendiente' | 'parcial' | 'pagada' | 'vencida'

export interface LineaOV {
  producto_id: string
  producto_nombre: string
  talla: string
  cantidad: number
  precio_pactado: number
}

export interface OVConDetalle extends OrdenVenta {
  terceros: { nombre: string } | null
  ov_detalle: (OVDetalle & {
    productos: { nombre: string; referencia: string; color: string | null; origen_usa: boolean } | null
  })[]
}

export interface OVProgressLine {
  producto_id: string
  referencia: string
  nombre: string
  color: string | null
  talla: string
  pedido: number
  producido: number
  despachado: number
  pendiente: number
}

export interface OVDashboardStats {
  totalSolicitado: number
  totalEntregado: number
  unidadesPedidas: number
  unidadesEntregadas: number
  ordenesActivas: number
  ordenesAgingCount: number   // OVs con +30 días desde confirmación sin completar
  unidadesAging: number       // Unidades en esas OVs
}


export interface ProductionSubState {
  estado: string
  timestamp: string
}

export interface OVMilestone {
  id: string
  label: string
  completed: boolean
  date?: string
  daysSinceStart?: number
  daysBetweenSteps?: number
  subStates?: ProductionSubState[]
}
