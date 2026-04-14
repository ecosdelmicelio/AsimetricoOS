# PRP: Módulo de Desarrollo de Muestras y PLM

## Objetivo

Crear un sistema de gestión de ciclo de vida de producto (PLM) que permita el desarrollo, prototipado y aprobación de muestras antes de su paso a producción masiva. Garantiza trazabilidad total de cambios, materiales, archivos técnicos, costos y tiempos. Alimenta los paneles de producción y compras con órdenes de muestras.

---

## Arquitectura de Datos (Supabase)

### 1. `desarrollo` (Cabecera)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `temp_id` | String | Formato `DEV-YYYY-XXX` (Autogenerado) |
| `cliente_id` | UUID | FK → `terceros` (Nullable — desarrollo interno) |
| `nombre_proyecto` | String | Nombre descriptivo |
| `categoria_producto` | Enum | `camiseta`, `polo`, `pantalon`, `hoodie`, `chaqueta`, `vestido`, `falda`, `accesorio`, `otro` |
| `complejidad` | Enum | `baja`, `media`, `alta` |
| `tipo_producto` | Enum | `fabricado`, `comercializado` — Define si genera OP o OC de muestra |
| `status` | Enum | `draft`, `ops_review`, `sampling`, `fitting`, `client_review`, `approved`, `graduated`, `cancelled` |
| `fecha_compromiso` | Date | Fecha prometida al cliente |
| `producto_final_id` | UUID | FK → `productos` (Post-graduación) |
| `prioridad` | Enum | `baja`, `media`, `alta`, `urgente` |
| `notas` | Text | |
| `creado_por` | UUID | FK → `profiles` |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### 2. `desarrollo_versiones`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `desarrollo_id` | UUID | FK |
| `version_n` | Integer | Incremental (1, 2, 3...) |
| `bom_data` | JSONB | Snapshot de materiales y cantidades |
| `cuadro_medidas` | JSONB | Medidas por talla |
| `comportamiento_tela` | Text | Observaciones sobre elongación/encogimiento |
| `notas_version` | Text | Qué cambió respecto a la versión anterior |
| `aprobado_ops` | Boolean | Aprobación operativa del Director de Operaciones — gatilla la fabricación de muestra |
| `aprobado_cliente` | Boolean | Aprobación visual/física del cliente |
| `aprobado_director` | Boolean | Aprobación técnica del Director de Diseño — gatilla la graduación |
| `created_at` | Timestamp | |

### 3. `desarrollo_assets` (Archivos y Fotos)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `version_id` | UUID | FK |
| `tipo` | Enum | `foto_muestra`, `foto_hallazgo`, `optitex`, `marquilla_comp`, `marquilla_imp`, `empaque`, `etiqueta`, `accesorio`, `ficha_tecnica` |
| `url` | String | Storage URL |
| `descripcion` | Text | |
| `created_at` | Timestamp | |

### 4. `desarrollo_transiciones` (Log de Estados)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `desarrollo_id` | UUID | FK |
| `estado_anterior` | Enum | Status del que salió |
| `estado_nuevo` | Enum | Status al que entró |
| `duracion_fase_seg` | BigInt | Segundos que duró en la fase anterior |
| `usuario_id` | UUID | FK → `profiles` |
| `notas` | Text | Motivo del cambio (especialmente en `cancelled`) |
| `created_at` | Timestamp | |

### 5. `desarrollo_hallazgos` (Hallazgos Estructurados)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `version_id` | UUID | FK → `desarrollo_versiones` |
| `categoria` | Enum | `molderia`, `costura`, `tela`, `acabado`, `color`, `medida`, `avios`, `otro` |
| `severidad` | Enum | `leve`, `moderado`, `critico` |
| `descripcion` | Text | Detalle del hallazgo |
| `zona_prenda` | String | Dónde en la prenda (manga, cuello, espalda, etc.) |
| `foto_url` | String | Storage URL (opcional, complementa `desarrollo_assets`) |
| `resuelto` | Boolean | Default false |
| `resuelto_en_version` | Integer | En qué versión se corrigió |
| `created_at` | Timestamp | |

### 6. `desarrollo_costos` (Desglose por Versión)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `version_id` | UUID | FK → `desarrollo_versiones` |
| `concepto` | Enum | `materiales`, `mano_obra`, `servicios_externos`, `transporte`, `otro` |
| `descripcion` | Text | Detalle |
| `monto` | Decimal | |
| `created_at` | Timestamp | |

### 7. `desarrollo_condiciones` (Condiciones Comerciales y de Abastecimiento)

> Se definen durante el desarrollo — especialmente en comercializados donde las restricciones vienen del proveedor/material. Al graduar, se copian al producto.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `desarrollo_id` | UUID | FK → `desarrollo` |
| `version_id` | UUID | FK → `desarrollo_versiones` (la versión donde se definieron/actualizaron) |
| `proveedor_id` | UUID | FK → `terceros` (Nullable — el proveedor de referencia) |
| `moq_proveedor` | Integer | Mínimo de orden del proveedor (en unidades del proveedor: metros, kg, piezas) |
| `moq_unidad` | Enum | `metros`, `kg`, `unidades`, `piezas`, `docenas` — Unidad del MOQ del proveedor |
| `moq_producto` | Integer | MOQ traducido a unidades de producto terminado (calculado o manual) |
| `multiplo_orden` | Integer | El proveedor despacha en múltiplos de X unidades |
| `leadtime_produccion_dias` | Integer | Días que tarda el proveedor en producir después de confirmar |
| `leadtime_envio_dias` | Integer | Días de tránsito/envío |
| `leadtime_total_dias` | Integer | Calculado: producción + envío + buffer |
| `incoterm` | String | FOB, CIF, EXW, DDP, etc. (Nullable) |
| `puerto_origen` | String | Puerto/ciudad de despacho (Nullable) |
| `moneda` | Enum | `USD`, `COP`, `EUR` — Moneda de negociación |
| `precio_referencia` | Decimal | Precio unitario negociado durante el desarrollo |
| `condiciones_pago` | String | Ej: "50% anticipo, 50% contra BL" |
| `empaque_minimo` | String | Ej: "Caja x 12 unidades", "Bolsa individual" |
| `tallas_disponibles` | JSONB | Array de tallas que el proveedor puede suministrar |
| `colores_disponibles` | JSONB | Array de colores disponibles |
| `notas` | Text | Restricciones adicionales, temporadas, vigencia de precios |
| `vigencia_precio` | Date | Hasta cuándo aplica el precio negociado |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### 8. `desarrollo_condiciones_material` (Restricciones por Material/Insumo)

> Para productos fabricados Y comercializados: cada material del BOM puede tener sus propias restricciones que impactan el MOQ del producto final.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `desarrollo_id` | UUID | FK → `desarrollo` |
| `material_id` | UUID | FK → `materiales` |
| `proveedor_id` | UUID | FK → `terceros` (Nullable) |
| `moq_material` | Decimal | Mínimo de compra del material (en su unidad: metros, kg) |
| `moq_unidad` | String | Unidad del MOQ del material |
| `consumo_por_unidad` | Decimal | Cuánto material se usa por unidad de producto |
| `moq_implicito_producto` | Integer | Calculado: `moq_material / consumo_por_unidad` — Mínimo de producto que implica este material |
| `leadtime_material_dias` | Integer | Tiempo de entrega del material |
| `notas` | Text | |
| `created_at` | Timestamp | |

### 9. `desarrollo_viabilidad_ops` (Checklist del Director de Operaciones)

> Registro estructurado de la evaluación operativa. El Director de Operaciones llena este checklist antes de aprobar.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `desarrollo_id` | UUID | FK → `desarrollo` |
| `version_id` | UUID | FK → `desarrollo_versiones` |
| `evaluado_por` | UUID | FK → `profiles` |
| `materiales_disponibles` | Boolean | Todos los materiales del BOM están disponibles con proveedores activos |
| `moq_viable` | Boolean | Los MOQs de materiales son alcanzables para la demanda proyectada |
| `leadtime_aceptable` | Boolean | El lead time total permite cumplir fechas comerciales |
| `proveedores_confirmados` | Boolean | Los proveedores clave han confirmado capacidad y precios |
| `capacidad_produccion` | Boolean | Hay capacidad en talleres/planta para el volumen esperado (solo fabricados) |
| `riesgo_abastecimiento` | Enum | `bajo`, `medio`, `alto` — Evaluación de riesgo de supply chain |
| `demanda_proyectada` | Integer | Unidades estimadas para primer pedido o primer año |
| `notas_ops` | Text | Observaciones, riesgos identificados, alternativas sugeridas |
| `veredicto` | Enum | `aprobado`, `aprobado_con_reservas`, `rechazado` |
| `condiciones_aprobacion` | Text | Si aprobó con reservas: qué condiciones se deben cumplir |
| `created_at` | Timestamp | |

### 10. `desarrollo_ordenes` (Enlace con OP/OC de Muestra)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `desarrollo_id` | UUID | FK → `desarrollo` |
| `version_id` | UUID | FK → `desarrollo_versiones` |
| `tipo_orden` | Enum | `op_muestra`, `oc_muestra` |
| `op_id` | UUID | FK → `ordenes_produccion` (Nullable) |
| `oc_id` | UUID | FK → `ordenes_compra` (Nullable) |
| `estado` | String | Refleja el estado de la OP/OC enlazada |
| `created_at` | Timestamp | |

---

## Integración con Producción y Compras

### Regla de Enrutamiento

```
desarrollo.tipo_producto = 'fabricado'     → Genera OP de muestra
desarrollo.tipo_producto = 'comercializado' → Genera OC de muestra
```

### OP de Muestra (Producto Fabricado)

Cuando un desarrollo de tipo `fabricado` entra en fase `sampling`:

1. Se crea una `ordenes_produccion` con un flag `es_muestra = true`
2. El `codigo` sigue formato especial: `OP-M-YYYY-XXX` (la M indica muestra)
3. El detalle (`op_detalle`) contiene solo la talla base y cantidad mínima
4. Se enlaza en `desarrollo_ordenes` con `tipo_orden = 'op_muestra'`
5. **Aparece en el panel de Producción** con un badge "MUESTRA" para distinguirla de OPs regulares
6. Sigue el mismo flujo de estados de producción (`programada` → `en_corte` → `en_confeccion` → `entregada`)
7. Si hay nueva versión del desarrollo, se puede crear una nueva OP de muestra

**Campos adicionales en `ordenes_produccion`:**

| Campo | Tipo | Notas |
|-------|------|-------|
| `es_muestra` | Boolean | Default false. True para OPs de desarrollo |
| `desarrollo_id` | UUID | FK → `desarrollo` (Nullable) |

### OC de Muestra (Producto Comercializado)

Cuando un desarrollo de tipo `comercializado` entra en fase `sampling`:

1. Se crea una `ordenes_compra` con un flag `es_muestra = true`
2. El `codigo` sigue formato: `OC-M-YYYY-XXX`
3. Detalle mínimo: producto, talla base, cantidad de muestra, proveedor
4. Se enlaza en `desarrollo_ordenes` con `tipo_orden = 'oc_muestra'`
5. **Aparece en el panel de Compras** con badge "MUESTRA"
6. Sigue el flujo normal de compras

**Campos adicionales en `ordenes_compra`:**

| Campo | Tipo | Notas |
|-------|------|-------|
| `es_muestra` | Boolean | Default false |
| `desarrollo_id` | UUID | FK → `desarrollo` (Nullable) |

### Condiciones Comerciales → Producto → OV

Este es el flujo completo de cómo las condiciones definidas en desarrollo impactan todo el ciclo comercial:

```
Desarrollo (negociación)
  → desarrollo_condiciones + desarrollo_condiciones_material
    → Graduación (copia al producto)
      → productos.minimo_orden, multiplo_orden, leadtime_dias
      → producto_condiciones (detalle extendido)
        → Validación en OV (al agregar líneas)
```

#### Paso 1: Definición durante el Desarrollo

En la fase `sampling` o `fitting`, el equipo registra las condiciones descubiertas:

**Para comercializados (condiciones del proveedor):**
- MOQ del proveedor: "El proveedor vende mínimo 500 piezas"
- Múltiplo: "Despacha en múltiplos de 50"
- Lead time: "Producción 30 días + envío 15 días"
- Empaque: "Cajas de 12 unidades"
- Tallas/colores disponibles
- Precio y vigencia

**Para fabricados (restricciones por material):**
- La tela X tiene MOQ de 300 metros con el proveedor
- Si cada camiseta usa 1.5 metros → el MOQ implícito del producto es 200 unidades
- El material con mayor MOQ implícito define el piso del producto
- Se calcula automáticamente: `MOQ producto = MAX(moq_implicito_producto de cada material)`

#### Paso 2: Graduación — Copia al Producto

Al graduar, el sistema:

1. Copia `moq_producto` → `productos.minimo_orden`
2. Copia `multiplo_orden` → `productos.multiplo_orden`
3. Copia `leadtime_total_dias` → `productos.leadtime_dias`
4. Crea registros en `producto_condiciones` con el detalle extendido (proveedor, incoterm, empaque, vigencia)
5. Para fabricados: el MOQ se calcula como el máximo de los MOQs implícitos de todos los materiales del BOM

**Campos en `productos` (ya existen en el schema):**

Los campos `minimo_orden`, `multiplo_orden` y `leadtime_dias` ya existen en la tabla `productos`. Hoy están vacíos o con defaults. El desarrollo los llena con datos reales.

#### Paso 3: Validación en Órdenes de Venta

Cuando se crea una OV y se agregan líneas de producto, el sistema valida:

| Validación | Regla | Comportamiento |
|------------|-------|----------------|
| **MOQ** | `cantidad >= producto.minimo_orden` | Warning si no cumple, bloqueo configurable |
| **Múltiplo** | `cantidad % producto.multiplo_orden === 0` | Warning: "Debe ser múltiplo de X" |
| **Lead time** | `fecha_entrega - hoy >= producto.leadtime_dias` | Warning: "Este producto requiere X días de anticipación" |
| **Tallas** | Talla solicitada está en `tallas_disponibles` | Error: "Talla no disponible para este producto" |
| **Colores** | Color solicitado está en `colores_disponibles` | Error: "Color no disponible" |
| **Vigencia** | `hoy <= vigencia_precio` | Warning: "Precio negociado venció, verificar con proveedor" |

**Nivel de validación configurable:**
- `warning` — Muestra advertencia pero permite continuar (default)
- `blocking` — No permite agregar la línea hasta corregir

#### Nueva Tabla: `producto_condiciones` (Detalle Extendido Post-Graduación)

> Vive en el feature de productos, no en desarrollo. Es el resultado graduado de `desarrollo_condiciones`.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | UUID | PK |
| `producto_id` | UUID | FK → `productos` |
| `proveedor_id` | UUID | FK → `terceros` |
| `moq_proveedor` | Integer | MOQ original del proveedor |
| `moq_unidad` | String | Unidad del MOQ |
| `leadtime_produccion_dias` | Integer | |
| `leadtime_envio_dias` | Integer | |
| `incoterm` | String | |
| `puerto_origen` | String | |
| `moneda` | Enum | `USD`, `COP`, `EUR` |
| `precio_negociado` | Decimal | |
| `condiciones_pago` | String | |
| `empaque_minimo` | String | |
| `tallas_disponibles` | JSONB | |
| `colores_disponibles` | JSONB | |
| `vigencia_precio` | Date | |
| `activo` | Boolean | Default true — se desactiva si el proveedor cambia condiciones |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### Visibilidad Cruzada

| Panel | Qué ve |
|-------|--------|
| **Producción** | Todas las OPs, las de muestra con badge "MUESTRA" y link al desarrollo |
| **Compras** | Todas las OCs, las de muestra con badge "MUESTRA" y link al desarrollo |
| **Desarrollo** | Estado de la OP/OC enlazada sin salir del módulo (via `desarrollo_ordenes`) |

---

## Flujo de Trabajo (The Factory Loop)

### Fase 1: Iniciación → `draft`

- Creación de `DEV-XXX`
- Definición de tipo: fabricado o comercializado
- Carga de materiales iniciales (BOM v1)
- Definición de cuadro de medidas base
- Vínculo opcional con cliente
- Estimación de complejidad, fecha compromiso y demanda proyectada
- **Si comercializado**: Registro inicial de proveedor y condiciones conocidas (`desarrollo_condiciones`)
- **Si fabricado**: Registro de restricciones por material del BOM (`desarrollo_condiciones_material`)

### Fase 2: Revisión Operativa → `ops_review`

> **Gate inicial obligatorio.** No se envía a fabricar/comprar muestra sin visto bueno de operaciones. Evitar hacer muestras de productos que nunca podrían escalar.

El **Director de Operaciones** evalúa viabilidad de cadena de suministro ANTES de comprometer recursos en una muestra física:

- **Disponibilidad de materiales**: Todos los materiales del BOM tienen proveedores activos con stock o capacidad de producción
- **Viabilidad de MOQs**: Los mínimos del proveedor son alcanzables dado el volumen de demanda proyectado. Si la tela tiene MOQ de 5,000 metros pero la demanda esperada solo justifica 500 metros → no es viable
- **Lead times aceptables**: El tiempo total (producción + envío + buffer) es compatible con los ciclos comerciales del cliente
- **Proveedores confirmados**: Los proveedores clave han confirmado precios, capacidad y tiempos. No son cotizaciones viejas o informales
- **Capacidad de producción** (fabricados): Hay talleres con capacidad disponible para el volumen esperado
- **Riesgo de abastecimiento**: Evaluación de si el producto depende de un único proveedor, material difícil de conseguir, o ruta logística riesgosa

**Veredictos posibles:**
- `aprobado` → Pasa a `sampling`, se autoriza OP/OC de muestra
- `aprobado_con_reservas` → Pasa a `sampling` pero queda documentado qué condiciones deben cumplirse antes del primer pedido masivo (no solo antes de la muestra)
- `rechazado` → Regresa a `draft` con notas del director de ops. Requiere buscar materiales alternativos, cambiar proveedores, o ajustar el concepto antes de reintentar

### Fase 3: Muestreo → `sampling`

- **Solo se llega aquí con aprobación de operaciones**
- **Se genera automáticamente la OP o OC de muestra** según `tipo_producto`
- Fabricación/adquisición de muestra física
- Carga de fotos de la muestra (hasta 10 por versión)
- Registro de costos reales de esta versión
- **Actualización de condiciones**: Al recibir la muestra se confirman/ajustan MOQs, lead times y precios reales del proveedor

### Fase 4: Fitting → `fitting`

- Registro de hallazgos estructurados (categoría, severidad, zona)
- Carga de fotos de hallazgos
- Fitting Form: comentarios de ajuste sobre medidas
- Si hay cambios de materiales o medidas → **Nueva Versión**
  - Si el cambio de material introduce un material nuevo o cambia significativamente el costo/proveedor → **regresa a `ops_review`** para re-validación
  - Si el cambio es menor (ajuste de medida, cambio de color dentro de la misma tela) → regresa a `sampling` directamente
- **Si cambia el material**: Recalcular MOQ implícito del producto (puede cambiar la restricción dominante)

### Fase 5: Revisión Cliente → `client_review`

- Cliente revisa visualmente o físicamente
- Aprueba o rechaza con comentarios
- Si rechaza → **Nueva Versión** (regresa a `sampling` o `ops_review` según la magnitud del cambio)

### Fase 6: Aprobación Final de Diseño → `approved`

- **Director de Diseño:** Valida que todos los hallazgos técnicos se resolvieron y la muestra cumple estándares de calidad
- Este es el último gate antes de graduación, ya que ops y cliente ya aprobaron previamente

### Fase 7: Graduación → `graduated`

- El sistema crea automáticamente el producto en `productos`
- Hereda `tipo_producto` (fabricado/comercializado) del desarrollo
- Mapea el SKU final
- La versión final se convierte en la Ficha Técnica oficial
- El BOM final se copia al producto
- **Copia condiciones comerciales al producto:**
  - `desarrollo_condiciones` → `producto_condiciones` + campos resumen en `productos`
  - `desarrollo_condiciones_material` → Se usa para calcular el MOQ final del producto
  - Para fabricados: `productos.minimo_orden = MAX(moq_implicito_producto)` de todos los materiales
  - Para comercializados: `productos.minimo_orden = desarrollo_condiciones.moq_producto`
  - `productos.multiplo_orden` y `productos.leadtime_dias` se copian directamente
- **Validación pre-graduación**: No se puede graduar si las condiciones comerciales están incompletas (MOQ y leadtime son obligatorios)
- **Registro del veredicto de ops**: Se conserva el `desarrollo_viabilidad_ops` aprobado desde la fase 2 como evidencia histórica del análisis de viabilidad
- **Condiciones heredadas**: Si ops aprobó con reservas, las condiciones quedan anotadas en el producto para que Compras/Producción las atiendan antes del primer pedido masivo

### Cancelación → `cancelled`

- Puede ocurrir desde cualquier fase
- Requiere motivo obligatorio (registrado en `desarrollo_transiciones`)
- Las OPs/OCs de muestra asociadas se cancelan también

---

## Dashboards

### Dashboard 1: Vista General (Gerencia / Comercial)

#### Panel de Muestras por Cliente

- Tabla agrupada por cliente: muestras activas, estado de cada una, días en fase actual
- % de aprobación por cliente (muestras aprobadas / total)
- Semáforo de aging: verde (<7 días), amarillo (7-15), rojo (>15 días sin movimiento)

#### Funnel de Conversión

- Visualización tipo funnel: `draft` → `ops_review` → `sampling` → `fitting` → `client_review` → `approved` → `graduated`
- Cuántas muestras entran y cuántas salen de cada fase
- % de muestras que mueren en cada fase y motivos de cancelación

#### Lead Time y Velocidad

- Tiempo promedio total: `draft` → `graduated`
- Tiempo promedio por fase (identifica cuellos de botella)
- Tendencia mensual del lead time (mejorando o empeorando)
- Comparativo por categoría de producto

#### Hit Rate por Cliente

- % de muestras aprobadas vs rechazadas por cliente
- Número promedio de iteraciones (versiones) por cliente
- Clientes que más "queman" iteraciones

#### Alertas Activas

- Muestras estancadas (>X días sin cambio de estado)
- Muestras próximas a fecha compromiso
- Muestras vencidas (pasaron la fecha compromiso)

#### Filtros Globales

- Por período (rango de fechas)
- Por cliente
- Por categoría de producto
- Por tipo (fabricado/comercializado)
- Por estado actual

---

### Dashboard 2: Director de Diseño

#### Análisis de Hallazgos

- **Heatmap de hallazgos por categoría**: Frecuencia de `molderia`, `costura`, `tela`, `acabado`, `color`, `medida`, `avios`
- **Top 10 hallazgos más repetidos**: Descripción, frecuencia, categoría. Si "manga corta 2cm" aparece 15 veces → problema de molde base
- **Hallazgos por zona de prenda**: Mapa visual de dónde se concentran los problemas
- **Tendencia de hallazgos por mes**: ¿Están disminuyendo o aumentando?
- **Hallazgos recurrentes cross-desarrollo**: Mismo hallazgo aparece en múltiples desarrollos distintos

#### Costos de Desarrollo

- **Costo total por período**: Filtrable por rango de fechas
- **Costo por cliente**: Cuánto cuesta desarrollar para cada cliente
- **Costo por muestra graduada**: Total gastado / muestras que llegaron a `graduated`
- **Costo de no-calidad**: Costo de versiones 2+ (cada iteración extra después de v1 es retrabajo). Separar costo de primera muestra vs costo de correcciones
- **Costo por categoría de producto**: Qué tipos de prenda cuestan más desarrollar
- **Desglose por concepto**: Materiales vs mano de obra vs servicios vs transporte

#### KPIs de Calidad del Equipo

| KPI | Fórmula | Meta sugerida |
|-----|---------|---------------|
| **First-pass yield** | Muestras aprobadas en v1 / Total graduadas | > 40% |
| **Promedio de iteraciones** | Promedio de versiones por muestra | < 3 |
| **Lead time promedio** | Días promedio draft → graduated | Baseline primero |
| **Costo promedio por muestra** | Total costos / Total muestras graduadas | Baseline primero |
| **Hallazgos recurrentes** | Hallazgos con >3 ocurrencias cross-desarrollo | Tendencia → 0 |
| **Aging alert** | Muestras >15 días sin movimiento | 0 |
| **Tasa de cancelación** | Muestras canceladas / Total iniciadas | < 20% |

#### Planificación y Capacidad

- **Carga actual**: Muestras activas simultáneas por fase
- **Backlog priorizado**: Muestras pendientes ordenadas por fecha compromiso y prioridad
- **Calendario de compromisos**: Vista tipo Gantt o calendario con fechas promesa
- **Distribución por complejidad**: Cuántas muestras baja/media/alta hay en cola

#### Base de Conocimiento de Telas

- Datos agregados de `comportamiento_tela` por referencia de material
- Encogimiento y elongación promedio por tipo de tela
- Útil para estimar medidas antes de confeccionar

---

### Dashboard 3: Director de Operaciones

#### Bandeja de Revisión Operativa (Gate Inicial)

- Cola de desarrollos en estado `ops_review` esperando autorización para pasar a muestra
- Separa dos flujos:
  - **Primera revisión**: Desarrollos que llegan directo desde `draft`
  - **Re-revisión**: Desarrollos que regresaron desde `fitting` por cambio de material
- Ordenados por fecha compromiso y prioridad
- Vista rápida del BOM propuesto, condiciones y proveedores de cada uno
- Checklist de viabilidad interactivo (llena `desarrollo_viabilidad_ops`)
- **Indicador de impacto**: Cuántos días se ahorran rechazando rápido vs dejar avanzar a muestra

#### Análisis de Viabilidad

- **Tasa de aprobación ops**: % de desarrollos aprobados / rechazados / aprobados con reservas
- **Motivos de rechazo más frecuentes**: MOQ inviable, lead time excesivo, material sin proveedor, etc.
- **Tiempo promedio en ops_review**: Cuánto tarda la evaluación operativa
- **Desarrollos devueltos a fitting**: Cuántos regresan desde ops y por qué causas

#### Riesgo de Abastecimiento

- **Mapa de dependencias de proveedores**: Cuántos productos dependen de cada proveedor clave
- **Concentración de riesgo**: Productos con proveedor único sin alternativa
- **Materiales críticos**: Insumos compartidos entre múltiples desarrollos/productos (si falla uno, caen varios)
- **Lead times por país/región**: Tiempos promedio de abastecimiento por origen

#### Capacidad vs Demanda

- **Demanda proyectada agregada**: Suma de `demanda_proyectada` de desarrollos aprobados
- **Capacidad comprometida por taller**: Cuánta capacidad hay reservada por OPs ya graduadas
- **Gap de capacidad**: Dónde la demanda proyectada supera la capacidad disponible
- **Pipeline de desarrollos**: Qué productos están por entrar a producción y cuándo

#### Condiciones con Reservas Activas

- Lista de productos graduados con `aprobado_con_reservas`
- Checklist pendiente antes del primer pedido masivo
- Alertas cuando se crea una OV sobre un producto con reservas sin resolver

#### KPIs de Operaciones

| KPI | Fórmula | Meta sugerida |
|-----|---------|---------------|
| **Tasa de aprobación ops** | Aprobados / Total evaluados | > 70% |
| **Tiempo de evaluación** | Días promedio en `ops_review` | < 3 días |
| **Rechazo por MOQ** | % rechazos por MOQ inviable | Tendencia → 0 |
| **Productos de proveedor único** | % productos sin proveedor alternativo | < 30% |
| **Cumplimiento de reservas** | % de reservas resueltas antes del primer pedido | > 90% |

---

### Dashboard 4: Panel de Producción (Extensión)

El panel de producción existente muestra todas las OPs. Se agrega:

- **Filtro "Tipo"**: Regular / Muestra
- **Badge visual**: Las OPs de muestra llevan chip "MUESTRA" en color distinto
- **Link al desarrollo**: Click en badge abre el detalle del `DEV-XXX` asociado
- **Métricas separadas**: Tiempo promedio de OPs de muestra vs OPs regulares
- **Vista agrupada**: Opción de ver OPs de muestra agrupadas por desarrollo

---

### Dashboard 5: Panel de Compras (Extensión)

El panel de compras existente muestra todas las OCs. Se agrega:

- **Filtro "Tipo"**: Regular / Muestra
- **Badge visual**: Las OCs de muestra llevan chip "MUESTRA"
- **Link al desarrollo**: Click en badge abre el detalle del `DEV-XXX`
- **Seguimiento de proveedor**: Tiempo de respuesta del proveedor para muestras
- **Vista agrupada**: OCs de muestra agrupadas por desarrollo

---

### Dashboard 6: Portal Cliente (Vista Limitada)

- Solo sus muestras, estado actual, galería de la última versión aprobada
- Botón de aprobación/rechazo con comentarios
- Historial de sus aprobaciones anteriores
- Tiempo estimado de siguiente entrega (basado en promedios históricos)
- **NO ve**: hallazgos técnicos, BOM detallado, costos, archivos Optitex

---

## UI/UX

- **Timeline de Versiones**: Línea de tiempo visual para "viajar" entre versiones y ver qué cambió
- **Galería tipo Lightroom**: Visualizador de alta calidad para fotos de muestras y hallazgos con zoom y comparación lado a lado
- **Badge de Estado**: Indicadores claros de quién falta por aprobar
- **Semáforo de Aging**: Visual inmediato de muestras estancadas
- **Transiciones animadas**: Al cambiar estado, feedback visual claro del nuevo estado

---

## Reglas de Negocio

- **Telas Regaladas**: Se registran en la bodega `DEV_STORAGE` con costo unitario $0
- **Protección Comercial**: El rol `comercial` solo accede a vista de estados y galería de muestra final
- **Archivos Técnicos**: Archivos Optitex solo visibles para roles `Producción` y `Diseño`
- **Versión Inmutable**: Una vez creada una versión, su BOM y medidas no se editan — se crea nueva versión
- **Gate Inicial de Ops**: No se puede pasar a `sampling` (no se crea OP/OC de muestra) hasta que el Director de Operaciones apruebe la viabilidad de insumos. Evita gastar en muestras de productos que nunca podrían escalar
- **Triple Gate de Aprobación en este orden**: (1) Operaciones → viabilidad de cadena de suministro ANTES de la muestra, (2) Cliente → visual/físico sobre la muestra, (3) Diseño → técnico/calidad antes de graduar
- **Aprobación Secuencial**: No se puede saltar gates. El cliente no revisa si ops no aprobó. Diseño no cierra si cliente no aprobó
- **Rechazo de Ops**: Si el Director de Operaciones rechaza, el desarrollo regresa a `draft` para replantear materiales, proveedores o concepto. No avanza a muestra
- **Re-revisión de Ops**: Si durante `fitting` cambia un material a uno nuevo o de costo/proveedor distinto, el desarrollo regresa a `ops_review` para re-validación antes de fabricar la nueva muestra
- **Cancelación con Motivo**: Toda cancelación requiere motivo obligatorio
- **Costos Automáticos**: Al crear OP/OC de muestra, los costos de materiales se calculan del BOM
- **Graduación Irreversible**: Una vez graduado, el desarrollo no puede volver a estados anteriores
- **Condiciones Obligatorias para Graduar**: No se puede graduar sin MOQ y leadtime definidos — son campos requeridos en la validación pre-graduación
- **MOQ Calculado (Fabricados)**: El MOQ del producto es el máximo de los MOQs implícitos de sus materiales. Si cambia el BOM, se recalcula automáticamente
- **MOQ Directo (Comercializados)**: El MOQ viene del proveedor y se registra directamente en `desarrollo_condiciones`
- **Validación en OV**: Al agregar líneas a una OV, el sistema valida MOQ, múltiplo, leadtime, tallas y colores contra `producto_condiciones`. Nivel configurable: warning o blocking
- **Vigencia de Precios**: Si el precio negociado está vencido, se muestra warning al crear OV. No bloquea por defecto

---

## Roadmap de Implementación

### Sprint 1: Fundación

- Migración de BD: tablas `desarrollo`, `desarrollo_versiones`, `desarrollo_transiciones`, `desarrollo_hallazgos`, `desarrollo_costos`, `desarrollo_assets`, `desarrollo_ordenes`, `desarrollo_condiciones`, `desarrollo_condiciones_material`, `desarrollo_viabilidad_ops`
- Tabla `producto_condiciones` en el feature de productos
- Campos `es_muestra` y `desarrollo_id` en `ordenes_produccion` y `ordenes_compra`
- RLS policies
- Services CRUD básicos
- UI: Lista de desarrollos, formulario de creación, detalle básico

### Sprint 2: Flujo de Versiones y Assets

- Módulo de carga de assets (fotos, archivos técnicos)
- Galería tipo Lightroom con zoom y comparación
- Formulario de versiones con BOM y cuadro de medidas
- Timeline visual de versiones
- Registro de hallazgos estructurados

### Sprint 3: Integración OP/OC, Condiciones y Aprobación

- Generación automática de OP/OC de muestra al entrar en `sampling`
- Badges "MUESTRA" en paneles de producción y compras
- Formulario de condiciones comerciales (comercializados) y restricciones por material (fabricados)
- Cálculo automático de MOQ implícito por material
- Lógica de aprobación triple (cliente → director de diseño → director de operaciones)
- Checklist de viabilidad operativa y formulario de `desarrollo_viabilidad_ops`
- Log de transiciones de estado
- Registro de costos por versión

### Sprint 4: Dashboards y Graduación

- Dashboard General (funnel, lead time, aging, hit rate)
- Dashboard Director de Diseño (hallazgos, costos, KPIs, capacidad)
- Dashboard Director de Operaciones (bandeja, viabilidad, riesgo de abastecimiento, reservas activas)
- Extensiones a paneles de producción y compras
- Portal cliente (vista limitada)
- Graduación automática a producto con copia de condiciones a `producto_condiciones`
- Validación de condiciones en OV (MOQ, múltiplo, leadtime, tallas, colores, vigencia)
- Reportes exportables

---

## Notas de Implementación

### Dependencia: Tablas de Compras

El módulo de compras tiene código y tipos definidos en `src/features/compras/` pero las tablas de BD (`ordenes_compra`, `oc_detalle`, `oc_detalle_mp`, `rollos`) no existen en migraciones. **Sprint 1 debe incluir la migración de compras como prerequisito** para poder crear OC de muestra.

### Campos en Productos

La tabla `productos` ya tiene `tipo_producto: 'fabricado' | 'comercializado'`, `estado: 'en_desarrollo'`, y los campos `minimo_orden`, `multiplo_orden`, `leadtime_dias`. La graduación debe:
1. Crear el producto con `estado = 'activo'`
2. Heredar `tipo_producto` del desarrollo
3. Copiar BOM de la versión final
4. Llenar `minimo_orden`, `multiplo_orden`, `leadtime_dias` desde las condiciones del desarrollo
5. Crear `producto_condiciones` con el detalle extendido (proveedor, incoterm, empaque, etc.)

### Validación en OV (Feature existente)

Actualmente `ordenes-venta` calcula leadtime en [ov-detail.tsx](src/features/ordenes-venta/components/ov-detail.tsx) pero no valida contra `productos.minimo_orden` ni `productos.multiplo_orden` al agregar líneas. Sprint 4 debe:
1. Agregar validación al formulario de líneas de OV
2. Consultar `producto_condiciones` para tallas/colores disponibles
3. Mostrar warnings/errores según nivel configurado
4. Mostrar banner si el precio negociado está vencido

### Estados de OP Existentes

Las OPs usan: `programada`, `en_corte`, `en_confeccion`, `dupro_pendiente`, `en_terminado`, `entregada`, `liquidada`, `cancelada`. Las OPs de muestra siguen el mismo flujo pero típicamente van directo de `programada` a `en_confeccion` (sin corte masivo).
