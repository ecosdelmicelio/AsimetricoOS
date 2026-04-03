export type TipoHito = 'corte' | 'confeccion' | 'dupro' | 'terminado' | 'fri' | 'empaque'

export interface Hito {
  id: string
  op_id: string
  hito: TipoHito
  producto_id: string | null
  talla: string | null
  cantidad: number
  reportado_por: string | null
  timestamp_registro: string
  notas: string | null
}

export const HITO_CONFIG: Record<TipoHito, { label: string; color: string }> = {
  corte:      { label: 'Corte',      color: 'bg-blue-100 text-blue-700' },
  confeccion: { label: 'Confección', color: 'bg-violet-100 text-violet-700' },
  dupro:      { label: 'DuPro',      color: 'bg-yellow-100 text-yellow-700' },
  terminado:  { label: 'Terminado',  color: 'bg-orange-100 text-orange-700' },
  fri:        { label: 'FRI',        color: 'bg-purple-100 text-purple-700' },
  empaque:    { label: 'Empaque',    color: 'bg-green-100 text-green-700' },
}
