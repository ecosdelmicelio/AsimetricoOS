import type { Tables } from '@/shared/types/database'

export type AreaNegocio = 
  | 'Comercial'
  | 'Mercadeo'
  | 'Administrativo'
  | 'Operaciones'
  | 'Desarrollo'
  | 'Logistica'
  | 'Talento_Humano'

export type TipoGasto = 'fijo' | 'variable' | 'semivariable'

export interface CategoriaGasto {
  id: string
  nombre: string
  parent_id: string | null
}

export interface Gasto {
  id: string
  descripcion: string
  monto_total: number
  costo_unitario: number
  cantidad: number
  fecha: string
  area: AreaNegocio
  tipo: TipoGasto
  categoria_id: string | null
  tercero_id: string | null
  registrado_por: string | null
  created_at: string
  // Extend con joins
  terceros?: { nombre: string }
  categorias_gastos?: { nombre: string }
}

export interface PresupuestoArea {
  id: string
  area: AreaNegocio
  mes: number
  anio: number
  monto_limite: number
}

export interface CreateGastoInput {
  descripcion: string
  costo_unitario: number
  cantidad: number
  fecha: string
  area: AreaNegocio
  tipo: TipoGasto
  categoria_id?: string
  tercero_id?: string
  metodo_pago: 'transferencia' | 'efectivo' | 'cheque' | 'otro'
}
