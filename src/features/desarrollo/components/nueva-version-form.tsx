'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { crearNuevaVersion } from '@/features/desarrollo/services/versiones-actions'

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

interface BomItem {
  material_nombre: string
  referencia:      string
  cantidad:        number
  unidad:          string
  costo_unitario:  number
}

interface Props {
  desarrolloId: string
  onCreated:    () => void
  onCancel:     () => void
}

export function NuevaVersionForm({ desarrolloId, onCreated, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [notas, setNotas]               = useState('')
  const [comportamiento, setComportamiento] = useState('')

  // BOM dinámico
  const [bomItems, setBomItems] = useState<BomItem[]>([
    { material_nombre: '', referencia: '', cantidad: 0, unidad: 'metros', costo_unitario: 0 }
  ])

  // Cuadro de medidas por talla
  const [medidas, setMedidas] = useState<Record<string, Record<string, string>>>({
    largo:   Object.fromEntries(TALLAS.map(t => [t, ''])),
    ancho:   Object.fromEntries(TALLAS.map(t => [t, ''])),
    manga:   Object.fromEntries(TALLAS.map(t => [t, ''])),
    cuello:  Object.fromEntries(TALLAS.map(t => [t, ''])),
    pecho:   Object.fromEntries(TALLAS.map(t => [t, ''])),
  })

  function addBomItem() {
    setBomItems(prev => [...prev, { material_nombre: '', referencia: '', cantidad: 0, unidad: 'metros', costo_unitario: 0 }])
  }

  function removeBomItem(idx: number) {
    setBomItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateBomItem(idx: number, field: keyof BomItem, value: string | number) {
    setBomItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
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
      setError('Las notas de la versión son obligatorias (explica qué cambió).')
      return
    }

    const bomFiltrado = bomItems.filter(b => b.material_nombre.trim())

    startTransition(async () => {
      const result = await crearNuevaVersion(desarrolloId, {
        notas_version:       notas.trim(),
        bom_data:            bomFiltrado.length > 0 ? (bomFiltrado as unknown as Record<string, unknown>[]) : undefined,
        cuadro_medidas:      medidas,
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
      {/* Notas de versión */}
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          ¿Qué cambió en esta versión? <span className="text-red-500">*</span>
        </label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={3}
          placeholder="Ej: Se ajustó el cuello, se cambió la tela de 180g a 200g, se corrigió largo de manga..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 resize-none"
        />
      </div>

      {/* BOM */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            BOM — Materiales
          </label>
          <button
            type="button"
            onClick={addBomItem}
            className="flex items-center gap-1 text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar material
          </button>
        </div>

        <div className="space-y-2">
          {bomItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
              <input
                type="text"
                placeholder="Material"
                value={item.material_nombre}
                onChange={e => updateBomItem(idx, 'material_nombre', e.target.value)}
                className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary-400"
              />
              <input
                type="text"
                placeholder="Ref"
                value={item.referencia}
                onChange={e => updateBomItem(idx, 'referencia', e.target.value)}
                className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary-400"
              />
              <input
                type="number"
                placeholder="Cant"
                value={item.cantidad || ''}
                onChange={e => updateBomItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                className="w-16 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary-400"
              />
              <select
                value={item.unidad}
                onChange={e => updateBomItem(idx, 'unidad', e.target.value)}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none"
              >
                <option value="metros">m</option>
                <option value="kg">kg</option>
                <option value="unidades">und</option>
                <option value="piezas">pcs</option>
              </select>
              <button
                type="button"
                onClick={() => removeBomItem(idx)}
                className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cuadro de medidas */}
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
          Cuadro de Medidas (cm)
        </label>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left px-3 py-2 rounded-tl-lg font-bold text-slate-500 uppercase tracking-wider">Medida</th>
                {TALLAS.map(t => (
                  <th key={t} className="px-3 py-2 font-bold text-slate-500 uppercase tracking-wider text-center">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(medidas).map((medida, mIdx) => (
                <tr key={medida} className={mIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-1.5 font-semibold text-slate-600 capitalize">{medida}</td>
                  {TALLAS.map(t => (
                    <td key={t} className="px-1.5 py-1">
                      <input
                        type="text"
                        value={medidas[medida][t]}
                        onChange={e => updateMedida(medida, t, e.target.value)}
                        placeholder="—"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-center focus:outline-none focus:border-primary-400"
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
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          Comportamiento de Tela
        </label>
        <textarea
          value={comportamiento}
          onChange={e => setComportamiento(e.target.value)}
          rows={2}
          placeholder="Ej: Encoge 3% en lavado, elongación lateral 8%..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 resize-none"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-50"
        >
          {isPending ? 'Creando...' : 'Crear Nueva Versión'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
