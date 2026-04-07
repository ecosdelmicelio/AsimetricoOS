/**
 * Utilidades para construir códigos de Producto (PT), Material (MP) y Servicios.
 * Reemplaza la complejidad del CodigoBuilder antiguo con funciones simples.
 */

/**
 * Construye un código de Producto Terminado (PT).
 * Formato: G-TT-F-COL-DDDD
 *
 * @param abrs - Objeto con abreviaciones de cada segmento
 * @returns Código PT formateado
 *
 * Ejemplo:
 * - buildCodigoPT({
 *     genero: 'M',
 *     tipo: 'BL',
 *     fit: 'S',
 *     color: 'NEG',
 *     diseno: 'BASI'
 *   }) → "M-BL-S-NEG-BASI"
 */
export function buildCodigoPT(abrs: {
  genero: string   // 1 char
  tipo: string     // 2 chars
  fit: string      // 1 char
  color: string    // 3 chars
  diseno: string   // 4 chars
}): string {
  return [
    abrs.genero,
    abrs.tipo,
    abrs.fit,
    abrs.color,
    abrs.diseno,
  ].join('-')
}

/**
 * Construye un código de Materia Prima (MP).
 * Formato: TT-SS-COL-DDDD
 *
 * @param abrs - Objeto con abreviaciones de cada segmento
 * @returns Código MP formateado
 *
 * Ejemplo:
 * - buildCodigoMP({
 *     tipo: 'TE',
 *     subtipo: 'AL',
 *     color: 'NEG',
 *     diseno: 'RAYD'
 *   }) → "TE-AL-NEG-RAYD"
 */
export function buildCodigoMP(abrs: {
  tipo: string     // 2 chars
  subtipo: string  // 2 chars
  color: string    // 3 chars
  diseno: string   // 4 chars
}): string {
  return [
    abrs.tipo,
    abrs.subtipo,
    abrs.color,
    abrs.diseno,
  ].join('-')
}

/**
 * Construye un código de Servicio Operativo.
 * Formato: TP-NNN (ej: CF-001, CO-002)
 *
 * @param tipoProceso - Abreviación de tipo de proceso (2 chars: CO, CF, MQ, etc)
 * @param consecutivo - Número consecutivo (se formatea con leading zeros)
 * @returns Código de servicio formateado
 *
 * Ejemplo:
 * - buildCodigoServicio('CF', 1) → "CF-001"
 * - buildCodigoServicio('CO', 42) → "CO-042"
 */
export function buildCodigoServicio(
  tipoProceso: string,
  consecutivo: number
): string {
  const nnnFormateado = String(consecutivo).padStart(3, '0')
  return `${tipoProceso}-${nnnFormateado}`
}

/**
 * Obtiene el segmento de diseño de un código PT o MP.
 * Ambos formatos terminan en 4 caracteres de diseño.
 *
 * @param codigo - Código completo (PT o MP)
 * @returns Último segmento (diseño)
 *
 * Ejemplo:
 * - extraerDiseno("M-BL-S-NEG-BASI") → "BASI"
 * - extraerDiseno("TE-AL-NEG-RAYD") → "RAYD"
 */
export function extraerDiseno(codigo: string): string {
  const partes = codigo.split('-')
  return partes[partes.length - 1] || ''
}

/**
 * Obtiene el segmento de color de un código PT o MP.
 * PT: G-TT-F-[COL]-DDDD → 4ta posición (índice 3)
 * MP: TT-SS-[COL]-DDDD → 3ra posición (índice 2)
 *
 * @param codigo - Código completo
 * @returns Segmento de color
 *
 * Ejemplo:
 * - extraerColor("M-BL-S-NEG-BASI") → "NEG"
 * - extraerColor("TE-AL-NEG-RAYD") → "NEG"
 */
export function extraerColor(codigo: string): string {
  const partes = codigo.split('-')
  if (partes.length >= 4) {
    // Si tiene 5 partes, es PT: color en índice 3
    // Si tiene 4 partes, es MP: color en índice 2
    return partes.length === 5 ? partes[3] : partes[2]
  }
  return ''
}

/**
 * Valida que un código tenga el formato esperado.
 * @param codigo - Código a validar
 * @param tipo - 'PT' | 'MP' | 'SERVICIO'
 * @returns true si el formato es válido
 */
export function validarFormatoCodigo(
  codigo: string,
  tipo: 'PT' | 'MP' | 'SERVICIO'
): boolean {
  const partes = codigo.split('-')

  switch (tipo) {
    case 'PT':
      // G-TT-F-COL-DDDD (5 partes)
      return (
        partes.length === 5 &&
        partes[0].length === 1 &&
        partes[1].length === 2 &&
        partes[2].length === 1 &&
        partes[3].length === 3 &&
        partes[4].length === 4
      )

    case 'MP':
      // TT-SS-COL-DDDD (4 partes)
      return (
        partes.length === 4 &&
        partes[0].length === 2 &&
        partes[1].length === 2 &&
        partes[2].length === 3 &&
        partes[3].length === 4
      )

    case 'SERVICIO':
      // TP-NNN (2 partes)
      return (
        partes.length === 2 &&
        partes[0].length === 2 &&
        partes[1].length === 3 &&
        /^\d+$/.test(partes[1])
      )

    default:
      return false
  }
}
