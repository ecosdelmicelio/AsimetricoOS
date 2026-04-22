import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

// Orden canónico de tallas: primero alfabéticas (XS→XXL), luego numéricas pares (2, 4, 6...)
export const TALLA_ORDEN: Record<string, number> = { XS: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5, XXXL: 6, '3XL': 6, '4XL': 7 }

export function sortTallas(tallas: string[]): string[] {
  return [...tallas].sort((a, b) => {
    const na = TALLA_ORDEN[a.toUpperCase()]
    const nb = TALLA_ORDEN[b.toUpperCase()]
    if (na !== undefined && nb !== undefined) return na - nb
    if (na !== undefined) return -1
    if (nb !== undefined) return 1
    const numA = parseInt(a), numB = parseInt(b)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return a.localeCompare(b)
  })
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    notation: 'compact',
    compactDisplay: 'short'
  }).format(value).toUpperCase()
}
