export type AtributoTipoServicio = 'tipo' | 'subtipo' | 'detalle'

export interface TipoServicioAtributo {
  id: string
  nombre: string
  abreviatura: string
  atributo_tipo: AtributoTipoServicio
  tipo_padre_id: string | null
  subtipo_padre_id: string | null
  activo: boolean
  created_at: string
}

export interface ServicioOperativo {
  id: string
  codigo: string
  nombre: string
  atributo1_id: string | null
  atributo2_id: string | null
  atributo3_id: string | null
  ejecutor_id: string | null
  tarifa_unitaria: number
  descripcion: string | null
  activo: boolean
  created_at: string
  // Joins opcionales para lectura
  atributo1?: TipoServicioAtributo
  atributo2?: TipoServicioAtributo
  atributo3?: TipoServicioAtributo
}
