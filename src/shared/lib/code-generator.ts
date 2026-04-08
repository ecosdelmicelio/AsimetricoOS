/**
 * Sistema inteligente de generación de códigos y nombres
 * Reutilizable para Servicios, Materiales Primas y Productos Terminados
 */

interface Atributo {
  id: string
  nombre?: string
  valor?: string
  abreviatura?: string
  abreviacion?: string | null
}

/**
 * Extrae palabras clave de un texto (mínimo 3 letras)
 * Ejemplo: "Corte recto estándar" → ["Corte", "recto", "estándar"]
 */
export function extraerPalabrasClaves(texto: string): string[] {
  if (!texto || texto.length === 0) return []

  return texto
    .toLowerCase()
    .split(/\s+/)
    .filter(palabra => palabra.length >= 3)
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
}

/**
 * Genera una abreviatura inteligente de un texto
 * - 'corto': Primera letra de cada palabra → "CO REC" → "COREC"
 * - 'largo': Primeras N letras de las 2 primeras palabras → "CORT-RECT"
 * - 'x-char': Exactamente X caracteres (ej: '2-char' → "CO")
 *
 * Ejemplo:
 * - generarAbreviatura("Corte recto estándar", "largo") → "CORT-RECT"
 * - generarAbreviatura("Corte recto", "2-char") → "CO"
 * - generarAbreviatura("Corte recto", "3-char") → "COR"
 */
export function generarAbreviatura(
  texto: string,
  modo: 'corto' | 'largo' | '1-char' | '2-char' | '3-char' | '4-char' = 'largo'
): string {
  if (!texto || !texto.trim()) return '___'

  const palabras = extraerPalabrasClaves(texto)
  if (palabras.length === 0) return texto.substring(0, 3).toUpperCase()

  // Modo específico de N caracteres
  if (modo.endsWith('-char')) {
    const numChars = parseInt(modo.charAt(0))
    return palabras.slice(0, 2).join('').substring(0, numChars).toUpperCase()
  }

  if (modo === 'corto') {
    // Primera letra de cada palabra: "Corte Recto" → "CR"
    return palabras.map(p => p.charAt(0)).join('').toUpperCase()
  }

  // Modo largo: primeras 4 letras de las 2 primeras palabras
  // "Corte Recto Estándar" → "CORT-RECT"
  const abreviaturas = palabras.slice(0, 2).map(p => {
    return p.substring(0, 4).toUpperCase()
  })

  return abreviaturas.join('-')
}

/**
 * Genera un código completo para un item (Servicios)
 * Estructura: [ABREVIATURA1]-[ABREVIATURA2]-[SECUENCIAL]
 * Ejemplo: "CORT-RECT-001"
 */
export function generarCodigo(
  atributo1: Atributo | undefined,
  atributo2: Atributo | undefined,
  secuencial: number = 1,
  descripcion?: string,
): string {
  // Usa descripción si está disponible, sino usa abreviatura manual
  const abr1 = descripcion
    ? generarAbreviatura(descripcion, 'largo')
    : (atributo1?.abreviatura || '__')

  const abr2 = atributo2?.abreviatura || '___'

  return `${abr1}-${abr2}-${String(secuencial).padStart(3, '0')}`
}

/**
 * Genera abreviatura inteligente para MP/PT con restricción de caracteres
 * Útil cuando necesitas exactamente 2, 3, o 4 caracteres
 *
 * Ejemplo:
 * - generarAbreviaturaFija("Algodón Blanco", "2-char") → "AB" (primera letra de cada palabra)
 * - generarAbreviaturaFija("Algodón", "3-char") → "ALG" (primeros 3 caracteres)
 * - generarAbreviaturaFija("Rayado Diagonal Fino", "4-char") → "RAYD" (primeros 4 caracteres)
 */
export function generarAbreviaturaFija(
  texto: string,
  modo: '1-char' | '2-char' | '3-char' | '4-char'
): string {
  if (!texto || !texto.trim()) {
    const defaultChars = parseInt(modo.charAt(0))
    return '_'.repeat(defaultChars)
  }

  const numChars = parseInt(modo.charAt(0))

  // Si hay múltiples palabras, toma primera letra de cada una
  const palabras = extraerPalabrasClaves(texto)
  if (palabras.length > 1) {
    const fromWords = palabras.map(p => p.charAt(0)).join('').toUpperCase()
    if (fromWords.length >= numChars) {
      return fromWords.substring(0, numChars)
    }
  }

  // Si no hay suficientes palabras, toma caracteres del texto limpio
  const limpio = texto.toUpperCase().replace(/\s+/g, '')
  return limpio.substring(0, numChars).padEnd(numChars, '_')
}

/**
 * Recomienda un nombre basado en los atributos seleccionados
 * Ejemplo: ["Corte", "Recto", "Precisión"] → "Corte Recto Precisión"
 * Soporta tanto 'nombre' (Atributo genérico) como 'valor' (AtributoMP/AtributoPT)
 */
export function recomendarNombre(atributos: (Atributo | undefined)[]): string {
  return atributos
    .filter(Boolean)
    .map(a => (a as any)?.nombre || (a as any)?.valor || '')
    .filter(Boolean)
    .join(' ')
}

/**
 * Valida si un código está completo (sin placeholders)
 */
export function esCodigoCompleto(codigo: string): boolean {
  return !codigo.includes('_') && !codigo.includes('*')
}

/**
 * Obtiene recomendaciones de mejora para un código
 */
export interface RecomendacionCodigo {
  falta?: string
  sugerencia?: string
}

export function obtenerRecomendaciones(
  atributo1?: Atributo,
  atributo2?: Atributo,
  descripcion?: string,
): RecomendacionCodigo {
  const recomendaciones: RecomendacionCodigo = {}

  if (!atributo1 || !atributo1.abreviatura) {
    recomendaciones.falta = `Tipo sin abreviatura${atributo1 ? ': ' + atributo1.nombre : ''}`
  }

  if (!atributo2 || !atributo2.abreviatura) {
    recomendaciones.falta = `Subtipo sin abreviatura${atributo2 ? ': ' + atributo2.nombre : ''}`
  }

  if (descripcion && descripcion.length < 5) {
    recomendaciones.sugerencia = 'Añade más palabras en la descripción para un código más descriptivo'
  }

  return recomendaciones
}

/**
 * Modo avanzado: Genera código usando descripción como fuente principal
 * Útil cuando quieres que "Corte recto estándar" → "COR-REC-001"
 * En lugar de solo abreviaturas configuradas
 */
export function generarCodigoDesdeDescripcion(
  descripcion: string,
  atributo2: Atributo | undefined,
  secuencial: number = 1,
): string {
  const abr1 = generarAbreviatura(descripcion, 'largo')
  const abr2 = atributo2?.abreviatura || '___'

  return `${abr1}-${abr2}-${String(secuencial).padStart(3, '0')}`
}

/**
 * Genera código para Materiales Primas (MP)
 * Estructura: TT-SS-COL-DDDD
 * Ejemplo: TE-AL-NEG-RAYD
 *
 * Donde:
 * - TT: Tipo (2 caracteres)
 * - SS: Subtipo (2 caracteres)
 * - COL: Color (3 caracteres)
 * - DDDD: Diseño (4 caracteres)
 */
export function generarCodigoMP(
  atributoTipo: (Atributo & { valor?: string; abreviacion?: string | null }) | undefined,
  atributoSubtipo: (Atributo & { valor?: string; abreviacion?: string | null }) | undefined,
  atributoColor: (Atributo & { valor?: string; abreviacion?: string | null }) | undefined,
  atributoDiseño: (Atributo & { valor?: string; abreviacion?: string | null }) | undefined,
): string {
  const getNombre = (attr: any) => attr?.nombre || attr?.valor || ''
  const getAbreviatura = (attr: any) => attr?.abreviatura || attr?.abreviacion || null

  const abrTipo = getAbreviatura(atributoTipo) || generarAbreviaturaFija(getNombre(atributoTipo), '2-char')
  const abrSubtipo = getAbreviatura(atributoSubtipo) || generarAbreviaturaFija(getNombre(atributoSubtipo), '2-char')
  const abrColor = getAbreviatura(atributoColor) || generarAbreviaturaFija(getNombre(atributoColor), '3-char')
  const abrDiseño = getAbreviatura(atributoDiseño) || generarAbreviaturaFija(getNombre(atributoDiseño), '4-char')

  return `${abrTipo}-${abrSubtipo}-${abrColor}-${abrDiseño}`
}

/**
 * Genera código para Productos Terminados (PT)
 * Estructura: G-TT-F-COL-DDDD
 * Ejemplo: M-BL-S-AZU-BOTO
 *
 * Donde:
 * - G: Género (1 carácter)
 * - TT: Tipo (2 caracteres)
 * - F: Fit (1 carácter)
 * - COL: Color (3 caracteres)
 * - DDDD: Diseño (4 caracteres)
 */
export function generarCodigoPT(
  atributoGenero: (Atributo & { valor?: string; abreviacion?: string | null }) | undefined,
  atributoTipo: (Atributo & { valor?: string; abreviacion?: string | null }) | undefined,
  atributoFit: (Atributo & { valor?: string; abreviacion?: string | null }) | undefined,
  atributoColor: (Atributo & { valor?: string; abreviacion?: string | null }) | undefined,
  atributoDiseño: (Atributo & { valor?: string; abreviacion?: string | null }) | undefined,
): string {
  const getNombre = (attr: any) => attr?.nombre || attr?.valor || ''
  const getAbreviatura = (attr: any) => attr?.abreviatura || attr?.abreviacion || null

  const abrGenero = getAbreviatura(atributoGenero) || generarAbreviaturaFija(getNombre(atributoGenero), '1-char')
  const abrTipo = getAbreviatura(atributoTipo) || generarAbreviaturaFija(getNombre(atributoTipo), '2-char')
  const abrFit = getAbreviatura(atributoFit) || generarAbreviaturaFija(getNombre(atributoFit), '1-char')
  const abrColor = getAbreviatura(atributoColor) || generarAbreviaturaFija(getNombre(atributoColor), '3-char')
  const abrDiseño = getAbreviatura(atributoDiseño) || generarAbreviaturaFija(getNombre(atributoDiseño), '4-char')

  return `${abrGenero}-${abrTipo}-${abrFit}-${abrColor}-${abrDiseño}`
}
