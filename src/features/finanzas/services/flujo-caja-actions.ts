'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { getCuotasProximas } from './prestamos-actions'
import { getNominaPorArea } from './empleados-actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(s: unknown): any { return s }

export interface DiaCashFlow {
  fecha: string
  ingresos: number
  egresos: number
  neto: number
  saldo_acumulado: number
  detalle_ingresos: { concepto: string; monto: number }[]
  detalle_egresos: { concepto: string; monto: number }[]
}

export interface FlujoCajaResumen {
  periodo: '30d' | '60d' | '90d'
  total_ingresos: number
  total_egresos: number
  neto: number
  saldo_final: number
  alerta: string | null
}

export async function getFlujoCaja90Dias() {
  const supabase = db(await createClient())
  const hoy = new Date()

  // ─── INGRESOS ESPERADOS ───────────────────────────────────────────────────
  // OVs pendientes de cobro → proyectadas al vencimiento (fecha + plazo_pago)
  const { data: ovsPendientes } = await supabase
    .from('ordenes_venta')
    .select('id, total, created_at, plazo_pago_dias, terceros(nombre)')
    .in('payment_status', ['pendiente', 'parcial'])
    .neq('status', 'cancelada')

  // ─── EGRESOS PROGRAMADOS ──────────────────────────────────────────────────
  // 1. Cuotas de préstamos
  const cuotasPrestamos = await getCuotasProximas(90)

  // 2. OCs pendientes de pago
  const { data: ocsPendientes } = await supabase
    .from('ordenes_compra')
    .select('id, total, created_at, plazo_pago_dias, terceros(nombre)')
    .in('payment_status', ['pendiente', 'parcial'])
    .neq('status', 'cancelada')

  // 3. Nómina mensual (próximos 3 meses)
  const nomina = await getNominaPorArea()
  const nomina_mensual = Object.values(nomina).reduce((a, b) => a + b, 0)

  // ─── CONSTRUIR LÍNEA DE TIEMPO (30 / 60 / 90 días) ──────────────────────
  const dias: Record<string, DiaCashFlow> = {}

  // Inicializar días
  for (let d = 1; d <= 90; d++) {
    const fecha = new Date(hoy)
    fecha.setDate(fecha.getDate() + d)
    const key = fecha.toISOString().split('T')[0]
    dias[key] = {
      fecha: key,
      ingresos: 0,
      egresos: 0,
      neto: 0,
      saldo_acumulado: 0,
      detalle_ingresos: [],
      detalle_egresos: [],
    }
  }

  // Ingresos: OVs proyectadas
  for (const ov of ovsPendientes ?? []) {
    const fechaOV = new Date(ov.created_at)
    fechaOV.setDate(fechaOV.getDate() + (ov.plazo_pago_dias ?? 30))
    const key = fechaOV.toISOString().split('T')[0]
    if (dias[key]) {
      dias[key].ingresos += Number(ov.total ?? 0)
      dias[key].detalle_ingresos.push({
        concepto: `OV — ${(ov.terceros as any)?.nombre ?? 'Cliente'}`,
        monto: Number(ov.total ?? 0)
      })
    }
  }

  // Egresos: Cuotas préstamos
  for (const c of cuotasPrestamos) {
    if (dias[c.fecha]) {
      dias[c.fecha].egresos += c.monto
      dias[c.fecha].detalle_egresos.push({ concepto: `Cuota — ${c.prestamo}`, monto: c.monto })
    }
  }

  // Egresos: OCs proyectadas
  for (const oc of ocsPendientes ?? []) {
    const fechaOC = new Date(oc.created_at)
    fechaOC.setDate(fechaOC.getDate() + (oc.plazo_pago_dias ?? 30))
    const key = fechaOC.toISOString().split('T')[0]
    if (dias[key]) {
      dias[key].egresos += Number(oc.total ?? 0)
      dias[key].detalle_egresos.push({
        concepto: `OC — ${(oc.terceros as any)?.nombre ?? 'Proveedor'}`,
        monto: Number(oc.total ?? 0)
      })
    }
  }

  // Egresos: Nómina (primer día hábil de cada mes dentro del horizonte)
  for (let m = 0; m < 3; m++) {
    const fechaNomina = new Date(hoy)
    fechaNomina.setDate(1)
    fechaNomina.setMonth(fechaNomina.getMonth() + m + 1)
    const key = fechaNomina.toISOString().split('T')[0]
    if (dias[key]) {
      dias[key].egresos += nomina_mensual
      dias[key].detalle_egresos.push({ concepto: 'Nómina mensual (con parafiscales)', monto: nomina_mensual })
    }
  }

  // Calcular neto y acumulado
  const lineas = Object.values(dias).sort((a, b) => a.fecha.localeCompare(b.fecha))
  let acumulado = 0
  for (const d of lineas) {
    d.neto = d.ingresos - d.egresos
    acumulado += d.neto
    d.saldo_acumulado = acumulado
  }

  // ─── RESÚMENES POR HORIZONTE ─────────────────────────────────────────────
  const calc = (limite: number): FlujoCajaResumen => {
    const subset = lineas.slice(0, limite)
    const ti = subset.reduce((s, d) => s + d.ingresos, 0)
    const te = subset.reduce((s, d) => s + d.egresos, 0)
    const neto = ti - te
    return {
      periodo: `${limite}d` as '30d' | '60d' | '90d',
      total_ingresos: ti,
      total_egresos: te,
      neto,
      saldo_final: neto,
      alerta: neto < 0 ? `⚠️ Déficit proyectado de $${Math.abs(neto).toLocaleString()} en los próximos ${limite} días` : null,
    }
  }

  return {
    lineas,
    resumen_30d: calc(30),
    resumen_60d: calc(60),
    resumen_90d: calc(90),
  }
}
