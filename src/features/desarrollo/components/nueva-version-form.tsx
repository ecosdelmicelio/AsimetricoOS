'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { Plus, Trash2, Package, Wrench, Calculator, Edit3, Ruler, AlertTriangle } from 'lucide-react'
import { crearNuevaVersion, actualizarVersion } from '@/features/desarrollo/services/versiones-actions'
import { getMedidasTemplate } from '@/features/desarrollo/services/medidas-actions'
import { cn, formatCurrency } from '@/shared/lib/utils'
import type { Material, ServicioOperativo } from '@/features/productos/services/bom-actions'
import { QuickCreateMaterialModal } from './quick-create-material-modal'
import type { CategoriaProducto } from '../types'

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

interface BomMaterial {
  material_id: string
  material_nombre: string
  referencia: string
  cantidad: number
  unidad: string
  costo_unit: number
}

interface BomServicio {
  servicio_id: string
  servicio_nombre: string
  cantidad: number
  tipo_proceso: string
  tarifa_unitaria: number
}

interface Props {
  desarrolloId: string
  categoria: CategoriaProducto
  clienteId?: string | null
  catalogoMateriales: Material[]
  catalogoServicios: ServicioOperativo[]
  proveedores: { id: string; nombre: string }[]
  initialBom?: any 
  initialNotas?: string
  initialComportamiento?: string
  initialMedidas?: Record<string, any>
  mode?: 'create' | 'edit'
  versionId?: string
  onCreated: () => void
  onCancel: () => void
}

export function NuevaVersionForm({ 
  desarrolloId, 
  categoria,
  clienteId,
  catalogoMateriales: initialMateriales, 
  catalogoServicios,
  proveedores,
  initialBom,
  initialNotas = '',
  initialComportamiento = '',
  initialMedidas,
  mode = 'create',
  versionId,
  onCreated, 
  onCancel 
}: Props) {
  const [catalogoMateriales, setCatalogoMateriales] = useState(initialMateriales)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'materiales' | 'servicios' | 'medidas'>('materiales')

  const [notas, setNotas] = useState(initialNotas)
  const [comportamiento, setComportamiento] = useState(initialComportamiento)

  // BOM Materiales
  const [bomMateriales, setBomMateriales] = useState<BomMaterial[]>(initialBom?.materiales || [])
  const [selectedMatId, setSelectedMatId] = useState('')
  const [matQty, setMatQty] = useState('')

  // BOM Servicios
  const [bomServicios, setBomServicios] = useState<BomServicio[]>(initialBom?.servicios || [])
  const [selectedServId, setSelectedServId] = useState('')
  const [servQty, setServQty] = useState('')

  // Cuadro de medidas (Estructura: { [label]: { tallas: { XS: '', ... }, tolerancia: 0.5 } })
  const [medidas, setMedidas] = useState<Record<string, any>>(initialMedidas ?? {})
  const [templateLoaded, setTemplateLoaded] = useState(false)

  // Cargar plantilla si es nueva versión
  useEffect(() => {
    async function loadTemplate() {
      if (mode === 'create' && (!initialMedidas || Object.keys(initialMedidas).length === 0) && !templateLoaded) {
        const { data } = await getMedidasTemplate(categoria, clienteId)
        if (data && data.puntos_medida) {
          const newMedidas: any = {}
          data.puntos_medida.forEach(p => {
            newMedidas[p.label] = {
              tallas: Object.fromEntries(TALLAS.map(t => [t, ''])),
              tolerancia: p.tolerancia ?? 0.5
            }
          })
          setMedidas(newMedidas)
          setTemplateLoaded(true)
        } else if (Object.keys(medidas).length === 0) {
          // Fallback manual si no hay plantilla
          setMedidas({
            'Largo Total': { tallas: Object.fromEntries(TALLAS.map(t => [t, ''])), tolerancia: 1.0 },
            'Ancho Pecho/Cintura': { tallas: Object.fromEntries(TALLAS.map(t => [t, ''])), tolerancia: 0.5 },
          })
          setTemplateLoaded(true)
        }
      }
    }
    loadTemplate()
  }, [categoria, clienteId, mode, initialMedidas, templateLoaded])

  // Totales
  const costoMateriales = useMemo(() => bomMateriales.reduce((sum, m) => sum + (m.cantidad * m.costo_unit), 0), [bomMateriales])
  const costoServicios = useMemo(() => bomServicios.reduce((sum, s) => sum + (s.cantidad * s.tarifa_unitaria), 0), [bomServicios])
  const costoTotal = costoMateriales + costoServicios

  function addMaterial() {
    const mat = catalogoMateriales.find(m => m.id === selectedMatId)
    if (!mat || !matQty) return
    setBomMateriales(prev => [...prev, {
      material_id: mat.id,
      material_nombre: mat.nombre,
      referencia: mat.codigo,
      cantidad: parseFloat(matQty),
      unidad: mat.unidad,
      costo_unit: mat.costo_unit
    }])
    setSelectedMatId('')
    setMatQty('')
  }

  function addServicio() {
    const serv = catalogoServicios.find(s => s.id === selectedServId)
    if (!serv || !servQty) return
    setBomServicios(prev => [...prev, {
      servicio_id: serv.id,
      servicio_nombre: serv.nombre,
      cantidad: parseFloat(servQty),
      tipo_proceso: serv.tipo_proceso,
      tarifa_unitaria: serv.tarifa_unitaria
    }])
    setSelectedServId('')
    setServQty('')
  }

  function updateMedidaValue(label: string, talla: string, value: string) {
    setMedidas(prev => ({
      ...prev,
      [label]: { 
        ...prev[label], 
        tallas: { ...prev[label].tallas, [talla]: value } 
      }
    }))
  }

  function updateTolerancia(label: string, value: number) {
    setMedidas(prev => ({
      ...prev,
      [label]: { ...prev[label], tolerancia: value }
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!notas.trim()) { setError('Las notas de la versión son obligatorias.'); return }

    startTransition(async () => {
      const payload = {
        bom_data: { materiales: bomMateriales, servicios: bomServicios, costo_estimado: costoTotal },
        cuadro_medidas: medidas,
        notas_version: notas,
        comportamiento_tela: comportamiento
      }

      const res = mode === 'edit' && versionId
        ? await actualizarVersion(versionId, payload)
        : await crearNuevaVersion(desarrolloId, payload)

      if (res.error) { setError(res.error) } 
      else { onCreated() }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button type="button" onClick={() => setTab('materiales')} className={cn('px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', tab === 'materiales' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
          <Package className="w-3.5 h-3.5 mb-0.5 inline mr-1" /> Materiales
        </button>
        <button type="button" onClick={() => setTab('servicios')} className={cn('px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', tab === 'servicios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
          <Wrench className="w-3.5 h-3.5 mb-0.5 inline mr-1" /> Servicios
        </button>
        <button type="button" onClick={() => setTab('medidas')} className={cn('px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', tab === 'medidas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
          <Ruler className="w-3.5 h-3.5 mb-0.5 inline mr-1" /> Medidas & Tolerancias
        </button>
      </div>

      <div className="min-h-[400px]">
        {tab === 'materiales' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex gap-2">
              <select value={selectedMatId} onChange={e => setSelectedMatId(e.target.value)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:border-primary-400">
                <option value="">Seleccionar material...</option>
                {catalogoMateriales.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.codigo})</option>)}
              </select>
              <input type="number" step="0.01" value={matQty} onChange={e => setMatQty(e.target.value)} placeholder="Cant" className="w-24 rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:border-primary-400" />
              <button type="button" onClick={addMaterial} className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all">
                <Plus className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => setShowQuickCreate(true)} className="px-4 py-2.5 rounded-xl border border-blue-100 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-tight hover:bg-blue-100 transition-all">
                MP Provisoria
              </button>
            </div>

            <div className="space-y-2">
              {bomMateriales.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{m.material_nombre}</p>
                    <p className="text-[10px] text-slate-400">{m.referencia} · {m.cantidad} {m.unidad} × {formatCurrency(m.costo_unit)} = <strong>{formatCurrency(m.cantidad * m.costo_unit)}</strong></p>
                  </div>
                  <button type="button" onClick={() => removeMaterial(i)} className="p-1.5 text-slate-300 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {bomMateriales.length === 0 && <p className="text-xs text-slate-400 italic text-center py-8">No hay materiales cargados</p>}
            </div>
          </div>
        )}

        {tab === 'servicios' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="flex gap-2">
              <select value={selectedServId} onChange={e => setSelectedServId(e.target.value)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:border-primary-400">
                <option value="">Seleccionar servicio...</option>
                {catalogoServicios.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.tipo_proceso})</option>)}
              </select>
              <input type="number" step="1" value={servQty} onChange={e => setServQty(e.target.value)} placeholder="Cant" className="w-24 rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:border-primary-400" />
              <button type="button" onClick={addServicio} className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {bomServicios.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{s.servicio_nombre}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter text-purple-500">{s.tipo_proceso}</p>
                    <p className="text-[10px] text-slate-400">{s.cantidad} ud × {formatCurrency(s.tarifa_unitaria)} = <strong>{formatCurrency(s.cantidad * s.tarifa_unitaria)}</strong></p>
                  </div>
                  <button type="button" onClick={() => removeServicio(i)} className="p-1.5 text-slate-300 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'medidas' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-[11px] font-black text-slate-900 uppercase">Cuadro de Medidas Técnicas</h4>
                  <p className="text-[10px] text-slate-400">Valores en centímetros (cm)</p>
                </div>
                {templateLoaded && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">
                    <Ruler className="w-3 h-3" /> Plantilla Aplicada
                  </span>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase">Punto de Medida</th>
                      <th className="py-2 text-[10px] font-black text-slate-400 uppercase text-center w-24">Tolerancia (±)</th>
                      {TALLAS.map(t => (
                        <th key={t} className="py-2 text-[10px] font-black text-slate-400 uppercase text-center w-16">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Object.keys(medidas).map((label) => (
                      <tr key={label} className="group hover:bg-slate-50/50">
                        <td className="py-3 text-[11px] font-bold text-slate-700">{label}</td>
                        <td className="py-2 px-2">
                          <input 
                            type="number" 
                            step="0.1" 
                            value={medidas[label].tolerancia}
                            onChange={(e) => updateTolerancia(label, parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-slate-100 px-2 py-1 text-center font-bold text-amber-600 focus:outline-none focus:border-amber-400"
                          />
                        </td>
                        {TALLAS.map(t => (
                          <td key={t} className="py-2 px-1">
                            <input 
                              type="text" 
                              value={medidas[label].tallas[t]}
                              onChange={(e) => updateMedidaValue(label, t, e.target.value)}
                              placeholder="—"
                              className="w-full rounded-lg border border-slate-100 px-2 py-1 text-center text-xs focus:outline-none focus:border-primary-400"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-[10px] text-blue-700 leading-snug">
                  <strong>Recomendación:</strong> Los anchos críticos (cintura/cadera) tienen una tolerancia ideal de ±0.5cm. Largos generales ±1.0cm.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comportamiento de tela */}
      <div className="p-4 rounded-2xl border border-slate-100 bg-white">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Notas & Observaciones</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Describa los cambios en esta versión..." className="w-full rounded-xl border border-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 resize-none mb-4" />
        
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Comportamiento de Tela / Alongación</label>
        <textarea value={comportamiento} onChange={e => setComportamiento(e.target.value)} rows={2} placeholder="Ej: Encoge 3% en lavado. Estira 20% en trama..." className="w-full rounded-xl border border-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 resize-none" />
      </div>

      <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl">
          <p className="text-[9px] font-black uppercase opacity-60">Costo Estimado</p>
          <p className="text-xl font-black">{formatCurrency(costoTotal)}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all">Cancelar</button>
          <button type="submit" disabled={isPending} className="px-8 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-50">
            {isPending ? 'Guardando...' : (mode === 'edit' ? 'Actualizar Versión' : 'Guardar Versión')}
          </button>
        </div>
      </div>

      {showQuickCreate && (
        <QuickCreateMaterialModal 
          onClose={() => setShowQuickCreate(false)} 
          onCreated={(newMat) => {
            setCatalogoMateriales(prev => [newMat, ...prev])
            setBomMateriales(prev => [...prev, {
              material_id: newMat.id,
              material_nombre: newMat.nombre,
              referencia: newMat.codigo,
              cantidad: 0,
              unidad: newMat.unidad,
              costo_unit: newMat.costo_unit
            }])
            setShowQuickCreate(false)
          }}
          proveedores={proveedores}
        />
      )}
    </form>
  )
}
