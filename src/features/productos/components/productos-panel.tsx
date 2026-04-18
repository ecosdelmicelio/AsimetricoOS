'use client'

import { useState, useTransition, useEffect, useCallback, useRef, startTransition } from 'react'
import { flushSync } from 'react-dom'
import { Plus, Edit2, Loader2, Package, Wrench, Trash2 } from 'lucide-react'
import { createProducto, updateProducto, toggleProductoActivo, deleteProducto } from '@/features/productos/services/producto-actions'
import { getAtributosPT, getAtributosProducto } from '@/features/productos/services/atributo-actions'
import { getBOMProducto } from '@/features/productos/services/bom-actions'
import { BOMEditor } from '@/features/productos/components/bom-editor'
import { CodigoPreviewPT } from '@/features/productos/components/codigo-preview-pt'
import type { Producto, TipoProducto, EstadoProducto, TipoDistribucion } from '@/features/productos/types'
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

  const handleEliminar = async (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto en desarrollo "${nombre}"? Esta acción no se puede deshacer.`)) {
      startTransition(async () => {
        const res = await deleteProducto(id)
        if (res.error) {
           alert(res.error)
        }
      })
    }
  }

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
        <div className="rounded-2xl bg-neu-base shadow-neu overflow-x-auto w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black/5 bg-neu-base">
                <th className="hidden lg:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 w-20">Creación</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 whitespace-nowrap">Código</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 min-w-[150px]">Descripción</th>
                <th className="hidden xl:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 w-20">Marca</th>
                <th className="hidden lg:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 w-24 whitespace-nowrap">Ref Cliente</th>
                <th className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-left px-3 py-2 w-24 whitespace-nowrap">Distribución</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right px-3 py-2 w-16">Stock</th>
                <th className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right px-3 py-2 w-28 whitespace-nowrap">Costo Unit.</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-right px-3 py-2 w-28 whitespace-nowrap">Valor Total</th>
                <th className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-center px-3 py-2 w-20">Estado</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visibles.map(p => {
                const saldo = saldoMap.get(p.id)
                return editingId === p.id
                  ? <tr key={p.id}><td colSpan={12} className="px-0 py-0">
                      <ProductForm
                        product={p}
                        marcas={marcas}
                        atributosPT={atributosPT}
                        catalogoMateriales={catalogoMateriales}
                        catalogoServicios={catalogoServicios}
                        onDone={() => setEditingId(null)}
                      />
                    </td></tr>
                  : <ProductRow 
                      key={p.id} 
                      product={p} 
                      onEdit={() => setEditingId(p.id)} 
                      onToggleActivo={async () => await toggleProductoActivo(p.id)} 
                      onDelete={() => handleEliminar(p.id, p.nombre)}
                      saldo={saldo} 
                      marcas={marcas} 
                    />
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ProductRow({ 
  product: p, 
  onEdit, 
  onToggleActivo, 
  onDelete,
  saldo, 
  marcas 
}: { 
  product: Producto; 
  onEdit: () => void; 
  onToggleActivo: () => void; 
  onDelete: () => void;
  saldo?: SaldoTotalPT; 
  marcas: MarcaConTercero[] 
}) {
  const brandName = marcas.find(m => m.id === p.marca_id)?.nombre || '—'

  return (
    <tr className={p.estado === 'inactivo' ? 'opacity-50' : ''}>
      <td className="hidden lg:table-cell px-3 py-2"><span className="text-xs text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}</span></td>
      <td className="px-3 py-2 whitespace-nowrap"><span className="font-mono text-xs font-semibold text-primary-700">{p.referencia}</span></td>
      <td className="px-3 py-2 min-w-[150px]">
        <div className="flex items-center gap-2">
          {p.tipo_producto === 'fabricado' ? (
            <Wrench className="w-3 h-3 text-primary-500 shrink-0" />
          ) : (
            <Package className="w-3 h-3 text-amber-500 shrink-0" />
          )}
          <p className="text-xs font-medium text-foreground truncate max-w-[150px] sm:max-w-[250px]">{p.nombre}</p>
        </div>
      </td>
      <td className="hidden xl:table-cell px-3 py-2"><span className="text-xs text-muted-foreground truncate">{brandName}</span></td>
      <td className="hidden lg:table-cell px-3 py-2 whitespace-nowrap"><span className="text-xs text-muted-foreground truncate">{p.referencia_cliente || '—'}</span></td>
      <td className="hidden sm:table-cell px-3 py-2 whitespace-nowrap">
        <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{
          backgroundColor: p.tipo_distribucion === 'MTO' ? '#fef3c7' : '#dbeafe',
          color: p.tipo_distribucion === 'MTO' ? '#92400e' : '#1e40af'
        }}>
          {p.tipo_distribucion === 'MTO' ? 'MTO' : 'MTS'}
        </span>
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap"><span className="text-xs font-mono text-foreground">{saldo?.saldo_total ?? 0}</span></td>
      <td className="hidden sm:table-cell px-3 py-2 text-right whitespace-nowrap">
        {(saldo?.saldo_total ?? 0) > 0 && (saldo?.costo_promedio ?? 0) > 0
          ? <span className="text-xs font-mono text-muted-foreground">$ {saldo!.costo_promedio!.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span>
          : <span className="text-xs text-muted-foreground/40">—</span>
        }
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {(saldo?.saldo_total ?? 0) > 0 && (saldo?.valor_total ?? 0) > 0
          ? <span className="text-xs font-mono text-foreground font-semibold">$ {saldo!.valor_total!.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
          : <span className="text-xs text-muted-foreground/40">—</span>
        }
      </td>

      <td className="px-3 py-2 text-center">
        <button
          onClick={p.estado !== 'en_desarrollo' ? onToggleActivo : undefined}
          disabled={p.estado === 'en_desarrollo'}
          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-lg transition-colors ${
            p.estado === 'activo' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
            p.estado === 'inactivo' ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' :
            'bg-blue-100 text-blue-700 cursor-default'
          }`}
        >
          {p.estado === 'activo' ? 'Activo' : p.estado === 'inactivo' ? 'Inactivo' : 'En desarrollo'}
        </button>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          {p.estado === 'en_desarrollo' && (
            <button
              onClick={onDelete}
              className="w-6 h-6 rounded-lg bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors ml-1"
              title="Eliminar producto"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
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
  const [tipoDistribucion, setTipoDistribucion] = useState<TipoDistribucion>(product?.tipo_distribucion ?? 'MTS')
  const [referenciaCliente, setReferenciaCliente] = useState(product?.referencia_cliente ?? '')
  const [marcaId, setMarcaId] = useState(product?.marca_id ?? '')
  const [estado, setEstado] = useState<EstadoProducto>(product?.estado ?? 'activo')
  const [color, setColor] = useState(product?.color ?? '')
  const [nombreComercial, setNombreComercial] = useState(product?.nombre_comercial ?? '')
  const [precioN1, setPrecioN1] = useState(product?.precio_base ? String(product.precio_base) : '')
  const [precioN2, setPrecioN2] = useState(product?.precio_estandar ? String(product.precio_estandar) : '')
  const [precioN3, setPrecioN3] = useState(product?.precio_n3 ? String(product.precio_n3) : '')
  const [partidaArancelaria, setPartidaArancelaria] = useState(product?.partida_arancelaria ?? '')
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
    setReferencia(codigo) // Sincronizar con el código generado
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
            tipo_distribucion: tipoDistribucion,
            referencia_cliente: referenciaCliente ? referenciaCliente : undefined,
            marca_id: marcaId ? marcaId : undefined,
            estado,
            color: color ? color : undefined,
            nombre_comercial: nombreComercial ? nombreComercial : undefined,
            precio_base: precioN1 ? parseFloat(precioN1) : undefined,
            precio_estandar: precioN2 ? parseFloat(precioN2) : undefined,
            precio_n3: precioN3 ? parseFloat(precioN3) : undefined,
            partida_arancelaria: partidaArancelaria.trim() || undefined,
            atributos: atributosSeleccionados,
          })
        : await createProducto({
            referencia,
            nombre,
            tipo_producto: tipo,
            tipo_distribucion: tipoDistribucion,
            referencia_cliente: referenciaCliente ? referenciaCliente : undefined,
            marca_id: marcaId ? marcaId : undefined,
            color: color ? color : undefined,
            nombre_comercial: nombreComercial ? nombreComercial : undefined,
            precio_base: precioN1 ? parseFloat(precioN1) : undefined,
            precio_estandar: precioN2 ? parseFloat(precioN2) : undefined,
            precio_n3: precioN3 ? parseFloat(precioN3) : undefined,
            partida_arancelaria: partidaArancelaria.trim() || undefined,
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
        <div className="space-y-4">
          {/* Top Row: Código Generado + Tipo y Distribución */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Código Generado - 2 columnas en desktop */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Código Generado *</label>
              {(() => {
                const atributosAgrupados: Record<TipoAtributo, AtributoPT[]> = {
                  tipo: [], fit: [], superior: [], inferior: [], capsula: [], diseno: [], color: [], genero: []
                }
                atributosPT.forEach(a => {
                  if (atributosAgrupados[a.tipo]) atributosAgrupados[a.tipo].push(a)
                })

                return (
                  <CodigoPreviewPT
                    atributos={atributosAgrupados}
                    seleccionados={atributosSeleccionados}
                    onCodigoChange={handleCodigoChange}
                    onNombreRecomendado={handleNombreRecomendado}
                  />
                )
              })()}
            </div>

            {/* Tipo y Distribución - 1 columna en desktop, lado derecho */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo *</label>
                <div className="relative flex rounded-xl bg-neu-base shadow-neu-inset p-1 w-full">
                  <div
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-primary-600 shadow transition-transform duration-300 ${
                      tipo === 'fabricado' ? 'translate-x-0' : 'translate-x-full'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isEdit}
                    onClick={() => setTipo('fabricado')}
                    className={`relative z-10 flex-1 py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
                      tipo === 'fabricado' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                    } ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Fabricado
                  </button>
                  <button
                    type="button"
                    disabled={isEdit}
                    onClick={() => setTipo('comercializado')}
                    className={`relative z-10 flex-1 py-1.5 text-[11px] font-semibold transition-colors duration-300 ${
                      tipo === 'comercializado' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                    } ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
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

          {/* Row 3: Color + Marca + Precios */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">N1 (COP)</label>
              <div className="relative rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <span className="text-muted-foreground text-xs mr-1">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={precioN1}
                  onChange={e => setPrecioN1(e.target.value)}
                  placeholder="0"
                  className="bg-transparent text-body-sm text-foreground outline-none w-20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">N2 (COP)</label>
              <div className="relative rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <span className="text-muted-foreground text-xs mr-1">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={precioN2}
                  onChange={e => setPrecioN2(e.target.value)}
                  placeholder="0"
                  className="bg-transparent text-body-sm text-foreground outline-none w-20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">N3 (COP)</label>
              <div className="relative rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <span className="text-muted-foreground text-xs mr-1">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={precioN3}
                  onChange={e => setPrecioN3(e.target.value)}
                  placeholder="0"
                  className="bg-transparent text-body-sm text-foreground outline-none w-20"
                />
              </div>
            </div>
          </div>

          {/* Atributos - creación y edición */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Atributos de Configuración</label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {TIPOS_ATRIBUTO.map(tipoAtributo => {
                const atributosDelTipo = atributosPT.filter(a => a.tipo === tipoAtributo)
                return (
                  <div key={tipoAtributo} className="space-y-0.5">
                    <label className="text-[10px] font-medium text-muted-foreground block truncate">
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

          {/* Row Final: Partida Arancelaria + Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Partida Arancelaria</label>
              <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                <input
                  value={partidaArancelaria}
                  onChange={e => setPartidaArancelaria(e.target.value)}
                  placeholder="Ej: 6109.10.00.00"
                  className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
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

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
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
