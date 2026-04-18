'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { getInteresesMes } from './prestamos-actions'
import { getNominaPorArea } from './empleados-actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(s: unknown): any { return s }

export interface LineaPL {
  concepto: string
  valor: number
  es_subtotal?: boolean
  nivel?: 1 | 2 | 3
}

// ─── ESTADO DE RESULTADOS ────────────────────────────────────────────────────

export async function getEstadoResultados(mes: number, anio: number) {
  const supabase = db(await createClient())

  const startDate = `${anio}-${String(mes).padStart(2, '0')}-01`
  const nextMes = mes === 12 ? 1 : mes + 1
  const nextAnio = mes === 12 ? anio + 1 : anio
  const endDate = `${nextAnio}-${String(nextMes).padStart(2, '0')}-01`

  // 1. INGRESOS — OVs facturadas del periodo
  const { data: ovs } = await supabase
    .from('ordenes_venta')
    .select('total')
    .gte('created_at', startDate)
    .lt('created_at', endDate)
    .neq('status', 'cancelada')

  const ingresos_brutos = (ovs ?? []).reduce((s: number, o: any) => s + Number(o.total ?? 0), 0)

  // 2. COSTO DE VENTAS — Gastos marcados como CIF
  const { data: gastos_cif } = await supabase
    .from('gastos')
    .select('monto_total')
    .gte('fecha', startDate)
    .lt('fecha', endDate)
    .eq('es_cif', true)

  const cif = (gastos_cif ?? []).reduce((s: number, g: any) => s + Number(g.monto_total), 0)

  // 3. GASTOS OPERATIVOS por área
  const { data: gastos_op } = await supabase
    .from('gastos')
    .select('monto_total, area')
    .gte('fecha', startDate)
    .lt('fecha', endDate)
    .eq('es_cif', false)

  const gastos_por_area: Record<string, number> = {}
  for (const g of gastos_op ?? []) {
    gastos_por_area[g.area] = (gastos_por_area[g.area] ?? 0) + Number(g.monto_total)
  }
  const total_gastos_op = Object.values(gastos_por_area).reduce((a, b) => a + b, 0)

  // 4. NÓMINA (como gasto operativo por área)
  const nomina = await getNominaPorArea()
  const total_nomina = Object.values(nomina).reduce((a, b) => a + b, 0)

  // 5. GASTOS FINANCIEROS — Intereses de préstamos
  const intereses = await getInteresesMes(mes, anio)

  // 6. IMPUESTO DE RENTA
  const { data: imp } = await supabase
    .from('ajustes_sistema')
    .select('valor')
    .eq('id', 'impuesto_renta_pct')
    .single() as { data: { valor: string } | null }
  const tasa_impuesto = parseFloat(imp?.valor ?? '35') / 100

  // ─── CONSTRUCCIÓN P&L ────────────────────────────────────────────────────
  const utilidad_bruta = ingresos_brutos - cif
  const total_op = total_gastos_op + total_nomina
  const ebitda = utilidad_bruta - total_op
  const ebit = ebitda - intereses
  const impuesto = Math.max(0, ebit * tasa_impuesto)
  const utilidad_neta = ebit - impuesto

  const lineas: LineaPL[] = [
    { concepto: 'Ingresos por Ventas (Netos)',     valor: ingresos_brutos,  nivel: 1 },
    { concepto: 'Costos Indirectos de Fabricación (CIF)', valor: -cif,      nivel: 2 },
    { concepto: 'UTILIDAD BRUTA',                  valor: utilidad_bruta,   es_subtotal: true },
    { concepto: 'Gastos Operativos (sin nómina)',  valor: -total_gastos_op, nivel: 2 },
    { concepto: 'Nómina (Costo Total con Parafiscales)', valor: -total_nomina, nivel: 2 },
    { concepto: 'EBITDA (Utilidad Operacional)',   valor: ebitda,           es_subtotal: true },
    { concepto: 'Gastos Financieros (Intereses)',  valor: -intereses,       nivel: 2 },
    { concepto: 'Utilidad Antes de Impuestos',     valor: ebit,             es_subtotal: true },
    { concepto: `Impuesto de Renta (${(tasa_impuesto * 100).toFixed(0)}%)`, valor: -impuesto, nivel: 2 },
    { concepto: 'UTILIDAD NETA',                   valor: utilidad_neta,    es_subtotal: true },
  ]

  return {
    lineas,
    resumen: {
      ingresos_brutos,
      cif,
      utilidad_bruta,
      total_gastos_op,
      total_nomina,
      ebitda,
      intereses,
      impuesto,
      utilidad_neta,
      margen_bruto: ingresos_brutos > 0 ? (utilidad_bruta / ingresos_brutos) * 100 : 0,
      margen_neto: ingresos_brutos > 0 ? (utilidad_neta / ingresos_brutos) * 100 : 0,
    }
  }
}

// ─── BALANCE GENERAL GERENCIAL ────────────────────────────────────────────────

export async function getBalanceGeneral(anio: number) {
  const supabase = db(await createClient())

  // ACTIVOS CORRIENTES
  const { data: ovsDeudoras } = await supabase
    .from('ordenes_venta')
    .select('total')
    .in('payment_status', ['pendiente', 'parcial'])
  const cuentas_por_cobrar = (ovsDeudoras ?? []).reduce((s: number, o: any) => s + Number(o.total ?? 0), 0)

  // Inventario valorizado — sumamos costo_promedio * stock del kardex
  const { data: inventario } = await supabase
    .from('catalogo_stock')
    .select('stock_total, costo_promedio')
  const valor_inventario = (inventario ?? []).reduce(
    (s: number, i: any) => s + (Number(i.stock_total ?? 0) * Number(i.costo_promedio ?? 0)), 0
  )

  // Saldo en bancos desde config
  const { data: configBancos } = await supabase
    .from('balance_config')
    .select('valor')
    .eq('clave', 'saldo_inicial_bancos')
    .single() as { data: { valor: number } | null }
  const saldo_bancos = Number(configBancos?.valor ?? 0)

  // ACTIVOS NO CORRIENTES
  const { data: activos } = await supabase
    .from('activos_fijos')
    .select('valor_compra, depreciacion_mes, fecha_compra')
    .eq('estado', 'activo')
  const valor_activos_bruto = (activos ?? []).reduce((s: number, a: any) => s + Number(a.valor_compra), 0)
  const depreciacion_acum = (activos ?? []).reduce((s: number, a: any) => {
    const meses = Math.floor((Date.now() - new Date(a.fecha_compra).getTime()) / (30 * 24 * 3600 * 1000))
    return s + (Number(a.depreciacion_mes) * meses)
  }, 0)
  const valor_activos_neto = Math.max(0, valor_activos_bruto - depreciacion_acum)

  // PASIVOS CORRIENTES
  const { data: ocsPendientes } = await supabase
    .from('ordenes_compra')
    .select('total')
    .in('payment_status', ['pendiente', 'parcial'])
  const cuentas_por_pagar = (ocsPendientes ?? []).reduce((s: number, o: any) => s + Number(o.total ?? 0), 0)

  // PASIVOS NO CORRIENTES
  const { data: prestamos } = await supabase
    .from('prestamos')
    .select('saldo_actual')
    .eq('estado', 'activo')
  const deuda_total = (prestamos ?? []).reduce((s: number, p: any) => s + Number(p.saldo_actual), 0)

  // PATRIMONIO
  const { data: configSocios } = await supabase
    .from('balance_config')
    .select('clave, valor')
    .in('clave', ['capital_social', 'utilidades_retenidas'])
  const capital_social = Number(configSocios?.find((c: any) => c.clave === 'capital_social')?.valor ?? 0)
  const utilidades_retenidas = Number(configSocios?.find((c: any) => c.clave === 'utilidades_retenidas')?.valor ?? 0)

  // Calcular utilidad del periodo actual (año completo)
  let utilidad_periodo = 0
  for (let m = 1; m <= 12; m++) {
    const { resumen } = await getEstadoResultados(m, anio)
    utilidad_periodo += resumen.utilidad_neta
  }

  const total_activos = saldo_bancos + cuentas_por_cobrar + valor_inventario + valor_activos_neto
  const total_pasivos = cuentas_por_pagar + deuda_total
  const total_patrimonio = capital_social + utilidades_retenidas + utilidad_periodo

  return {
    activos: {
      corrientes: { saldo_bancos, cuentas_por_cobrar, valor_inventario },
      no_corrientes: { valor_activos_bruto, depreciacion_acum, valor_activos_neto },
      total: total_activos,
    },
    pasivos: {
      corrientes: { cuentas_por_pagar },
      no_corrientes: { deuda_total },
      total: total_pasivos,
    },
    patrimonio: {
      capital_social,
      utilidades_retenidas,
      utilidad_periodo,
      total: total_patrimonio,
    },
    ecuacion_ok: Math.abs(total_activos - (total_pasivos + total_patrimonio)) < 1,
  }
}

// ─── BREAK-EVEN ──────────────────────────────────────────────────────────────

export async function getBreakEven(mes: number, anio: number) {
  const supabase = db(await createClient())

  const startDate = `${anio}-${String(mes).padStart(2, '0')}-01`
  const nextMes = mes === 12 ? 1 : mes + 1
  const nextAnio = mes === 12 ? anio + 1 : anio
  const endDate = `${nextAnio}-${String(nextMes).padStart(2, '0')}-01`

  // Costos Fijos del mes (gastos tipo 'fijo' + nómina)
  const { data: gastosFijos } = await supabase
    .from('gastos')
    .select('monto_total')
    .gte('fecha', startDate)
    .lt('fecha', endDate)
    .eq('tipo', 'fijo')
  const cf = (gastosFijos ?? []).reduce((s: number, g: any) => s + Number(g.monto_total), 0)

  const nomina = await getNominaPorArea()
  const total_nomina = Object.values(nomina).reduce((a, b) => a + b, 0)
  const costos_fijos = cf + total_nomina

  // Precio promedio ponderado y margen variable
  const { data: ovDetalles } = await supabase
    .from('ov_detalle')
    .select('precio_unitario, cantidad, ordenes_venta!inner(created_at)')
    .gte('ordenes_venta.created_at', startDate)
    .lt('ordenes_venta.created_at', endDate)

  const detalles = (ovDetalles ?? []) as any[]
  const unidades_totales = detalles.reduce((s, d) => s + Number(d.cantidad), 0)
  const ingresos_totales = detalles.reduce((s, d) => s + Number(d.precio_unitario) * Number(d.cantidad), 0)
  const precio_promedio = unidades_totales > 0 ? ingresos_totales / unidades_totales : 0

  // Costos variables por unidad (CIF / unidades vendidas)
  const { data: gastosCIF } = await supabase
    .from('gastos').select('monto_total')
    .gte('fecha', startDate).lt('fecha', endDate).eq('es_cif', true)
  const cif_total = (gastosCIF ?? []).reduce((s: number, g: any) => s + Number(g.monto_total), 0)
  const cv_unitario = unidades_totales > 0 ? cif_total / unidades_totales : 0

  const margen_contribucion = precio_promedio - cv_unitario
  const punto_equilibrio_unidades = margen_contribucion > 0
    ? Math.ceil(costos_fijos / margen_contribucion)
    : 0
  const punto_equilibrio_pesos = punto_equilibrio_unidades * precio_promedio

  return {
    costos_fijos,
    precio_promedio,
    cv_unitario,
    margen_contribucion,
    punto_equilibrio_unidades,
    punto_equilibrio_pesos,
    unidades_vendidas: unidades_totales,
    cobertura_pct: punto_equilibrio_unidades > 0
      ? (unidades_totales / punto_equilibrio_unidades) * 100
      : 0,
  }
}

// ─── CCE (CICLO DE CONVERSIÓN DE EFECTIVO) ───────────────────────────────────

export async function getCCE(mes: number, anio: number) {
  const supabase = db(await createClient())
  const startDate = `${anio}-${String(mes).padStart(2, '0')}-01`
  const nextMes = mes === 12 ? 1 : mes + 1
  const nextAnio = mes === 12 ? anio + 1 : anio
  const endDate = `${nextAnio}-${String(nextMes).padStart(2, '0')}-01`

  // Días de Cobro promedio (DSO)
  const { data: clientes } = await supabase
    .from('terceros').select('plazo_pago_dias').overlaps('tipos', ['cliente'])
  const dso = (clientes ?? []).length > 0
    ? (clientes ?? []).reduce((s: number, c: any) => s + Number(c.plazo_pago_dias ?? 30), 0) / (clientes ?? []).length
    : 30

  // Días de Pago promedio a proveedores (DPO)
  const { data: proveedores } = await supabase
    .from('terceros').select('plazo_pago_dias').overlaps('tipos', ['proveedor'])
  const dpo = (proveedores ?? []).length > 0
    ? (proveedores ?? []).reduce((s: number, p: any) => s + Number(p.plazo_pago_dias ?? 30), 0) / (proveedores ?? []).length
    : 30

  // Días de Inventario (DIO) — estimado en lead time promedio
  const { data: productos } = await supabase.from('productos').select('leadtime_dias').eq('estado', 'activo')
  const dio = (productos ?? []).length > 0
    ? (productos ?? []).reduce((s: number, p: any) => s + Number(p.leadtime_dias ?? 30), 0) / (productos ?? []).length
    : 30

  const cce = dso + dio - dpo

  return {
    dso: Math.round(dso),
    dio: Math.round(dio),
    dpo: Math.round(dpo),
    cce: Math.round(cce),
    interpretacion: cce > 90
      ? 'CRÍTICO: El efectivo tarda más de 90 días en recuperarse'
      : cce > 60
      ? 'ATENCIÓN: Ciclo de efectivo alto, considera mejorar plazos de cobro'
      : 'SALUDABLE: Ciclo de conversión bajo control',
  }
}
