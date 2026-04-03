export type UnidadMaterial = 'metros' | 'kg' | 'unidades' | 'conos' | 'lb'

export interface Material {
  id: string
  codigo: string
  nombre: string
  unidad: UnidadMaterial
  costo_unit: number
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}
