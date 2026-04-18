'use client'

import { useState } from 'react'
import { Code2, AlertTriangle, ShieldCheck, Package } from 'lucide-react'
import { CalidadConfigForm } from '@/features/calidad/components/calidad-config-form'
import { TiposMovimientoTab } from '@/features/configuracion/components/tipos-movimiento-tab'
import { BodegasTab } from '@/features/configuracion/components/bodegas-tab'
import { AtributosConfig } from '@/features/productos/components/atributos-config'
import { AtributosConfigMP } from '@/features/materiales/components/atributos-config'
import { AtributosConfigServicio } from '@/features/servicios/components/atributos-config-servicio'
import { PlmConfigPanel } from '@/features/configuracion/components/plm-config-panel'
import type { CalidadConfig } from '@/features/calidad/types'
import type { TipoMovimiento } from '@/features/configuracion/services/tipos-movimiento-actions'
import type { Bodega } from '@/features/wms/types'
import type { AtributoPT } from '@/features/productos/types/atributos'
import type { AtributoMP } from '@/features/materiales/types/atributos'
import type { TipoServicioAtributo } from '@/features/servicios/types/servicios'

type Tab = 'defectos' | 'calidad' | 'movimientos' | 'atributos-pt' | 'atributos-mp' | 'atributos-servicios' | 'bodegas' | 'plm'

const TABS: { id: Tab; label: string; sub: string; icon: 'code' | 'shield' | 'package' }[] = [
  { id: 'bodegas', label: 'Bodegas', sub: 'Gestión de bodegas y default',           icon: 'package' },
  { id: 'atributos-pt', label: 'Atributos PT', sub: 'Tipo, Fit, Color, etc.',       icon: 'code'  },
  { id: 'atributos-mp', label: 'Atributos MP', sub: 'Tipo, Subtipo, Color, etc.',   icon: 'code'  },
  { id: 'atributos-servicios', label: 'Atributos Servicios', sub: 'Tipo, Subtipo',   icon: 'code'  },
  { id: 'defectos', label: 'Tipos de Defecto', sub: 'Catálogo para calidad',        icon: 'code'  },
  { id: 'movimientos', label: 'Movimientos', sub: 'Tipos de movimiento kardex',    icon: 'code'  },
  { id: 'calidad',  label: 'Calidad',          sub: 'Parámetros de inspección',     icon: 'shield'},
  { id: 'plm',      label: 'Parámetros PLM',   sub: 'Días nuevo, reglas',         icon: 'code'  },
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
}: Props) {
  const [tab, setTab] = useState<Tab>('bodegas')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-left ${
              tab === t.id
                ? 'bg-neu-base shadow-neu-inset border-2 border-primary-400'
                : 'bg-neu-base shadow-neu border-2 border-transparent hover:shadow-neu-lg'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              tab === t.id ? 'bg-primary-100' : 'bg-neu-base shadow-neu-inset'
            }`}>
              {t.icon === 'shield'
                ? <ShieldCheck className={`w-3.5 h-3.5 ${tab === t.id ? 'text-primary-600' : 'text-muted-foreground'}`} />
                : t.icon === 'package'
                ? <Package className={`w-3.5 h-3.5 ${tab === t.id ? 'text-primary-600' : 'text-muted-foreground'}`} />
                : <Code2 className={`w-3.5 h-3.5 ${tab === t.id ? 'text-primary-600' : 'text-muted-foreground'}`} />
              }
            </div>
            <div>
              <p className={`text-body-sm font-semibold ${tab === t.id ? 'text-primary-700' : 'text-foreground'}`}>
                {t.label}
              </p>
              <p className="text-xs text-muted-foreground">{t.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'bodegas' && <BodegasTab bodegas={bodegas} bodegaDefaultId={bodegaDefaultId} />}
      {tab === 'atributos-pt' && <AtributosConfig atributos={atributosPT} />}
      {tab === 'atributos-mp' && <AtributosConfigMP atributos={atributosMP} />}
      {tab === 'atributos-servicios' && <AtributosConfigServicio atributos={atributosServicios} />}
      {tab === 'defectos' && <DefectosPanel tiposDefecto={tiposDefecto} />}
      {tab === 'movimientos' && <TiposMovimientoTab tiposMovimiento={tiposMovimiento} />}
      {tab === 'calidad'  && <CalidadConfigForm config={calidadConfig} />}
      {tab === 'plm'      && <PlmConfigPanel ajustes={ajustes} />}
    </div>
  )
}

function DefectosPanel({ tiposDefecto }: { tiposDefecto: Props['tiposDefecto'] }) {
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
