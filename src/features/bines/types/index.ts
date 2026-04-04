export interface Bin {
  id: string
  codigo: string
  tipo: 'caja_cliente' | 'interno'
  bodega_id: string | null
  bodega_nombre?: string
  estado: 'en_bodega' | 'en_transito' | 'entregado'
  created_at: string
}

export interface BinContenido {
  id: string
  codigo: string
  bodega_nombre?: string
  created_at: string
  items: Array<{
    producto_id: string
    referencia: string
    nombre: string
    color: string | null
    talla: string | null
    cantidad: number
    recepcion_id: string
  }>
}
