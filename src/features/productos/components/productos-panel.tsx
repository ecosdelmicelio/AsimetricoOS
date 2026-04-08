'use client'

import { useState, useTransition, useEffect, useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Plus, Edit2, Loader2, Package } from 'lucide-react'
import { createProducto, updateProducto, toggleProductoActivo } from '@/features/productos/services/producto-actions'
import { getAtributosPT, getAtributosProducto } from '@/features/productos/services/atributo-actions'
import { getBOMProducto } from '@/features/productos/services/bom-actions'
import { BOMEditor } from '@/features/productos/components/bom-editor'
import { CodigoPreviewPT } from '@/features/productos/components/codigo-preview-pt'
import type { Producto, TipoProducto, EstadoProducto } from '@/features/productos/types'
import type { AtributoPT, TipoAtributo } from '@/features/productos/types/atributos'
import { TIPOS_ATRIBUTO, LABELS_ATRIBUTO } from '@/features/productos/types/atributos'
import type { MarcaConTercero } from '@/features/configuracion/services/marcas-actions'
import type { Material, ServicioOperativo } from '@/features/productos/services/bom-actions'
import type { SaldoTotalPT } from '@/features/kardex/services/kardex-actions'

interface Props {
  productos: Producto[]
  marcas: MarcaConTercero[]
  atributosPT: AtributoPT[]
  saldosPorProducto: SaldoTotalPT[]
  catalogoMateriales: Material[]
  catalogoServicios: ServicioOperativo[]
}

export function ProductosPanel({ productos, marcas, atributosPT, saldosPorProducto, catalogoMateriales, catalogoServicios }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'en_desarrollo' | 'activo' | 'inactivo'>('activo')

  // Crear índice de saldos por producto_id para acceso O(1)
  const saldoMap = new Map(saldosPorProducto.map(s => [s.producto_id, s]))

  const visibles = productos.filter(p => p.estado === filtroEstado)

  return (
    <div className="space-y-4">
      {/* Header acciones */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const ciclo: ('en_desarrollo' | 'activo' | 'inactivo')[] = ['en_desarrollo', 'activo', 'inactivo']
            const siguiente = ciclo[(ciclo.indexOf(filtroEstado) + 1) % ciclo.length]
            setFiltroEstado(siguiente)
          }}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div
            className={`relative w-16 h-5 rounded-full transition-colors overflow-hidden ${
              filtroEstado === 'en_desarrollo' ? 'bg-blue-500' : filtroEstado === 'activo' ? 'bg-green-500' : 'bg-gray-400'
            }`}
          >
            <span className={`absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              filtroEstado === 'en_desarrollo' ? 'translate-x-0.5' : filtroEstado === 'activo' ? 'translate-x-5' : 'translate-x-10'
            }`} />
          </div>
          <span className="text-body-sm text-muted-foreground">
            {filtroEstado === 'en_desarrollo' ? 'En desarrollo' : filtroEstado === 'activo' ? 'Activos' : 'Inactivos'}
          </span>
        </button>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo producto
          </button>
        )}
      </div>

      {/* Form de creación */}
      {showForm && (
        <ProductForm
          marcas={marcas}
          atributosPT={atributosPT}
          catalogoMateriales={catalogoMateriales}
          catalogoServicios={catalogoServicios}
          onDone={() => setShowForm(false)}
        />
      )}

      {/* Lista vacía */}
      {visibles.length === 0 && !showForm && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-3">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Sin productos</p>
          <p className="text-body-sm text-muted-foreground mt-1">Crea tu primer producto para empezar</p>
        </div>
      )}

      {/* Tabla */}
      {visibles.length > 0 && (
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black/5 bg-neu-base">
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2">Creación</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2">Código</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2">Descripción</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2">Tipo</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2">Ref Cliente</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2">Marca</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right px-3 py-2">Stock</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right px-3 py-2">Costo Unit.</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right px-3 py-2">Costo Total</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-center px-3 py-2">Estado</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visibles.map(p => {
                const saldo = saldoMap.get(p.id)
                return editingId === p.id
                  ? <tr key={p.id}><td colSpan={11} className="px-0 py-0">
                      <ProductForm
                        product={p}
                        marcas={marcas}
                        atributosPT={atributosPT}
                        catalogoMateriales={catalogoMateriales}
                        catalogoServicios={catalogoServicios}
                        onDone={() => setEditingId(null)}
                      />
                    </td></tr>
                  : <ProductRow key={p.id} product={p} onEdit={() => setEditingId(p.id)} onToggleActivo={async () => {
                      await toggleProductoActivo(p.id)
                    }} saldo={saldo} />
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ProductRow({ product: p, onEdit, onToggleActivo, saldo }: { product: Producto; onEdit: () => void; onToggleActivo: () => void; saldo?: SaldoTotalPT }) {
  return (
    <tr className={p.estado === 'inactivo' ? 'opacity-50' : ''}>
      <td className="px-3 py-2"><span className="text-xs text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}</span></td>
      <td className="px-3 py-2"><span className="font-mono text-xs font-semibold text-primary-700">{p.referencia}</span></td>
      <td className="px-3 py-2"><p className="text-xs font-medium text-foreground line-clamp-2">{p.nombre}</p></td>
      <td className="px-3 py-2"><span className="text-xs text-foreground capitalize">{p.tipo_producto === 'fabricado' ? 'Fabricado' : 'Comercializado'}</span></td>
      <td className="px-3 py-2"><span className="text-xs text-muted-foreground truncate">{p.referencia_cliente || '—'}</span></td>
      <td className="px-3 py-2"><span className="text-xs text-muted-foreground truncate">{p.marca_id ? 'Con marca' : '—'}</span></td>
      <td className="px-3 py-2 text-right"><span className="text-xs font-mono text-foreground">{saldo?.saldo_total ?? 0}</span></td>
      <td className="px-3 py-2 text-right"><span className="text-xs font-mono text-muted-foreground">$ {(saldo?.costo_promedio ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span></td>
      <td className="px-3 py-2 text-right"><span className="text-xs font-mono text-foreground font-semibold">$ {(saldo?.valor_total ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span></td>
      <td className="px-3 py-2 text-center">
        <button
          onClick={onToggleActivo}
          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-lg transition-colors ${
            p.estado === 'activo' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
            p.estado === 'inactivo' ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' :
            'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {p.estado === 'activo' ? 'Activo' : p.estado === 'inactivo' ? 'Inactivo' : 'En desarrollo'}
        </button>
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={onEdit}
          className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </td>
    </tr>
  )
}

function ProductForm({
  product,
  marcas,
  atributosPT,
  catalogoMateriales,
  catalogoServicios,
  onDone,
}: {
  product?: Producto
  marcas: MarcaConTercero[]
  atributosPT: AtributoPT[]
  catalogoMateriales: Material[]
  catalogoServicios: ServicioOperativo[]
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [referencia, setReferencia] = useState(product?.referencia ?? '')
  const [nombre, setNombre] = useState(product?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoProducto>(product?.tipo_producto ?? 'fabricado')
  const [referenciaCliente, setReferenciaCliente] = useState(product?.referencia_cliente ?? '')
  const [marcaId, setMarcaId] = useState(product?.marca_id ?? '')
  const [estado, setEstado] = useState<EstadoProducto>(product?.estado ?? 'activo')
  const [color, setColor] = useState(product?.color ?? '')
  const [nombreComercial, setNombreComercial] = useState(product?.nombre_comercial ?? '')
  const [precioN1, setPrecioN1] = useState(product?.precio_base ? String(product.precio_base) : '')
  const [precioN2, setPrecioN2] = useState(product?.precio_estandar ? String(product.precio_estandar) : '')
  const [precioN3, setPrecioN3] = useState(product?.precio_n3 ? String(product.precio_n3) : '')
  const [tab, setTab] = useState<'detalles' | 'bom'>('detalles')
  const [bomData, setBomData] = useState<Awaited<ReturnType<typeof getBOMProducto>> | null>(null)
  const [bomLoading, setBomLoading] = useState(false)
  const [bomCompletadoLocal, setBomCompletadoLocal] = useState(product?.bom_completo ?? false)
  const [atributosSeleccionados, setAtributosSeleccionados] = useState<Record<TipoAtributo, string>>(() => {
    const defaultAttrs: Record<TipoAtributo, string> = {
      tipo: '', fit: '', superior: '', inferior: '', capsula: '', diseno: '', color: '', genero: ''
    }
    return defaultAttrs
  })
  const [codigoPT, setCodigoPT] = useState('')
  const [codigoCompleto, setCodigoCompleto] = useState(false)

  const nombreEditadoRef = useRef(false)

  // Callbacks para CodigoPreviewPT
  const handleCodigoChange = useCallback((codigo: string, completo: boolean) => {
    setCodigoPT(codigo)
    setCodigoCompleto(completo)
  }, [])

  const handleNombreRecomendado = useCallback((nombreRecomendado: string) => {
    if (nombreRecomendado.trim() && !nombreEditadoRef.current) {
      setNombre(nombreRecomendado)
    }
  }, [])

  // Cargar BOM cuando se abre el tab BOM
  const handleBomTabClick = async () => {
    if (!product || bomData) {
      setTab('bom')
      return
    }
    setBomLoading(true)
    const bom = await getBOMProducto(product.id)
    setBomData(bom)
    setBomLoading(false)
    setTab('bom')
  }

  // Recargar BOM después de cambios
  const handleBOMChanged = async () => {
    if (!product) return
    const bom = await getBOMProducto(product.id)
    flushSync(() => setBomData(bom))
  }

  const isEdit = !!product

  // Cargar atributos cuando se abre edición
  useEffect(() => {
    if (isEdit && product) {
      getAtributosProducto(product.id).then(attrs => {
        setAtributosSeleccionados(attrs)
      })
    }
  }, [product, isEdit])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!referencia.trim() || !nombre.trim()) {
      setError('Referencia y nombre son obligatorios')
      return
    }

    // Validar que no se pueda cambiar a activo sin BOM completo (productos fabricados)
    if (isEdit && product.tipo_producto === 'fabricado' && estado === 'activo' && product.estado !== 'activo') {
      // Verificar que el BOM esté cargado y marcado como completado
      const tieneItems = bomData && (bomData.materiales.length > 0 || bomData.servicios.length > 0)

      if (!tieneItems) {
        setError('Debes agregar materiales o servicios al BOM antes de activar el producto')
        return
      }

      if (!bomCompletadoLocal) {
        setError('Debes marcar el BOM como completado antes de activar el producto')
        return
      }
    }

    setError(null)
    startTransition(async () => {
      const res = isEdit
        ? await updateProducto(product.id, {
            referencia,
            nombre,
            tipo_producto: tipo,
            referencia_cliente: referenciaCliente ? referenciaCliente : null,
            marca_id: marcaId ? marcaId : null,
            estado,
            color: color ? color : undefined,
            nombre_comercial: nombreComercial ? nombreComercial : null,
            precio_base: precioN1 ? parseFloat(precioN1) : null,
            precio_estandar: precioN2 ? parseFloat(precioN2) : null,
            precio_n3: precioN3 ? parseFloat(precioN3) : null,
            atributos: atributosSeleccionados,
          })
        : await createProducto({
            referencia,
            nombre,
            tipo_producto: tipo,
            referencia_cliente: referenciaCliente ? referenciaCliente : null,
            marca_id: marcaId ? marcaId : null,
            color: color ? color : undefined,
            nombre_comercial: nombreComercial ? nombreComercial : null,
            precio_base: precioN1 ? parseFloat(precioN1) : null,
            precio_estandar: precioN2 ? parseFloat(precioN2) : null,
            precio_n3: precioN3 ? parseFloat(precioN3) : null,
            atributos: atributosSeleccionados,
          })

      if ('error' in res && res.error) {
        setError(res.error)
        return
      }
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 bg-neu-base shadow-neu-inset rounded-xl mx-3 my-2 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {isEdit ? `Editando ${product.referencia}` : 'Nuevo producto'}
      </p>

      {/* Tabs */}
      {isEdit && (
        <div className="flex gap-1 rounded-lg bg-neu-base shadow-neu-inset p-1">
          <button
            type="button"
            onClick={() => setTab('detalles')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${
              tab === 'detalles'
                ? 'bg-neu-base shadow-neu text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Detalles
          </button>
          {tipo === 'fabricado' && (
            <button
              type="button"
              onClick={handleBomTabClick}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${
                tab === 'bom'
                  ? 'bg-neu-base shadow-neu text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              BOM
            </button>
          )}
        </div>
      )}

      {/* Tab: Detalles */}
      {tab === 'detalles' && (
        <div className="space-y-3">
          {/* Row: Referencia + Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Referencia *</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <input
                  value={referencia}
                  onChange={e => setReferencia(e.target.value.toUpperCase())}
                  required
                  placeholder="PT-001"
                  className="w-full bg-transparent text-body-sm font-mono text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo *</label>
              <div className="flex gap-2">
                {(['fabricado', 'comercializado'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    disabled={isEdit}
                    className={`flex-1 px-2 py-1.5 text-xs rounded-lg transition-all ${
                      tipo === t
                        ? 'bg-primary-600 text-white font-semibold'
                        : 'bg-neu-base text-muted-foreground hover:bg-neu-base/80'
                    } ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {t === 'fabricado' ? 'Fabricado' : 'Comercializado'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row: Nombre + Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Nombre *</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <input
                  value={nombre}
                  onChange={e => { nombreEditadoRef.current = true; setNombre(e.target.value) }}
                  required
                  placeholder="Camiseta algodón"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Color</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <input
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="Negro"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Row: Precios N1, N2, N3 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">N1 (COP)</label>
              <div className="relative rounded-lg bg-neu-base shadow-neu">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={precioN1}
                  onChange={e => setPrecioN1(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent pl-6 pr-2.5 py-2 text-body-sm text-foreground outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">N2 (COP)</label>
              <div className="relative rounded-lg bg-neu-base shadow-neu">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={precioN2}
                  onChange={e => setPrecioN2(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent pl-6 pr-2.5 py-2 text-body-sm text-foreground outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">N3 (COP)</label>
              <div className="relative rounded-lg bg-neu-base shadow-neu">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={precioN3}
                  onChange={e => setPrecioN3(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent pl-6 pr-2.5 py-2 text-body-sm text-foreground outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row: Ref Cliente + Nombre Comercial */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ref Cliente</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <input
                  value={referenciaCliente}
                  onChange={e => setReferenciaCliente(e.target.value)}
                  placeholder="SKU-CLIENTE-123"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nombre Comercial</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <input
                  value={nombreComercial}
                  onChange={e => setNombreComercial(e.target.value)}
                  placeholder="Premium, Ejecutivo"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Row: Marca + Estado (si edición) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Marca</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <select
                  value={marcaId}
                  onChange={e => setMarcaId(e.target.value)}
                  className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                >
                  <option value="">—</option>
                  {marcas.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {isEdit && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                  <select
                    value={estado}
                    onChange={e => setEstado(e.target.value as EstadoProducto)}
                    disabled={estado === 'inactivo'}
                    className={`w-full bg-transparent text-body-sm text-foreground outline-none appearance-none ${estado === 'inactivo' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {estado === 'inactivo' ? (
                      <option value="activo">Activo</option>
                    ) : (
                      <>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                        <option value="en_desarrollo">En desarrollo</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Atributos - creación y edición */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Atributos</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_ATRIBUTO.map(tipoAtributo => {
                const atributosDelTipo = atributosPT.filter(a => a.tipo === tipoAtributo)
                return (
                  <div key={tipoAtributo} className="space-y-0.5">
                    <label className="text-xs font-medium text-muted-foreground block truncate">
                      {LABELS_ATRIBUTO[tipoAtributo]}
                    </label>
                    <select
                      value={atributosSeleccionados[tipoAtributo] ?? ''}
                      onChange={e =>
                        setAtributosSeleccionados(prev => ({
                          ...prev,
                          [tipoAtributo]: e.target.value,
                        }))
                      }
                      className="w-full text-xs rounded-lg bg-neu-base shadow-neu-inset px-2 py-1.5 text-foreground outline-none appearance-none"
                    >
                      <option value="">—</option>
                      {atributosDelTipo.map(attr => (
                        <option key={attr.id} value={attr.id}>
                          {attr.valor}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Código inteligente - en creación y edición */}
          <CodigoPreviewPT
            atributos={atributosPT}
            generoId={atributosSeleccionados.genero || null}
            tipoId={atributosSeleccionados.tipo || null}
            fitId={atributosSeleccionados.fit || null}
            colorId={atributosSeleccionados.color || null}
            disenoId={atributosSeleccionados.diseno || null}
            onCodigoChange={handleCodigoChange}
            onNombreRecomendado={handleNombreRecomendado}
          />

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}

      {/* Tab: BOM */}
      {tab === 'bom' && isEdit && bomLoading && (
        <div className="text-center py-6 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Cargando BOM...</span>
        </div>
      )}
      {tab === 'bom' && isEdit && bomData && !bomLoading && (
        <BOMEditor
          productoId={product.id}
          materiales={bomData.materiales}
          servicios={bomData.servicios}
          catalogoMateriales={catalogoMateriales}
          catalogoServicios={catalogoServicios}
          precioBase={product.precio_base}
          costoTotal={bomData.costo_total}
          costoMateriales={bomData.costo_materiales}
          costoServicios={bomData.costo_servicios}
          bomCompleto={bomCompletadoLocal}
          onBOMCompleted={() => setBomCompletadoLocal(true)}
          onBOMChanged={handleBOMChanged}
        />
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onDone}
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
          {isEdit ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}
