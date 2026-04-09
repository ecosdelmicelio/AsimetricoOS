'use client'

import { useState, useTransition, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertTriangle } from 'lucide-react'
import { createProducto } from '@/features/productos/services/producto-actions'
import { CodigoPreviewPT } from '@/features/productos/components/codigo-preview-pt'
import { useDuplicateCheck } from '@/shared/hooks/use-duplicate-check'
import type { TipoProducto, TipoDistribucion } from '@/features/productos/types'
import type { AtributoPT, TipoAtributo } from '@/features/productos/types/atributos'
import type { Marca } from '@/features/configuracion/services/marcas-actions'
import { TIPOS_ATRIBUTO, LABELS_ATRIBUTO } from '@/features/productos/types/atributos'

interface Props {
  atributosPT: AtributoPT[]
  marcas: Marca[]
}

export function ProductoForm({ atributosPT, marcas }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Agrupar atributos internamente para resolver posible error de serialización en Next.js
  const atributos = useMemo(() => {
    const acc = {} as Record<TipoAtributo, AtributoPT[]>
    TIPOS_ATRIBUTO.forEach(t => acc[t] = [])
    atributosPT.forEach(a => {
      if (acc[a.tipo]) acc[a.tipo].push(a)
    })
    return acc
  }, [atributosPT])

  // Tipo y Código
  const [tipoProducto, setTipoProducto] = useState<TipoProducto>('fabricado')
  const [tipoDistribucion, setTipoDistribucion] = useState<TipoDistribucion>('MTS')
  const [codigo, setCodigo] = useState('')
  const [codigoCompleto, setCodigoCompleto] = useState(false)

  // Básico
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState('')

  // Atributos seleccionados (tipo → atributo_id)
  const [atributosSeleccionados, setAtributosSeleccionados] = useState<Record<TipoAtributo, string>>({
    tipo: '',
    fit: '',
    superior: '',
    inferior: '',
    capsula: '',
    diseno: '',
    color: '',
    genero: '',
  })

  const [marcaSeleccionada, setMarcaSeleccionada] = useState('')

  // Precios
  const [precioN1, setPrecioN1] = useState('')
  const [precioN2, setPrecioN2] = useState('')
  const [precioN3, setPrecioN3] = useState('')
  const [referenciaCliente, setReferenciaCliente] = useState('')
  const [nombreComercial, setNombreComercial] = useState('')
  const [partidaArancelaria, setPartidaArancelaria] = useState('')
  const [autoColor, setAutoColor] = useState(false)

  // Auto-llenar color cuando se selecciona el atributo color
  useEffect(() => {
    const attrColorId = atributosSeleccionados.color
    if (attrColorId) {
      const attr = (atributos.color ?? []).find(a => a.id === attrColorId)
      if (attr) {
        setColor(attr.valor)
        setAutoColor(true)
      }
    } else {
      setAutoColor(false)
    }
  }, [atributosSeleccionados.color, atributos.color])

  // Auto-llenar referencia cuando código está completo
  useEffect(() => {
    if (codigoCompleto && codigo) {
      // Ya no auto-llenamos, dejamos que se especifique manualmente si es necesario
      // pero podríamos auto-llenar si queremos
    }
  }, [codigoCompleto, codigo])

  const handleCodigoChange = useCallback((nuevoCodigo: string, completo: boolean) => {
    setCodigo(nuevoCodigo)
    setCodigoCompleto(completo)
  }, [])

  const { isDuplicate: nombreDuplicado, checking: checkingNombre } = useDuplicateCheck({
    table: 'productos',
    field: 'nombre',
    value: nombre,
    enabled: nombre.trim().length > 2,
  })

  const canAdvanceStep1 = codigoCompleto && nombre.trim().length > 0

  function handleSubmit() {
    setError(null)

    startTransition(async () => {
      const res = await createProducto({
        referencia: codigo,
        nombre: nombre.trim(),
        color: color.trim() || undefined,
        precio_base: precioN1 ? parseFloat(precioN1) : undefined,
        precio_estandar: precioN2 ? parseFloat(precioN2) : undefined,
        precio_n3: precioN3 ? parseFloat(precioN3) : undefined,
        referencia_cliente: referenciaCliente.trim() || undefined,
        nombre_comercial: nombreComercial.trim() || undefined,
        partida_arancelaria: partidaArancelaria.trim() || undefined,
        tipo_producto: tipoProducto,
        tipo_distribucion: tipoDistribucion,
        marca_id: marcaSeleccionada || undefined,
        atributos: atributosSeleccionados,
      })
      if (res.error) { setError(res.error); return }
      router.push(`/catalogo/${res.data!.id}`)
    })
  }

  return (
    <form onSubmit={e => { e.preventDefault(); handleSubmit() }} className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Top Row: Código Generado + Tipo */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-start">
        <div className="w-full space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Código Generado *</label>
          <CodigoPreviewPT
            atributos={atributos}
            seleccionados={atributosSeleccionados}
            onCodigoChange={handleCodigoChange}
          />
        </div>
        
        <div className="space-y-3 md:min-w-[220px]">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo *</label>
            <div className="relative flex rounded-xl bg-neu-base shadow-neu-inset p-1 w-full">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-primary-600 shadow transition-transform duration-300 ${
                  tipoProducto === 'fabricado' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <button
                type="button"
                onClick={() => setTipoProducto('fabricado')}
                className={`relative z-10 flex-1 py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
                  tipoProducto === 'fabricado' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Fabricado
              </button>
              <button
                type="button"
                onClick={() => setTipoProducto('comercializado')}
                className={`relative z-10 flex-1 py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
                  tipoProducto === 'comercializado' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Comercializado
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Distribución *</label>
            <div className="relative flex rounded-xl bg-neu-base shadow-neu-inset p-1 w-full">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-primary-600 shadow transition-transform duration-300 ${
                  tipoDistribucion === 'MTS' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <button
                type="button"
                onClick={() => setTipoDistribucion('MTS')}
                className={`relative z-10 flex-1 py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
                  tipoDistribucion === 'MTS' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                MTS
              </button>
              <button
                type="button"
                onClick={() => setTipoDistribucion('MTO')}
                className={`relative z-10 flex-1 py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
                  tipoDistribucion === 'MTO' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                MTO
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 (Debajo del código): Nombre, Ref Cliente, Nombre Comercial */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nombre *</label>
            {checkingNombre && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          </div>
          <div className={`rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5 ${nombreDuplicado ? 'ring-1 ring-amber-400' : ''}`}>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          {nombreDuplicado && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span className="text-xs">Duplicado</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Ref. Cliente</label>
          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
            <input
              type="text"
              value={referenciaCliente}
              onChange={e => setReferenciaCliente(e.target.value)}
              placeholder="SKU-123"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Nombre Comercial</label>
          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
            <input
              type="text"
              value={nombreComercial}
              onChange={e => setNombreComercial(e.target.value)}
              placeholder="Premium, Ejecutivo"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Row 3: Color + Marca */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Color {autoColor && <span className="text-primary-500">Auto</span>}
          </label>
          <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
            <input
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="Color"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Marca</label>
          <select
            value={marcaSeleccionada}
            onChange={e => setMarcaSeleccionada(e.target.value)}
            className="w-full text-xs rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-[9px] text-foreground outline-none"
          >
            <option value="">— seleccionar —</option>
            {marcas.map(marca => (
              <option key={marca.id} value={marca.id}>
                {marca.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 4: Atributos grid (8 campos) */}
      <div className="grid grid-cols-4 gap-2">
        {TIPOS_ATRIBUTO.map(tipoAtributo => (
          <div key={tipoAtributo} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground block truncate">
              {LABELS_ATRIBUTO[tipoAtributo]}
            </label>
            <select
              value={atributosSeleccionados[tipoAtributo]}
              onChange={e =>
                setAtributosSeleccionados(prev => ({
                  ...prev,
                  [tipoAtributo]: e.target.value,
                }))
              }
              className="w-full text-xs rounded-lg bg-neu-base shadow-neu-inset px-2 py-1.5 text-foreground outline-none"
            >
              <option value="">—</option>
              {(atributos[tipoAtributo] ?? []).map(attr => (
                <option key={attr.id} value={attr.id}>
                  {attr.valor}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Row 5: Precios N1, N2, N3 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">N1 (COP)</label>
          <div className="relative rounded-lg bg-neu-base shadow-neu-inset">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={precioN1}
              onChange={e => setPrecioN1(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent pl-6 pr-2.5 py-1.5 text-sm text-foreground outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">N2 (COP)</label>
          <div className="relative rounded-lg bg-neu-base shadow-neu-inset">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={precioN2}
              onChange={e => setPrecioN2(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent pl-6 pr-2.5 py-1.5 text-sm text-foreground outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">N3 (COP)</label>
          <div className="relative rounded-lg bg-neu-base shadow-neu-inset">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={precioN3}
              onChange={e => setPrecioN3(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent pl-6 pr-2.5 py-1.5 text-sm text-foreground outline-none"
            />
          </div>
        </div>
      </div>

      {/* Row 6: Partida Arancelaria al final */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Partida Arancelaria</label>
        <div className="rounded-lg bg-neu-base shadow-neu-inset px-2.5 py-1.5">
          <input
            type="text"
            value={partidaArancelaria}
            onChange={e => setPartidaArancelaria(e.target.value)}
            placeholder="Ej: 6109.10.00.00"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2 rounded-lg bg-neu-base shadow-neu text-sm text-muted-foreground hover:text-foreground transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canAdvanceStep1 || pending}
          className="flex-1 py-2 rounded-lg bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear
        </button>
      </div>
    </form>
  )
}
