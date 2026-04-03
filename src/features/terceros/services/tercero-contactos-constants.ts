export type CategoriaContacto =
  | 'comercial'
  | 'tesoreria'
  | 'contabilidad'
  | 'id'
  | 'dueno'
  | 'taller'
  | 'logistica'

export const CATEGORIA_LABEL: Record<CategoriaContacto, string> = {
  comercial:    'Comercial',
  tesoreria:    'Tesorería',
  contabilidad: 'Contabilidad',
  id:           'I+D',
  dueno:        'Dueño',
  taller:       'Líder de taller',
  logistica:    'Logística',
}

export const CATEGORIA_COLOR: Record<CategoriaContacto, string> = {
  comercial:    'bg-blue-100 text-blue-700',
  tesoreria:    'bg-emerald-100 text-emerald-700',
  contabilidad: 'bg-violet-100 text-violet-700',
  id:           'bg-cyan-100 text-cyan-700',
  dueno:        'bg-amber-100 text-amber-700',
  taller:       'bg-orange-100 text-orange-700',
  logistica:    'bg-slate-100 text-slate-700',
}
