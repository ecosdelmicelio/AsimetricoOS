export interface Bodega {
  id: string
  codigo: string
  nombre: string
  tipo: 'principal' | 'secundaria' | 'externa' | 'consignacion'
  tercero_id: string | null
  activo: boolean
  created_at: string
}

export interface Traslado {
  id: string
  codigo: string
  bodega_origen_id: string
  bodega_destino_id: string
  bodega_origen?: Bodega
  bodega_destino?: Bodega
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
