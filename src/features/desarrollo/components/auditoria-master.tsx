'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, AlertCircle, Info, FileText, CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { updateDesarrollo, cambiarStatusDesarrollo } from '@/features/desarrollo/services/desarrollo-actions'
import type { TipoMuestra, JsonAltaResolucion } from '@/features/desarrollo/types'

interface Props {
  desarrolloId: string
  jsonAltaResolucion: JsonAltaResolucion
  tipoMuestraActual?: TipoMuestra
  disonanciaActiva?: boolean
  status: string
}

export function AuditoriaMaster({ 
  desarrolloId, 
  jsonAltaResolucion, 
  tipoMuestraActual,
  disonanciaActiva,
  status
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tipoMuestra, setTipoMuestra] = useState<TipoMuestra | ''>(tipoMuestraActual || '')
  const [notaAuditoria, setNotaAuditoria] = useState('')

  const handleCertificar = (esDisonancia: boolean) => {
    if (!tipoMuestra && !esDisonancia) {
      alert('Debes asignar un Tipo de Muestra (A, B, C, D) para certificar.')
      return
    }

    startTransition(async () => {
      // 1. Actualizar metadatos de auditoría
      await updateDesarrollo(desarrolloId, {
        // @ts-ignore - Actualizando campos del protocolo Sprint 7
        tipo_muestra_asignada: tipoMuestra || null,
        disonancia_activa: esDisonancia
      })

      // 2. Si es dironancia, podemos mover a 'hold' o dejarlo en ops_review
      // Si es certificación, movemos a 'sampling'
      if (!esDisonancia) {
        await cambiarStatusDesarrollo(desarrolloId, 'sampling', `Certificado como Tipo ${tipoMuestra}. ${notaAuditoria}`)
      } else {
        await updateDesarrollo(desarrolloId, {
           // @ts-ignore 
           notas: (notaAuditoria ? `DISONANCIA DETECTADA: ${notaAuditoria}` : 'Disonancia sin notas adicionales')
        })
      }
      
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            PANEL DE AUDITORÍA OPERATIVA (SPRINT 7)
          </h3>
          <p className="text-xs text-slate-500 mt-1">Valida la alta resolución comercial antes de comprometer capacidad de planta.</p>
        </div>
        {disonanciaActiva && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 animate-pulse">
            <AlertCircle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Disonancia Activa</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visualización de Alta Resolución */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <FileText className="w-3.5 h-3.5" /> Ficha de Alta Resolución (Comercial)
             </h4>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <DetailItem label="Telas Requeridas" value={jsonAltaResolucion.telas_requeridas} />
                <DetailItem label="Composición / Gramaje" value={jsonAltaResolucion.composicion_gramaje} />
                <DetailItem label="Colores" value={jsonAltaResolucion.colores_requeridos} />
                <DetailItem label="Tallas" value={jsonAltaResolucion.tallas_requeridas} />
                <DetailItem label="Insumos Especiales" value={jsonAltaResolucion.insumos_especiales} />
                <DetailItem label="Técnica Confección" value={jsonAltaResolucion.tecnica_confeccion} />
             </div>
          </div>
        </div>

        {/* Controles de Auditoría */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <ShieldCheck className="w-24 h-24 rotate-12" />
            </div>

            <div className="relative z-10 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Tipo de Muestra (Track)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['A', 'B', 'C', 'D'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTipoMuestra(t as TipoMuestra)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-black transition-all border-2",
                        tipoMuestra === t 
                          ? "bg-primary-600 border-primary-400 text-white" 
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Notas de Auditoría
                </label>
                <textarea
                  value={notaAuditoria}
                  onChange={e => setNotaAuditoria(e.target.value)}
                  placeholder="Observaciones de viabilidad..."
                  rows={3}
                  className="w-full rounded-xl bg-slate-800 border-slate-700 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                />
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => handleCertificar(false)}
                  disabled={isPending || status !== 'ops_review'}
                  className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Certificar & Pasar a Muestreo
                </button>

                <button
                  onClick={() => handleCertificar(true)}
                  disabled={isPending}
                  className="w-full py-3 rounded-xl border-2 border-red-500/50 text-red-400 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <AlertCircle className="w-4 h-4" />
                  Activar Disonancia
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
             <Info className="w-4 h-4 text-blue-500 shrink-0" />
             <p className="text-[10px] text-blue-800 leading-relaxed italic">
               La certificación tipo <strong>D</strong> implica canalización directa a producción tras el primer fitting exitoso. 
               La certificación <strong>A</strong> es estrictamente para prototipado interno.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-slate-700 font-medium whitespace-pre-line">{value || '—'}</p>
    </div>
  )
}
