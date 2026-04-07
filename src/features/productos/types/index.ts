export type EstadoProducto = 'activo' | 'inactivo' | 'en_desarrollo'
export type TipoProducto = 'fabricado' | 'comercializado'

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
  marca_id: string | null
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
  tipo_producto?: TipoProducto
  marca_id?: string
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
  tipo_producto?: TipoProducto
  marca_id?: string | null
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
