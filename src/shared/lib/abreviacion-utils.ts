/**
 * Utilidades para generación y validación de abreviaciones.
 * Auto-genera abreviaciones desde valores y resuelve colisiones.
 */

/**
 * Normaliza un valor a abreviación (sin tildes, UPPERCASE, A-Z0-9 only)
 * @param valor - Texto a normalizar
 * @param longitud - Cantidad de caracteres deseados
 * @returns Abreviación normalizada
 *
 * Ejemplo:
 * - normalizarAbreviacion("Básico", 4) → "BASI"
 * - normalizarAbreviacion("Azul Marino", 3) → "AZU"
 */
export function normalizarAbreviacion(valor: string, longitud: number): string {
  // Remover tildes/acentos
  const sinTildes = valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover marcas diacríticas
    .toUpperCase()

  // Tomar solo letras y números
  const soloAlfanumericos = sinTildes.replace(/[^A-Z0-9]/g, '')

  // Tomar primeros N caracteres
  return soloAlfanumericos.substring(0, longitud)
}

/**
 * Genera una abreviación automática desde un valor.
 * Por defecto toma las primeras N letras normalizadas.
 *
 * @param valor - Texto base
 * @param longitud - Longitud deseada de la abreviación
 * @returns Abreviación generada
 *
 * Ejemplo:
 * - generarAbreviacion("Básico", 4) → "BASI"
 * - generarAbreviacion("Floral", 4) → "FLOR"
 */
export function generarAbreviacion(valor: string, longitud: number): string {
  return normalizarAbreviacion(valor, longitud)
}

/**
 * Resuelve colisiones en abreviaciones probando variantes.
 * Si la base está tomada, intenta BAS1, BAS2, etc. o BAT, BAU, BAV...
 *
 * @param base - Abreviación base a probar
 * @param existentes - Array de abreviaciones ya usadas
 * @param longitud - Longitud máxima permitida
 * @returns Abreviación libre encontrada
 *
 * Ejemplo:
 * - Si "TE" está tomada y longitud=2, intenta "TF", "TG", "T1", "T2"...
 */
export function resolverColision(
  base: string,
  existentes: string[],
  longitud: number
): string {
  if (!existentes.includes(base)) {
    return base
  }

  // Intenta variantes sustituyendo el último carácter
  const ultimoIdx = base.length - 1
  const prefijo = base.substring(0, ultimoIdx)

  // Secuencia: letras siguientes, luego números
  const variantes = [
    // Letras posteriores (A->B->C...)
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => prefijo + c),
    // Números (0-9)
    ...'0123456789'.split('').map(c => prefijo + c),
  ]

  for (const variante of variantes) {
    if (!existentes.includes(variante)) {
      return variante
    }
  }

  // Fallback: si todo falla, agregar número al final
  return `${base.substring(0, longitud - 1)}1`
}

/**
 * Valida que una abreviación sea única para su tipo en un conjunto.
 * @param tipo - Tipo de atributo
 * @param abreviacion - Abreviación a validar
 * @param existentes - Array de {tipo: string, abreviacion: string}
 * @param excludeId - ID a excluir de la validación (para ediciones)
 * @returns true si es única, false si está duplicada
 */
export function esAbreviacionUnica(
  tipo: string,
  abreviacion: string | null | undefined,
  existentes: Array<{ tipo: string; abreviacion: string | null }>,
  excludeId?: string
): boolean {
  if (!abreviacion) return true // null/undefined son válidos

  return !existentes.some(
    e => e.tipo === tipo && e.abreviacion === abreviacion
  )
}
