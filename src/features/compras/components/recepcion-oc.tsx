'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Loader2, AlertTriangle, Calendar, Trash2 } from 'lucide-react'
import { createRecepcionOC, revertirRecepcionOC } from '@/features/compras/services/compras-actions'
import { extraerReferenciaBase, extraerColorDelCodigo } from '@/shared/lib/productos-utils'
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

function HistorialRecepcionRow({ recepcion }: { recepcion: any }) {
  const [reverting, setReverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRevertir = async () => {
    if (!confirm('¿Revertir esta recepción? Se creará un movimiento kardex inverso.')) return

    setReverting(true)
    setError(null)
    const res = await revertirRecepcionOC(recepcion.id)
    if (res.error) {
      setError(res.error)
    }
    setReverting(false)
  }

  const esActiva = recepcion.estado !== 'revertida'

  return (
    <div className="grid grid-cols-12 gap-3 items-center px-5 py-3">
      <div className="col-span-3">
        <p className="text-body-sm font-medium text-foreground">
          {recepcion.materiales?.nombre || recepcion.productos?.referencia}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {recepcion.materiales?.codigo}
        </p>
      </div>
      <div className="col-span-1 text-right">
        <p className="text-body-sm font-medium text-foreground">
          {recepcion.cantidad_recibida} {recepcion.materiales?.unidad}
        </p>
      </div>
      <div className="col-span-1 text-right">
        <p className="text-body-sm text-foreground">${recepcion.precio_unitario?.toFixed(2) ?? '—'}</p>
      </div>
      <div className="col-span-1 flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{formatDate(recepcion.fecha_recepcion)}</span>
      </div>
      <div className="col-span-2">
        <p className="text-xs text-muted-foreground">{recepcion.profiles?.full_name ?? 'Sistema'}</p>
      </div>
      <div className="col-span-2">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
          esActiva
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {esActiva ? 'Activa' : 'Revertida'}
        </span>
      </div>
      <div className="col-span-2 flex justify-center">
        {esActiva ? (
          <button
            onClick={handleRevertir}
            disabled={reverting}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
            title="Revertir recepción (crea movimiento kardex inverso)"
          >
            {reverting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="text-xs font-medium">Revertir</span>
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Revertida</span>
        )}
        {error && (
          <div className="absolute top-2 right-2 bg-red-100 text-red-700 px-3 py-2 rounded text-xs">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export function RecepcionOC({ oc, recepciones }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isMateriaPrima = oc.tipo === 'materia_prima'
  const materialesDisponibles = isMateriaPrima
    ? (oc as any).oc_detalle_mp?.map((m: any) => ({
        material_id: m.material_id,
        materiales: m.materiales,
        precio_unitario: m.precio_unitario,
        cantidad: m.cantidad
      })) ?? []
    : oc.rollos ?? []
  const productosDisponibles = oc.oc_detalle ?? []

  // Form state para MP con cascada
  const [refBase, setRefBase] = useState('')
  const [colorSeleccionado, setColorSeleccionado] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [formDataMP, setFormDataMP] = useState({
    material_id: '',
    cantidad_recibida: '',
    cantidad_esperada: '',
    precio_unitario: '',
    notas: '',
  })

  // Agrupar materiales por referencia base
  const materialesPorRef = useMemo(() => {
    const grupos = new Map<string, typeof materialesDisponibles>()
    for (const m of materialesDisponibles) {
      const refBase = extraerReferenciaBase(m.materiales?.codigo ?? '')
      if (!grupos.has(refBase)) {
        grupos.set(refBase, [])
      }
      grupos.get(refBase)!.push(m)
    }
    return grupos
  }, [materialesDisponibles])

  const referenciasBase = Array.from(materialesPorRef.keys()).sort()
  const coloresDisponibles = refBase ? materialesPorRef.get(refBase) ?? [] : []

  // Form state para PT
  const [formDataPT, setFormDataPT] = useState<Record<string, Record<string, string>>>({})
  const [preciosPT, setPreciosPT] = useState<Record<string, string>>({})
  const [notasPT, setNotasPT] = useState('')

  // Calcular total recibido por material
  const totalRecibidoPorMaterial = useMemo(() => {
    const totales = new Map<string, number>()
    for (const r of recepciones) {
      const recepcion = r as any
      if (recepcion.material_id) {
        totales.set(recepcion.material_id, (totales.get(recepcion.material_id) ?? 0) + r.cantidad_recibida)
      }
    }
    return totales
  }, [recepciones])

  // Calcular total recibido por producto/talla
  const totalRecibidoPorProducto = useMemo(() => {
    const totales = new Map<string, number>()
    for (const r of recepciones) {
      const recepcion = r as any
      if (recepcion.producto_id && recepcion.talla) {
        const key = `${recepcion.producto_id}-${recepcion.talla}`
        totales.set(key, (totales.get(key) ?? 0) + r.cantidad_recibida)
      }
    }
    return totales
  }, [recepciones])

  const handleSubmitMP = (e: React.FormEvent) => {
    e.preventDefault()

    const cantidadNum = parseFloat(formDataMP.cantidad_recibida)
    const precioNum = formDataMP.precio_unitario ? parseFloat(formDataMP.precio_unitario) : undefined

    if (!colorSeleccionado || isNaN(cantidadNum) || cantidadNum <= 0) {
      setError('Selecciona referencia, color y cantidad')
      return
    }

    // Validar que no exceda 120% de la cantidad ordenada
    const colorRollo = coloresDisponibles.find((m: any) => m.material_id === colorSeleccionado)
    if (colorRollo) {
      const cantidadOrdenada = colorRollo.cantidad ?? 0
      const totalRecibido = (totalRecibidoPorMaterial.get(colorSeleccionado) ?? 0) + cantidadNum
      const limite = cantidadOrdenada * 1.2

      if (totalRecibido > limite) {
        setError(`No puedes recibir más del 120% ordenado. Ordenado: ${cantidadOrdenada}, Ya recibido: ${totalRecibidoPorMaterial.get(colorSeleccionado) ?? 0}, Límite: ${limite.toFixed(2)}, Intenta agregar: ${cantidadNum}`)
        return
      }
    }

    setError(null)
    startTransition(async () => {
      const colorRollo = coloresDisponibles.find((m: any) => m.material_id === colorSeleccionado)
      if (!colorRollo?.material_id) {
        setError('Material no encontrado')
        return
      }

      const res = await createRecepcionOC({
        oc_id: oc.id,
        material_id: colorRollo.material_id,
        cantidad_recibida: cantidadNum,
        cantidad_esperada: formDataMP.cantidad_esperada ? parseFloat(formDataMP.cantidad_esperada) : undefined,
        precio_unitario: precioNum,
        notas: formDataMP.notas,
      })

      if (res.error) {
        setError(res.error)
        return
      }

      setNumeroFactura('')
      setRefBase('')
      setColorSeleccionado('')
      setFormDataMP({
        material_id: '',
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

    // Validar que no exceda 120% de la cantidad ordenada (por producto/talla)
    for (const [prodId, tallaData] of Object.entries(formDataPT)) {
      for (const [talla, cantStr] of Object.entries(tallaData)) {
        const cant = parseFloat(cantStr)
        if (isNaN(cant) || cant <= 0) continue

        const detalle = productosDisponibles.find((d: any) => d.producto_id === prodId && d.talla === talla)
        if (detalle) {
          const cantidadOrdenada = detalle.cantidad ?? 0
          const key = `${prodId}-${talla}`
          const totalRecibido = (totalRecibidoPorProducto.get(key) ?? 0) + cant
          const limite = cantidadOrdenada * 1.2

          if (totalRecibido > limite) {
            setError(`Referencia ${detalle.productos?.referencia}/${talla}: No puedes recibir más del 120%. Límite: ${limite}, Ya recibido: ${totalRecibidoPorProducto.get(key) ?? 0}`)
            return
          }
        }
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
                      <label className="text-xs font-medium text-foreground">{prod?.productos?.referencia || prodId}</label>
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
                          <td className="py-2 px-2 text-foreground font-medium">{prod?.productos?.referencia || prodId}</td>
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
              <span className="col-span-1 text-xs font-semibold text-muted-foreground uppercase">Talla</span>
              <span className="col-span-1 text-xs font-semibold text-muted-foreground uppercase text-right">Cantidad</span>
              <span className="col-span-1 text-xs font-semibold text-muted-foreground uppercase text-right">Precio</span>
              <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Fecha</span>
              <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Registrado por</span>
              <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Estado</span>
              <span className="col-span-1 text-xs font-semibold text-muted-foreground uppercase text-center">Acción</span>
            </div>
            <div className="divide-y divide-black/5">
              {recepciones.map((r: any) => (
                <HistorialRecepcionRow key={r.id} recepcion={r} />
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

          {/* Número de Factura */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Número de Factura (Proveedor)</label>
            <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
              <input
                type="text"
                value={numeroFactura}
                onChange={e => setNumeroFactura(e.target.value)}
                placeholder="Ej: INV-12345"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Referencia Base */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Referencia *</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                <select
                  value={refBase}
                  onChange={e => {
                    setRefBase(e.target.value)
                    setColorSeleccionado('')
                  }}
                  className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                >
                  <option value="">Selecciona referencia...</option>
                  {referenciasBase.map(ref => (
                    <option key={ref} value={ref}>
                      {ref}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color disponible */}
            {refBase && coloresDisponibles.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Color *</label>
                <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
                  <select
                    value={colorSeleccionado}
                    onChange={e => {
                      setColorSeleccionado(e.target.value)
                      // Precarga automática de precio
                      const material = materialesDisponibles.find((m: any) => m.material_id === e.target.value)
                      if (material) {
                        setFormDataMP(prev => ({
                          ...prev,
                          precio_unitario: material.precio_unitario?.toString() ?? ''
                        }))
                      }
                    }}
                    className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                  >
                    <option value="">Selecciona color...</option>
                    {coloresDisponibles.map((m: any) => {
                      const color = extraerColorDelCodigo(m.materiales?.codigo ?? '')
                      return (
                        <option key={m.material_id} value={m.material_id}>
                          {color} - {m.materiales?.nombre}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* Unidad de medida (display) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Unidad</label>
              <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2 flex items-center">
                <span className="text-body-sm text-muted-foreground">
                  {colorSeleccionado
                    ? coloresDisponibles.find((m: any) => m.material_id === colorSeleccionado)?.materiales?.unidad || '—'
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
            <span className="col-span-1 text-xs font-semibold text-muted-foreground uppercase text-right">Cantidad</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground uppercase text-right">Precio</span>
            <span className="col-span-1 text-xs font-semibold text-muted-foreground uppercase">Fecha</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Registrado por</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">Estado</span>
            <span className="col-span-2 text-xs font-semibold text-muted-foreground uppercase text-center">Acción</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-black/5">
            {recepciones.map((r: any) => (
              <HistorialRecepcionRow key={r.id} recepcion={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
