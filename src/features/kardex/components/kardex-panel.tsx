'use client'

import { useState } from 'react'
import { SaldosPTMatriz } from './saldos-pt-matriz'
import { HistorialPTFiltrable } from './historial-pt-filtrable'
import { SaldosMPTabla } from './saldos-mp-tabla'
import { HistorialMPFiltrable } from './historial-mp-filtrable'
import type { SaldoMP, SaldoPT, HistorialMP, HistorialPT } from '../services/kardex-actions'

type Tab = 'saldos-mp' | 'saldos-pt' | 'historial-mp' | 'historial-pt'

interface Props {
  saldosMP: SaldoMP[]
  saldosPT: SaldoPT[]
  historialMP: HistorialMP[]
  historialPT: HistorialPT[]
  materiales: Array<{ id: string; codigo: string; nombre: string }>
  productos: Array<{ id: string; referencia: string; nombre: string }>
  bodegas: Array<{ id: string; nombre: string }>
  tiposMovimiento: Array<{ id: string; nombre: string }>
}

export function KardexPanel({
  saldosMP,
  saldosPT,
  historialMP,
  historialPT,
  materiales,
  productos,
  bodegas,
  tiposMovimiento,
}: Props) {
  const [tab, setTab] = useState<Tab>('saldos-pt')

  const tabs: Array<{ id: Tab; label: string; section: 'saldos' | 'historial' }> = [
    { id: 'saldos-pt', label: 'Saldos PT', section: 'saldos' },
    { id: 'saldos-mp', label: 'Saldos MP', section: 'saldos' },
    { id: 'historial-pt', label: 'Historial PT', section: 'historial' },
    { id: 'historial-mp', label: 'Historial MP', section: 'historial' },
  ]

  return (
    <div className="space-y-6">
      {/* Sección Saldos */}
      <div>
        <h2 className="text-body-md font-semibold text-foreground mb-4">Saldos Actuales</h2>
        <div className="flex gap-2 border-b border-black/10 mb-4">
          {tabs
            .filter(t => t.section === 'saldos')
            .map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-body-sm font-semibold transition-colors border-b-2 ${
                  tab === t.id
                    ? 'text-primary-700 border-primary-700'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>

        <div className="mt-4">
          {tab === 'saldos-pt' && (
            <SaldosPTMatriz saldos={saldosPT} />
          )}
          {tab === 'saldos-mp' && (
            <SaldosMPTabla saldos={saldosMP} />
          )}
        </div>
      </div>

      {/* Sección Historial */}
      <div>
        <h2 className="text-body-md font-semibold text-foreground mb-4">Historial (Últimos 30 días)</h2>
        <div className="flex gap-2 border-b border-black/10 mb-4">
          {tabs
            .filter(t => t.section === 'historial')
            .map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-body-sm font-semibold transition-colors border-b-2 ${
                  tab === t.id
                    ? 'text-primary-700 border-primary-700'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>

        <div className="mt-4">
          {tab === 'historial-pt' && (
            <HistorialPTFiltrable
              historial={historialPT}
              productos={productos}
              bodegas={bodegas}
              tiposMovimiento={tiposMovimiento}
            />
          )}
          {tab === 'historial-mp' && (
            <HistorialMPFiltrable
              historial={historialMP}
              materiales={materiales}
              bodegas={bodegas}
              tiposMovimiento={tiposMovimiento}
            />
          )}
        </div>
      </div>
    </div>
  )
}
