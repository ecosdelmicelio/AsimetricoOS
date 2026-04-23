export type TipoInspeccion = 'dupro' | 'fri'
export type ResultadoInspeccion = 'pendiente' | 'aceptada' | 'rechazada' | 'segundas'

export interface CalidadConfig {
  id: string
  dupro_pct: number
  fri_metodo: 'sqrt' | 'pct' | 'aql'
  fri_pct: number
  aql_nivel: string
  inspeccion_nivel: 'I' | 'II' | 'III'
  porcentaje_merma_tolerada: number
  updated_at: string
}
export type GravedadDefecto = 'menor' | 'mayor' | 'critico'

export interface TipoDefecto {
  id: string
  codigo: string
  categoria: string
  descripcion: string
  gravedad_sugerida: GravedadDefecto
  puntos_penalidad: number
  activo: boolean
  tipos_producto_aplicables: string[]
}

export interface Novedad {
  id: string
  inspeccion_id: string
  tipo_defecto_id: string | null
  gravedad: GravedadDefecto
  cantidad_afectada: number
  foto_url: string | null
  descripcion: string | null
  timestamp_registro: string
  tipos_defecto?: TipoDefecto | null
}

export interface Inspeccion {
  id: string
  op_id: string
  entrega_id: string | null  // NULL = DUPRO (proceso), NOT NULL = FRI (por entrega)
  tipo: TipoInspeccion
  muestra_revisada: number | null
  inspector_id: string | null
  resultado: ResultadoInspeccion
  timestamp_inicio: string | null
  timestamp_cierre: string | null
  notas: string | null
  created_at: string
  cantidad_segundas: number | null
}

export interface InspeccionConNovedades extends Inspeccion {
  novedades_calidad: Novedad[]
}

export interface OPParaInspeccion {
  id: string
  codigo: string
  estado: string
  fecha_promesa: string
  taller: string
  cliente: string
  ov_codigo: string
  inspeccion_pendiente: Inspeccion | null
}

export interface TallerCalidadStats {
  total_cerradas: number
  aceptadas: number
  rechazadas: number
  ftt: number                          // First Time Through %
  top_defectos: { codigo: string; descripcion: string; veces: number }[]
}
