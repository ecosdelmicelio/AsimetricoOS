export type UnidadMaterial = 'metros' | 'kg' | 'unidades' | 'conos' | 'lb'
export type TipoMP = 'nacional' | 'importado'

export interface Material {
  id: string
  codigo: string
  nombre: string
  unidad: UnidadMaterial
  costo_unit: number
  referencia_proveedor: string | null
  partida_arancelaria: string | null
  tipo_mp: TipoMP
  activo: boolean
  rendimiento_kg: number | null
  es_tela: boolean
  saldo: number
  minimo_orden: number
  multiplo_orden: number
  leadtime_dias: number
  created_at: string
  updated_at: string
}

export interface CreateMaterialInput {
  codigo: string
  nombre: string
  unidad: UnidadMaterial
  costo_unit: number
  referencia_proveedor?: string
  partida_arancelaria?: string
  tipo_mp?: TipoMP
  rendimiento_kg?: number | null
  minimo_orden?: number
  multiplo_orden?: number
  leadtime_dias?: number
  schema_id?: string
  autoRefs?: Array<{ segmento_id: string; longitud: number }>
}

export interface UpdateMaterialInput {
  nombre?: string
  unidad?: UnidadMaterial
  costo_unit?: number
  referencia_proveedor?: string
  partida_arancelaria?: string
  tipo_mp?: TipoMP
  rendimiento_kg?: number | null
  minimo_orden?: number
  multiplo_orden?: number
  leadtime_dias?: number
  activo?: boolean
}
