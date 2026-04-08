# Code Generator API Reference

> Librería inteligente para generar códigos y nombres automáticamente en Servicios, MP y PT.

---

## 📦 Importación

```typescript
import {
  extraerPalabrasClaves,
  generarAbreviatura,
  generarAbreviaturaFija,
  generarCodigo,
  recomendarNombre,
  esCodigoCompleto,
  obtenerRecomendaciones,
  generarCodigoDesdeDescripcion,
} from '@/shared/lib/code-generator'
```

---

## 🔧 API Reference

### `extraerPalabrasClaves(texto: string): string[]`

Extrae palabras clave de un texto (mínimo 3 letras).

**Ejemplo:**
```typescript
extraerPalabrasClaves("Corte recto de precisión en tela")
// → ["Corte", "Recto", "Precisión", "Tela"]
```

**Parámetros:**
- `texto`: string - Texto a procesar

**Retorna:** string[] - Array de palabras clave

---

### `generarAbreviatura(texto: string, modo?: string): string`

Genera una abreviatura inteligente basada en el texto.

**Ejemplo:**
```typescript
generarAbreviatura("Corte recto estándar", "largo")
// → "CORT-RECT"

generarAbreviatura("Corte recto", "corto")
// → "CR"

generarAbreviatura("Algodón", "2-char")
// → "AL"
```

**Parámetros:**
- `texto`: string - Texto a abreviar
- `modo`: 'corto' | 'largo' | '1-char' | '2-char' | '3-char' | '4-char'
  - `'corto'`: Primera letra de cada palabra → "CR"
  - `'largo'`: Primeros 4 chars de 2 primeras palabras → "CORT-RECT"
  - `'1-char'` to `'4-char'`: Exactamente N caracteres → "C", "CR", "COR", "CORT"

**Retorna:** string - Abreviatura generada

---

### `generarAbreviaturaFija(texto: string, modo: '1-char' | '2-char' | '3-char' | '4-char'): string`

Genera abreviatura con restricción de caracteres exacta (mejor para MP/PT).

**Ejemplo:**
```typescript
generarAbreviaturaFija("Algodón Blanco", "2-char")
// → "AB" (primera letra de cada palabra)

generarAbreviaturaFija("Algodón", "3-char")
// → "ALG" (primeros 3 caracteres)

generarAbreviaturaFija("Rayado Diagonal Fino", "4-char")
// → "RAYD" (primeros 4 caracteres)
```

**Parámetros:**
- `texto`: string - Texto a abreviar
- `modo`: '1-char' | '2-char' | '3-char' | '4-char' - Caracteres exactos

**Retorna:** string - Abreviatura con exactamente N caracteres

---

### `generarCodigo(atributo1?, atributo2?, secuencial?, descripcion?): string`

Genera un código completo para Servicios.

**Ejemplo:**
```typescript
generarCodigo(
  { id: "1", nombre: "Corte", abreviatura: "CO" },
  { id: "2", nombre: "Recto", abreviatura: "RE" },
  1,
  "Corte recto de precisión"
)
// → "CORT-RECT-001"

// O simplemente:
generarCodigo(
  { id: "1", nombre: "Corte" },
  { id: "2", nombre: "Recto" },
  1,
  "Corte recto de precisión"
)
// → "CORT-RECT-001" (genera inteligente desde descripción)
```

**Parámetros:**
- `atributo1`: Atributo | undefined - Tipo/Género
- `atributo2`: Atributo | undefined - Subtipo/Tipo
- `secuencial`: number (default: 1) - Número consecutivo
- `descripcion`: string | undefined - Descripción para generar inteligente

**Retorna:** string - Código formateado (XXX-XXX-NNN)

---

### `recomendarNombre(atributos: (Atributo | undefined)[]): string`

Recomienda un nombre basado en los atributos.

**Ejemplo:**
```typescript
recomendarNombre([
  { id: "1", nombre: "Corte" },
  { id: "2", nombre: "Recto" },
  { id: "3", nombre: "Precisión" }
])
// → "Corte Recto Precisión"

// Con undefined (filtrado automático)
recomendarNombre([
  { id: "1", nombre: "Tela" },
  { id: "2", nombre: "Algodón" },
  undefined,
  undefined
])
// → "Tela Algodón"
```

**Parámetros:**
- `atributos`: Array de Atributo | undefined

**Retorna:** string - Nombre recomendado

---

### `esCodigoCompleto(codigo: string): boolean`

Valida si un código está completo (sin placeholders).

**Ejemplo:**
```typescript
esCodigoCompleto("CORT-RECT-001")  // → true
esCodigoCompleto("CO-RE-001")      // → true
esCodigoCompleto("CO-__-001")      // → false
esCodigoCompleto("CORT-*-001")     // → false
```

**Parámetros:**
- `codigo`: string - Código a validar

**Retorna:** boolean - true si está completo

---

### `obtenerRecomendaciones(atributo1?, atributo2?, descripcion?): RecomendacionCodigo`

Obtiene recomendaciones para mejorar el código.

**Ejemplo:**
```typescript
obtenerRecomendaciones(
  { id: "1", nombre: "Corte" },        // sin abreviatura
  { id: "2", nombre: "Recto", abreviatura: "RE" },
  "Cor"                                 // muy corta
)
// → {
//   falta: "Tipo sin abreviatura: Corte",
//   sugerencia: "Añade más palabras en la descripción para un código más descriptivo"
// }
```

**Parámetros:**
- `atributo1`: Atributo | undefined
- `atributo2`: Atributo | undefined
- `descripcion`: string | undefined

**Retorna:** RecomendacionCodigo
```typescript
interface RecomendacionCodigo {
  falta?: string
  sugerencia?: string
}
```

---

### `generarCodigoDesdeDescripcion(descripcion, atributo2?, secuencial?): string`

Genera código usando descripción como fuente principal.

**Ejemplo:**
```typescript
generarCodigoDesdeDescripcion(
  "Corte recto de precisión",
  { id: "2", nombre: "Recto", abreviatura: "RE" },
  1
)
// → "CORT-RE-001"
```

**Parámetros:**
- `descripcion`: string - Descripción principal
- `atributo2`: Atributo | undefined - Segundo atributo
- `secuencial`: number (default: 1) - Número consecutivo

**Retorna:** string - Código generado

---

## 🎯 Casos de Uso Comunes

### Servicios
```typescript
import { generarCodigo, recomendarNombre, esCodigoCompleto } from '@/shared/lib/code-generator'

const tipo = { id: "1", nombre: "Corte" }
const subtipo = { id: "2", nombre: "Recto" }
const descripcion = "Corte recto de precisión"

const codigo = generarCodigo(tipo, subtipo, 1, descripcion)
const nombre = recomendarNombre([tipo, subtipo])
const valido = esCodigoCompleto(codigo)

// → "CORT-RECT-001", "Corte Recto", true
```

### Materiales Primas (MP: TT-SS-COL-DDDD)
```typescript
import { generarAbreviaturaFija } from '@/shared/lib/code-generator'

const tipo = generarAbreviaturaFija("Tela", "2-char")           // "TE"
const subtipo = generarAbreviaturaFija("Algodón", "2-char")     // "AL"
const color = generarAbreviaturaFija("Negro", "3-char")        // "NEG"
const diseno = generarAbreviaturaFija("Rayado Diagonal", "4-char") // "RAYD"

const codigo = `${tipo}-${subtipo}-${color}-${diseno}`
// → "TE-AL-NEG-RAYD"
```

### Productos Terminados (PT: G-TT-F-COL-DDDD)
```typescript
import { generarAbreviaturaFija } from '@/shared/lib/code-generator'

const genero = generarAbreviaturaFija("Mujer", "1-char")        // "M"
const tipo = generarAbreviaturaFija("Blusa", "2-char")          // "BL"
const fit = generarAbreviaturaFija("Slim", "1-char")            // "S"
const color = generarAbreviaturaFija("Azul Marino", "3-char")   // "AZU"
const diseno = generarAbreviaturaFija("Botones Decorativos", "4-char") // "BOTO"

const codigo = `${genero}-${tipo}-${fit}-${color}-${diseno}`
// → "M-BL-S-AZU-BOTO"
```

---

## 🔒 Tipos

```typescript
interface Atributo {
  id: string
  nombre: string
  abreviatura?: string
}

interface RecomendacionCodigo {
  falta?: string
  sugerencia?: string
}
```

---

## ⚡ Performance

- Todas las funciones usan `useMemo` en React para evitar recálculos
- Regex mínimo, split simple
- O(n) donde n = número de palabras
- Típicamente < 1ms por llamada

---

## 🧪 Tests

```typescript
describe('code-generator', () => {
  test('generarAbreviatura con descripción larga', () => {
    expect(generarAbreviatura("Corte recto de precisión estándar", "largo"))
      .toBe("CORT-RECT")
  })

  test('generarAbreviaturaFija respeta caracteres', () => {
    expect(generarAbreviaturaFija("Algodón", "3-char"))
      .toBe("ALG")
  })

  test('recomendarNombre filtra undefined', () => {
    expect(recomendarNombre([{ id: "1", nombre: "Corte" }, undefined]))
      .toBe("Corte")
  })

  test('esCodigoCompleto detecta placeholders', () => {
    expect(esCodigoCompleto("CO-__-001")).toBe(false)
    expect(esCodigoCompleto("CORT-RECT-001")).toBe(true)
  })
})
```

---

## 📋 Checklist de Integración

- [ ] Importar la librería en tu componente
- [ ] Pasar descripción a las funciones generadoras
- [ ] Mostrar recomendaciones en la UI
- [ ] Validar con `esCodigoCompleto()` antes de crear
- [ ] Respetar abreviaturas manuales si existen
- [ ] Testear con casos edge

---

## 📞 FAQ

**P: ¿Qué pasa si no hay descripción?**  
A: El sistema usa la abreviatura configurada (si existe) o genera desde el nombre del atributo.

**P: ¿Puedo personalizar los modos?**  
A: No, los modos están definidos fijos. Pero puedes combinar funciones para casos especiales.

**P: ¿Funciona con acentos?**  
A: Sí, pero se respetan como caracteres normales. "Café" → "CAF" en modo 3-char.

**P: ¿Y caracteres especiales?**  
A: Se ignoran automáticamente en la extracción de palabras.

---

**Versión:** 1.0  
**Última actualización:** 2026-04-08  
**Mantenimiento:** Alejandro Guevara

