export type EstadoProducto = 'activo' | 'descontinuado'
export type TipoProducto = 'fabricado' | 'comercializado'

export interface Producto {
  id: string
  referencia: string
  nombre: string
  categoria: string
  color: string | null
  origen_usa: boolean
  precio_base: number | null
  estado: EstadoProducto
  tipo_producto: TipoProducto
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
  tipo_producto?: TipoProducto
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
  tipo_producto?: TipoProducto
  estado?: EstadoProducto
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
