'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createDesarrollo } from '@/features/desarrollo/services/desarrollo-actions'
import type { 
  CategoriaProducto, 
  TipoProducto, 
  Prioridad, 
  Temporada,
  JsonAltaResolucion 
} from '@/features/desarrollo/types'
import { AlertTriangle, Save, Send } from 'lucide-react'

interface Item {
  id: string
  nombre: string
  referencia?: string
}

interface Props {
  clientes: Item[]
  chasis: Item[]
}

export function DesarrolloForm({ clientes, chasis }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // 1. Datos Básicos
  const [nombreProyecto, setNombreProyecto]     = useState('')
  const [temporada, setTemporada]               = useState<Temporada>('2026-A')
  const [categoria, setCategoria]               = useState<CategoriaProducto>('camiseta')
  const [tipoProducto, setTipoProducto]         = useState<TipoProducto>('fabricado')
  const [prioridad, setPrioridad]               = useState<Prioridad>('media')
  const [fechaCompromiso, setFechaCompromiso]   = useState('')
  const [clienteId, setClienteId]               = useState('')
  const [notas, setNotas]                       = useState('')
  
  // 2. Chasis
  const [chasisId, setChasisId]                 = useState('')

  // 3. Detalles Alta Resolución
  const [detalleAR, setDetalleAR] = useState<JsonAltaResolucion>({
    telas_requeridas: '',
    composicion_gramaje: '',
    colores_requeridos: '',
    tallas_requeridas: '',
    insumos_especiales: '',
    tecnica_confeccion: ''
  })

  // 4. Modo de guardado
  const [isDraft, setIsDraft] = useState(true)

  const handleDetalleChange = (field: keyof JsonAltaResolucion, value: string) => {
    setDetalleAR(prev => ({ ...prev, [field]: value }))
  }

  function validate(official: boolean) {
    if (!nombreProyecto.trim()) return 'El nombre del proyecto es obligatorio.'
    if (official) {
      if (!detalleAR.telas_requeridas.trim()) return 'Las telas requeridas son obligatorias para auditoría.'
      if (!detalleAR.composicion_gramaje.trim()) return 'Composición y gramaje son obligatorios.'
      if (!detalleAR.colores_requeridos.trim()) return 'Colores requeridos son obligatorios.'
      if (!detalleAR.tallas_requeridas.trim()) return 'Tallas requeridas son obligatorias.'
    }
    return null
  }

  function handleSubmit(e: React.FormEvent, forceOfficial = false) {
    e.preventDefault()
    setError(null)

    const validationError = validate(forceOfficial)
    if (validationError) {
      setError(validationError)
      return
    }

    startTransition(async () => {
      const result = await createDesarrollo({
        nombre_proyecto:    nombreProyecto.trim(),
        categoria_producto: categoria,
        temporada,
        tipo_producto:      tipoProducto,
        prioridad,
        fecha_compromiso:   fechaCompromiso || undefined,
        cliente_id:         clienteId || undefined,
        notas:              notas || undefined,
        chasis_producto_id: chasisId || undefined,
        json_alta_resolucion: detalleAR
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push(`/desarrollo/${result.data?.id}`)
    })
  }

  return (
    <form className="space-y-8">
      {/* 1. SECCIÓN: IDENTIFICACIÓN ESTRATÉGICA */}
      <section className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-3 bg-primary-500 rounded-full" />
          1. IDENTIFICACIÓN ESTRATÉGICA
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Nombre del Proyecto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombreProyecto}
              onChange={e => setNombreProyecto(e.target.value)}
              placeholder="Ej: Colección Verano 2026 - Bloom"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Temporada <span className="text-red-500">*</span>
              </label>
              <select
                value={temporada}
                onChange={e => setTemporada(e.target.value as Temporada)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
              >
                <option value="2025-A">2025-A</option>
                <option value="2025-B">2025-B</option>
                <option value="2026-A">2026-A</option>
                <option value="2026-B">2026-B</option>
                <option value="PERMANENTE">Permanente</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
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
                <option value="body">Body</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
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
                <option value="urgente">🚨 Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Cliente / Marca
              </label>
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
              >
                <option value="">— Desarrollo Interno —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECCIÓN: FORMULARIO DE ALTA RESOLUCIÓN */}
      <section className="space-y-4 p-6 rounded-2xl bg-slate-50 border border-slate-100">
        <h3 className="text-sm font-black text-primary-700 flex items-center gap-2">
          <div className="w-1 h-3 bg-primary-600 rounded-full" />
          2. FORMULARIO DE ALTA RESOLUCIÓN (SPINT 7)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Telas */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Telas Requeridas <span className="text-primary-500">*</span>
              </label>
              <textarea
                value={detalleAR.telas_requeridas}
                onChange={e => handleDetalleChange('telas_requeridas', e.target.value)}
                placeholder="Ej: Viscosa de seda, Lycra pesada..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Composición y Gramaje <span className="text-primary-500">*</span>
              </label>
              <input
                type="text"
                value={detalleAR.composicion_gramaje}
                onChange={e => handleDetalleChange('composicion_gramaje', e.target.value)}
                placeholder="Ej: 95% Algodón 5% Spandex, 180g"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>

          {/* Colores y Tallas */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Colores Requeridos <span className="text-primary-500">*</span>
              </label>
              <input
                type="text"
                value={detalleAR.colores_requeridos}
                onChange={e => handleDetalleChange('colores_requeridos', e.target.value)}
                placeholder="Ej: Negro, Blanco Niebla, Azul Cobalto"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Tallas <span className="text-primary-500">*</span>
              </label>
              <input
                type="text"
                value={detalleAR.tallas_requeridas}
                onChange={e => handleDetalleChange('tallas_requeridas', e.target.value)}
                placeholder="Ej: S, M, L, XL"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>

          {/* Sourcing e Ingeniería */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Chasis de Referencia
              </label>
              <select
                value={chasisId}
                onChange={e => setChasisId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 bg-white"
              >
                <option value="">— Nuevo Chasis (A medida) —</option>
                {chasis.map(c => (
                  <option key={c.id} value={c.id}>{c.referencia} - {c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                Insumos Especiales
              </label>
              <textarea
                value={detalleAR.insumos_especiales}
                onChange={e => handleDetalleChange('insumos_especiales', e.target.value)}
                placeholder="Ej: Cremallera oculta, botones de madera..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
              />
            </div>
          </div>

          {/* Confección */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Técnica de Confección / Observaciones
            </label>
            <textarea
              value={detalleAR.tecnica_confeccion}
              onChange={e => handleDetalleChange('tecnica_confeccion', e.target.value)}
              placeholder="Ej: Costura flatseamer, dobladillo invisible..."
              rows={5}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
            />
          </div>
        </div>
      </section>

      {/* FOOTER: ACCIONES */}
      <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="draft-mode" 
            checked={isDraft}
            onChange={e => setIsDraft(e.target.checked)}
            className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
          />
          <label htmlFor="draft-mode" className="text-xs font-bold text-slate-600 select-none flex items-center gap-1.5">
            Guardar como Borrador (Permitir Disonancia)
            <AlertTriangle className="w-3 h-3 text-amber-500" />
          </label>
        </div>

        <div className="flex items-center gap-3">
          {isDraft ? (
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, false)}
              disabled={isPending}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isPending ? 'Guardando...' : 'Guardar Borrador'}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, true)}
              disabled={isPending}
              className="px-8 py-3 rounded-xl bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isPending ? 'Enviando...' : 'Solicitar Auditoría Ops'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-red-700">{error}</p>
        </div>
      )}
    </form>
  )
}
