export const TIPOS_PROCESO = ['corte', 'confeccion', 'maquillado', 'lavanderia', 'otro'] as const
export type TipoProceso = typeof TIPOS_PROCESO[number]

export const LABELS_TIPO_PROCESO: Record<TipoProceso, string> = {
  corte: 'Corte',
  confeccion: 'Confección',
  maquillado: 'Maquillado',
  lavanderia: 'Lavandería',
  otro: 'Otro',
}

export const ABREVIATURAS_TIPO_PROCESO: Record<TipoProceso, string> = {
  corte: 'CO',
  confeccion: 'CF',
  maquillado: 'MQ',
  lavanderia: 'LV',
  otro: 'OT',
}

export interface ServicioOperativo {
  id: string
  codigo: string
  nombre: string
  tipo_proceso: TipoProceso
  tarifa_unitaria: number
  descripcion: string | null
  ejecutor: string | null
  activo: boolean
  created_at: string
}
