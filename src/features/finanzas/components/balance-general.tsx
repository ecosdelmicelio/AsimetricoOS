'use client'

import { Building2, Users, Package, Briefcase, TrendingDown } from 'lucide-react'

interface BalanceData {
  activos: {
    corrientes: { saldo_bancos: number; cuentas_por_cobrar: number; valor_inventario: number }
    no_corrientes: { valor_activos_bruto: number; depreciacion_acum: number; valor_activos_neto: number }
    total: number
  }
  pasivos: {
    corrientes: { cuentas_por_pagar: number }
    no_corrientes: { deuda_total: number }
    total: number
  }
  patrimonio: {
    capital_social: number
    utilidades_retenidas: number
    utilidad_periodo: number
    total: number
  }
  ecuacion_ok: boolean
}

const fmt = (n: number) => `$${Number(n).toLocaleString('es-CO')}`

function Fila({ concepto, valor, bold = false, indent = false }: {
  concepto: string; valor: number; bold?: boolean; indent?: boolean
}) {
  return (
    <div className={`flex justify-between py-2 border-b border-slate-50 ${bold ? 'font-black text-foreground' : 'text-muted-foreground'}`}>
      <span className={`text-body-sm ${indent ? 'pl-6' : ''}`}>{concepto}</span>
      <span className={`text-body-sm font-bold ${valor < 0 ? 'text-red-600' : ''}`}>{fmt(valor)}</span>
    </div>
  )
}

function Seccion({ titulo, icon: Icon, children, total, color }: {
  titulo: string; icon: React.ElementType; children: React.ReactNode; total: number; color: string
}) {
  return (
    <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
      <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-black text-xs uppercase tracking-widest text-foreground">{titulo}</span>
        </div>
        <span className="font-black text-foreground">{fmt(total)}</span>
      </div>
      <div className="px-6 py-2">{children}</div>
    </div>
  )
}

export function BalanceGeneral({ data, anio }: { data: BalanceData; anio: number }) {
  return (
    <div className="space-y-6">
      {/* Indicador de balance */}
      <div className={`rounded-2xl p-4 flex items-center gap-3 ${data.ecuacion_ok ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-200'}`}>
        <div className={`w-3 h-3 rounded-full ${data.ecuacion_ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <p className={`text-sm font-bold ${data.ecuacion_ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {data.ecuacion_ok
            ? `✓ Balance cuadra — Activos = Pasivos + Patrimonio (${fmt(data.activos.total)})`
            : `⚠️ Balance descuadrado — revisa la configuración inicial`
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ACTIVOS */}
        <Seccion titulo="Activos" icon={Building2} total={data.activos.total} color="bg-primary-100 text-primary-600">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-3 pb-1">Corrientes</p>
          <Fila concepto="Caja y Bancos"        valor={data.activos.corrientes.saldo_bancos}        indent />
          <Fila concepto="Cuentas por Cobrar"   valor={data.activos.corrientes.cuentas_por_cobrar} indent />
          <Fila concepto="Inventarios"          valor={data.activos.corrientes.valor_inventario}   indent />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-3 pb-1">No Corrientes</p>
          <Fila concepto="Activos Fijos (Bruto)" valor={data.activos.no_corrientes.valor_activos_bruto}  indent />
          <Fila concepto="(-) Depreciación Acum." valor={-data.activos.no_corrientes.depreciacion_acum} indent />
          <Fila concepto="Activos Fijos Netos"   valor={data.activos.no_corrientes.valor_activos_neto}  indent />
        </Seccion>

        {/* PASIVOS */}
        <Seccion titulo="Pasivos" icon={TrendingDown} total={data.pasivos.total} color="bg-red-100 text-red-600">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-3 pb-1">Corrientes</p>
          <Fila concepto="Cuentas por Pagar (OCs)" valor={data.pasivos.corrientes.cuentas_por_pagar} indent />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-3 pb-1">No Corrientes</p>
          <Fila concepto="Préstamos y Créditos"    valor={data.pasivos.no_corrientes.deuda_total}    indent />
        </Seccion>

        {/* PATRIMONIO */}
        <Seccion titulo="Patrimonio" icon={Users} total={data.patrimonio.total} color="bg-emerald-100 text-emerald-600">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-3 pb-1">Capital</p>
          <Fila concepto="Capital Social"          valor={data.patrimonio.capital_social}       indent />
          <Fila concepto="Utilidades Retenidas"    valor={data.patrimonio.utilidades_retenidas} indent />
          <Fila concepto={`Utilidad ${anio}`}      valor={data.patrimonio.utilidad_periodo}    indent />
        </Seccion>
      </div>
    </div>
  )
}
