# PRP-002: WMS - Bodegas, Bines y Traslados con Bodega Default

> **Estado**: PENDIENTE
> **Fecha**: 2026-04-09
> **Proyecto**: Asimetrico OS

---

## Objetivo

Construir el módulo WMS (Warehouse Management System) que permita gestionar múltiples bodegas, ver y administrar los bines contenidos en cada una, y registrar traslados de inventario entre bodegas. Adicionalmente, exponer la bodega default en Configuración para que todo el sistema (recepciones, kardex, bins) la use dinámicamente en lugar de hardcodear `.eq('tipo', 'principal')`.

## Por Qué

| Problema | Solución |
|----------|----------|
| Solo existe una bodega "Asimetrico Central" y no hay UI para crear ni administrar bodegas | Panel de gestión CRUD de bodegas con tipos y estado activo/inactivo |
| Los bines se crean y consultan por bodega pero no hay un lugar unificado para verlos | Vista de bines por bodega con su contenido (items, cantidades) |
| No existe mecanismo para mover inventario de una bodega a otra | Flujo de traslados que genera movimientos kardex de SALIDA en origen y ENTRADA en destino |
| La bodega "principal" se busca con `.eq('tipo', 'principal')` hardcodeado en 6+ lugares del código | Clave `bodega_default_id` en tabla `configuracion` usada desde una función helper centralizada |

**Valor de negocio**: Permite operar con múltiples bodegas (planta, showroom, consignación en taller) sin riesgo de mezclar inventarios. El traslado queda trazado en kardex con documento_tipo = 'traslado'. La bodega default configurable elimina un punto de falla crítico si cambia la bodega principal.

## Qué

### Criterios de Éxito
- [ ] Se pueden crear, editar (nombre, código, tipo, activo) y listar bodegas desde Configuración > Bodegas
- [ ] Cada bodega muestra sus bines con estado y contenido (items + cantidades) en el panel WMS
- [ ] Se puede registrar un traslado: seleccionar bodega origen, bodega destino, bin o items sueltos, y confirmar
- [ ] El traslado genera 2 movimientos en kardex: SALIDA_TRASLADO en origen + ENTRADA_TRASLADO en destino
- [ ] La clave `bodega_default_id` existe en tabla `configuracion` y puede cambiarse desde Configuración > Bodegas
- [ ] Todos los lugares que usan `.eq('tipo', 'principal')` son reemplazados por `getBodegaDefault()`

### Comportamiento Esperado

**Gestión de Bodegas (Configuración > Bodegas):**
1. El usuario ve la lista de bodegas activas con código, nombre, tipo y conteo de bines
2. Puede crear una bodega nueva (código único, nombre, tipo: principal/secundaria/externa/consignación)
3. Puede marcar una bodega como "Default" — esto actualiza la clave `bodega_default_id` en `configuracion`
4. Puede activar/desactivar bodegas (no eliminar — preservar kardex)

**Panel WMS (nueva ruta `/wms`):**
1. El usuario selecciona una bodega del sidebar
2. Ve los bines de esa bodega con estado (en_bodega / en_tránsito / entregado) y su contenido expandible
3. Puede iniciar un traslado: elige bodega destino, selecciona bines o items, confirma
4. El sistema valida que haya saldo suficiente y registra el traslado

**Traslado:**
- Se crea un registro en tabla `traslados` (origen, destino, estado: pendiente/completado)
- Por cada item trasladado, se crea un registro en `traslado_items`
- Se generan movimientos kardex automáticamente al confirmar

---

## Contexto

### Referencias
- `src/features/bines/` - Tipos Bin/BinContenido y acciones existentes (crearBin, getBinesByBodega, getContenidoBin)
- `src/features/compras/services/compras-actions.ts` - Patrón getBodegaPrincipal() y crearBin — a refactorizar con getBodegaDefault()
- `src/features/configuracion/components/configuracion-tabs.tsx` - Patrón de tabs para añadir tab Bodegas
- `src/features/configuracion/services/tipos-movimiento-actions.ts` - Patrón server actions con revalidatePath
- `src/features/kardex/services/kardex-actions.ts` - Patrón de movimientos kardex multi-bodega
- `src/app/(main)/configuracion/` - Ruta existente donde va el tab de Bodegas
- Tabla `bodegas`: id, codigo, nombre, tipo, tercero_id, activo, created_at
- Tabla `bines`: id, codigo, tipo, bodega_id, entrega_id, estado, created_at
- Tabla `kardex`: bodega_id, tipo_movimiento_id, documento_tipo, documento_id, cantidad, etc.
- Tabla `configuracion`: clave, valor, descripcion, tipo

### Arquitectura Propuesta (Feature-First)

```
src/features/wms/
├── components/
│   ├── wms-panel.tsx              # Panel principal con sidebar de bodegas
│   ├── bodega-selector.tsx        # Sidebar: lista de bodegas clickeables
│   ├── bodega-bines-view.tsx      # Vista de bines de la bodega seleccionada
│   ├── bin-card.tsx               # Card expandible con contenido del bin
│   ├── traslado-form.tsx          # Form para iniciar un traslado
│   └── traslados-historial.tsx    # Historial de traslados
│
├── services/
│   ├── bodegas-actions.ts         # CRUD bodegas + setBodegaDefault
│   └── traslados-actions.ts       # crearTraslado, confirmarTraslado, getTraslados
│
└── types/
    └── index.ts                   # Bodega, Traslado, TrasladoItem

src/features/configuracion/components/
└── bodegas-tab.tsx                # Tab de gestión de bodegas (usa bodegas-actions)

src/shared/lib/
└── bodega-default.ts              # getBodegaDefault() — helper centralizado
```

### Modelo de Datos

```sql
-- Tabla traslados (nueva)
CREATE TABLE traslados (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          TEXT NOT NULL UNIQUE,
  bodega_origen   UUID NOT NULL REFERENCES bodegas(id),
  bodega_destino  UUID NOT NULL REFERENCES bodegas(id),
  estado          TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | completado | cancelado
  notas           TEXT,
  registrado_por  UUID REFERENCES auth.users(id),
  fecha_traslado  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla traslado_items (nueva)
CREATE TABLE traslado_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traslado_id     UUID NOT NULL REFERENCES traslados(id) ON DELETE CASCADE,
  producto_id     UUID REFERENCES productos(id),
  material_id     UUID REFERENCES materiales(id),
  bin_id          UUID REFERENCES bines(id),
  talla           TEXT,
  cantidad        NUMERIC NOT NULL,
  unidad          TEXT NOT NULL,
  costo_unitario  NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar bodega_default_id en configuracion
INSERT INTO configuracion (clave, valor, descripcion, tipo)
VALUES (
  'bodega_default_id',
  '<id-asimetrico-central>',  -- se resuelve en migración con subquery
  'ID de la bodega que actúa como principal por defecto',
  'uuid'
);

-- RLS
ALTER TABLE traslados ENABLE ROW LEVEL SECURITY;
ALTER TABLE traslado_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traslados_all" ON traslados FOR ALL USING (true);
CREATE POLICY "traslado_items_all" ON traslado_items FOR ALL USING (true);
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: Migración BD + Helper getBodegaDefault
**Objetivo**: Crear tablas `traslados` y `traslado_items`, insertar clave `bodega_default_id` en `configuracion`, y crear el helper `getBodegaDefault()` en shared que todos los módulos usarán.
**Validación**: `execute_sql` confirma tablas creadas con RLS activo. Helper importable desde `@/shared/lib/bodega-default`.

### Fase 2: Gestión de Bodegas en Configuración
**Objetivo**: Añadir tab "Bodegas" al panel de Configuración con CRUD completo (crear, editar nombre/tipo, activar/desactivar, marcar default).
**Validación**: Playwright screenshot confirma tab visible. Se puede crear una bodega nueva y aparece en la lista. El badge "Default" se mueve correctamente.

### Fase 3: Refactorizar bodega hardcodeada en compras + kardex
**Objetivo**: Reemplazar todos los `.eq('tipo', 'principal')` y `getBodegaPrincipal()` en `compras-actions.ts` (y cualquier otro módulo) por el nuevo `getBodegaDefault()`. Sin cambios de comportamiento.
**Validación**: `npm run typecheck` pasa. Las recepciones de OC siguen funcionando igual.

### Fase 4: Panel WMS — Vista de Bodegas y Bines
**Objetivo**: Crear ruta `/wms` con panel que muestra bodegas en sidebar y, al seleccionar una, lista sus bines con estado y contenido expandible.
**Validación**: Playwright navega a `/wms`, hace click en bodega, ve bines y puede expandir contenido de uno.

### Fase 5: Flujo de Traslados
**Objetivo**: Implementar el formulario de traslado (seleccionar origen/destino/items), la action `crearTraslado` que genera kardex, y el historial de traslados.
**Validación**: Se crea un traslado en la BD, aparecen 2 movimientos kardex (SALIDA_TRASLADO + ENTRADA_TRASLADO), y el historial lo muestra.

### Fase 6: Validación Final
**Objetivo**: Sistema WMS funcionando end-to-end, sin deuda técnica.
**Validación**:
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot confirma UI del panel WMS
- [ ] Playwright screenshot confirma tab Bodegas en Configuración
- [ ] Todos los criterios de éxito cumplidos
- [ ] Sin usos de `.eq('tipo', 'principal')` en el codebase

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] La tabla `bodegas` ya existe con datos reales — no usar `DROP TABLE`, solo `ALTER TABLE` si se necesita
- [ ] Los tipos de movimiento `SALIDA_TRASLADO` y `ENTRADA_TRASLADO` probablemente no existen — crearlos en la migración o vía `kardex_tipos_movimiento`
- [ ] `getBodegaDefault()` es async (necesita Supabase client server-side) — no llamarla en Client Components directamente
- [ ] El valor de `bodega_default_id` en la migración debe resolverse con subquery: `(SELECT id FROM bodegas WHERE tipo = 'principal' LIMIT 1)`
- [ ] La ruta `/wms` no existe aún — crear `src/app/(main)/wms/page.tsx`
- [ ] Los bines con `estado != 'en_bodega'` no deben ser trasladables — validar en la action

## Anti-Patrones

- NO hardcodear `.eq('tipo', 'principal')` en ningún lugar nuevo — siempre usar `getBodegaDefault()`
- NO eliminar bodegas con datos en kardex — solo desactivar (`activo = false`)
- NO crear un kardex entry sin `tipo_movimiento_id` válido
- NO usar `any` en TypeScript — tipar correctamente Bodega, Traslado, TrasladoItem
- NO omitir validación Zod en los inputs del formulario de traslado

## 🧠 Aprendizajes (Self-Annealing / Neural Network)

> Esta sección CRECE con cada error encontrado durante la implementación.

---

*PRP pendiente aprobación. No se ha modificado código.*
