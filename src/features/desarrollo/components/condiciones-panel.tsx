'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, AlertCircle, Trash2, Plus } from 'lucide-react'
import { guardarCondicionesMaterial, guardarCondiciones } from '@/features/desarrollo/services/muestra-actions'
import { cn } from '@/shared/lib/utils'

interface Props {
  desarrolloId: string
  versionId: string
  tipoProducto: 'fabricado' | 'comercializado'
  bomData: any[]
  condicionesExistentes: any | null
  materialCondicionesExistentes: any[]
  proveedores: { id: string; nombre: string }[]
}

export function CondicionesPanel({
  desarrolloId,
  versionId,
  tipoProducto,
  bomData,
  condicionesExistentes,
  materialCondicionesExistentes,
  proveedores,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Estado para condiciones generales (comercializados)
  const [general, setGeneral] = useState({
    proveedor_id:             condicionesExistentes?.proveedor_id || '',
    moq_producto:             condicionesExistentes?.moq_producto || 0,
    multiplo_orden:           condicionesExistentes?.multiplo_orden || 1,
    leadtime_produccion_dias: condicionesExistentes?.leadtime_produccion_dias || 0,
    leadtime_envio_dias:      condicionesExistentes?.leadtime_envio_dias || 0,
    moneda:                   condicionesExistentes?.moneda || 'COP',
    precio_referencia:        condicionesExistentes?.precio_referencia || 0,
  })

  // Estado para condiciones de materiales (fabricados)
  // Inicializamos con los materiales del BOM si no hay condiciones guardadas
  const [materiales, setMateriales] = useState<any[]>(
    materialCondicionesExistentes.length > 0
      ? materialCondicionesExistentes.map(m => ({
          material_id: m.material_id,
          material_nombre: m.materiales?.nombre || 'Material desconocido',
          moq_material: m.moq_material,
          moq_unidad: m.moq_unidad,
          consumo_por_unidad: m.consumo_por_unidad,
          leadtime_material_dias: m.leadtime_material_dias,
        }))
      : bomData.map(b => ({
          material_id: b.id || '', // Si el BOM tiene IDs de materiales reales
          material_nombre: b.material_nombre,
          moq_material: 0,
          moq_unidad: b.unidad || 'metros',
          consumo_por_unidad: b.cantidad || 0,
          leadtime_material_dias: 0,
        }))
  )

  function handleSave() {
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      let res1: { error: string | null } = { error: null }
      let res2: { error: string | null } = { error: null }

      if (tipoProducto === 'comercializado') {
        res1 = await guardarCondiciones(desarrolloId, versionId, general)
      } else {
        // Para fabricados también guardamos condiciones generales si hay proveedor o MOQ total
        res1 = await guardarCondiciones(desarrolloId, versionId, general)
        res2 = await guardarCondicionesMaterial(desarrolloId, materiales)
      }

      if (res1.error || res2.error) {
        setError(res1.error || res2.error)
      } else {
        setSuccess(true)
        router.refresh()
      }
    })
  }

  const hasMissingData = tipoProducto === 'fabricado' 
    ? materiales.length === 0 || materiales.some(m => m.moq_material <= 0)
    : !general.proveedor_id || general.moq_producto <= 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Condiciones de Abastecimiento</h3>
          <p className="text-[11px] text-slate-500">Define mínimos, leadtimes y precios necesarios para avanzar a revisión operativa.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : <><Save className="w-3.5 h-3.5" /> Guardar Cambios</>}
        </button>
      </div>

      {hasMissingData && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>
            <strong>Atención:</strong> Debes completar los MOQs y leadtimes para que el Director de Operaciones pueda aprobar este desarrollo.
          </p>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[11px] font-bold text-center">
          ✓ Condiciones guardadas correctamente
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
          Error: {error}
        </div>
      )}

      {/* Sección General */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condiciones Generales</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proveedor de Referencia</label>
              <select
                value={general.proveedor_id}
                onChange={e => setGeneral({ ...general, proveedor_id: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-primary-400"
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">MOQ Producto</label>
              <input
                type="number"
                value={general.moq_producto}
                onChange={e => setGeneral({ ...general, moq_producto: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Múltiplo de Orden</label>
              <input
                type="number"
                value={general.multiplo_orden}
                onChange={e => setGeneral({ ...general, multiplo_orden: parseInt(e.target.value) || 1 })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Leadtime Prod (Días)</label>
              <input
                type="number"
                value={general.leadtime_produccion_dias}
                onChange={e => setGeneral({ ...general, leadtime_produccion_dias: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Leadtime Envío (Días)</label>
              <input
                type="number"
                value={general.leadtime_envio_dias}
                onChange={e => setGeneral({ ...general, leadtime_envio_dias: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>
        </div>

        {/* Sección de Materiales (solo fabricados) */}
        {tipoProducto === 'fabricado' && (
          <div className="space-y-4 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mínimos por Materia Prima</p>
              <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">BOM v{materiales.length > 0 ? 'Actual' : 'N/A'}</span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {materiales.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">No hay materiales definidos en el BOM para calcular mínimos.</p>
              )}
              {materiales.map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
                  <p className="text-[10px] font-black text-slate-700 truncate">{m.material_nombre}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">MOQ Material ({m.moq_unidad})</label>
                      <input
                        type="number"
                        value={m.moq_material}
                        onChange={e => {
                          const newMats = [...materiales]
                          newMats[idx].moq_material = parseFloat(e.target.value) || 0
                          setMateriales(newMats)
                        }}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:border-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Consumo Unitario</label>
                      <input
                        type="number"
                        value={m.consumo_por_unidad}
                        onChange={e => {
                          const newMats = [...materiales]
                          newMats[idx].consumo_por_unidad = parseFloat(e.target.value) || 0
                          setMateriales(newMats)
                        }}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:border-primary-400"
                      />
                    </div>
                    {m.consumo_por_unidad > 0 && (
                      <div className="col-span-2 mt-1">
                        <p className="text-[9px] text-slate-500 italic">
                          Implica un MOQ de producto de <strong>{Math.ceil(m.moq_material / m.consumo_por_unidad)}</strong> unidades.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {materiales.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-800 uppercase text-center">
                  MOQ Sugerido: {Math.max(...materiales.map(m => m.consumo_por_unidad > 0 ? Math.ceil(m.moq_material / m.consumo_por_unidad) : 0))} unds
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
