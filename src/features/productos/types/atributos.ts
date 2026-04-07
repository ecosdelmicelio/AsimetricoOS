export const TIPOS_ATRIBUTO = ['tipo', 'fit', 'superior', 'inferior', 'capsula', 'diseno', 'color', 'genero'] as const
export type TipoAtributo = typeof TIPOS_ATRIBUTO[number]

export const LABELS_ATRIBUTO: Record<TipoAtributo, string> = {
  tipo: 'Tipo',
  fit: 'Fit',
  superior: 'Superior',
  inferior: 'Inferior',
  capsula: 'Capsula',
  diseno: 'Diseño',
  color: 'Color',
  genero: 'Genero',
}

export interface AtributoPT {
  id: string
  tipo: TipoAtributo
  valor: string
  abreviacion?: string | null
  created_at: string
}

export interface ProductoAtributo {
  producto_id: string
  atributo_id: string
  tipo: TipoAtributo
}
