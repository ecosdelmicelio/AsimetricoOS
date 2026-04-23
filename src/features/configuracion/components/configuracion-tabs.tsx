'use client'

import { useState } from 'react'
import { Code2, AlertTriangle, ShieldCheck, Package, Landmark, Users } from 'lucide-react'
import { CalidadConfigForm } from '@/features/calidad/components/calidad-config-form'
import { DefectosConfig } from '@/features/calidad/components/defectos-config'
import { TiposMovimientoTab } from '@/features/configuracion/components/tipos-movimiento-tab'
import { BodegasTab } from '@/features/configuracion/components/bodegas-tab'
import { AtributosConfig } from '@/features/productos/components/atributos-config'
import { AtributosConfigMP } from '@/features/materiales/components/atributos-config'
import { AtributosConfigServicio } from '@/features/servicios/components/atributos-config-servicio'
import { PlmConfigPanel } from '@/features/configuracion/components/plm-config-panel'
import type { CalidadConfig, TipoDefecto } from '@/features/calidad/types'
import type { TipoMovimiento } from '@/features/configuracion/services/tipos-movimiento-actions'
import type { Bodega } from '@/features/wms/types'
import type { AtributoPT } from '@/features/productos/types/atributos'
import type { AtributoMP } from '@/features/materiales/types/atributos'
import type { TipoServicioAtributo } from '@/features/servicios/types/servicios'

type Tab = 'bodegas' | 'atributos-pt' | 'atributos-mp' | 'atributos-servicios' | 'defectos' | 'movimientos' | 'calidad' | 'plm' | 'finanzas' | 'hr' | 'socios'

const TABS: { id: Tab; label: string; sub: string; icon: any }[] = [
  { id: 'bodegas', label: 'Bodegas', sub: 'Gestión de bodegas y default',           icon: Package },
  { id: 'atributos-pt', label: 'Atributos PT', sub: 'Tipo, Fit, Color, etc.',       icon: Code2  },
  { id: 'atributos-mp', label: 'Atributos MP', sub: 'Tipo, Subtipo, Color, etc.',   icon: Code2  },
  { id: 'atributos-servicios', label: 'Atributos Servicios', sub: 'Tipo, Subtipo',   icon: Code2  },
  { id: 'defectos', label: 'Tipos de Defecto', sub: 'Catálogo para calidad',        icon: AlertTriangle },
  { id: 'movimientos', label: 'Movimientos', sub: 'Tipos de movimiento kardex',    icon: Code2  },
  { id: 'calidad',  label: 'Calidad',          sub: 'Parámetros de inspección',     icon: ShieldCheck},
  { id: 'finanzas', label: 'Entidad Legal',    sub: 'Capital, bancos, activos',     icon: Landmark },
  { id: 'hr',       label: 'Nómina',           sub: 'Empleados y parafiscales',     icon: Users },
  { id: 'socios',   label: 'Socios',           sub: 'Participación y capital',      icon: Users },
  { id: 'plm',      label: 'Parámetros PLM',   sub: 'Días nuevo, reglas',           icon: Code2  },
]

interface Props {
  tiposDefecto: TipoDefecto[]
  tiposMovimiento: TipoMovimiento[]
  calidadConfig: CalidadConfig
  atributosPT: AtributoPT[]
  atributosMP: AtributoMP[]
  atributosServicios: TipoServicioAtributo[]
  bodegas: Bodega[]
  bodegaDefaultId: string | null
  ajustes: any[]
  // Finanzas & HR
  balanceConfig: any[]
  activos: any[]
  empleados: any[]
  parafiscales: any[]
  socios: any[]
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

        {tab === 'atributos-pt' && <AtributosConfig atributos={atributosPT} />}
        {tab === 'atributos-mp' && <AtributosConfigMP atributos={atributosMP} />}
        {tab === 'atributos-servicios' && <AtributosConfigServicio atributos={atributosServicios} />}
        {tab === 'defectos' && <DefectosConfig tiposDefecto={tiposDefecto} />}
        {tab === 'movimientos' && <TiposMovimientoTab tiposMovimiento={tiposMovimiento} />}
        {tab === 'calidad'  && <CalidadConfigForm config={calidadConfig} />}
        {tab === 'plm'      && <PlmConfigPanel ajustes={ajustes} />}
        
        {tab === 'finanzas' && (
          <div className="space-y-6">
            <DataGrid title="Balance Inicial" data={balanceConfig} columns={['clave', 'valor', 'nota']} />
            <DataGrid title="Activos Fijos" data={activos} columns={['nombre', 'valor_compra', 'estado']} />
          </div>
        )}

        {tab === 'hr' && (
          <div className="space-y-6">
            <DataGrid title="Nómina" data={empleados} columns={['nombre', 'cargo', 'salario_base', 'estado']} />
            <DataGrid title="Parafiscales (%)" data={parafiscales} columns={['id', 'valor', 'descripcion']} />
          </div>
        )}

        {tab === 'socios' && <DataGrid title="Socios" data={socios} columns={['nombre', 'capital_aportado', 'participacion_pct']} />}
      </div>
    </div>
  )
}

function DataGrid({ title, data, columns }: { title: string; data: any[]; columns: string[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h3>
      <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden border border-black/5">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-black/5">
            <tr>
              {columns.map(c => (
                <th key={c} className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.replace('_', ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 bg-white">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                {columns.map(c => (
                  <td key={c} className="px-5 py-3 text-body-sm text-slate-700 font-medium">
                    {typeof row[c] === 'number' ? row[c].toLocaleString() : String(row[c] || '—')}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-body-sm text-muted-foreground italic">Sin registros</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
