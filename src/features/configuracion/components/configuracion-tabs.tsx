'use client'

import { useState } from 'react'
import { Code2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { SchemaManager } from '@/features/codigo-schema/components/schema-manager'
import { CalidadConfigForm } from '@/features/calidad/components/calidad-config-form'
import { TiposMovimientoTab } from '@/features/configuracion/components/tipos-movimiento-tab'
import type { CodigoSchema } from '@/features/codigo-schema/types'
import type { CalidadConfig } from '@/features/calidad/types'
import type { TipoMovimiento } from '@/features/configuracion/services/tipos-movimiento-actions'

type Tab = 'pt' | 'mp' | 'servicio' | 'defectos' | 'calidad' | 'movimientos'

const TABS: { id: Tab; label: string; sub: string; icon: 'code' | 'shield' }[] = [
  { id: 'pt',       label: 'Esquema PT',      sub: 'Código de Producto Terminado', icon: 'code'  },
  { id: 'mp',       label: 'Esquema MP',       sub: 'Código de Materia Prima',      icon: 'code'  },
  { id: 'servicio', label: 'Esquema Servicio', sub: 'Código de Servicio',           icon: 'code'  },
  { id: 'defectos', label: 'Tipos de Defecto', sub: 'Catálogo para calidad',        icon: 'code'  },
  { id: 'movimientos', label: 'Movimientos', sub: 'Tipos de movimiento kardex',    icon: 'code'  },
  { id: 'calidad',  label: 'Calidad',          sub: 'Parámetros de inspección',     icon: 'shield'},
]

interface Props {
  schemaProducto: CodigoSchema | null
  schemaMaterial: CodigoSchema | null
  schemaServicio: CodigoSchema | null
  tiposDefecto: { id: string; codigo: string; nombre: string; categoria: string }[]
  tiposMovimiento: TipoMovimiento[]
  calidadConfig: CalidadConfig
}

export function ConfiguracionTabs({
  schemaProducto,
  schemaMaterial,
  schemaServicio,
  tiposDefecto,
  tiposMovimiento,
  calidadConfig,
}: Props) {
  const [tab, setTab] = useState<Tab>('pt')

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
                : <Code2     className={`w-3.5 h-3.5 ${tab === t.id ? 'text-primary-600' : 'text-muted-foreground'}`} />
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
      {tab === 'pt'       && <SchemaManager entidad="producto" schema={schemaProducto} />}
      {tab === 'mp'       && <SchemaManager entidad="material" schema={schemaMaterial} />}
      {tab === 'servicio' && <SchemaManager entidad="servicio" schema={schemaServicio} />}
      {tab === 'defectos' && <DefectosPanel tiposDefecto={tiposDefecto} />}
      {tab === 'movimientos' && <TiposMovimientoTab tiposMovimiento={tiposMovimiento} />}
      {tab === 'calidad'  && <CalidadConfigForm config={calidadConfig} />}
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
