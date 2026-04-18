'use client'

import { useState } from 'react'
import { Box } from 'lucide-react'
import { SaldosPTMatriz } from './saldos-pt-matriz'
import { SaldosMPTabla } from './saldos-mp-tabla'
import { SaldosPorBin } from './saldos-por-bin'
import { HistorialPTFiltrable } from './historial-pt-filtrable'
import { HistorialMPFiltrable } from './historial-mp-filtrable'
import type { SaldoMP, SaldoPT, SaldoBin, HistorialMP, HistorialPT } from '../services/kardex-actions'

type Tab = 'saldos-pt' | 'saldos-mp' | 'saldos-bin' | 'historial-pt' | 'historial-mp'

interface Props {
  saldosMP: SaldoMP[]
  saldosPT: SaldoPT[]
  saldosBin: SaldoBin[]
  historialMP: HistorialMP[]
  historialPT: HistorialPT[]
  materiales: Array<{ id: string; codigo: string; nombre: string }>
  productos: Array<{ id: string; referencia: string; nombre: string }>
  bodegas: Array<{ id: string; nombre: string }>
  tiposMovimiento: Array<{ id: string; nombre: string }>
}

export function KardexDashboard({
  saldosMP,
  saldosPT,
  saldosBin,
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
    { id: 'saldos-bin', label: 'Saldos por Bin', section: 'saldos' },
    { id: 'historial-pt', label: 'Historial PT', section: 'historial' },
    { id: 'historial-mp', label: 'Historial MP', section: 'historial' },
  ]

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* SECCIÓN: NAVEGACIÓN Y FILTROS */}
      <div className="bg-white/50 p-2 rounded-[32px] border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-1 flex-wrap p-1 bg-slate-100/50 rounded-[24px]">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t.id
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        
        <div className="px-6 py-2 border-l border-slate-200">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             Vista: <span className="text-slate-900">{tabs.find(t => t.id === tab)?.label}</span>
           </p>
        </div>
      </div>

      {/* SECCIÓN DINÁMICA: VISTA DE DATOS */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden p-8 min-h-[500px]">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
           </div>
           <div>
              <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest leading-none">
                 {tab.includes('saldos') ? 'Consolidado de Existencias' : 'Bitácora de Trazabilidad'}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                 {tab.includes('mp') ? 'Materia Prima e Insumos' : 'Producto Terminado y Muestras'}
              </p>
           </div>
        </div>

        <div className="mt-4 transition-all duration-500">
          {tab === 'saldos-pt' && <SaldosPTMatriz saldos={saldosPT} />}
          {tab === 'saldos-mp' && <SaldosMPTabla saldos={saldosMP} />}
          {tab === 'saldos-bin' && <SaldosPorBin saldos={saldosBin} bodegas={bodegas} />}
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
