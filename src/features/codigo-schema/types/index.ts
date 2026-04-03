export type EntidadSchema = 'producto' | 'material' | 'servicio'
export type TipoSegmento = 'selector' | 'auto_ref'

export interface CodigoSegmentoValor {
  id: string
  segmento_id: string
  valor: string
  etiqueta: string
  activo: boolean
  created_at: string
}

export interface CodigoSegmento {
  id: string
  schema_id: string
  orden: number
  clave: string
  etiqueta: string
  longitud: number
  tipo: TipoSegmento
  ultimo_ref: number
  valores: CodigoSegmentoValor[]
}

export interface CodigoSchema {
  id: string
  entidad: EntidadSchema
  nombre: string
  bloqueado: boolean
  created_at: string
  segmentos: CodigoSegmento[]
}

export interface SegmentoSeleccion {
  segmento_id: string
  clave: string
  tipo: TipoSegmento
  longitud: number
  valor: string        // valor real del segmento
  descripcion?: string // solo para auto_ref
}
