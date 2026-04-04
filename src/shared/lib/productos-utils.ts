/**
 * Utilidades compartidas para manejo de productos, colores y referencias.
 * Eliminan duplicación entre ov-form, oc-prendas-form y otros componentes.
 */

export const COLORES_COMUNES = [
  'Beige', 'Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Gris', 'Rosa',
  'Naranja', 'Marrón', 'Morado', 'Plateado', 'Dorado', 'Marino', 'Claro', 'Oscuro',
  'Burdeos', 'Vino', 'Navy', 'Royal', 'Teal', 'Turquesa', 'Coral', 'Salmón',
  'BEN', 'NEN', 'BLN', 'RJO', 'AZL', 'VRD', 'GRS', 'RSA'
]

/**
 * Extrae el nombre base de un producto removiendo el sufijo de color.
 *
 * Ejemplo:
 * - derivarNombreBase("Body Easywear R01 Beige", "Beige") → "Body Easywear R01"
 * - derivarNombreBase("Body Easywear R01", null) → "Body Easywear R01"
 */
export function derivarNombreBase(nombre: string, color: string | null): string {
  if (!color) return nombre
  const regex = new RegExp(`\\s*${color.trim()}\\s*$`, 'i')
  return nombre.replace(regex, '').trim()
}

/**
 * Extrae el color del nombre del producto si el campo color en BD es null.
 *
 * Estrategia: intenta extraer la última palabra del nombre si es un color común.
 *
 * Ejemplo:
 * - extraerColorDelNombre("Body Easywear R01 Beige", null) → "Beige"
 * - extraerColorDelNombre("Body Easywear R01 Beige", "Beige") → "Beige"
 * - extraerColorDelNombre("Body Easywear R01", null) → null
 */
export function extraerColorDelNombre(nombre: string, colorBD: string | null): string | null {
  if (colorBD) return colorBD

  const palabras = nombre.split(' ')
  const ultimaPalabra = palabras[palabras.length - 1]

  if (COLORES_COMUNES.some(c => ultimaPalabra.toLowerCase() === c.toLowerCase())) {
    return ultimaPalabra
  }

  return null
}

/**
 * Extrae referencia base de un código de material (sin color).
 *
 * Schema material: CAT-SUB-COL-REF
 * Ejemplo: TE-SEN-NE01 → TE-SEN (sin color)
 *
 * @param codigo - Código completo ej: "TE-SEN-NE01"
 * @returns Referencia base ej: "TE-SEN"
 */
export function extraerReferenciaBase(codigo: string): string {
  const partes = codigo.split('-')
  if (partes.length >= 3) {
    // Retorna CAT-SUB (sin COL y REF)
    return `${partes[0]}-${partes[1]}`
  }
  return codigo
}

/**
 * Extrae el color de un código de material.
 *
 * Schema material: CAT-SUB-COL-REF
 * Ejemplo: TE-SEN-NE01 → NE (color es la 3ª parte)
 *
 * @param codigo - Código completo ej: "TE-SEN-NE01"
 * @returns Color ej: "NE"
 */
export function extraerColorDelCodigo(codigo: string): string | null {
  const partes = codigo.split('-')
  if (partes.length >= 3) {
    return partes[2]
  }
  return null
}
