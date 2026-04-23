'use client'

import { useState, useMemo, useTransition, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronDown, Search } from 'lucide-react'
import { createOrdenVenta, updateOrdenVenta } from '@/features/ordenes-venta/services/ov-actions'
import { TALLAS_STANDARD } from '@/shared/constants/tallas'
import { derivarNombreBase, extraerColorDelNombre } from '@/shared/lib/productos-utils'
import type { LineaOV, OVConDetalle } from '@/features/ordenes-venta/types'
import { MatrizProductos } from '@/shared/components/matriz-productos'
import type { ProductoEnMatriz } from '@/shared/components/matriz-productos'

// ---------------------------------------------------------------------------
// Tipos y Ayudantes
// ---------------------------------------------------------------------------

export interface Producto {
  id: string
  nombre: string
  referencia: string
  color: string | null
  precio_base: number | null
  categoria: string | null
}

export interface Cliente {
  id: string
  nombre: string
  plazo_pago_dias: number | null
}

export type ProductoAlias = {
  producto_id: string
  cliente_id: string
  sku_cliente: string
  nombre_comercial_cliente: string | null
  precio_acordado: number | null
}

interface Props {
  clientes: Cliente[]
  productos: Producto[]
  aliases?: ProductoAlias[]
  initialData?: OVConDetalle
}

// ---------------------------------------------------------------------------
// Componente de Selector de Producto para la Grilla
// ---------------------------------------------------------------------------

function SelectorProductoCelda({ 
  productos, 
  onSelect, 
  autoFocus = false,
  clienteId
}: { 
  productos: Producto[], 
  onSelect: (p: Producto) => void,
  autoFocus?: boolean,
  clienteId?: string
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  const filtered = useMemo(() => {
    if (!query.trim()) return productos.slice(0, 20)
    const q = query.toLowerCase()
    return productos.filter(p => 
      p.nombre.toLowerCase().includes(q) || 
      p.referencia.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [productos, query])

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width
      })
    }
  }

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords()
      window.addEventListener('scroll', updateCoords, true)
      window.addEventListener('resize', updateCoords)
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true)
      window.removeEventListener('resize', updateCoords)
    }
  }, [isOpen])

  // Evitar problemas de hidratación en Portales al usar document.body
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center group">
        <input
          type="text"
          autoFocus={autoFocus}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          placeholder={clienteId ? "Escoja producto..." : "Seleccione cliente primero..."}
          className="w-full bg-emerald-50/10 hover:bg-white border-2 border-transparent focus:border-emerald-100 rounded-2xl outline-none text-[11px] font-black text-slate-900 uppercase tracking-tighter placeholder:text-slate-300 h-11 px-4 transition-all"
        />
        <div className="absolute right-3 pointer-events-none text-slate-300 group-hover:text-emerald-500 transition-colors">
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {mounted && isOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[190] bg-slate-900/10 backdrop-blur-[2px] animate-in fade-in duration-200" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            style={{ 
              position: 'fixed',
              top: coords.top - 8, // Separación del input
              left: coords.left + (coords.width / 2),
              transform: 'translate(-50%, -100%)',
              width: Math.max(500, coords.width),
              zIndex: 200
            }}
            className="bg-white border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] rounded-[32px] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
                {clienteId ? (query ? `Resultados: "${query}"` : 'Catálogo Asociado (B2B)') : 'Catálogo Global (Solo Lectura)'}
              </p>
              {filtered.length > 0 && (
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{filtered.length} ítems</span>
              )}
            </div>
            
            <div className="max-h-[400px] overflow-y-auto customize-scrollbar">
              {filtered.length > 0 ? (
                filtered.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelect(p)
                      setQuery('')
                      setIsOpen(false)
                    }}
                    className="w-full px-6 py-4 text-left hover:bg-slate-50 flex items-center justify-between group transition-all border-b border-slate-50/50 last:border-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-[12px] font-black text-slate-900 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors">{p.nombre}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">REF: {p.referencia}</span>
                        {p.color && (
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">• {p.color}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest">
                        Agregar
                      </div>
                      <Plus className="w-4 h-4 text-slate-200 group-hover:text-emerald-500 transform group-hover:scale-125 transition-all" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-12 text-center text-slate-300">
                  <Search className="w-10 h-10 mx-auto mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">No hay coincidencias en este catálogo</p>
                  {!clienteId && (
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Seleccione un cliente para filtrar automáticamente</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente Principal Formulario
// ---------------------------------------------------------------------------

export function OVForm({ clientes, productos, aliases = [], initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [clienteId, setClienteId] = useState(initialData?.cliente_id ?? '')
  const [fechaEntrega, setFechaEntrega] = useState(initialData?.fecha_entrega ?? '')
  const [plazoPago, setPlazoPago] = useState(initialData?.plazo_pago_dias ?? 30)
  const [notas, setNotas] = useState(initialData?.notas ?? '')
  const [showCatalog, setShowCatalog] = useState(false)
  
  const [productosEnForm, setProductosEnForm] = useState<ProductoEnMatriz[]>(() => {
    if (!initialData) return []
    const matrixMap = new Map<string, ProductoEnMatriz>()
    for (const line of initialData.ov_detalle) {
      if (!matrixMap.has(line.producto_id)) {
        const prod = line.productos
        const colorReal = prod ? extraerColorDelNombre(prod.nombre, prod.color) : null
        matrixMap.set(line.producto_id, {
          producto_id: line.producto_id,
          referencia: prod?.referencia ?? '',
          nombre: prod?.nombre ?? 'Producto',
          color: colorReal,
          precio_unitario: line.precio_pactado,
          cantidades: Object.fromEntries(TALLAS_STANDARD.map(t => [t, 0])),
        })
      }
      matrixMap.get(line.producto_id)!.cantidades[line.talla] = line.cantidad
    }
    return Array.from(matrixMap.values())
  })

  const [error, setError] = useState<string | null>(null)

  // Filtro B2B Estricto
  const productosFiltrados = useMemo(() => {
    // Si no hay cliente seleccionado, la grilla de búsqueda permanece vacía
    // para forzar la selección del cliente antes que la de productos (Seguridad B2B)
    if (!clienteId) return []

    const aliasDelCliente = aliases.filter(a => a.cliente_id === clienteId)
    
    // MODO ESTRICTO: Si tiene cliente pero NO tiene aliases asociados, catálogo vacío
    if (aliasDelCliente.length === 0) return []

    const allowedIds = new Set(aliasDelCliente.map(a => a.producto_id))
    return productos.filter(p => allowedIds.has(p.id)).map(p => {
      const aliasData = aliasDelCliente.find(a => a.producto_id === p.id)!
      return {
        ...p,
        nombre: aliasData.nombre_comercial_cliente ?? p.nombre,
        referencia: aliasData.sku_cliente ?? p.referencia,
        precio_base: aliasData.precio_acordado ?? p.precio_base
      }
    })
  }, [productos, aliases, clienteId])

  const catalogoDisponible = useMemo(() => {
    const items = productosFiltrados.filter(p => !productosEnForm.some(pf => pf.producto_id === p.id))
    const grouped = new Map<string, typeof items>()
    for (const p of items) {
      const cat = p.categoria || 'Sin Categoría'
      if (!grouped.has(cat)) grouped.set(cat, [])
      grouped.get(cat)!.push(p)
    }
    return grouped
  }, [productosFiltrados, productosEnForm])

  function handleAddProduct(p: Producto) {
    if (productosEnForm.some(pf => pf.producto_id === p.id)) return
    const colorReal = extraerColorDelNombre(p.nombre, p.color)
    const nuevo: ProductoEnMatriz = {
      producto_id: p.id,
      referencia: p.referencia,
      nombre: p.nombre,
      color: colorReal,
      precio_unitario: p.precio_base ?? 0,
      cantidades: Object.fromEntries(TALLAS_STANDARD.map(t => [t, 0])),
    }
    setProductosEnForm(prev => [...prev, nuevo])
  }

  function handleUpdateQty(pid: string, talla: string, val: number) {
    setProductosEnForm(prev => prev.map(p => 
      p.producto_id === pid 
        ? { ...p, cantidades: { ...p.cantidades, [talla]: Math.max(0, val) } } 
        : p
    ))
  }

  function handleUpdatePrice(pid: string, val: number) {
    setProductosEnForm(prev => prev.map(p => 
      p.producto_id === pid 
        ? { ...p, precio_unitario: Math.max(0, val) } 
        : p
    ))
  }

  function handleRemove(pid: string) {
    setProductosEnForm(prev => prev.filter(p => p.producto_id !== pid))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!clienteId) { setError('Selecciona un cliente'); return }
    if (!fechaEntrega) { setError('Selecciona fecha de entrega'); return }

    const lineas = productosEnForm.flatMap(p => 
      TALLAS_STANDARD.map(t => ({
        producto_id: p.producto_id,
        producto_nombre: p.nombre,
        talla: t,
        cantidad: p.cantidades[t] || 0,
        precio_pactado: p.precio_unitario
      })).filter(l => l.cantidad > 0)
    )

    if (lineas.length === 0) {
      setError('Agrega productos con cantidad > 0')
      return
    }

    startTransition(async () => {
      const payload = {
        cliente_id: clienteId,
        fecha_entrega: fechaEntrega,
        plazo_pago_dias: plazoPago,
        notas: notas || undefined,
        lineas,
      }
      const res = initialData 
        ? await updateOrdenVenta(initialData.id, payload)
        : await createOrdenVenta(payload)

      if (res.error) { setError(res.error); return }
      const id = initialData?.id ?? (res.data as any).id
      router.push(`/ordenes-venta/${id}`)
    })
  }

  const totalesPorTalla = useMemo(() => {
    const tots: Record<string, number> = {}
    for (const t of TALLAS_STANDARD) {
      tots[t] = productosEnForm.reduce((sum, p) => sum + (p.cantidades[t] || 0), 0)
    }
    return tots
  }, [productosEnForm])

  const subtotalUdsGlobal = useMemo(() => 
    Object.values(totalesPorTalla).reduce((s, v) => s + v, 0), 
  [totalesPorTalla])

  const subtotalPrecioGlobal = useMemo(() => 
    productosEnForm.reduce((sum, p) => 
      sum + (Object.values(p.cantidades).reduce((s, v) => s + v, 0) * p.precio_unitario)
    , 0),
  [productosEnForm])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* TOOLBAR */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-5 sticky top-0 z-[60] flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-[280px] space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente / Entidad</label>
          <select
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            autoFocus={!initialData}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-slate-300 transition-all cursor-pointer"
            required
          >
            <option value="">Seleccione Cliente...</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="w-24 space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Plazo</label>
          <input
            type="number"
            value={plazoPago}
            onChange={e => setPlazoPago(parseInt(e.target.value) || 0)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 tabular-nums outline-none"
          />
        </div>
        <div className="w-40 space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Entrega</label>
          <input
            type="date"
            value={fechaEntrega}
            onChange={e => setFechaEntrega(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 outline-none"
            required
          />
        </div>
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Notas</label>
          <input
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Instrucciones breves..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-600 outline-none"
          />
        </div>
      </div>

      {/* TRANSACTIONAL GRID */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100/50 border-b border-slate-100">
                <th className="px-6 py-5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-50/80 backdrop-blur z-10 w-[300px]">Producto / Referencia</th>
                <th className="px-4 py-5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest w-[120px]">Color</th>
                {TALLAS_STANDARD.map(t => (
                  <th key={t} className="px-2 py-5 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest min-w-[60px]">{t}</th>
                ))}
                <th className="px-4 py-5 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest border-l border-slate-200/40">Total</th>
                <th className="px-4 py-5 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest">P. Pactado</th>
                <th className="px-6 py-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {productosEnForm.map(p => {
                const rowTotal = Object.values(p.cantidades).reduce((s,v) => s+v, 0)
                return (
                  <tr key={p.producto_id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-2 sticky left-0 bg-white/90 group-hover:bg-slate-50/90 backdrop-blur z-10">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">{p.nombre}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">REF: {p.referencia}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-lg">{p.color ?? 'Genérico'}</span>
                    </td>
                    {TALLAS_STANDARD.map(t => (
                      <td key={t} className="px-1 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={p.cantidades[t] || ''}
                          onChange={e => handleUpdateQty(p.producto_id, t, parseInt(e.target.value) || 0)}
                          className="w-12 text-center bg-slate-50 border border-slate-100 rounded-lg py-1.5 text-[11px] font-black tabular-nums focus:bg-white focus:border-slate-300 outline-none transition-all"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center border-l border-slate-200/30">
                      <span className="text-[10px] font-black text-slate-900 tabular-nums">{rowTotal}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="relative inline-flex items-center">
                        <span className="absolute left-1.5 text-[8px] font-black text-slate-300">$</span>
                        <input
                          type="number"
                          value={p.precio_unitario || ''}
                          onChange={e => handleUpdatePrice(p.producto_id, parseFloat(e.target.value) || 0)}
                          className="w-20 text-center bg-slate-50 border border-slate-100 rounded-lg py-1.5 pl-3 text-[11px] font-black tabular-nums focus:bg-white focus:border-slate-300 outline-none transition-all"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(p.producto_id)}
                        className="p-2.5 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Eliminar Línea"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              
              {/* FILA DE ENTRADA (ESTILO SPREADSHEET) */}
              <tr className="bg-emerald-50/20">
                <td className="px-6 py-2 sticky left-0 bg-emerald-50/40 backdrop-blur z-10 border-r border-emerald-100/30">
                  <SelectorProductoCelda 
                    productos={productosFiltrados.filter(p => !productosEnForm.some(pf => pf.producto_id === p.id))}
                    onSelect={handleAddProduct}
                    autoFocus={false}
                    clienteId={clienteId}
                  />
                </td>
                <td colSpan={TALLAS_STANDARD.length + 4} className="px-6 py-4">
                  <p className="text-[9px] font-black text-emerald-600/50 uppercase tracking-[0.3em]">
                    ← Use el buscador para agregar una nueva línea
                  </p>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white border-t-2 border-slate-900">
                <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest sticky left-0 bg-slate-900 z-10">Totales Globales</td>
                <td className="px-4 py-4" />
                {TALLAS_STANDARD.map(t => (
                  <td key={t} className="px-2 py-4 text-center text-[11px] font-black tabular-nums">{totalesPorTalla[t] || '-'}</td>
                ))}
                <td className="px-4 py-4 text-center text-[12px] font-black tabular-nums border-l border-slate-700">{subtotalUdsGlobal}</td>
                <td colSpan={2} className="px-6 py-4 text-right text-[12px] font-black tracking-tight text-emerald-400">
                  ${subtotalPrecioGlobal.toLocaleString('es-CO')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* CATALOGO OPCIONAL */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowCatalog(!showCatalog)}
          className="px-6 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all flex items-center gap-3"
        >
          <div className={`w-2 h-2 rounded-full transition-colors ${showCatalog ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          {showCatalog ? 'Ocultar Catálogo Visual' : 'Mostrar Catálogo Visual'}
        </button>

        {showCatalog && (
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...catalogoDisponible.values()].flat().map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddProduct(p)}
                    className="group bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left hover:bg-white hover:border-slate-300 hover:shadow-xl transition-all"
                  >
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight mb-1">{p.nombre}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">REF: {p.referencia}</p>
                  </button>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* STICKY FOOTER SUBMIT */}
      <div className="sticky bottom-4 left-0 right-0 z-40 bg-white/80 backdrop-blur-md rounded-[40px] border border-slate-100 shadow-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Inversión Final</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">${subtotalPrecioGlobal.toLocaleString('es-CO')}</p>
           </div>
           <div className="h-10 w-px bg-slate-100" />
           <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volumen</p>
              <p className="text-lg font-black text-slate-900 tracking-tight tabular-nums">{subtotalUdsGlobal} UDS</p>
           </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-10 py-5 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-40"
        >
          {isPending ? 'Sincronizando...' : (initialData ? 'Actualizar Orden' : 'Confirmar Pedido')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 text-[11px] font-black uppercase text-center tracking-widest">
          ERROR OPERATIVO: {error}
        </div>
      )}
    </form>
  )
}
