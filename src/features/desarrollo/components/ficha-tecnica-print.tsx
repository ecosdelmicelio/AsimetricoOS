'use client'

import { Printer, X } from 'lucide-react'
import { cn, formatCurrency } from '@/shared/lib/utils'
import type { DesarrolloOperacion } from '@/features/desarrollo/types'

interface Props {
  desarrollo: any
  version: any
  operaciones: DesarrolloOperacion[]
  onClose: () => void
}

export function FichaTecnicaPrint({ desarrollo, version, operaciones, onClose }: Props) {
  const handlePrint = () => {
    window.print()
  }

  const bom = version?.bom_data || { materiales: [], servicios: [] }
  const medidas = version?.cuadro_medidas || {}

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto no-scrollbar print:static print:inset-auto print:z-auto print:overflow-visible">
      {/* Barra de Herramientas (Oculta al imprimir) */}
      <div className="sticky top-0 bg-slate-900 text-white p-4 flex items-center justify-between shadow-xl print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Printer className="w-4 h-4 text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Previsualización de Ficha Técnica</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
          >
            Imprimir Ahora
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Contenido de la Ficha */}
      <div className="max-w-[21cm] mx-auto p-[2cm] print:p-0 print:max-w-none bg-white">
        {/* Header Ficha */}
        <div className="border-b-2 border-slate-900 pb-8 mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2">
              Ficha Técnica de Ingeniería
            </h1>
            <div className="flex items-center gap-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">
              <span>{desarrollo.temp_id}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
              <span className="text-slate-900">v{version.version_n}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
              <span>{new Date().toLocaleDateString('es-CO')}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900 mb-1">{desarrollo.nombre_comercial || desarrollo.nombre_proyecto}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{desarrollo.categoria_producto} · {desarrollo.tipo_producto}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 mb-8">
          <div className="col-span-2 space-y-8">
            {/* Sección: Información General & Comercial */}
            <div className="grid grid-cols-2 gap-8">
              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">I. Info. General</h3>
                <div className="grid grid-cols-1 gap-y-4">
                  <PrintField label="Cliente" value={desarrollo.terceros?.nombre || 'PROPIO'} />
                  <PrintField label="Prioridad" value={desarrollo.prioridad} />
                  <PrintField label="Complejidad" value={desarrollo.complejidad} />
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">II. Info. Comercial</h3>
                <div className="grid grid-cols-1 gap-y-4">
                  <PrintField label="Subpartida Arancelaria" value={desarrollo.subpartida_arancelaria || '—'} />
                  <PrintField label="Composición" value={desarrollo.composicion || '—'} />
                  <PrintField label="Instrucciones Cuidado" value={desarrollo.instrucciones_cuidado || '—'} />
                </div>
              </section>
            </div>

            {/* Sección: BOM (Consumos) */}
            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">III. Materias Primas e Insumos</h3>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 text-[9px] font-black uppercase text-slate-400">Referencia</th>
                    <th className="py-2 text-[9px] font-black uppercase text-slate-400">Descripción</th>
                    <th className="py-2 text-right text-[9px] font-black uppercase text-slate-400">Cant.</th>
                    <th className="py-2 text-center text-[9px] font-black uppercase text-slate-400">Unid.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bom.materiales?.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 text-[10px] font-bold text-slate-900">{m.referencia}</td>
                      <td className="py-2 text-[10px] font-medium text-slate-600">{m.material_nombre}</td>
                      <td className="py-2 text-[10px] font-black text-slate-900 text-right tabular-nums">{m.cantidad}</td>
                      <td className="py-2 text-[10px] font-bold text-slate-400 text-center">{m.unidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          {/* Sketch o Foto Principal */}
          <div className="border-2 border-slate-100 rounded-3xl overflow-hidden bg-slate-50 flex items-center justify-center min-h-[300px] relative">
            {version.desarrollo_assets?.find((a: any) => ['foto_muestra', 'sketch'].includes(a.tipo)) ? (
              <img 
                src={version.desarrollo_assets.find((a: any) => ['foto_muestra', 'sketch'].includes(a.tipo)).url} 
                className="w-full h-full object-contain"
                alt="Referencia Visual"
              />
            ) : (
              <div className="text-center p-4">
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Espacio para Sketch Técnico</div>
                <p className="text-[8px] text-slate-300 mt-2">Referencia Visual de Prenda</p>
              </div>
            )}
          </div>
        </div>

        {/* Sección: Ruta de Confección */}
        <section className="mb-8">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">IV. Ruta de Confección & Procesos</h3>
          <table className="w-full text-left border border-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3 px-4 text-[9px] font-black uppercase text-slate-400 w-12 text-center">#</th>
                <th className="py-3 px-4 text-[9px] font-black uppercase text-slate-400">Operación</th>
                <th className="py-3 px-4 text-[9px] font-black uppercase text-slate-400">Maquinaria</th>
                <th className="py-3 px-4 text-[9px] font-black uppercase text-slate-400">Observaciones Técnicas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operaciones.map((op, i) => (
                <tr key={i}>
                  <td className="py-3 px-4 text-[10px] font-black text-slate-900 text-center">{i + 1}</td>
                  <td className="py-3 px-4 text-[10px] font-black text-slate-900 uppercase">{op.nombre_operacion}</td>
                  <td className="py-3 px-4 text-[10px] font-bold text-slate-600 uppercase">{op.maquina_requerida}</td>
                  <td className="py-3 px-4 text-[10px] font-medium text-slate-500 italic">{op.notas_tecnicas || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Sección: Calidad & Puntos Críticos */}
        {version.puntos_criticos_calidad?.length > 0 && (
          <section className="mb-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">V. Puntos Críticos de Calidad (Inspección)</h3>
            <div className="grid grid-cols-1 gap-3">
              {version.puntos_criticos_calidad.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-900 uppercase">{p.descripcion}</p>
                    <p className="text-[9px] font-medium text-slate-500">{p.tolerancia}</p>
                  </div>
                  {p.es_bloqueante && (
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">Bloqueante</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sección: Cuadro de Medidas */}
        <section className="mb-8">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">VI. Especificaciones de Medida (cm)</h3>
          <table className="w-full text-left border border-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-2 px-3 text-[9px] font-black uppercase text-slate-400">Punto de Medida</th>
                <th className="py-2 px-3 text-[9px] font-black uppercase text-slate-400 text-center">Tol (±)</th>
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(t => (
                  <th key={t} className="py-2 px-1 text-[9px] font-black uppercase text-slate-400 text-center">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(medidas).map(([label, val]: [string, any]) => (
                <tr key={label}>
                  <td className="py-2 px-3 text-[10px] font-bold text-slate-900">{label}</td>
                  <td className="py-2 px-3 text-[10px] font-black text-amber-600 text-center">{val.tolerancia || '0.5'}</td>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(t => (
                    <td key={t} className="py-2 px-1 text-[10px] font-medium text-slate-700 text-center tabular-nums">
                      {val.tallas?.[t] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Footer Firmas */}
        <div className="mt-16 grid grid-cols-2 gap-16 pt-8 border-t border-slate-100">
          <div className="border-t border-slate-900 pt-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Firma Director de Diseño</span>
          </div>
          <div className="border-t border-slate-900 pt-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Firma Responsable Taller</span>
          </div>
        </div>

        {/* Disclaimer print */}
        <p className="mt-12 text-[8px] text-slate-300 text-center uppercase tracking-widest">
          Documento Confidencial · Propiedad de Asimetrico OS · {desarrollo.temp_id}
        </p>
      </div>
    </div>
  )
}

function PrintField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
      <span className="text-xs font-bold text-slate-900 uppercase">{value}</span>
    </div>
  )
}
