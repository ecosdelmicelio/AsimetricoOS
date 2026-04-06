'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'

export function OVFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [estado, setEstado] = useState(searchParams.get('estado') || 'todas')
  const [desde, setDesde] = useState(searchParams.get('desde') || '')
  const [hasta, setHasta] = useState(searchParams.get('hasta') || '')

  const hasActiveFilters = estado !== 'todas' || desde || hasta

  function apply(newEstado = estado, newDesde = desde, newHasta = hasta) {
    const params = new URLSearchParams()
    if (newEstado && newEstado !== 'todas') params.set('estado', newEstado)
    if (newDesde) params.set('desde', newDesde)
    if (newHasta) params.set('hasta', newHasta)
    router.push(`/ordenes-venta?${params.toString()}`)
  }

  function handleClear() {
    setEstado('todas')
    setDesde('')
    setHasta('')
    router.push('/ordenes-venta')
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
        <SlidersHorizontal className="w-3 h-3" />
        Filtrar
      </div>

      {/* Estado */}
      <select
        value={estado}
        onChange={e => { setEstado(e.target.value); apply(e.target.value) }}
        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-700 uppercase tracking-wider appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
      >
        <option value="todas">Todas</option>
        <option value="borrador">Borrador</option>
        <option value="confirmada">Confirmada</option>
        <option value="en_produccion">En Producción</option>
        <option value="completada">Completada</option>
        <option value="cancelada">Cancelada</option>
      </select>

      {/* Desde */}
      <input
        type="date"
        value={desde}
        onChange={e => setDesde(e.target.value)}
        onBlur={() => apply()}
        placeholder="Desde"
        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm w-32"
      />

      {/* Hasta */}
      <input
        type="date"
        value={hasta}
        onChange={e => setHasta(e.target.value)}
        onBlur={() => apply()}
        placeholder="Hasta"
        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm w-32"
      />

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 border border-red-100 text-red-500 font-black text-[10px] uppercase tracking-wider hover:bg-red-100 transition-all"
        >
          <X className="w-3 h-3" />
          Limpiar
        </button>
      )}
    </div>
  )
}
