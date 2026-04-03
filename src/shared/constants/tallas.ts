export const TALLAS_STANDARD = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
export type Talla = typeof TALLAS_STANDARD[number]
