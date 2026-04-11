export interface Bodega {
  id: string
  codigo: string
  nombre: string
  tipo: 'principal' | 'secundaria' | 'externa' | 'consignacion'
  tercero_id: string | null
  activo: boolean
  created_at: string
}

export interface Zona {
  id: string
  bodega_id: string
  nombre: string
  codigo: string
  created_at: string
}

export interface Posicion {
  id: string
  bodega_id: string
  zona_id: string | null
  codigo: string
  nombre: string | null
  capacidad_bines: number
  created_at: string
}

export interface Traslado {
  id: string
  codigo: string
  tipo: 'entre_bodegas' | 'bin_completo' | 'bin_a_bin'
  bodega_origen_id: string
  bodega_destino_id: string
  bodega_origen?: Bodega
  bodega_destino?: Bodega
  bin_origen_id?: string | null
  bin_destino_id?: string | null
  estado: 'pendiente' | 'completado' | 'cancelado'
  notas: string | null
  registrado_por: string | null
  fecha_traslado: string
  created_at: string
}

export interface TrasladoItem {
  id: string
  traslado_id: string
  producto_id: string | null
  material_id: string | null
  bin_id: string | null
  talla: string | null
  cantidad: number
  unidad: string
  costo_unitario: number | null
  created_at: string
}

export interface BinEnBodega {
  id: string
  codigo: string
  posicion_id: string | null
  posicion_codigo?: string // Para facilitar UI
  estado: string
  tipo: string
  es_fijo: boolean
}

export interface AjusteInventario {
  id: string
  codigo: string
  tipo: 'entrada' | 'salida'
  bodega_id: string
  bin_id: string
  notas: string
  estado: string
  registrado_por: string | null
  fecha_ajuste: string
  created_at: string
  bines?: { codigo: string; posicion: string | null }
  ajuste_items?: AjusteItem[]
}

export interface AjusteItem {
  id: string
  ajuste_id: string
  producto_id: string | null
  material_id: string | null
  talla: string | null
  cantidad: number
  unidad: string
  costo_unitario: number | null
  created_at: string
}
