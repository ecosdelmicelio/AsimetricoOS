export const TIPOS_ATRIBUTO_MP = ['tipo', 'subtipo', 'color', 'diseño'] as const
export type TipoAtributoMP = typeof TIPOS_ATRIBUTO_MP[number]

export const LABELS_ATRIBUTO_MP: Record<TipoAtributoMP, string> = {
  tipo: 'Tipo',
  subtipo: 'Subtipo',
  color: 'Color',
  diseño: 'Diseño',
}

export interface AtributoMP {
  id: string
  tipo: TipoAtributoMP
  valor: string
  abreviacion?: string | null
  created_at: string
}

export interface MaterialAtributo {
  material_id: string
  atributo_id: string
  tipo: TipoAtributoMP
}
