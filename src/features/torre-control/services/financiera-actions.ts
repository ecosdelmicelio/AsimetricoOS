'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export interface FinancieraKPIs {
  revenue_mes: number
  cogs_mes: number
  margen_bruto_pct: number
  ebitda_aprox: number
  flujo_neto_mes: number
  cuentas_por_cobrar: number
  cuentas_por_pagar: number
  dias_promedio_cobro: number
  dias_promedio_pago: number
  burn_rate: number
  runway_meses: number
}

export interface CarteraAging {
  rango: string
  monto: number
  count: number
}

export interface FlujoMensual {
  mes: string
  ingresos: number
  egresos: number
}

export interface FinancieraData {
  kpis: FinancieraKPIs
  aging_cobrar: CarteraAging[]
  aging_pagar: CarteraAging[]
  flujo_mensual: FlujoMensual[]
  top_clientes_revenue: { nombre: string; revenue: number }[]
}

export async function getFinancieraData(): Promise<FinancieraData> {
  const supabase = db(await createClient())

  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const inicio6Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1).toISOString()

  const [
    ovDetalleRes,
    ocDetalleRes,
    pagosRes,
    ovsRes,
    ocsRes,
    bancosRes
  ] = await Promise.all([
    // Revenue: OV detalle del mes actual
    supabase
      .from('ov_detalle')
      .select('precio_pactado, cantidad, ov_id, ordenes_venta!inner(created_at, estado, cliente_id, terceros!cliente_id(nombre))')
      .gte('ordenes_venta.created_at', inicio6Meses),

    // COGS: OC detalle del mes actual
    supabase
      .from('oc_detalle')
      .select('precio_pactado, cantidad, oc_id, ordenes_compra!inner(created_at)')
      .gte('ordenes_compra.created_at', inicio6Meses),

    // Pagos de los últimos 6 meses
    supabase
      .from('pagos')
      .select('*')
      .gte('fecha_pago', inicio6Meses)
      .order('fecha_pago', { ascending: true }),

    // OVs para cartera por cobrar
    supabase
      .from('ordenes_venta')
      .select('id, total_facturado, total_pagado, estado_pago, fecha_vencimiento, fecha_factura')
      .neq('estado_pago', 'pagada')
      .not('total_facturado', 'is', null),

    // OCs para cartera por pagar
    supabase
      .from('ordenes_compra')
      .select('id, total_facturado, total_pagado, estado_pago, fecha_vencimiento, fecha_factura_proveedor')
      .neq('estado_pago', 'pagada')
      .not('total_facturado', 'is', null),

    // Saldos bancarios
    supabase
      .from('cuentas_bancarias')
      .select('saldo_actual')
      .eq('activa', true)
  ])

  const ovDetalle = ovDetalleRes.data || []
  const ocDetalle = ocDetalleRes.data || []
  const pagos = pagosRes.data || []
  const ovsPendientes = ovsRes.data || []
  const ocsPendientes = ocsRes.data || []
  const bancos = (bancosRes as any).data || []

  // ---------- REVENUE & COGS DEL MES ----------
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`

  const revenueMes = ovDetalle
    .filter((d: any) => (d.ordenes_venta?.created_at || '').startsWith(mesActual))
    .reduce((s: number, d: any) => s + (d.precio_pactado * d.cantidad), 0)

  const cogsMes = ocDetalle
    .filter((d: any) => (d.ordenes_compra?.created_at || '').startsWith(mesActual))
    .reduce((s: number, d: any) => s + (d.precio_pactado * d.cantidad), 0)

  const margenBrutoPct = revenueMes > 0 ? ((revenueMes - cogsMes) / revenueMes) * 100 : 0
  const ebitdaAprox = revenueMes - cogsMes

  // ---------- FLUJO DE CAJA DEL MES ----------
  const pagosMes = pagos.filter((p: any) => (p.fecha_pago || '').startsWith(mesActual))
  const ingresosMes = pagosMes.filter((p: any) => p.tipo === 'ingreso').reduce((s: number, p: any) => s + p.monto, 0)
  const egresosMes = pagosMes.filter((p: any) => p.tipo === 'egreso').reduce((s: number, p: any) => s + p.monto, 0)

  // ---------- CUENTAS POR COBRAR Y PAGAR ----------
  const cxc = ovsPendientes.reduce((s: number, ov: any) => s + ((ov.total_facturado || 0) - (ov.total_pagado || 0)), 0)
  const cxp = ocsPendientes.reduce((s: number, oc: any) => s + ((oc.total_facturado || 0) - (oc.total_pagado || 0)), 0)

  // ---------- DÍAS PROMEDIO DE COBRO/PAGO ----------
  const pagosIngreso = pagos.filter((p: any) => p.tipo === 'ingreso' && p.documento_id)
  const pagosEgreso = pagos.filter((p: any) => p.tipo === 'egreso' && p.documento_id)

  let diasCobro = 0
  if (pagosIngreso.length > 0) {
    diasCobro = Math.round(pagosIngreso.reduce((s: number, p: any) => {
      const diff = (new Date(p.fecha_pago).getTime() - new Date(p.created_at || p.fecha_pago).getTime()) / 86400000
      return s + Math.max(0, diff)
    }, 0) / pagosIngreso.length)
  }

  let diasPago = 0
  if (pagosEgreso.length > 0) {
    diasPago = Math.round(pagosEgreso.reduce((s: number, p: any) => {
      const diff = (new Date(p.fecha_pago).getTime() - new Date(p.created_at || p.fecha_pago).getTime()) / 86400000
      return s + Math.max(0, diff)
    }, 0) / pagosEgreso.length)
  }

  // ---------- AGING CARTERA ----------
  function calcAging(docs: any[], fechaField: string): CarteraAging[] {
    const hoy = Date.now()
    const rangos = [
      { label: '0-30d', min: 0, max: 30 },
      { label: '31-60d', min: 31, max: 60 },
      { label: '61-90d', min: 61, max: 90 },
      { label: '>90d', min: 91, max: Infinity },
    ]
    return rangos.map(r => {
      const matched = docs.filter((d: any) => {
        const fv = d[fechaField]
        if (!fv) return r.label === '>90d' // Sin fecha = mayor riesgo
        const dias = Math.floor((hoy - new Date(fv).getTime()) / 86400000)
        return dias >= r.min && dias <= r.max
      })
      return {
        rango: r.label,
        monto: matched.reduce((s: number, d: any) => s + ((d.total_facturado || 0) - (d.total_pagado || 0)), 0),
        count: matched.length,
      }
    })
  }

  const agingCobrar = calcAging(ovsPendientes, 'fecha_vencimiento')
  const agingPagar = calcAging(ocsPendientes, 'fecha_vencimiento')

  // ---------- FLUJO MENSUAL (6 meses) ----------
  const mesesMap: Record<string, { ingresos: number; egresos: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    mesesMap[key] = { ingresos: 0, egresos: 0 }
  }
  pagos.forEach((p: any) => {
    const key = (p.fecha_pago || '').substring(0, 7)
    if (mesesMap[key]) {
      if (p.tipo === 'ingreso') mesesMap[key].ingresos += p.monto
      else mesesMap[key].egresos += p.monto
    }
  })
  const flujoMensual: FlujoMensual[] = Object.entries(mesesMap).map(([mes, v]) => ({
    mes,
    ingresos: v.ingresos,
    egresos: v.egresos,
  }))

  // ---------- TOP CLIENTES POR REVENUE ----------
  const clienteMap: Record<string, { nombre: string; revenue: number }> = {}
  ovDetalle.forEach((d: any) => {
    const nombre = d.ordenes_venta?.terceros?.nombre || 'Desconocido'
    const clienteId = d.ordenes_venta?.cliente_id || 'unknown'
    if (!clienteMap[clienteId]) clienteMap[clienteId] = { nombre, revenue: 0 }
    clienteMap[clienteId].revenue += d.precio_pactado * d.cantidad
  })
  const topClientes = Object.values(clienteMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // ---------- BURN RATE & RUNWAY ----------
  const egresos3Meses = pagos.filter((p: any) => p.tipo === 'egreso').reduce((s: number, p: any) => s + p.monto, 0)
  const burnRate = egresos3Meses / (pagos.length > 0 ? 3 : 1) // Promedio mensual (last 3-6 months)
  const saldoTotal = bancos.reduce((s: number, b: any) => s + (b.saldo_actual || 0), 0)
  const runway = burnRate > 0 ? saldoTotal / burnRate : Infinity

  return {
    kpis: {
      revenue_mes: revenueMes,
      cogs_mes: cogsMes,
      margen_bruto_pct: margenBrutoPct,
      ebitda_aprox: ebitdaAprox,
      flujo_neto_mes: ingresosMes - egresosMes,
      cuentas_por_cobrar: cxc,
      cuentas_por_pagar: cxp,
      dias_promedio_cobro: diasCobro,
      dias_promedio_pago: diasPago,
      burn_rate: burnRate,
      runway_meses: runway,
    },
    aging_cobrar: agingCobrar,
    aging_pagar: agingPagar,
    flujo_mensual: flujoMensual,
    top_clientes_revenue: topClientes,
  }
}
