export type EstadoProducto = 'activo' | 'inactivo' | 'en_desarrollo'
export type TipoProducto = 'fabricado' | 'comercializado'
export type TipoDistribucion = 'MTO' | 'MTS'

export interface Producto {
  id: string
  referencia: string
  nombre: string
  categoria: string
  color: string | null
  origen_usa: boolean
  precio_base: number | null
  precio_estandar: number | null
  precio_n3: number | null
  referencia_cliente: string | null
  nombre_comercial: string | null
  estado: EstadoProducto
  tipo_producto: TipoProducto
  tipo_distribucion: TipoDistribucion
  marca_id: string | null
  bom_completo: boolean
  minimo_orden: number
  multiplo_orden: number
  leadtime_dias: number
  created_at: string
  updated_at: string
}

export interface AutoRefInput {
  segmento_id: string
  longitud: number
}

export interface CreateProductoInput {
  referencia: string
  nombre: string
  categoria?: string
  color?: string
  origen_usa?: boolean
  precio_base?: number
  precio_estandar?: number
  precio_n3?: number
  referencia_cliente?: string
  nombre_comercial?: string
  partida_arancelaria?: string
  tipo_producto?: TipoProducto
  tipo_distribucion?: TipoDistribucion
  marca_id?: string
  minimo_orden?: number
  multiplo_orden?: number
  leadtime_dias?: number
  atributos?: Record<string, string>
  autoRefs?: AutoRefInput[]
  schema_id?: string
}

export interface UpdateProductoInput {
  referencia?: string
  nombre?: string
  categoria?: string
  color?: string
  origen_usa?: boolean
  precio_base?: number
  precio_estandar?: number | null
  precio_n3?: number | null
  referencia_cliente?: string | null
  nombre_comercial?: string | null
  partida_arancelaria?: string | null
  tipo_producto?: TipoProducto
  tipo_distribucion?: TipoDistribucion
  marca_id?: string | null
  minimo_orden?: number
  multiplo_orden?: number
  leadtime_dias?: number
  estado?: EstadoProducto
  atributos?: Record<string, string>
}

// Categorías estándar textil
export const CATEGORIAS_PRODUCTO = [
  'blusas',
  'camisas',
  'pantalones',
  'faldas',
  'vestidos',
  'chaquetas',
  'abrigos',
  'ropa interior',
  'accesorios',
  'otro',
] as const
