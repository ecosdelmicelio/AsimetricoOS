# 📋 BUSINESS_LOGIC.md - Asimétrico OS (Torre de Control)

> Generado por SaaS Factory | Fecha: 2026-02-22
> Contexto fuente: Asimetrico.md — Códex Estratégico Asimétrico Lab 2026

---

## 1. Problema de Negocio

**Dolor:** Asimétrico Lab opera con ceguera operativa total sobre sus talleres satélites. El Orquestador debe ir físicamente a los talleres para conocer el avance de producción. Los defectos de calidad se registran pero nunca se consultan ni generan acción. La liquidación financiera de una OP tarda hasta 15 días después de que el taller termina.

**Costo actual:**
- Desplazamientos físicos constantes a 3 talleres para saber estados
- Datos de calidad que no cambian ninguna decisión operativa
- 15 días de ceguera financiera por OP completada
- Imposible detectar retrasos antes de que ya sea demasiado tarde

---

## 2. Solución

**Propuesta de valor:** Una plataforma web/mobile que digitaliza el ciclo completo OV → OP → Producción → Calidad → Liquidación, dándole al Orquestador visibilidad en tiempo real sin pisar un taller.

**Flujo principal (Happy Path):**

1. **Orquestador crea una OV** → Define cliente, productos (SKU), cantidades por talla y fecha de entrega
2. **OV se divide en OPs** → El Orquestador asigna partes de la OV a uno o más talleres, generando Órdenes de Producción
3. **Taller recibe su OP** → El Jefe de Piso ve en su celular qué debe producir, cuánto y cuándo
4. **Jefe de Piso reporta por hito completado** → Al terminar Corte, Confección, etc., registra unidades por talla desde el celular
5. **Inspector registra calidad** → Desde el taller, con foto obligatoria, reporta defectos en DUPRO (preventiva) y FRI (final)
6. **App calcula liquidación automáticamente** → Costo real = servicio taller - penalidades calidad
7. **Orquestador aprueba liquidación** → Cierre financiero de la OP
8. **Torre de Control siempre actualizada** → Dashboard en tiempo real con estado de todas las OPs, alertas de retraso y ranking de talleres

---

## 3. Usuarios

| Rol | Dispositivo | Acciones principales |
|-----|-------------|---------------------|
| **Orquestador** (Daniel/Alejandro) | Desktop + Mobile | Crear OVs, dividir a talleres, aprobar liquidaciones, ver Torre de Control |
| **Jefe de Piso** (1 por taller, 3 talleres activos) | Mobile (smartphone) | Ver su OP asignada, reportar hitos completados con unidades por talla |
| **Inspector de Calidad** (puede ser de Asimétrico o del taller) | Mobile (smartphone) | Registrar DUPRO/FRI, fotografiar defectos, cerrar inspecciones |

---

## 4. Arquitectura de Datos

**Input:**
- Productos (SKU + nombre + categoría)
- Clientes y Talleres (maestro de terceros)
- Órdenes de Venta (cliente, productos, tallas, cantidades, precio pactado, fecha entrega)
- Reportes de hitos (Jefe de Piso: unidades por talla por hito)
- Inspecciones de calidad (tipo defecto, gravedad, foto, cantidad afectada)

**Output:**
- Estado en tiempo real de cada OP (hito actual, % completado)
- Alertas de retraso (cuando la OP va a incumplir fecha prometida)
- Informe de calidad por taller (ranking, defectos recurrentes, FTT)
- Liquidación financiera por OP (costo real vs. teórico)
- Torre de Control: dashboard con todas las OPs activas

**Storage (Supabase tables):**

```
productos          → Catálogo de SKUs (referencia, nombre, categoría, precio base)
clientes           → Maestro de clientes
talleres           → Talleres satélites (nombre, capacidad_diaria, lead_time, estado)
ordenes_venta      → Cabecera de OV (cliente, fecha_entrega, estado)
ov_detalle         → Líneas de OV (producto, talla, cantidad, precio_pactado)
ordenes_produccion → OP asignada a taller (ov_id, taller_id, fecha_promesa, estado)
op_detalle         → Detalle de OP por producto/talla/cantidad
hitos_produccion   → Log de hitos (op_id, hito_nombre, talla, cantidad, timestamp, usuario_id)
inspecciones       → Cabecera DUPRO/FRI (op_id, tipo, fecha, inspector_id, resultado)
novedades_calidad  → Defectos (inspeccion_id, tipo_defecto, gravedad, foto_url, cantidad)
liquidaciones      → Pre-liquidación por OP (costos calculados, estado: pendiente/aprobada)
```

---

## 5. KPI de Éxito (v1)

| Métrica | Hoy | Objetivo v1 |
|---------|-----|-------------|
| Visibilidad de estado de OP | Solo yendo físicamente al taller | Tiempo real desde cualquier lugar |
| Tiempo de liquidación post-cierre | 15 días | Menos de 24 horas |
| Consulta de datos de calidad | Nunca se consultan | Dashboard activo con ranking de talleres |
| Detección de retrasos | Cuando ya es tarde | Alerta antes de vencer la fecha |

---

## 6. Especificación Técnica

### Features a Implementar (Feature-First)

```
src/features/
├── auth/                → Email/Password (Supabase), 3 roles: orquestador | jefe_piso | inspector
├── productos/           → Catálogo de SKUs
├── clientes-talleres/   → Maestro de terceros (clientes + talleres satélites)
├── ordenes-venta/       → Creación y gestión de OVs con matriz de tallas
├── ordenes-produccion/  → Split OV → OP por taller, asignación
├── produccion/          → Reporte de hitos por Jefe de Piso (mobile-first)
├── calidad/             → DUPRO/FRI con foto obligatoria, registro de defectos
├── liquidacion/         → Cálculo automático de costo real + aprobación Orquestador
└── torre-control/       → Dashboard en tiempo real para el Orquestador
```

### Roles y Permisos (RLS Supabase)

| Feature | Orquestador | Jefe de Piso | Inspector |
|---------|:-----------:|:------------:|:---------:|
| Torre de Control | ✅ | ❌ | ❌ |
| Crear OV / generar OP | ✅ | ❌ | ❌ |
| Ver su OP asignada | ✅ | ✅ Solo su taller | ❌ |
| Reportar hitos | ✅ | ✅ Solo su taller | ❌ |
| Registrar calidad | ✅ | ❌ | ✅ |
| Aprobar liquidación | ✅ | ❌ | ❌ |

### Hitos de Producción (Secuencia bloqueante)

```
[1] Corte → [2] Confección → [3] DUPRO (Calidad preventiva) →
[4] Terminado → [5] FRI (Inspección final) → [6] Empaque
```

**Regla:** Un hito no puede reportarse sin que el anterior esté cerrado. El sistema no permite avanzar si hay una inspección abierta con defecto CRÍTICO.

### Stack Confirmado

- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind 3.4 + shadcn/ui
- **Backend:** Supabase (Auth + Database + Storage para fotos de calidad)
- **Validación:** Zod
- **State:** Zustand
- **MCPs activos:** Next.js DevTools + Playwright + Supabase

---

## 7. Próximos Pasos

1. [ ] Setup proyecto Next.js 16 base
2. [ ] Configurar Supabase (tablas + RLS + Storage bucket para fotos)
3. [ ] Feature: auth (Email/Password, 3 roles)
4. [ ] Feature: productos (catálogo SKU)
5. [ ] Feature: clientes-talleres (maestro de terceros)
6. [ ] Feature: ordenes-venta (OV con matriz de tallas)
7. [ ] Feature: ordenes-produccion (split OV → OP por taller)
8. [ ] Feature: produccion (hitos mobile-first)
9. [ ] Feature: calidad (DUPRO/FRI con foto)
10. [ ] Feature: liquidacion (cálculo + aprobación)
11. [ ] Feature: torre-control (dashboard Orquestador)
12. [ ] Testing E2E con Playwright
13. [ ] Deploy en Vercel

---

## 8. Notas Arquitectónicas

- **Mobile-first obligatorio** en `produccion/` y `calidad/` — los usuarios están en el taller
- **RLS estricto:** cada Jefe de Piso solo ve las OPs de su taller
- **Fotos en Supabase Storage:** las imágenes de defectos se almacenan con referencia a `novedades_calidad`
- **Liquidación como estado bloqueante:** la OP no cierra hasta que el Orquestador aprueba
- **Torre de Control:** exclusiva del Orquestador, semáforo de estado por OP, ranking de talleres por FTT (First Time Through)
- **App existente:** hay un proyecto Next.js ya iniciado en este directorio — evaluar reutilizar o arrancar limpio

---

*"Primero entiende el negocio. Después escribe código."*
