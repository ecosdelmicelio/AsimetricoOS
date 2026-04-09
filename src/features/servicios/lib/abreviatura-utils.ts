/**
 * Genera una sugerencia de abreviatura basada en el nombre.
 * Extrae consonantes y si existe, agrega sufijo numérico.
 * @param nombre - Nombre del atributo
 * @param existentes - Array de abreviaturas ya existentes
 * @returns Sugerencia de abreviatura única
 */
export function generarSugestionAbreviatura(nombre: string, existentes: string[]): string {
  // Extraer consonantes del nombre (sin vocales ni espacios)
  const consonantes = nombre
    .replace(/[aeiouáéíóúAEIOUÁÉÍÓÚ\s]/g, '')
    .toUpperCase()

  if (!consonantes || consonantes.length === 0) {
    return 'AB'
  }

  // Tomar hasta 3 caracteres
  let sugerencia = consonantes.slice(0, 3)

  // Si ya existe, agregar sufijo numérico
  if (existentes.includes(sugerencia)) {
    let contador = 2
    while (existentes.includes(`${sugerencia}${contador}`)) {
      contador++
    }
    sugerencia = `${sugerencia}${contador}`
  }

  return sugerencia
}
