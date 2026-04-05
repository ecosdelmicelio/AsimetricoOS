export type EstadoEntrega = 'recibida' | 'en_inspeccion' | 'aceptada' | 'rechazada'

export interface Entrega {
  id: string
  op_id: string
  numero_entrega: number
  fecha_entrega: string
  estado: EstadoEntrega
  notas: string | null
  bin_codigo: string | null
  reporte_corte_id?: string | null
  cantidad_cortada?: number
  cantidad_entregada?: number
  cantidad_faltante?: number
  es_faltante?: boolean
  created_at: string
  updated_at: string
}

export interface EntregaDetalle {
  id: string
  entrega_id: string
  producto_id: string
  talla: string
  cantidad_entregada: number
  created_at: string
}

export interface EntregaConDetalle extends Entrega {
  entrega_detalle: (EntregaDetalle & {
    productos: { nombre: string; referencia: string; color: string | null } | null
  })[]
}

export interface CreateEntregaInput {
  op_id: string
  fecha_entrega: string
  notas?: string
  lineas: {
    producto_id: string
    talla: string
    cantidad_entregada: number
  }[]
}
