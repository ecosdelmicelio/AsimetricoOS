'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createDesarrollo } from '@/features/desarrollo/services/desarrollo-actions'
import type { CategoriaProducto, Complejidad, TipoProducto, Prioridad } from '@/features/desarrollo/types'

interface Cliente {
  id: string
  nombre: string
}

interface Props {
  clientes: Cliente[]
}

export function DesarrolloForm({ clientes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [nombreProyecto, setNombreProyecto]     = useState('')
  const [categoria, setCategoria]               = useState<CategoriaProducto>('camiseta')
  const [complejidad, setComplejidad]           = useState<Complejidad>('media')
  const [tipoProducto, setTipoProducto]         = useState<TipoProducto>('fabricado')
  const [prioridad, setPrioridad]               = useState<Prioridad>('media')
  const [fechaCompromiso, setFechaCompromiso]   = useState('')
  const [clienteId, setClienteId]               = useState('')
  const [notas, setNotas]                       = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nombreProyecto.trim()) {
      setError('El nombre del proyecto es obligatorio.')
      return
    }

    startTransition(async () => {
      const result = await createDesarrollo({
        nombre_proyecto:    nombreProyecto.trim(),
        categoria_producto: categoria,
        complejidad,
        tipo_producto:      tipoProducto,
        prioridad,
        fecha_compromiso:   fechaCompromiso || undefined,
        cliente_id:         clienteId || undefined,
        notas:              notas || undefined,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push(`/desarrollo/${result.data?.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Nombre */}
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          Nombre del Proyecto <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={nombreProyecto}
          onChange={e => setNombreProyecto(e.target.value)}
          placeholder="Ej: Camiseta Oversize Verano 2026"
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {/* Categoria + Tipo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value as CategoriaProducto)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
          >
            <option value="camiseta">Camiseta</option>
            <option value="polo">Polo</option>
            <option value="pantalon">Pantalón</option>
            <option value="hoodie">Hoodie</option>
            <option value="chaqueta">Chaqueta</option>
            <option value="vestido">Vestido</option>
            <option value="falda">Falda</option>
            <option value="accesorio">Accesorio</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Tipo de Producto <span className="text-red-500">*</span>
          </label>
          <select
            value={tipoProducto}
            onChange={e => setTipoProducto(e.target.value as TipoProducto)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
          >
            <option value="fabricado">Fabricado (genera OP)</option>
            <option value="comercializado">Comercializado (genera OC)</option>
          </select>
        </div>
      </div>

      {/* Complejidad + Prioridad */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Complejidad
          </label>
          <select
            value={complejidad}
            onChange={e => setComplejidad(e.target.value as Complejidad)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Prioridad
          </label>
          <select
            value={prioridad}
            onChange={e => setPrioridad(e.target.value as Prioridad)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
      </div>

      {/* Cliente + Fecha compromiso */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Cliente (opcional)
          </label>
          <select
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
          >
            <option value="">— Desarrollo interno —</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Fecha Compromiso
          </label>
          <input
            type="date"
            value={fechaCompromiso}
            onChange={e => setFechaCompromiso(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
          Notas iniciales
        </label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={3}
          placeholder="Contexto adicional, referencias, inspiración..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 resize-none"
        />
      </div>

      {/* Info sobre flujo */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700">
        <strong>Flujo de aprobación:</strong> Al crear, el desarrollo inicia en <strong>Borrador</strong>.
        Luego pasa a <strong>Revisión Ops</strong> → <strong>Muestreo</strong> → <strong>Fitting</strong> → <strong>Revisión Cliente</strong> → <strong>Aprobado</strong> → <strong>Graduado</strong>.
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-50"
        >
          {isPending ? 'Creando...' : 'Crear Desarrollo'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
