import type { Tables } from '@/shared/types/database'

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

export type EstadoOV = 'borrador' | 'confirmada' | 'en_produccion' | 'completada' | 'cancelada'

export const TALLAS_STANDARD = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
export const TALLAS_SHAPE = ['0XS', '00S', '0SM', 'SM', 'ML', 'LXL'] as const

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
