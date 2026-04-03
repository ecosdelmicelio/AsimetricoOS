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
