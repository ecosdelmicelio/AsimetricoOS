'use client'

import { useState } from 'react'
import { Code2, AlertTriangle, ShieldCheck, Package, Landmark, Users } from 'lucide-react'
import { CalidadConfigForm } from '@/features/calidad/components/calidad-config-form'
import { TiposMovimientoTab } from '@/features/configuracion/components/tipos-movimiento-tab'
import { BodegasTab } from '@/features/configuracion/components/bodegas-tab'
import { AtributosConfig } from '@/features/productos/components/atributos-config'
import { AtributosConfigMP } from '@/features/materiales/components/atributos-config'
import { AtributosConfigServicio } from '@/features/servicios/components/atributos-config-servicio'
import { PlmConfigPanel } from '@/features/configuracion/components/plm-config-panel'
import { ConfiguracionContablePanel } from '@/features/finanzas/components/configuracion-contable-panel'
import { EmpleadosManager } from '@/features/finanzas/components/empleados-manager'
import type { CalidadConfig } from '@/features/calidad/types'
import type { TipoMovimiento } from '@/features/configuracion/services/tipos-movimiento-actions'
import type { Bodega } from '@/features/wms/types'
import type { AtributoPT } from '@/features/productos/types/atributos'
import type { AtributoMP } from '@/features/materiales/types/atributos'
import type { TipoServicioAtributo } from '@/features/servicios/types/servicios'
import type { ActivoFijo } from '@/features/finanzas/services/activos-actions'
import type { Empleado } from '@/features/finanzas/services/empleados-actions'
import type { Socio } from '@/features/finanzas/services/socios-actions'

type Tab = 'bodegas' | 'atributos-pt' | 'atributos-mp' | 'atributos-servicios' | 'defectos' | 'movimientos' | 'calidad' | 'plm' | 'finanzas' | 'recursos-humanos'

const TABS: { id: Tab; label: string; sub: string; icon: any }[] = [
  { id: 'bodegas', label: 'Bodegas', sub: 'Gestión de bodegas y default',           icon: Package },
  { id: 'finanzas', label: 'Finanzas', sub: 'Balances, Activos y Parafiscales',    icon: Landmark },
  { id: 'recursos-humanos', label: 'R. Humanos', sub: 'Gestión de empleados y nómina', icon: Users },
  { id: 'atributos-pt', label: 'Atributos PT', sub: 'Tipo, Fit, Color, etc.',       icon: Code2  },
  { id: 'atributos-mp', label: 'Atributos MP', sub: 'Tipo, Subtipo, Color, etc.',   icon: Code2  },
  { id: 'atributos-servicios', label: 'Atributos Servicios', sub: 'Tipo, Subtipo',   icon: Code2  },
  { id: 'defectos', label: 'Tipos de Defecto', sub: 'Catálogo para calidad',        icon: Code2  },
  { id: 'movimientos', label: 'Movimientos', sub: 'Tipos de movimiento kardex',    icon: Code2  },
  { id: 'calidad',  label: 'Calidad',          sub: 'Parámetros de inspección',     icon: ShieldCheck},
  { id: 'plm',      label: 'Parámetros PLM',   sub: 'Días nuevo, reglas',         icon: Code2  },
]

interface Props {
  tiposDefecto: { id: string; codigo: string; nombre: string; categoria: string }[]
  tiposMovimiento: TipoMovimiento[]
  calidadConfig: CalidadConfig
  atributosPT: AtributoPT[]
  atributosMP: AtributoMP[]
  atributosServicios: TipoServicioAtributo[]
  bodegas: Bodega[]
  bodegaDefaultId: string | null
  ajustes: any[]
  // Finanzas & HR
  balanceConfig: { clave: string; valor: number; nota: string }[]
  activos: ActivoFijo[]
  empleados: Empleado[]
  parafiscales: Record<string, number>
  socios: Socio[]
}

export function ConfiguracionTabs({
  tiposDefecto,
  tiposMovimiento,
  calidadConfig,
  atributosPT,
  atributosMP,
  atributosServicios,
  bodegas,
  bodegaDefaultId,
  ajustes,
  balanceConfig,
  activos,
  empleados,
  parafiscales,
  socios
}: Props) {
  const [tab, setTab] = useState<Tab>('bodegas')

  return (
    <div className="space-y-6">
      {/* Tabs Layout: Grid para mejor visualización de muchos elementos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left group ${
              tab === t.id
                ? 'bg-neu-base shadow-neu-inset border-2 border-primary-500'
                : 'bg-neu-base shadow-neu border-2 border-transparent hover:scale-[1.02]'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              tab === t.id ? 'bg-primary-900 text-white' : 'bg-neu-base shadow-neu-inset text-muted-foreground'
            }`}>
              <t.icon className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className={`text-[11px] font-black uppercase tracking-wider truncate ${tab === t.id ? 'text-primary-900' : 'text-foreground'}`}>
                {t.label}
              </p>
              <p className="text-[9px] text-muted-foreground truncate italic">{t.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pt-4 transition-all duration-300">
        {tab === 'bodegas' && <BodegasTab bodegas={bodegas} bodegaDefaultId={bodegaDefaultId} />}
        {tab === 'finanzas' && <ConfiguracionContablePanel balanceConfig={balanceConfig} activos={activos} parafiscales={parafiscales} socios={socios} />}
        {tab === 'recursos-humanos' && <EmpleadosManager initialEmpleados={empleados} />}
        {tab === 'atributos-pt' && <AtributosConfig atributos={atributosPT} />}
        {tab === 'atributos-mp' && <AtributosConfigMP atributos={atributosMP} />}
        {tab === 'atributos-servicios' && <AtributosConfigServicio atributos={atributosServicios} />}
        {tab === 'defectos' && <DefectosPanel tiposDefecto={tiposDefecto} />}
        {tab === 'movimientos' && <TiposMovimientoTab tiposMovimiento={tiposMovimiento} />}
        {tab === 'calidad'  && <CalidadConfigForm config={calidadConfig} />}
        {tab === 'plm'      && <PlmConfigPanel ajustes={ajustes} />}
      </div>
    </div>
  )
}

function DefectosPanel({ tiposDefecto }: { tiposDefecto: { id: string; codigo: string; nombre: string; categoria: string }[] }) {
  return (
    <div className="space-y-4">
      <p className="text-body-sm text-muted-foreground">
        Tipos de defecto usados en inspecciones de calidad (DuPro y FRI).
      </p>
      {tiposDefecto.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center flex flex-col items-center gap-2">
          <AlertTriangle className="w-7 h-7 text-muted-foreground" />
          <p className="text-body-sm text-muted-foreground">Sin tipos de defecto configurados</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-black/5">
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Código</span>
            <span className="col-span-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</span>
            <span className="col-span-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categoría</span>
          </div>
          <div className="divide-y divide-black/5">
            {tiposDefecto.map(td => (
              <div key={td.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3">
                <span className="col-span-2 font-mono text-body-sm font-bold text-primary-700">{td.codigo}</span>
                <span className="col-span-5 text-body-sm text-foreground">{td.nombre}</span>
                <span className="col-span-5 text-body-sm text-muted-foreground capitalize">{td.categoria}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
