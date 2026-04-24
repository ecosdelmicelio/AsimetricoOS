'use client'

import { useState } from 'react'
import { Info, Globe, Tag, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  desarrollo: any
  onSave: (data: any) => Promise<void>
}

export function DesarrolloInfoComercial({ desarrollo, onSave }: Props) {
  const [formData, setFormData] = useState({
    nombre_comercial: desarrollo.nombre_comercial || '',
    subpartida_arancelaria: desarrollo.subpartida_arancelaria || '',
    composicion: desarrollo.composicion || '',
    instrucciones_cuidado: desarrollo.instrucciones_cuidado || '',
    notas: desarrollo.notas || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formData)
      toast.success('Información comercial actualizada')
    } catch (error) {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Información Comercial & Aduanera</h3>
          <p className="text-slate-400 text-xs font-medium">Atributos maestros para exportación y retail</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Actualizar Información'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Columna Izquierda: Identificación */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Tag className="w-4 h-4" /> Identificación de Mercado
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                <input
                  value={formData.nombre_comercial}
                  onChange={e => setFormData({ ...formData, nombre_comercial: e.target.value })}
                  placeholder="Ej: Camiseta Oversize 'Urban Flow'"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-300 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Subpartida Arancelaria</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    value={formData.subpartida_arancelaria}
                    onChange={e => setFormData({ ...formData, subpartida_arancelaria: e.target.value })}
                    placeholder="Ej: 6109.10.00.00"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-300 transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Info className="w-4 h-4" /> Composición y Cuidado
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Composición Textil</label>
                <textarea
                  value={formData.composicion}
                  onChange={e => setFormData({ ...formData, composicion: e.target.value })}
                  placeholder="Ej: 100% Algodón Pima de fibra larga..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-300 transition-all outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrucciones de Cuidado</label>
                <textarea
                  value={formData.instrucciones_cuidado}
                  onChange={e => setFormData({ ...formData, instrucciones_cuidado: e.target.value })}
                  placeholder="Ej: Lavar a máquina con agua fría, no usar blanqueador..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-300 transition-all outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Notas Adicionales */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm flex flex-col h-full">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
            <FileText className="w-4 h-4" /> Notas de Desarrollo
          </h4>
          <textarea
            value={formData.notas}
            onChange={e => setFormData({ ...formData, notas: e.target.value })}
            placeholder="Documenta cualquier particularidad comercial, restricciones de marca o acuerdos específicos con el cliente..."
            className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-6 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-300 transition-all outline-none resize-none"
          />
        </div>
      </div>
    </div>
  )
}
