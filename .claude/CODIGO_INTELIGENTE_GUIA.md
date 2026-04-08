# 🎯 Sistema Inteligente de Generación de Códigos y Nombres

> Reemplaza la generación manual y repetitiva de códigos con un algoritmo inteligente que **aprende del contexto**.

---

## 📊 ¿Qué Cambió?

### Antes (Manual)
```
Usuario selecciona:
  Tipo: Corte (abr: "CO")
  Subtipo: Recto (abr: "RE")
  
Sistema genera:
  Código: CO-RE-001 ❌ (genérico, no descriptivo)
  Nombre: El usuario lo escribe manualmente
```

### Después (Inteligente)
```
Usuario selecciona:
  Tipo: Corte
  Subtipo: Recto
  Descripción: "Corte recto de precisión en tela"
  
Sistema genera:
  Código: CORT-RECT-001 ✅ (inteligente, descriptivo)
  Nombre: "Corte Recto" ✅ (recomendación automática)
  
Si usuario edita nombre/código, el sistema lo respeta.
```

---

## 🏗️ Arquitectura

### Archivo Central: `src/shared/lib/code-generator.ts`

```typescript
// Función principal: extrae palabras clave de descripción
extraerPalabrasClaves("Corte recto estándar")
// → ["Corte", "Recto", "Estándar"]

// Genera abreviaturas inteligentes
generarAbreviatura("Corte recto", "largo")
// → "CORT-RECT"

generarAbreviatura("Corte recto", "2-char")
// → "CR"

generarAbreviatura("Algodón", "3-char")
// → "ALG"
```

---

## 🔧 Implementación por Panel

### 1️⃣ Servicios (✅ COMPLETADO)

**Archivo:** `src/features/servicios/components/servicios-panel.tsx`

Cambios:
- ✅ Se pasa `descripcion` a `CodigoPreviewServicio`
- ✅ Se recibe recomendación de nombre con `onNombreRecomendado`
- ✅ Código genera automáticamente: `CORT-RECT-001`

Cómo usar:
```tsx
<CodigoPreviewServicio
  descripcion={descripcion}
  onNombreRecomendado={(nombre) => {
    if (nombre && !nombre.trim()) onNombreChange(nombre)
  }}
/>
```

---

### 2️⃣ Materiales Primas (📝 POR HACER)

**Archivo:** `src/features/materiales/components/codigo-preview-mp.tsx`

Estructura MP: `TT-SS-COL-DDDD` (4 partes, cada una con caracteres fijos)

Ejemplo:
- Tipo: "Tela" → 2 chars → "TE"
- Subtipo: "Algodón" → 2 chars → "AL"
- Color: "Negro" → 3 chars → "NEG"
- Diseño: "Rayado Diagonal" → 4 chars → "RAYD"
- **Resultado:** `TE-AL-NEG-RAYD`

**Plan de implementación:**

```tsx
// Usar nuevas funciones en codigo-preview-mp.tsx
import { generarAbreviaturaFija, recomendarNombre } from '@/shared/lib/code-generator'

// Para cada atributo tipo MP, generar inteligentemente
const abreviacionesMejores = {
  tipo: generarAbreviaturaFija(atributoTipo?.nombre || '', '2-char'),
  subtipo: generarAbreviaturaFija(atributoSubtipo?.nombre || '', '2-char'),
  color: generarAbreviaturaFija(atributoColor?.nombre || '', '3-char'),
  diseno: generarAbreviaturaFija(atributoDiseño?.nombre || '', '4-char'),
}

// Generar nombre recomendado
const nombreRec = recomendarNombre([
  atributoTipo,
  atributoSubtipo,
  atributoColor,
  atributoDiseño,
])
```

**Lógica:**
1. Si el atributo tiene abreviatura manual configurada → usar esa
2. Si no → generar inteligente desde el nombre del atributo
3. Mostrar recomendación: "Tela Algodón Negro Rayado Diagonal"

---

### 3️⃣ Productos Terminados (📝 POR HACER)

**Archivo:** `src/features/productos/components/codigo-preview-pt.tsx` (si existe)

Estructura PT: `G-TT-F-COL-DDDD` (5 partes)

Mismo patrón que MP pero con 5 segmentos:
- Género: 1 char (M/F)
- Tipo: 2 chars
- Fit: 1 char
- Color: 3 chars
- Diseño: 4 chars

---

## 💡 Algoritmo Inteligente

### Paso 1: Extraer Palabras Clave
```
Entrada: "Corte recto de precisión en tela"
Filtrar (>= 3 letras): ["Corte", "recto", "precisión", "tela"]
→ ["Corte", "Recto", "Precisión", "Tela"]
```

### Paso 2: Generar Abreviatura Según Modo

**Modo "largo"** (para servicios):
```
Tomar 2 primeras palabras: ["Corte", "Recto"]
Primeros 4 caracteres de cada: "CORT", "RECT"
Unir: "CORT-RECT" ✅
```

**Modo "2-char"** (para MP tipo/subtipo):
```
Si múltiples palabras: primera letra de cada → "CR"
Si una palabra: primeros 2 chars → "CO"
```

**Modo "3-char"** (para MP color):
```
Primera palabra, primeros 3 chars → "COR"
```

**Modo "4-char"** (para MP diseño):
```
Primera palabra, primeros 4 chars → "CORT"
Ó múltiples palabras → "CORT" o "RECT" según la más larga
```

### Paso 3: Generar Nombre Recomendado
```
Atributos: [Corte, Recto, Precisión]
Nombre: "Corte Recto Precisión"
```

### Paso 4: Validación
```
¿Tiene placeholders (_ ó *)?
  - SÍ → No está completo ❌
  - NO → Código válido ✅
```

---

## 🎛️ Configuración de Atributos

Para que el sistema funcione, los atributos pueden tener:

```
Atributo {
  id: "123"
  nombre: "Corte Recto"           // Usado para generar código
  abreviatura?: "CO"              // Opcional: si existe, se usa preferentemente
}
```

### Prioridad
1. ✅ Si existe `abreviatura` manual → usar esa
2. 🤖 Si no → generar inteligente desde `nombre`

Esto permite:
- Equipos que quieren control total → configuren abreviaturas
- Equipos que quieren automatización → dejen vacío y dejen que el sistema genere

---

## 📋 Checklist de Implementación

- [x] **Servicios**: Sistema inteligente implementado
  - [x] Componente `codigo-preview-servicio.tsx` actualizado
  - [x] Función `generarAbreviatura()` funciona
  - [x] Recomendación de nombre con tooltip

- [ ] **Materiales Primas**: Implementar en `codigo-preview-mp.tsx`
  - [ ] Usar `generarAbreviaturaFija()` para cada segmento
  - [ ] Mostrar recomendación de nombre
  - [ ] Respetar abreviaturas configuradas

- [ ] **Productos Terminados**: Implementar en `codigo-preview-pt.tsx`
  - [ ] Mismo patrón que MP con 5 segmentos
  - [ ] Mostrar recomendación de nombre
  - [ ] Validar formato PT: G-TT-F-COL-DDDD

---

## 🧪 Pruebas Manuales

### Caso 1: Servicio de Corte
```
Tipo: "Corte"
Subtipo: "Recto"
Descripción: "Corte recto de precisión en tela"

Esperado:
✓ Código: CORT-RECT-001
✓ Nombre: Corte Recto
✓ Tooltip: "Corte recto de precisión en tela"
```

### Caso 2: Material Tela Algodón
```
Tipo: "Tela" → 2 chars → "TE"
Subtipo: "Algodón" → 2 chars → "AL"
Color: "Negro" → 3 chars → "NEG"
Diseño: "Rayado Diagonal" → 4 chars → "RAYD"

Esperado:
✓ Código: TE-AL-NEG-RAYD
✓ Nombre: Tela Algodón Negro Rayado Diagonal
```

### Caso 3: Abreviatura Manual Configurada
```
Atributo {
  nombre: "Corte Recto",
  abreviatura: "CO"  ← Manual configurada
}

Esperado:
✓ Código usa "CO", NO "CORT"
✓ Sistema respeta configuración manual
```

---

## 🔗 Referencias

- **Función generadora**: `src/shared/lib/code-generator.ts`
- **Componente Servicios**: `src/features/servicios/components/codigo-preview-servicio.tsx`
- **Componente MP**: `src/features/materiales/components/codigo-preview-mp.tsx`
- **Builder original**: `src/shared/lib/codigo-builder-utils.ts` (compatible)

---

## 🚀 Próximos Pasos

1. **Fase 1**: Verificar que Servicios funciona correctamente
2. **Fase 2**: Implementar en Materiales Primas
3. **Fase 3**: Implementar en Productos Terminados
4. **Fase 4**: Añadir Tests automatizados
5. **Fase 5**: Documentar para el equipo

