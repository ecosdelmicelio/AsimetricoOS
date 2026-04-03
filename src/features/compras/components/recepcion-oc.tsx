'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, AlertTriangle, Calendar } from 'lucide-react'
import { createRecepcionOC } from '@/features/compras/services/compras-actions'
import { formatDate } from '@/shared/lib/utils'
import type { OrdenCompraConDetalle } from '@/features/compras/types'

interface RecepcionMP {
  id: string
  material_id: string | null
  cantidad_recibida: number
  cantidad_esperada: number | null
  precio_unitario: number | null
  notas: string | null
  fecha_recepcion: string
  materiales: { codigo: string; nombre: string; unidad: string } | null
  profiles: { full_name: string } | null
}

interface RecepcionPT {
  id: string
  producto_id: string | null
  talla: string | null
  cantidad_recibida: number
  cantidad_esperada: number | null
  precio_unitario: number | null
  notas: string | null
  fecha_recepcion: string
  productos: { referencia: string; nombre: string } | null
  profiles: { full_name: string } | null
}

interface Props {
  oc: OrdenCompraConDetalle & { tipo?: string; oc_detalle?: any[] }
  recepciones: (RecepcionMP | RecepcionPT)[]
}

export function RecepcionOC({ oc, recepciones }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isMateriaPrima = oc.tipo === 'materia_prima'

  // Form state para MP
  const [formDataMP, setFormDataMP] = useState({
    material_id: oc.rollos?.[0]?.material_id ?? '',
    cantidad_recibida: '',
    cantidad_esperada: '',
    precio_unitario: '',
    notas: '',
  })

  // Form state para PT
  const [formDataPT, setFormDataPT] = useState<Record<string, Record<string, string>>>({})
  const [preciosPT, setPreciosPT] = useState<Record<string, string>>({})
  const [notasPT, setNotasPT] = useState('')

  const materialesDisponibles = oc.rollos ?? []
  const productosDisponibles = oc.oc_detalle ?? []

  const handleSubmitMP = (e: React.FormEvent) => {
    e.preventDefault()

    const cantidadNum = parseFloat(formDataMP.cantidad_recibida)
    const precioNum = formDataMP.precio_unitario ? parseFloat(formDataMP.precio_unitario) : undefined

    if (!formDataMP.material_id || isNaN(cantidadNum) || cantidadNum <= 0) {
      setError('Completa todos los campos requeridos')
      return
    }

    setError(null)
    startTransition(async () => {
      const res = await createRecepcionOC({
        oc_id: oc.id,
        material_id: formDataMP.material_id,
        cantidad_recibida: cantidadNum,
        cantidad_esperada: formDataMP.cantidad_esperada ? parseFloat(formDataMP.cantidad_esperada) : undefined,
        precio_unitario: precioNum,
        notas: formDataMP.notas,
      })

      if (res.error) {
        setError(res.error)
        return
      }

      setFormDataMP({
        material_id: materialesDisponibles[0]?.material_id ?? '',
        cantidad_recibida: '',
        cantidad_esperada: '',
        precio_unitario: '',
        notas: '',
      })
      setShowForm(false)
    })
  }

  const handleSubmitPT = (e: React.FormEvent) => {
    e.preventDefault()

    // Validar que hay al menos una cantidad registrada
    let totalCantidad = 0
    for (const refData of Object.values(formDataPT)) {
      for (const cantStr of Object.values(refData)) {
        const cant = parseFloat(cantStr)
        if (!isNaN(cant) && cant > 0) totalCantidad += cant
      }
    }

    if (totalCantidad === 0) {
      setError('Registra al menos una cantidad')
      return
    }

    // Validar precios
    const productos = productosDisponibles.reduce((acc: any, item: any) => {
      if (!acc[item.producto_id]) acc[item.producto_id] = true
      return acc
    }, {})

    for (const prodId of Object.keys(productos)) {
      if (!preciosPT[prodId]) {
        setError(`Falta precio para referencia ${prodId}`)
        return
      }
    }

    setError(null)
    startTransition(async () => {
      // Crear una recepción por cada referencia/talla
      let hasError = false
      for (const [prodId, tallaData] of Object.entries(formDataPT)) {
        for (const [talla, cantStr] of Object.entries(tallaData)) {
          const cant = parseFloat(cantStr)
          if (isNaN(cant) || cant <= 0) continue

          const res = await createRecepcionOC({
            oc_id: oc.id,
            producto_id: prodId,
            talla,
            cantidad_recibida: cant,
            precio_unitario: preciosPT[prodId] ? parseFloat(preciosPT[prodId]) : undefined,
            notas: notasPT,
          })

          if (res.error) {
            setError(res.error)
            hasError = true
            break
          }
        }
        if (hasError) break
      }

      if (!hasError) {
        setFormDataPT({})
        setPreciosPT({})
        setNotasPT('')
        setShowForm(false)
      }
    })
  }

  if (!isMateriaPrima) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-body-md">Recepciones</h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva recepción
            </button>
          )}
        </div>

        {/* Form Matriz PT */}
        {showForm && (
          <form onSubmit={handleSubmitPT} className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Registrar recepción - Matriz</p>

            {/* Precios por referencia */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Precio por Referencia *</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from(new Set(productosDisponibles.map((d: any) => d.producto_id))).map((prodId: string) => {
                  const prod = productosDisponibles.find((d: any) => d.producto_id === prodId)
                  return (
                    <div key={prodId} className="space-y-1">
                      <label className="text-xs font-medium text-foreground">{prod?.referencia || prodId}</label>
                      <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={preciosPT[prodId] ?? ''}
                          onChange={e => setPreciosPT({ ...preciosPT, [prodId]: e.target.value })}
                          required
                          placeholder="$25.00"
                          className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Matriz de cantidades */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Cantidades por Talla</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-black/5">
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Referencia</th>
                      {Array.from(new Set(productosDisponibles.map((d: any) => d.talla))).map((talla: string) => (
                        <th key={talla} className="text-center py-2 px-2 font-semibold text-muted-foreground">{talla}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(productosDisponibles.map((d: any) => d.producto_id))).map((prodId: string) => {
                      const prod = productosDisponibles.find((d: any) => d.producto_id === prodId)
                      const tallas = productosDisponibles.filter((d: any) => d.producto_id === prodId).map((d: any) => d.talla)
                      return (
                        <tr key={prodId} className="border-b border-black/5">
                          <td className="py-2 px-2 text-foreground font-medium">{prod?.referencia || prodId}</td>
                          {Array.from(new Set(productosDisponibles.map((d: any) => d.talla))).map((talla: string) => (
                            <td key={`${prodId}-${talla}`} className="text-center py-2 px-2">
                              {tallas.includes(talla) ? (
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={formDataPT[prodId]?.[talla] ?? ''}
                                  onChange={e => {
                                    setFormDataPT({
                                      ...formDataPT,
                                      [prodId]: { ...formDataPT[prodId], [talla]: e.target.value }
                                    })
                                  }}
                                  placeholder="0"
                                  className="w-full max-w-12 bg-transparent text-center text-body-sm text-foreground outline-none border border-black/10 rounded px-1 py-0.5"
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Notas</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <textarea
                  value={notasPT}
                  onChange={e => setNotasPT(e.target.value)}
                  placeholder="Observaciones..."
                  rows={2}
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null) }}
                className="px-3 py-1.5 rounded-lg text-body-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
              >
                {pending && <Loader2 className="w-3 h-3 animate-spin" />}
                Registrar
              </button>
            </div>
          </form>
        )}

        {/* Historial PT */}
        {recepciones.length === 0 ? (
          <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
            <p className="text-body-sm text-muted-foreground">Sin recepciones registradas</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-black/5">
              <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Referencia</span>
              <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Talla</span>
              <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-right">Cantidad</span>
              <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-right">Precio</span>
              <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Fecha</span>
              <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Registrado por</span>
            </div>
            <div className="divide-y divide-black/5">
              {recepciones.map((r: any) => (
                <div key={r.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3">
                  <div className="col-span-2">
                    <p className="text-body-sm font-medium text-foreground">{r.productos?.referencia}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-body-sm text-foreground">{r.talla}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-body-sm font-medium text-foreground">{r.cantidad_recibida}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-body-sm text-foreground">${r.precio_unitario?.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{formatDate(r.fecha_recepcion)}</span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">{r.profiles?.full_name ?? 'Sistema'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // MP Form (original)
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-body-md">Recepciones</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva recepción
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmitMP} className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Registrar recepción</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Material */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Material *</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <select
                  value={formDataMP.material_id}
                  onChange={e => setFormDataMP({ ...formDataMP, material_id: e.target.value })}
                  required
                  className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                >
                  <option value="">Selecciona un material</option>
                  {materialesDisponibles.map(r => (
                    <option key={r.material_id} value={r.material_id}>
                      {r.materiales?.codigo} - {r.materiales?.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Unidad de medida (display) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Unidad</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2 flex items-center">
                <span className="text-body-sm text-muted-foreground">
                  {formDataMP.material_id
                    ? materialesDisponibles.find(r => r.material_id === formDataMP.material_id)?.materiales?.unidad || '—'
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cantidad Recibida */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Cantidad Recibida *</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formDataMP.cantidad_recibida}
                  onChange={e => setFormDataMP({ ...formDataMP, cantidad_recibida: e.target.value })}
                  required
                  placeholder="50.5"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Precio Unitario */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Precio Unitario</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formDataMP.precio_unitario}
                  onChange={e => setFormDataMP({ ...formDataMP, precio_unitario: e.target.value })}
                  placeholder="10.50"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cantidad Esperada */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Cantidad Esperada</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formDataMP.cantidad_esperada}
                  onChange={e => setFormDataMP({ ...formDataMP, cantidad_esperada: e.target.value })}
                  placeholder="50.0"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Notas</label>
            <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
              <textarea
                value={formDataMP.notas}
                onChange={e => setFormDataMP({ ...formDataMP, notas: e.target.value })}
                placeholder="Observaciones sobre la recepción..."
                rows={2}
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null) }}
              className="px-3 py-1.5 rounded-lg text-body-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-60"
            >
              {pending && <Loader2 className="w-3 h-3 animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      )}

      {/* Historial de recepciones */}
      {recepciones.length === 0 ? (
        <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
          <p className="text-body-sm text-muted-foreground">Sin recepciones registradas</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-black/5">
            <span className="col-span-3 text-xs font-semibold text-muted-foreground uppercase">Material</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-right">Cantidad</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-right">Precio</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Fecha</span>
            <span className="col-span-3 text-xs font-semibold text-muted-foreground uppercase">Registrado por</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-black/5">
            {recepciones.map((r: any) => (
              <div key={r.id} className="grid grid-cols-12 gap-3 items-center px-5 py-3">
                <div className="col-span-3">
                  <p className="text-body-sm font-medium text-foreground">{r.materiales?.nombre}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.materiales?.codigo}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-body-sm font-medium text-foreground">{r.cantidad_recibida} {r.materiales?.unidad}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-body-sm text-foreground">${r.precio_unitario?.toFixed(2) ?? '—'}</p>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{formatDate(r.fecha_recepcion)}</span>
                </div>
                <div className="col-span-3">
                  <p className="text-xs text-muted-foreground">{r.profiles?.full_name ?? 'Sistema'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
