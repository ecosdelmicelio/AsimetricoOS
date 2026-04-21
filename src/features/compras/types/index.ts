export type EstadoDocumental = 'pendiente_afidavit' | 'cargado' | 'na' | 'en_proceso' | 'completada' | 'finalizada'
export type EstadoGreige = 'en_crudo' | 'para_tejer' | 'otros'
export type EstadoPago = 'pendiente' | 'parcial' | 'pagada' | 'vencida'

export interface OrdenCompra {
  id: string
  codigo: string
  proveedor_id: string | null
  estado_documental: EstadoDocumental
  estado_greige: EstadoGreige
  tipo: 'materia_prima' | 'producto_terminado'
  fecha_oc: string
  fecha_entrega_est: string
  notas: string | null
  creado_por: string | null
  orden_venta_id: string | null
  created_at: string
  updated_at: string
}

export interface Rollo {
  id: string
  oc_id: string
  material_id: string
  peso_real_kg: number
  rendimiento_real: number | null
  saldo_kg: number
  notas: string | null
  created_at: string
}

export interface OrdenCompraConDetalle extends OrdenCompra {
  terceros: { nombre: string } | null
  rollos: (Rollo & { materiales: { codigo: string; nombre: string; unidad: string } | null })[]
  oc_detalle: (OCDetalle & {
    productos: {
      referencia: string
      nombre: string
      color: string | null
      precio_base?: number | null
      tallas?: string[]
    } | null
  })[]
  oc_detalle_mp: Array<{
    id: string
    oc_id: string
    material_id: string
    cantidad: number
    precio_unitario: number
    created_at: string
    materiales: {
      codigo: string
      nombre: string
      unidad: string
    } | null
  }>
}

export interface OCListItem extends OrdenCompra {
  terceros: { nombre: string } | null
  rollos: { id: string }[]
  oc_detalle?: { cantidad: number; precio_pactado: number; productos: { nombre: string; referencia: string } | null }[]
  oc_detalle_mp?: { cantidad: number; precio_unitario: number; materiales: { codigo: string; nombre: string } | null }[]
  ordenes_venta?: { codigo: string } | null
}

export interface OCDetalle {
  id: string
  oc_id: string
  producto_id: string
  talla: string
  cantidad: number
  precio_pactado: number
  created_at: string
}

export interface LineaOC {
  producto_id: string
  talla: string
  cantidad: number
  precio_pactado: number
}
