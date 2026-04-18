export type EstadoTercero = 'activo' | 'suspendido' | 'en_evaluacion'
export type TipoTercero = 'cliente' | 'satelite' | 'proveedor_mp'
export type NivelCliente = 'N1' | 'N2' | 'N3'

export interface Tercero {
  id: string
  nombre: string
  tipos: TipoTercero[]
  nit: string | null
  email: string | null
  email_facturacion: string | null
  telefono: string | null
  direccion: string | null
  estado: EstadoTercero
  capacidad_diaria: number | null
  lead_time_dias: number | null
  valor_servicio_ref: number | null
  porcentaje_anticipo: number | null
  calificacion: number | null
  descuento_pago_anticipado: number | null
  bodega_taller_id: string | null
  nivel_cliente: NivelCliente | null
  plazo_pago_dias: number | null
  created_at: string
  updated_at: string
}

export interface CreateTerceroInput {
  nombre: string
  tipos: TipoTercero[]
  nit?: string
  email?: string
  email_facturacion?: string
  telefono?: string
  direccion?: string
  capacidad_diaria?: number
  lead_time_dias?: number
  valor_servicio_ref?: number
  porcentaje_anticipo?: number
  calificacion?: number
  descuento_pago_anticipado?: number
  bodega_taller_id?: string
  nivel_cliente?: NivelCliente
  plazo_pago_dias?: number
}

export interface UpdateTerceroInput extends Partial<CreateTerceroInput> {
  estado?: EstadoTercero
}

export const TIPO_LABEL: Record<TipoTercero, string> = {
  cliente:      'Cliente',
  satelite:     'Satélite',
  proveedor_mp: 'Proveedor MP',
}

export const TIPO_COLOR: Record<TipoTercero, string> = {
  cliente:      'bg-blue-100 text-blue-700',
  satelite:     'bg-violet-100 text-violet-700',
  proveedor_mp: 'bg-emerald-100 text-emerald-700',
}

export const ESTADO_CONFIG: Record<EstadoTercero, { label: string; className: string }> = {
  activo:        { label: 'Activo',        className: 'bg-green-100 text-green-700' },
  suspendido:    { label: 'Suspendido',    className: 'bg-red-100 text-red-700' },
  en_evaluacion: { label: 'En evaluación', className: 'bg-yellow-100 text-yellow-700' },
}
