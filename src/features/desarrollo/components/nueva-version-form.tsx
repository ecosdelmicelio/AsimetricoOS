'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Trash2, Package, Wrench, Calculator } from 'lucide-react'
import { crearNuevaVersion } from '@/features/desarrollo/services/versiones-actions'
import { cn, formatCurrency } from '@/shared/lib/utils'
import type { Material, ServicioOperativo } from '@/features/productos/services/bom-actions'

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
  catalogoMateriales: Material[]
  catalogoServicios: ServicioOperativo[]
  onCreated: () => void
  onCancel: () => void
}

export function NuevaVersionForm({ 
  desarrolloId, 
  catalogoMateriales, 
  catalogoServicios,
  onCreated, 
  onCancel 
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'materiales' | 'servicios'>('materiales')

  const [notas, setNotas] = useState('')
  const [comportamiento, setComportamiento] = useState('')

  // BOM Materiales
  const [bomMateriales, setBomMateriales] = useState<BomMaterial[]>([])
  const [selectedMatId, setSelectedMatId] = useState('')
  const [matQty, setMatQty] = useState('')

  // BOM Servicios
  const [bomServicios, setBomServicios] = useState<BomServicio[]>([])
  const [selectedServId, setSelectedServId] = useState('')
  const [servQty, setServQty] = useState('')

  // Cuadro de medidas por talla
  const [medidas, setMedidas] = useState<Record<string, Record<string, string>>>({
    largo: Object.fromEntries(TALLAS.map(t => [t, ''])),
    ancho: Object.fromEntries(TALLAS.map(t => [t, ''])),
    manga: Object.fromEntries(TALLAS.map(t => [t, ''])),
    cuello: Object.fromEntries(TALLAS.map(t => [t, ''])),
    pecho: Object.fromEntries(TALLAS.map(t => [t, ''])),
  })

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

  function removeMaterial(idx: number) {
    setBomMateriales(prev => prev.filter((_, i) => i !== idx))
  }

  function removeServicio(idx: number) {
    setBomServicios(prev => prev.filter((_, i) => i !== idx))
  }

  function updateMedida(medida: string, talla: string, value: string) {
    setMedidas(prev => ({
      ...prev,
      [medida]: { ...prev[medida], [talla]: value }
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!notas.trim()) {
      setError('Las notas de la versión son obligatorias.')
      return
    }

    startTransition(async () => {
      const result = await crearNuevaVersion(desarrolloId, {
        notas_version: notas.trim(),
        bom_data: {
          materiales: bomMateriales,
          servicios: bomServicios,
          costo_estimado: costoTotal
        } as any,
        cuadro_medidas: medidas,
        comportamiento_tela: comportamiento || undefined,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      onCreated()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resumen de Costos */}
      <div className="grid grid-cols-3 gap-3">
        <CostoCard label="Materiales" value={costoMateriales} color="text-blue-600" bg="bg-blue-50" />
        <CostoCard label="Servicios" value={costoServicios} color="text-purple-600" bg="bg-purple-50" />
        <CostoCard label="Costo Total" value={costoTotal} color="text-slate-900" bg="bg-slate-100" />
      </div>

      {/* Notas de versión */}
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
          ¿Qué cambió en esta versión? <span className="text-red-500">*</span>
        </label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={2}
          placeholder="Ej: Ajuste de moldería, cambio de insumos..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 resize-none"
        />
      </div>

      {/* Tabs BOM */}
      <div className="space-y-3">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
          <button type="button" onClick={() => setTab('materiales')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
              tab === 'materiales' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500')}>
            <Package className="w-3.5 h-3.5" /> Materiales ({bomMateriales.length})
          </button>
          <button type="button" onClick={() => setTab('servicios')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
              tab === 'servicios' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500')}>
            <Wrench className="w-3.5 h-3.5" /> Servicios ({bomServicios.length})
          </button>
        </div>

        {tab === 'materiales' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={selectedMatId}
                onChange={e => setSelectedMatId(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              >
                <option value="">Seleccionar material...</option>
                {catalogoMateriales.length === 0 && <option disabled>No hay materiales activos en el catálogo</option>}
                {catalogoMateriales.map(m => (
                  <option key={m.id} value={m.id}>{m.codigo} — {m.nombre} ({m.unidad}) · {formatCurrency(m.costo_unit)}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Cant"
                value={matQty}
                onChange={e => setMatQty(e.target.value)}
                className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-xs text-center"
              />
              <button type="button" onClick={addMaterial} disabled={!selectedMatId || !matQty}
                className="p-2 rounded-xl bg-blue-600 text-white disabled:opacity-50">
                <Plus className="w-4 h-4" />
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
            </div>
          </div>
        ) : (
          <div className="space-y-3">
             <div className="flex gap-2">
              <select
                value={selectedServId}
                onChange={e => setSelectedServId(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              >
                <option value="">Seleccionar servicio...</option>
                {catalogoServicios.length === 0 && <option disabled>No hay servicios activos en el catálogo</option>}
                {catalogoServicios.map(s => (
                  <option key={s.id} value={s.id}>{s.codigo} — {s.nombre} · {formatCurrency(s.tarifa_unitaria)}/ud</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Cant"
                value={servQty}
                onChange={e => setServQty(e.target.value)}
                className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-xs text-center"
              />
              <button type="button" onClick={addServicio} disabled={!selectedServId || !servQty}
                className="p-2 rounded-xl bg-purple-600 text-white disabled:opacity-50">
                <Plus className="w-4 h-4" />
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
      </div>

      {/* Cuadro de medidas */}
      <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
          Cuadro de Medidas (cm)
        </label>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-200/50">
                <th className="text-left px-3 py-2 rounded-tl-lg font-black text-slate-500 uppercase">Medida</th>
                {TALLAS.map(t => (
                  <th key={t} className="px-3 py-2 font-black text-slate-500 uppercase text-center">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(medidas).map((medida, mIdx) => (
                <tr key={medida} className={mIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-1.5 font-bold text-slate-700 capitalize">{medida}</td>
                  {TALLAS.map(t => (
                    <td key={t} className="px-1.5 py-1">
                      <input
                        type="text"
                        value={medidas[medida][t]}
                        onChange={e => updateMedida(medida, t, e.target.value)}
                        placeholder="—"
                        className="w-full rounded-lg border border-slate-100 px-2 py-1 text-center focus:outline-none focus:border-primary-400"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

       {/* Comportamiento de tela */}
       <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
          Comportamiento de Tela
        </label>
        <textarea
          value={comportamiento}
          onChange={e => setComportamiento(e.target.value)}
          rows={2}
          placeholder="Ej: Encoge 3% en lavado..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 resize-none"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-50"
        >
          {isPending ? 'Guardando versión...' : <><Calculator className="w-4 h-4" /> Crear Nueva Versión</>}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function CostoCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn('p-3 rounded-2xl border border-slate-100 shadow-sm transition-all', bg)}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn('text-sm font-black', color)}>{formatCurrency(value)}</p>
    </div>
  )
}
