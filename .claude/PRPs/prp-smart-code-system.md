# PRP: Sistema de Código Semi-Inteligente (PT, MP, Servicios)

## Fecha: 2026-04-07 | Estado: PENDIENTE APROBACIÓN

---

## 1. Problema y Solución

**Problema:** `codigo-schema` (4 tablas BD + CodigoBuilder complejo) fue construido antes de
existir los atributos de producto. Es redundante. Los servicios operativos no tienen panel
CRUD propio — solo existe el SchemaManager vacío en /configuracion.

**Solución:** Códigos derivados automáticamente de atributos con abreviaciones auto-generadas
y editables. El CodigoBuilder desaparece de los formularios. Los servicios operativos tienen
su propio panel CRUD igual al de materiales.

---

## 2. Estructura de Códigos

### 2.1 Código PT (Producto Terminado) — máx ~16 chars con separadores

Formato: **`G-TT-F-COL-DDDD`**

| Segmento | Atributo   | Long | Ejemplo |
|----------|------------|------|---------|
| G        | genero     | 1    | `M`, `H`, `U` |
| TT       | tipo       | 2    | `BL`, `PN`, `VS` |
| F        | fit        | 1    | `R`, `S`, `O` |
| COL      | color      | 3    | `NEG`, `BEI`, `ROJ` |
| DDDD     | diseño     | 4 palabras | `BASI`, `FLOR`, `RAYD` |

**Ejemplo completo:** `M-BL-S-NEG-BASI`

Los 5 atributos (genero, tipo, fit, color, diseño) son **obligatorios** para generar el código.

**Diseño PT:** El usuario le da un **nombre legible** al diseño al añadir el atributo (ej: "Básico",
"Floral", "Rayado"). El sistema auto-genera una abreviación de 4 chars a partir de ese nombre
(`BASI`, `FLOR`, `RAYD`). Funciona igual que los diseños MP.

### 2.2 Código MP (Materia Prima) — todos los atributos

Formato: **`TT-SS-COL-DDDD`**

| Segmento | Atributo   | Long | Ejemplo |
|----------|------------|------|---------|
| TT       | tipo       | 2    | `TE`, `HI`, `EL` |
| SS       | subtipo    | 2    | `AL`, `PO`, `MY` |
| COL      | color      | 3    | `NEG`, `BEI`, `BLN` |
| DDDD     | diseño     | 4 palabras | `RAYD`, `FLOR`, `LISO` |

**Ejemplo completo:** `TE-AL-NEG-RAYD`

**Diferencias con PT:**
- Diseños MP = **palabras compuestas legibles**, ej: RAYD (Rayado), LISO, FLOR
- Cada color tiene su **propia abreviación única de 3 chars**, sin importar si son tonalidades del
  mismo color base. Azul Marino = `AZM`, Azul Rey = `AZR`, Azul Cielo = `AZC` (no comparten)

> **Nota:** PT y MP usan la misma lógica para diseños: nombre legible → 4 chars auto-generados
> y editables. La única diferencia estructural es qué atributos componen el código.

### 2.3 Código Servicio Operativo

Formato: **`TP-NNN`**

| Segmento | Campo          | Long | Ejemplo |
|----------|----------------|------|---------|
| TP       | tipo_proceso   | 2    | `CO`, `CF`, `MQ`, `LV`, `OT` |
| NNN      | consecutivo    | 3    | `001`, `002` |

**Ejemplo:** `CF-001`, `CF-002`, `CO-001`

El NNN es **consecutivo independiente por tipo_proceso** (CF propio, CO propio, etc.).

---

## 3. Sistema de Abreviaciones

### 3.1 Reglas generales

- Abreviaciones **únicas por tipo** de atributo (no globalmente)
- Auto-generadas al crear un atributo, editables antes de guardar
- Validación de unicidad en tiempo real (cliente) y en servidor (constraint BD)
- UPPERCASE siempre

### 3.2 Algoritmos de auto-generación

| Atributo       | Long | Algoritmo |
|----------------|------|-----------|
| genero PT      | 1    | Primera letra del valor normalizado |
| tipo PT        | 2    | Primeras 2 consonantes (fallback: primeras 2 letras) |
| fit PT         | 1    | Primera letra del valor normalizado |
| color PT/MP    | 3    | Primeras 3 letras normalizadas del nombre del color (sin tildes) |
| diseño PT      | 4    | Primeras 4 letras normalizadas del nombre dado por el usuario |
| tipo MP        | 2    | Primeras 2 letras del valor |
| subtipo MP     | 2    | Primeras 2 letras del valor |
| diseño MP      | 4    | Primeras 4 letras normalizadas del nombre del diseño |

> **Color:** Cada tonalidad recibe su propia abreviación única de 3 chars.
> Azul Marino → `AZM` | Azul Rey → `AZR` | Azul Cielo → `AZC`
> El constraint UNIQUE (tipo, abreviacion) garantiza que no se repitan.

### 3.3 Colisiones

Si la abreviación auto-generada ya existe, el sistema prueba variantes:
- Ej: `TE` tomada → prueba `TL`, `TX`, `T1`, etc. hasta encontrar una libre
- El usuario siempre puede escribir la abreviación manualmente

---

## 4. Servicios Operativos — Clasificación y Atributos

Los servicios tienen **dos campos de clasificación**:

### `tipo_proceso` (qué se hace)
`corte | confeccion | maquillado | lavanderia | bordado | estampado | otro`

### `ejecutor` (quién lo hace / qué tipo de proveedor)
`interno | taller_externo | transporte_externo | laboratorio | otro_externo`

El `ejecutor` permite:
- Filtrar en OPs qué servicios requieren tercerización
- Identificar costos externos vs internos en liquidación
- Distinguir modelos de operación (propio vs maquila vs transporte)

**El código del servicio solo usa `tipo_proceso`** para el segmento TP.
`ejecutor` es metadata operativa, no parte del código.

---

## 5. Cambios en Base de Datos

### 5.1 Columna `abreviacion` en atributos

```sql
-- Atributos PT
ALTER TABLE atributos_pt
  ADD COLUMN abreviacion TEXT;
ALTER TABLE atributos_pt
  ADD CONSTRAINT uq_abreviacion_pt UNIQUE (tipo, abreviacion);

-- Atributos MP
ALTER TABLE atributos_mp
  ADD COLUMN abreviacion TEXT;
ALTER TABLE atributos_mp
  ADD CONSTRAINT uq_abreviacion_mp UNIQUE (tipo, abreviacion);
```

### 5.2 Columna `ejecutor` en servicios_operativos

```sql
ALTER TABLE servicios_operativos
  ADD COLUMN ejecutor TEXT NOT NULL DEFAULT 'interno'
  CHECK (ejecutor IN (
    'interno', 'taller_externo', 'transporte_externo', 'laboratorio', 'otro_externo'
  ));

-- Ampliar tipo_proceso con nuevos valores si el tipo es enum
ALTER TYPE tipo_proceso_enum ADD VALUE IF NOT EXISTS 'bordado';
ALTER TYPE tipo_proceso_enum ADD VALUE IF NOT EXISTS 'estampado';
```

### 5.3 Tablas históricas — NO tocar

`codigo_schemas`, `codigo_segmentos`, `codigo_segmento_valores` se mantienen con datos
históricos. No se eliminan.

---

## 6. Arquitectura de Código

### 6.1 Nuevo: `shared/lib/abreviacion-utils.ts`

```typescript
/** Genera abreviación automática dado el valor y longitud deseada */
export function generarAbreviacion(valor: string, longitud: number): string

/** Prueba variantes hasta encontrar una que no esté en `existentes` */
export function resolverColision(
  base: string,
  existentes: string[],
  longitud: number
): string

/** Primeras N letras normalizadas (sin tildes, uppercase, solo A-Z0-9) */
export function normalizarAbreviacion(valor: string, longitud: number): string
```

### 6.2 Nuevo: `shared/lib/codigo-builder-utils.ts`

```typescript
/** Construye código PT: G-TT-F-COL-DDDD */
export function buildCodigoPT(abrs: {
  genero: string   // 1 char
  tipo: string     // 2 chars
  fit: string      // 1 char
  color: string    // 3 chars
  diseno: string   // 4 chars
}): string

/** Construye código MP: TT-SS-COL-DDDD */
export function buildCodigoMP(abrs: {
  tipo: string     // 2 chars
  subtipo: string  // 2 chars
  color: string    // 3 chars
  diseno: string   // 4 chars
}): string

/** Construye código Servicio: TP-NNN */
export function buildCodigoServicio(
  tipoProceso: string,
  consecutivo: number
): string
```

### 6.3 Modificar: `features/productos/services/atributo-actions.ts`

```typescript
// NUEVO: incluir abreviacion al crear
createAtributoPT(tipo: TipoAtributo, valor: string, abreviacion: string)

// NUEVO: editar abreviacion de atributo existente
updateAbreviacionPT(id: string, abreviacion: string)

// NUEVO: validar unicidad server-side
checkAbreviacionPT(tipo: TipoAtributo, abreviacion: string, excludeId?: string)
```

### 6.4 Modificar: `features/materiales/services/atributo-actions.ts`

Misma lógica para `atributos_mp`.

### 6.5 Nuevo Feature: `features/servicios/`

```
src/features/servicios/
├── components/
│   └── servicios-panel.tsx      # Visual idéntico a materiales-panel.tsx
├── services/
│   └── servicios-actions.ts     # CRUD + auto-código + campo ejecutor
└── types/
    └── index.ts                 # ServicioOperativo con ejecutor, TipoEjecutor
```

---

## 7. UI — Cambios por Feature

### 7.1 AtributosConfig PT y MP — columna abreviación

Por cada atributo en la tabla:
- Nueva columna `Abr.` (editable inline)
- Al crear: input de `abreviacion` pre-rellenado + badge de validación en tiempo real
- Íconos: ✓ (único y válido) | ⚠ (duplicada) | ✏ (sin asignar)
- Longitud máxima reforzada por tipo de atributo en el input

### 7.2 ProductoForm — sin CodigoBuilder

```
ANTES: <CodigoBuilder schema={schema} onChange={handleCodigoChange} />
AHORA: <CodigoPreviewPT seleccionados={atributosSeleccionados} onCodigo={setCodigo} />
```

- Se construye en tiempo real con `buildCodigoPT`
- Preview: `M-BL-S-NEG-____` (placeholder mientras no hay diseño)
- `referencia` se auto-rellena al completar los 5 atributos
- Botón "Crear" disabled si faltan atributos con abreviación configurada

### 7.3 MaterialesPanel — sin CodigoBuilder

```
ANTES: <CodigoBuilder schema={schema} onChange={handleCodigoChange} />
AHORA: <CodigoPreviewMP seleccionados={atributosSeleccionados} onCodigo={setCodigo} />
```

### 7.4 ServiciosPanel — formulario

```
Tipo proceso *  [select: corte | confección | maquillado | lavandería | bordado | estampado | otro]
Ejecutor *      [select: Interno | Taller externo | Transporte externo | Laboratorio | Otro externo]
Nombre *        [text: "Confección jersey básico"]
Tarifa (COP) *  [number]
Descripción     [textarea - opcional]
Código          [read-only: CF-001 — generado al guardar]
```

### 7.5 ConfiguracionTabs — limpieza

**Eliminar:**  Esquema PT · Esquema MP · Esquema Servicio

**Mejorar:**   Atributos PT · Atributos MP (con columna abreviación editable)

**Agregar:**   Tab **"Servicios"** → `ServiciosPanel` (CRUD de servicios operativos)

---

## 8. Qué se Depreca (sin borrar)

Los productos con códigos del schema viejo se mantienen intactos. Solo cambia el flujo
de creación de nuevos productos/materiales.

| Archivo / Tabla                            | Estado |
|--------------------------------------------|--------|
| `codigo-schema/components/codigo-builder`  | Sin uso en formularios nuevos |
| `codigo-schema/components/schema-manager`  | Sin uso en /configuracion |
| `codigo-schema/components/segmentos-editor`| Sin uso |
| `codigo-schema/components/valores-editor`  | Sin uso |
| `codigo-schema/services/schema-actions`    | Sin uso en flujos nuevos |
| Tablas `codigo_schemas`, `codigo_segmentos`, `codigo_segmento_valores` | Datos históricos, NO eliminar |

---

## 9. Fases de Implementación

| Fase | Descripción |
|------|-------------|
| **1** | BD: ALTERs + constraints (`abreviacion` en atributos_pt/mp, `ejecutor` en servicios) |
| **2** | Utilidades: `abreviacion-utils.ts` + `codigo-builder-utils.ts` |
| **3** | Actions PT: `createAtributoPT` acepta abreviacion, nuevo `updateAbreviacionPT` |
| **4** | Actions MP: ídem para `atributos_mp` |
| **5** | UI `AtributosConfig` PT: columna abreviación editable inline |
| **6** | UI `AtributosConfigMP`: ídem |
| **7** | `ProductoForm`: quitar CodigoBuilder, agregar `CodigoPreviewPT` |
| **8** | `MaterialesPanel`: quitar CodigoBuilder, agregar `CodigoPreviewMP` |
| **9** | Feature `features/servicios/`: CRUD completo con auto-código y campo ejecutor |
| **10** | `ConfiguracionTabs`: eliminar tabs schema, agregar tab Servicios |
| **11** | Cleanup global: remover imports de `codigo-schema` en formularios actualizados |

---

## 10. Decisiones Tomadas (Cerradas)

| # | Decisión |
|---|----------|
| 1 | Diseño PT = palabras compuestas legibles, usuario le da nombre al añadir el atributo |
| 2 | Colores: cada tonalidad tiene su propia abreviación única de 3 chars (sin agrupación por base) |
| 3 | Servicios operativos: tab en `/configuracion` (no ruta propia) |
| 4 | Servicios: dos campos de clasificación — `tipo_proceso` (en el código) y `ejecutor` (metadata) |

---

## 11. Definición de "Terminado"

- [ ] Atributos PT/MP: columna `abreviacion` visible y editable en /configuracion
- [ ] Unicidad de abreviaciones por tipo, validada en cliente y servidor
- [ ] Diseños PT/MP: nombre legible → 4 chars auto-generados (ej: Floral → `FLOR`)
- [ ] Colores PT/MP: cada tonalidad → 3 chars únicos propios (ej: Azul Marino → `AZM`)
- [ ] Al crear PT: `referencia` = código `G-TT-F-COL-DISE` auto-construido
- [ ] Al crear MP: `codigo` = código `TT-SS-COL-DISE` auto-construido
- [ ] Servicios operativos: tab en /configuracion con CRUD completo
- [ ] Servicios: campos `tipo_proceso` + `ejecutor` + `tarifa`, código `TP-NNN` auto-generado
- [ ] Tabs de schema viejo eliminados de /configuracion
- [ ] `CodigoBuilder` no se importa en ningún formulario activo
- [ ] Código legible en BOM, listas de OP, OV y liquidación
