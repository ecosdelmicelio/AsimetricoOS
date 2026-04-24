import { FlaskConical, Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { getDesarrollos } from '@/features/desarrollo/services/desarrollo-actions'
import { DesarrolloKanbanBoard } from './desarrollo-kanban'
import { IndicadoresDesarrolloHeader } from './indicadores-desarrollo'
import { PageHeader } from '@/shared/components/page-header'
import { DesarrolloTabs } from './desarrollo-tabs'
import type { DesarrolloConRelaciones } from '@/features/desarrollo/types'

interface Props {
  activeTab?: string
}

export async function DesarrolloList({ activeTab = 'pipeline' }: Props) {
  const result = await getDesarrollos()
  const allDesarrollos = result.data as DesarrolloConRelaciones[]

  // Filtrado según Tab
  const filterByTab = () => {
    if (activeTab === 'pipeline') {
      return allDesarrollos.filter(d => d.status !== 'graduated' && d.status !== 'descartado')
    }
    if (activeTab === 'archivo') {
      return allDesarrollos.filter(d => d.status === 'graduated')
    }
    return []
  }

  const desarrollos = filterByTab()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[18px] bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm shrink-0">
                <FlaskConical className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none uppercase">
                  Laboratorio I+D
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">
                  Gestión del Ciclo de Vida del Producto (PLM)
                </p>
              </div>
            </div>
            
            <div className="h-10 w-px bg-slate-200 mx-2 hidden lg:block" />
            
            <div className="hidden lg:block">
              <DesarrolloTabs />
            </div>
          </div>

          <Link
            href="/desarrollo/nuevo"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nuevo Desarrollo
          </Link>
        </div>

        {/* Responsive Tabs (Mobile/Tablet) */}
        <div className="lg:hidden">
          <DesarrolloTabs />
        </div>
      </div>

      {activeTab === 'pipeline' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <IndicadoresDesarrolloHeader desarrollos={desarrollos} />
          {desarrollos.length === 0 ? (
            <EmptyState message="No hay proyectos activos en el pipeline. Inicia uno nuevo para arrancar el sprint." />
          ) : (
            <div className="w-full">
              <DesarrolloKanbanBoard desarrollos={desarrollos} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'archivo' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Archivo de Productos Graduados</h2>
                <p className="text-xs text-slate-400 font-medium">Historial técnico de desarrollos convertidos en productos operativos.</p>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    placeholder="BUSCAR REFERENCIA..." 
                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-slate-300 transition-all w-64"
                  />
                </div>
              </div>
            </div>

            {desarrollos.length === 0 ? (
              <div className="py-20 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                  <Filter className="w-6 h-6 text-slate-200" />
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin productos graduados aún</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {desarrollos.map(d => (
                  <Link 
                    key={d.id} 
                    href={`/desarrollo/${d.id}`}
                    className="flex items-center justify-between p-5 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-slate-200 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">
                        {d.temp_id.split('-').pop()}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-0.5">{d.temp_id}</p>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-primary-600 transition-colors">
                          {d.nombre_proyecto}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Graduado el</p>
                        <p className="text-[11px] font-black text-slate-900 uppercase">
                          {new Date(d.updated_at || '').toLocaleDateString()}
                        </p>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                        Operativo
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {(activeTab === 'biblioteca' || activeTab === 'laboratorio') && (
        <div className="py-32 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-[28px] bg-slate-50 flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
            <FlaskConical className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Módulo en Construcción</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-sm font-medium">
            Estamos preparando la base de conocimientos técnicos. Pronto podrás gestionar {activeTab === 'biblioteca' ? 'Plantillas de Medidas' : 'Fichas Técnicas de Materiales'} desde aquí.
          </p>
        </div>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-24 flex flex-col items-center text-center max-w-2xl mx-auto mt-12 group">
      <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mb-8 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform duration-500">
        <FlaskConical className="w-10 h-10 text-slate-300" />
      </div>
      <p className="text-slate-900 font-black text-2xl tracking-tighter uppercase">Sin Proyectos</p>
      <p className="text-slate-400 text-sm mt-3 max-w-sm font-medium leading-relaxed">
        {message}
      </p>
    </div>
  )
}

