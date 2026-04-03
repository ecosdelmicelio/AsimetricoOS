'use client'

import { useState, useTransition, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Package, ShoppingBag, ChevronRight, ChevronLeft, AlertTriangle, Globe } from 'lucide-react'
import { createProducto } from '@/features/productos/services/producto-actions'
import { CodigoBuilder } from '@/features/codigo-schema/components/codigo-builder'
import { useDuplicateCheck } from '@/shared/hooks/use-duplicate-check'
import type { CodigoSchema, SegmentoSeleccion } from '@/features/codigo-schema/types'
import type { TipoProducto } from '@/features/productos/types'

interface CodigoState {
  codigo: string
  completo: boolean
  selecciones: SegmentoSeleccion[]
}

interface Props {
  schema: CodigoSchema | null
}

export function ProductoForm({ schema }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  // Step 1
  const [tipoProducto, setTipoProducto] = useState<TipoProducto>('fabricado')
  const [codigoState, setCodigoState] = useState<CodigoState>({
    codigo: '',
    completo: false,
    selecciones: [],
  })
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState('')

  // Step 2
  const [precioBase, setPrecioBase] = useState('')

  // Auto-derivar color y origen del esquema de código
  const autoColor = useMemo(() => {
    if (!schema || codigoState.selecciones.length === 0) return ''
    const seg = schema.segmentos.find(s => s.etiqueta.toLowerCase().includes('color'))
    if (!seg) return ''
    const sel = codigoState.selecciones.find(s => s.segmento_id === seg.id)
    if (!sel?.valor) return ''
    return seg.valores.find(v => v.valor === sel.valor)?.etiqueta ?? sel.valor
  }, [schema, codigoState.selecciones])

  const autoOrigenUsa = useMemo(() => {
    if (!schema || codigoState.selecciones.length === 0) return false
    const seg = schema.segmentos.find(s =>
      s.etiqueta.toLowerCase().includes('origen') || s.etiqueta.toLowerCase().includes('origin')
    )
    if (!seg) return false
    const sel = codigoState.selecciones.find(s => s.segmento_id === seg.id)
    if (!sel?.valor) return false
    const etiqueta = seg.valores.find(v => v.valor === sel.valor)?.etiqueta ?? ''
    return etiqueta.toLowerCase().includes('usa') || etiqueta.toLowerCase().includes(' us') || sel.valor.toUpperCase() === 'US'
  }, [schema, codigoState.selecciones])

  // Auto-rellenar color cuando cambia la selección del código
  useEffect(() => {
    if (autoColor) setColor(autoColor)
  }, [autoColor])

  const handleCodigoChange = useCallback(
    (result: { codigo: string; completo: boolean; selecciones: SegmentoSeleccion[] }) => {
      setCodigoState(result)
    },
    [],
  )

  const { isDuplicate: nombreDuplicado, checking: checkingNombre } = useDuplicateCheck({
    table: 'productos',
    field: 'nombre',
    value: nombre,
    enabled: nombre.trim().length > 2,
  })

  const canAdvanceStep1 = codigoState.completo && nombre.trim().length > 0

  function handleSubmit() {
    setError(null)
    const autoRefs = codigoState.selecciones
      .filter(s => s.tipo === 'auto_ref')
      .map(s => ({ segmento_id: s.segmento_id, longitud: s.longitud }))

    startTransition(async () => {
      const res = await createProducto({
        referencia: codigoState.codigo,
        nombre: nombre.trim(),
        color: color.trim() || undefined,
        origen_usa: autoOrigenUsa,
        precio_base: precioBase ? parseFloat(precioBase) : undefined,
        tipo_producto: tipoProducto,
        autoRefs: autoRefs.length > 0 ? autoRefs : undefined,
        schema_id: schema?.id,
      })
      if (res.error) { setError(res.error); return }
      router.push(`/productos/${res.data!.id}`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['Identidad', 'Precio'] as const).map((label, i) => {
          const s = i + 1
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-primary-600 text-white'
                    : step > s
                    ? 'bg-green-500 text-white'
                    : 'bg-neu-base shadow-neu text-muted-foreground'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              <span
                className={`text-body-sm ${
                  step === s ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {s < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Identidad ── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Tipo de producto */}
          <div className="space-y-2">
            <label className="text-body-sm text-muted-foreground font-medium">
              Tipo de Producto *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipoProducto('fabricado')}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  tipoProducto === 'fabricado'
                    ? 'border-primary-400 bg-primary-50 shadow-neu-inset'
                    : 'border-transparent bg-neu-base shadow-neu hover:shadow-neu-lg'
                }`}
              >
                <Package
                  className={`w-4 h-4 shrink-0 ${
                    tipoProducto === 'fabricado' ? 'text-primary-600' : 'text-muted-foreground'
                  }`}
                />
                <div>
                  <p
                    className={`text-body-sm font-semibold ${
                      tipoProducto === 'fabricado' ? 'text-primary-700' : 'text-foreground'
                    }`}
                  >
                    Fabricado
                  </p>
                  <p className="text-xs text-muted-foreground">Requiere BOM</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoProducto('comercializado')}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  tipoProducto === 'comercializado'
                    ? 'border-primary-400 bg-primary-50 shadow-neu-inset'
                    : 'border-transparent bg-neu-base shadow-neu hover:shadow-neu-lg'
                }`}
              >
                <ShoppingBag
                  className={`w-4 h-4 shrink-0 ${
                    tipoProducto === 'comercializado' ? 'text-primary-600' : 'text-muted-foreground'
                  }`}
                />
                <div>
                  <p
                    className={`text-body-sm font-semibold ${
                      tipoProducto === 'comercializado' ? 'text-primary-700' : 'text-foreground'
                    }`}
                  >
                    Comercializado
                  </p>
                  <p className="text-xs text-muted-foreground">Sin BOM</p>
                </div>
              </button>
            </div>
          </div>

          {/* Código */}
          <div className="space-y-2">
            <label className="text-body-sm text-muted-foreground font-medium">
              Código de referencia *
            </label>
            <CodigoBuilder schema={schema} onChange={handleCodigoChange} />
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-body-sm text-muted-foreground font-medium">
                Nombre del producto *
              </label>
              {checkingNombre && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className={`rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 ${nombreDuplicado ? 'ring-1 ring-amber-400' : ''}`}>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Blusa Manga Larga Body"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            {nombreDuplicado && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="text-xs">Ya existe un producto con este nombre</span>
              </div>
            )}
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-body-sm text-muted-foreground font-medium">Color</label>
              {autoColor && (
                <span className="text-[10px] text-primary-500 font-medium">Auto</span>
              )}
            </div>
            <div className="rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5">
              <input
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="Ej: Rojo Vino, Azul Navy, Negro"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {autoColor ? 'Derivado del esquema de código. Puedes editarlo.' : 'Cada código de producto tiene un color fijo.'}
            </p>
          </div>

          {/* Origen USA — solo si el esquema tiene un segmento de origen */}
          {autoOrigenUsa && (
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
              <Globe className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-body-sm font-semibold text-blue-700">Origen USA 🇺🇸</p>
                <p className="text-xs text-blue-600">Derivado del esquema de código. Requiere etiquetado especial.</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-2.5 rounded-xl bg-neu-base shadow-neu text-body-sm text-muted-foreground hover:text-foreground transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canAdvanceStep1}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Precio ── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="rounded-xl bg-neu-base shadow-neu-inset px-4 py-3 space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              Resumen
            </p>
            <p className="font-mono text-body-sm font-bold text-primary-700 tracking-widest">
              {codigoState.codigo}
            </p>
            <p className="text-body-sm text-foreground">{nombre}</p>
            {color && (
              <p className="text-xs text-muted-foreground">Color: <span className="font-medium text-foreground">{color}</span></p>
            )}
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                tipoProducto === 'fabricado'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {tipoProducto === 'fabricado' ? 'Fabricado' : 'Comercializado'}
            </span>
          </div>

          {/* Precio techo */}
          <div className="space-y-1.5">
            <label className="text-body-sm text-muted-foreground font-medium">
              Precio techo (COP)
            </label>
            <div className="relative rounded-xl bg-neu-base shadow-neu-inset">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-body-sm">
                $
              </span>
              <input
                type="number"
                min={0}
                step={1000}
                value={precioBase}
                onChange={e => setPrecioBase(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent pl-7 pr-3 py-2.5 text-body-sm text-foreground outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Precio de venta máximo. El BOM calculará el costo real de producción.
            </p>
          </div>

          {error && <p className="text-red-600 text-body-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neu-base shadow-neu text-body-sm text-muted-foreground hover:text-foreground transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Crear producto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
