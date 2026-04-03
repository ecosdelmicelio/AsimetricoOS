export type UserRole = 'orquestador' | 'jefe_piso' | 'inspector' | 'taller'

export type EstadoOP =
  | 'programada'
  | 'en_corte'
  | 'en_confeccion'
  | 'dupro_pendiente'
  | 'en_terminado'
  | 'en_entregas'
  | 'completada'
  | 'cancelada'

export type EstadoOV =
  | 'borrador'
  | 'confirmada'
  | 'en_produccion'
  | 'completada'
  | 'cancelada'

export type HitoNombre =
  | 'corte'
  | 'confeccion'
  | 'dupro'
  | 'terminado'
  | 'fri'
  | 'empaque'

export type GravedadDefecto = 'menor' | 'mayor' | 'critico'

export type TipoInspeccion = 'dupro' | 'fri'

export type EstadoLiquidacion = 'pendiente' | 'aprobada'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  taller_id: string | null
  created_at: string
}
