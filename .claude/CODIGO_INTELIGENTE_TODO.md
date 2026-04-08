# 🚀 TODO: Completar Sistema Inteligente en MP y PT

> Plan específico y ejecutable para terminar la implementación

---

## ✅ Estado Actual

### Completado
- ✅ Sistema base: `src/shared/lib/code-generator.ts`
- ✅ Servicios: `src/features/servicios/components/codigo-preview-servicio.tsx`
- ✅ Librería de ejemplos y documentación

### Pendiente
- ⏳ Materiales Primas (MP)
- ⏳ Productos Terminados (PT)

---

## 🔧 TODO 1: Materiales Primas (MP)

### Archivo a Modificar
```
src/features/materiales/components/codigo-preview-mp.tsx
```

### Cambios Específicos

#### Paso 1: Añadir imports
```typescript
import { generarAbreviaturaFija, recomendarNombre } from '@/shared/lib/code-generator'
```

#### Paso 2: Actualizar Props (línea ~8)
```typescript
interface Props {
  atributos: Record<TipoAtributoMP, AtributoMP[]>
  seleccionados: Record<TipoAtributoMP, string>
  onCodigoChange: (codigo: string, completo: boolean) => void
  // AÑADIR:
  onNombreRecomendado?: (nombre: string) => void  // ← NUEVO
}
```

#### Paso 3: Actualizar función (línea ~14)
```typescript
export function CodigoPreviewMP({ 
  atributos, 
  seleccionados, 
  onCodigoChange,
  onNombreRecomendado  // ← NUEVO PARÁMETRO
}: Props)
```

#### Paso 4: Modificar lógica de generación (línea ~18-33)

**ANTES:**
```typescript
const abreviacionesSeleccionadas = useMemo(() => {
  const result: Partial<Record<TipoAtributoMP, string>> = {}

  TIPOS_REQUERIDOS.forEach(tipo => {
    const atributoId = seleccionados[tipo]
    if (atributoId) {
      const atributo = atributos[tipo]?.find(a => a.id === atributoId)
      if (atributo?.abreviacion) {
        result[tipo] = atributo.abreviacion
      }
    }
  })

  return result
}, [atributos, seleccionados])
```

**DESPUÉS:**
```typescript
const abreviacionesSeleccionadas = useMemo(() => {
  const result: Partial<Record<TipoAtributoMP, string>> = {}
  const modos: Record<TipoAtributoMP, '2-char' | '2-char' | '3-char' | '4-char'> = {
    tipo: '2-char',
    subtipo: '2-char',
    color: '3-char',
    diseño: '4-char',
  }

  TIPOS_REQUERIDOS.forEach(tipo => {
    const atributoId = seleccionados[tipo]
    if (atributoId) {
      const atributo = atributos[tipo]?.find(a => a.id === atributoId)
      
      // MEJORA: Usar abreviatura manual si existe, sino generar inteligente
      if (atributo?.abreviacion) {
        // Usar lo manual configurado
        result[tipo] = atributo.abreviacion
      } else if (atributo?.valor) {
        // Generar inteligente desde el nombre
        result[tipo] = generarAbreviaturaFija(atributo.valor, modos[tipo])
      }
    }
  })

  return result
}, [atributos, seleccionados])
```

#### Paso 5: Añadir generación de nombre recomendado

**Añadir después de `const codigoMP = useMemo(...)` (línea ~50):**

```typescript
// Generar nombre recomendado basado en atributos
const nombreRecomendado = useMemo(() => {
  const atributoSeleccionados = TIPOS_REQUERIDOS.map(tipo => {
    const atributoId = seleccionados[tipo]
    if (!atributoId) return undefined
    return atributos[tipo]?.find(a => a.id === atributoId)
  })
  
  return recomendarNombre(
    atributoSeleccionados.map(a => a ? { id: a.id, nombre: a.valor } : undefined)
  )
}, [atributos, seleccionados])
```

#### Paso 6: Llamar callback de nombre (línea ~72)

**Después de `useMemo(() => { onCodigoChange(...) })`:**

```typescript
// Notificar nombre recomendado al padre
useMemo(() => {
  if (onNombreRecomendado && nombreRecomendado) {
    onNombreRecomendado(nombreRecomendado)
  }
}, [nombreRecomendado, onNombreRecomendado])
```

#### Paso 7: Actualizar UI para mostrar nombre (línea ~77-100)

**Añadir después del bloque de código:**

```typescript
{nombreRecomendado && (
  <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
    <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
    <div className="text-xs text-blue-700">
      <p className="font-medium">Nombre recomendado:</p>
      <p className="mt-0.5">{nombreRecomendado}</p>
    </div>
  </div>
)}
```

**Añadir import de icono (línea ~1-4):**
```typescript
import { AlertCircle, Lightbulb } from 'lucide-react'  // ← AÑADIR Lightbulb
```

#### Paso 8: Actualizar llamada en materiales-panel.tsx (línea ~420)

**En donde se usa `<CodigoPreviewMP`, añadir prop:**

```typescript
<CodigoPreviewMP 
  atributos={atributosPorTipo}
  seleccionados={atributosSeleccionados}
  onCodigoChange={handleCodigoChange}
  onNombreRecomendado={(nombre) => {
    if (nombre && !nombre.trim()) setNombre(nombre)
  }}
/>
```

---

## 🔧 TODO 2: Productos Terminados (PT)

### Archivo a Crear/Modificar
```
src/features/productos/components/codigo-preview-pt.tsx
```

**Si el archivo NO existe**, crear uno basado en `codigo-preview-mp.tsx` pero adaptado para PT.

### Estructura PT
```
Formato: G-TT-F-COL-DDDD
- Género: 1 char (M/F/U)
- Tipo: 2 chars
- Fit: 1 char
- Color: 3 chars
- Diseño: 4 chars
```

### Implementación

#### Paso 1: Crear componente o actualizar existente

```typescript
'use client'

import { useMemo } from 'react'
import { AlertCircle, Lightbulb } from 'lucide-react'
import { generarAbreviaturaFija, recomendarNombre } from '@/shared/lib/code-generator'
import { buildCodigoPT } from '@/shared/lib/codigo-builder-utils'
import type { AtributoPT, TipoAtributo } from '@/features/productos/types/atributos'

interface Props {
  atributos: Record<TipoAtributo, AtributoPT[]>
  seleccionados: Record<TipoAtributo, string>
  onCodigoChange: (codigo: string, completo: boolean) => void
  onNombreRecomendado?: (nombre: string) => void
}

export function CodigoPreviewPT({
  atributos,
  seleccionados,
  onCodigoChange,
  onNombreRecomendado,
}: Props) {
  // Los 5 tipos requeridos para el código PT
  const TIPOS_REQUERIDOS: TipoAtributo[] = ['genero', 'tipo', 'fit', 'color', 'diseno']

  // Mapear modos de cada atributo
  const modos: Record<TipoAtributo, '1-char' | '2-char' | '3-char' | '4-char'> = {
    genero: '1-char',
    tipo: '2-char',
    fit: '1-char',
    color: '3-char',
    diseno: '4-char',
  }

  // Obtener abreviaciones de los atributos seleccionados
  const abreviacionesSeleccionadas = useMemo(() => {
    const result: Partial<Record<TipoAtributo, string>> = {}

    TIPOS_REQUERIDOS.forEach(tipo => {
      const atributoId = seleccionados[tipo]
      if (atributoId) {
        const atributo = atributos[tipo]?.find(a => a.id === atributoId)

        if (atributo?.abreviatura) {
          result[tipo] = atributo.abreviatura
        } else if (atributo?.nombre) {
          result[tipo] = generarAbreviaturaFija(atributo.nombre, modos[tipo])
        }
      }
    })

    return result
  }, [atributos, seleccionados])

  // Validar que todos los atributos requeridos estén seleccionados Y tengan abreviación
  const tieneTodos = useMemo(() => {
    return TIPOS_REQUERIDOS.every(tipo => abreviacionesSeleccionadas[tipo])
  }, [abreviacionesSeleccionadas])

  // Construir código o mostrar placeholder
  const codigoPT = useMemo(() => {
    if (tieneTodos) {
      return buildCodigoPT({
        genero: abreviacionesSeleccionadas.genero!,
        tipo: abreviacionesSeleccionadas.tipo!,
        fit: abreviacionesSeleccionadas.fit!,
        color: abreviacionesSeleccionadas.color!,
        diseno: abreviacionesSeleccionadas.diseno!,
      })
    }

    const parts = [
      abreviacionesSeleccionadas.genero || '_',
      abreviacionesSeleccionadas.tipo || '__',
      abreviacionesSeleccionadas.fit || '_',
      abreviacionesSeleccionadas.color || '___',
      abreviacionesSeleccionadas.diseno || '____',
    ]

    return parts.join('-')
  }, [tieneTodos, abreviacionesSeleccionadas])

  // Generar nombre recomendado
  const nombreRecomendado = useMemo(() => {
    const atributosSeleccionados = TIPOS_REQUERIDOS.map(tipo => {
      const atributoId = seleccionados[tipo]
      if (!atributoId) return undefined
      return atributos[tipo]?.find(a => a.id === atributoId)
    })

    return recomendarNombre(atributosSeleccionados)
  }, [atributos, seleccionados])

  // Notificar cambios al padre
  useMemo(() => {
    onCodigoChange(tieneTodos ? codigoPT : '', tieneTodos)
  }, [codigoPT, tieneTodos, onCodigoChange])

  // Notificar nombre recomendado
  useMemo(() => {
    if (onNombreRecomendado && nombreRecomendado) {
      onNombreRecomendado(nombreRecomendado)
    }
  }, [nombreRecomendado, onNombreRecomendado])

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
        <div className="font-mono text-sm text-foreground">{codigoPT}</div>
      </div>

      {nombreRecomendado && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
          <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <p className="font-medium">Nombre recomendado:</p>
            <p className="mt-0.5">{nombreRecomendado}</p>
          </div>
        </div>
      )}

      {!tieneTodos && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Completa todos los atributos para generar el código</p>
        </div>
      )}
    </div>
  )
}
```

#### Paso 2: Integrar en productos-panel.tsx

**Buscar donde se genera el código PT y actualizar con:**

```typescript
<CodigoPreviewPT
  atributos={atributosPT}  // Ajustar según el nombre real
  seleccionados={atributosSeleccionados}  // Ajustar según el nombre real
  onCodigoChange={handleCodigoChange}
  onNombreRecomendado={(nombre) => {
    if (nombre && !nombre.trim()) setNombre(nombre)
  }}
/>
```

---

## 🧪 Pruebas Necesarias

### Test 1: Material Tela Algodón Negro
```
Tipo: Tela
Subtipo: Algodón
Color: Negro
Diseño: Rayado Diagonal

Esperado:
✓ Código: TE-AL-NEG-RAYD
✓ Nombre: Tela Algodón Negro Rayado Diagonal
✓ Sin errores de tipado
```

### Test 2: Producto Blusa Mujer
```
Género: Mujer
Tipo: Blusa
Fit: Slim
Color: Azul Marino
Diseño: Botones Decorativos

Esperado:
✓ Código: M-BL-S-AZU-BOTO
✓ Nombre: Mujer Blusa Slim Azul Marino Botones Decorativos
✓ Sin errores de tipado
```

### Test 3: Con Abreviatura Manual
```
Si un atributo tiene abreviatura configurada manualmente
Esperado:
✓ Sistema usa la manual, NO la generada
✓ Código se genera correctamente
```

---

## 📋 Checklist de Implementación

### Materiales Primas
- [ ] Actualizar imports en `codigo-preview-mp.tsx`
- [ ] Actualizar interface Props
- [ ] Modificar lógica de generación de abreviaturas
- [ ] Añadir generación de nombre recomendado
- [ ] Mostrar recomendación en UI
- [ ] Actualizar llamada en `materiales-panel.tsx`
- [ ] Probar: Material Tela Algodón
- [ ] Probar: Con abreviatura manual
- [ ] Verificar que no hay errores TypeScript

### Productos Terminados
- [ ] Crear o actualizar `codigo-preview-pt.tsx`
- [ ] Implementar lógica de 5 segmentos
- [ ] Integrar en `productos-panel.tsx`
- [ ] Probar: Producto Blusa Mujer
- [ ] Probar: Con abreviatura manual
- [ ] Probar: Validación de formato

### Verificación Final
- [ ] Todos los tests pasan
- [ ] Sin errores TypeScript
- [ ] Sin warnings en consola
- [ ] Códigos generados correctamente
- [ ] Nombres recomendados correctamente
- [ ] Sistema respeta abreviaturas manuales

---

## 🔗 Archivos de Referencia

```
Implementación completada:
✅ src/shared/lib/code-generator.ts
✅ src/features/servicios/components/codigo-preview-servicio.tsx
✅ src/features/servicios/components/servicios-panel.tsx

Por completar:
⏳ src/features/materiales/components/codigo-preview-mp.tsx
⏳ src/features/materiales/components/materiales-panel.tsx
⏳ src/features/productos/components/codigo-preview-pt.tsx (crear si no existe)
⏳ src/features/productos/components/productos-panel.tsx

Documentación:
📚 .claude/CODIGO_INTELIGENTE_GUIA.md
📚 .claude/CODIGO_INTELIGENTE_EJEMPLOS.md
📚 .claude/CODIGO_INTELIGENTE_TODO.md (este archivo)
```

---

## ⏱️ Tiempo Estimado

- **Materiales Primas**: 15-20 minutos
- **Productos Terminados**: 15-20 minutos
- **Pruebas**: 10 minutos
- **Total**: ~45 minutos

---

## 🚀 Próximos Pasos

1. Ejecutar TODO 1 (Materiales Primas)
2. Ejecutar TODO 2 (Productos Terminados)
3. Ejecutar pruebas
4. Validar con el equipo
5. Documentar en CLAUDE.md los cambios
6. Celebrar 🎉

