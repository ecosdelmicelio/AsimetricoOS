import type { Tables } from '@/shared/types/database'

export type Desarrollo = Tables<'desarrollo'>
export type DesarrolloVersion = Tables<'desarrollo_versiones'>
export type DesarrolloAsset = Tables<'desarrollo_assets'>
export type DesarrolloTransicion = Tables<'desarrollo_transiciones'>
export type DesarrolloHallazgo = Tables<'desarrollo_hallazgos'>
export type DesarrolloCosto = Tables<'desarrollo_costos'>
export type DesarrolloCondicion = Tables<'desarrollo_condiciones'>
export type DesarrolloCondicionMaterial = Tables<'desarrollo_condiciones_material'>
export type DesarrolloViabilidadOps = Tables<'desarrollo_viabilidad_ops'>
export type DesarrolloOrden = Tables<'desarrollo_ordenes'>
export type ProductoCondicion = Tables<'producto_condiciones'>

export type StatusDesarrollo =
  | 'draft'
  | 'ops_review'
  | 'sampling'
  | 'fitting'
  | 'client_review'
  | 'approved'
  | 'graduated'
  | 'cancelled'

export const STATUS_LABELS: Record<StatusDesarrollo, string> = {
  draft:         'Borrador',
  ops_review:    'Revisión Ops',
  sampling:      'Muestreo',
  fitting:       'Fitting',
  client_review: 'Revisión Cliente',
  approved:      'Aprobado',
  graduated:     'Graduado',
  cancelled:     'Cancelado',
}

export const STATUS_COLORS: Record<StatusDesarrollo, string> = {
  draft:         'bg-gray-100 text-gray-600',
  ops_review:    'bg-amber-100 text-amber-700',
  sampling:      'bg-blue-100 text-blue-700',
  fitting:       'bg-purple-100 text-purple-700',
  client_review: 'bg-orange-100 text-orange-700',
  approved:      'bg-green-100 text-green-700',
  graduated:     'bg-emerald-100 text-emerald-700',
  cancelled:     'bg-red-100 text-red-600',
}

export const SECUENCIA_STATUS: StatusDesarrollo[] = [
  'draft',
  'ops_review',
  'sampling',
  'fitting',
  'client_review',
  'approved',
  'graduated',
]

export type CategoriaProducto =
  | 'camiseta' | 'polo' | 'pantalon' | 'hoodie'
  | 'chaqueta' | 'vestido' | 'falda' | 'accesorio'
  | 'body' | 'leggings' | 'top' | 'bikini' | 'short' | 'otro'

export const CATEGORIA_LABELS: Record<CategoriaProducto, string> = {
  camiseta:  'Camiseta',
  polo:      'Polo',
  pantalon:  'Pantalón',
  hoodie:    'Hoodie',
  chaqueta:  'Chaqueta',
  vestido:   'Vestido',
  falda:     'Falda',
  accesorio: 'Accesorio',
  body:      'Body',
  leggings:  'Leggings',
  top:       'Top',
  bikini:    'Bikini',
  short:     'Short',
  otro:      'Otro',
}

export type Complejidad = 'baja' | 'media' | 'alta'
export type TipoProducto = 'fabricado' | 'comercializado'
export type Prioridad = 'baja' | 'media' | 'alta' | 'urgente'

export const PRIORIDAD_COLORS: Record<Prioridad, string> = {
  baja:    'bg-gray-100 text-gray-500',
  media:   'bg-blue-100 text-blue-600',
  alta:    'bg-orange-100 text-orange-600',
  urgente: 'bg-red-100 text-red-600',
}

export interface DesarrolloConRelaciones extends Desarrollo {
  terceros: { nombre: string } | null
  desarrollo_versiones: Pick<DesarrolloVersion, 'id' | 'version_n' | 'aprobado_ops' | 'aprobado_cliente' | 'aprobado_director'>[]
  profiles: { full_name: string } | null
}

export type Temporada = '2025-A' | '2025-B' | '2026-A' | '2026-B' | 'PERMANENTE'

export interface CreateDesarrolloInput {
  nombre_proyecto:    string
  categoria_producto: CategoriaProducto
  temporada:          Temporada
  complejidad:        Complejidad
  tipo_producto:      TipoProducto
  prioridad:          Prioridad
  fecha_compromiso?:  string
  cliente_id?:        string
  notas?:             string
}

export interface DesarrolloMedidaTemplate {
  id: string
  categoria_producto: CategoriaProducto
  cliente_id: string | null
  nombre_fit: string
  is_default: boolean
  puntos_medida: {
    label: string
    tolerancia?: number
    base_cm?: number
  }[]
  created_at: string
  updated_at: string
}
