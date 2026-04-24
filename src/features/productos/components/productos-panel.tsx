'use client'

import { useState, useTransition, useEffect, useCallback, useRef, startTransition } from 'react'
import { flushSync } from 'react-dom'
import { Plus, Edit2, Loader2, Package, Wrench, Trash2 } from 'lucide-react'
import { cn, formatCurrency } from '@/shared/lib/utils'
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
import { Modal } from '@/shared/components/modal'
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
    <div className="space-y-6">
      {/* Header acciones Premium */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const ciclo: ('en_desarrollo' | 'activo' | 'inactivo')[] = ['en_desarrollo', 'activo', 'inactivo']
                const siguiente = ciclo[(ciclo.indexOf(filtroEstado) + 1) % ciclo.length]
                setFiltroEstado(siguiente)
              }}
              className="group relative flex items-center justify-center"
            >
              <div
                className={`w-14 h-6 rounded-full transition-all duration-300 border border-slate-200 ${
                  filtroEstado === 'en_desarrollo' ? 'bg-blue-500 border-blue-600' : filtroEstado === 'activo' ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-400 border-slate-500'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  filtroEstado === 'en_desarrollo' ? 'translate-x-1' : filtroEstado === 'activo' ? 'translate-x-5' : 'translate-x-9'
                }`} />
              </div>
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Vista de Catálogo</span>
              <span className={cn("text-xs font-black uppercase tracking-tight mt-1", 
                filtroEstado === 'en_desarrollo' ? 'text-blue-600' : filtroEstado === 'activo' ? 'text-emerald-600' : 'text-slate-500'
              )}>
                {filtroEstado === 'en_desarrollo' ? 'En Auditoría / I+D' : filtroEstado === 'activo' ? 'Referencias Activas' : 'Histórico Inactivo'}
              </span>
            </div>
          </div>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 border border-slate-800"
          >
            <Plus className="w-4 h-4" />
            Crear Producto
          </button>
        )}
      </div>

      {/* Modales Premium */}
      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)}
        title="Crear Nueva Referencia"
        size="xl"
      >
        <ProductForm
          marcas={marcas}
          atributosPT={atributosPT}
          catalogoMateriales={catalogoMateriales}
          catalogoServicios={catalogoServicios}
          onDone={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingId}
        onClose={() => setEditingId(null)}
        title={`Editando: ${productos.find(p => p.id === editingId)?.referencia}`}
        size="xl"
      >
        {editingId && (
          <ProductForm
            product={productos.find(p => p.id === editingId)}
            marcas={marcas}
            atributosPT={atributosPT}
            catalogoMateriales={catalogoMateriales}
            catalogoServicios={catalogoServicios}
            onDone={() => setEditingId(null)}
          />
        )}
      </Modal>

      {/* Lista vacía Premium */}
      {visibles.length === 0 && !showForm && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-24 flex flex-col items-center text-center max-w-2xl mx-auto mt-12 group">
          <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mb-8 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform duration-500">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-900 font-black text-2xl tracking-tighter uppercase">Sin Registros en Catálogo</p>
          <p className="text-slate-400 text-sm mt-3 max-w-sm font-medium leading-relaxed">
            No hay productos que coincidan con el filtro seleccionado. Comienza creando una referencia fabricada o comercializada.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-10 flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Plus className="w-5 h-5" />
            Crear Nueva Referencia
          </button>
        </div>
      )}

      {/* Tabla Premium */}
      {visibles.length > 0 && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden group">
          <div className="w-full overflow-hidden">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/20">
                  <th className="hidden lg:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-4 w-24">Registro</th>
                  <th className="hidden sm:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-4 w-32">Identificación</th>
                  <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-4">Descripción Producto</th>
                  <th className="hidden xl:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-4 w-28">Marca</th>
                  <th className="hidden md:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-4 w-24 text-center">Distrib.</th>
                  <th className="hidden lg:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-right px-4 py-4 w-24">Saldos</th>
                  <th className="hidden xl:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-right px-4 py-4 w-32">Valoración</th>
                  <th className="hidden sm:table-cell text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-4 py-4 w-24">Estatus</th>
                  <th className="px-4 py-4 w-16 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibles.map(p => {
                  const saldo = saldoMap.get(p.id)
                  return (
                    <ProductRow 
                      key={p.id} 
                      product={p} 
                      onEdit={() => setEditingId(p.id)} 
                      onToggleActivo={async () => await toggleProductoActivo(p.id)} 
                      onDelete={() => handleEliminar(p.id, p.nombre)}
                      saldo={saldo} 
                      marcas={marcas} 
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
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
  const brandName = marcas.find(m => m.id === p.marca_id)?.nombre || 'Interno'

  return (
    <tr className={cn('group/row transition-all hover:bg-slate-50/50', p.estado === 'inactivo' ? 'opacity-40 grayscale-[0.5]' : '')}>
      <td className="hidden lg:table-cell px-4 py-4">
        <span className="text-[10px] font-black text-slate-400 tabular-nums">
          {p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
        </span>
      </td>
      <td className="hidden sm:table-cell px-4 py-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-black text-slate-900 tracking-wider font-mono bg-slate-100 px-2 py-0.5 rounded-lg w-fit truncate block max-w-[100px]">
            {p.referencia}
          </span>
          {p.referencia_cliente && (
            <span className="text-[9px] font-black text-slate-400 mt-1 uppercase truncate max-w-[100px]">
              Ref: {p.referencia_cliente}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <button 
          onClick={onEdit}
          className="min-w-0 flex-1 text-left group/name hover:bg-slate-50 transition-all rounded-lg p-1 -m-1"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-black text-slate-900 truncate tracking-tight group-hover/name:text-primary-600">
              {p.nombre}
            </span>
            <span className="sm:hidden text-[9px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
              {p.referencia}
            </span>
          </div>
          {p.nombre_comercial && (
            <p className="text-[10px] font-black text-primary-600/70 border border-primary-100 bg-primary-50 px-1.5 py-0.5 rounded w-fit mt-1 uppercase tracking-widest truncate max-w-full">{p.nombre_comercial}</p>
          )}
        </button>
      </td>
      <td className="hidden xl:table-cell px-4 py-4">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{brandName}</span>
      </td>
      <td className="hidden md:table-cell px-4 py-4">
        <div className="flex justify-center">
          <div className={cn('px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest w-fit', 
            p.tipo_distribucion === 'MTO' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
          )}>
            {p.tipo_distribucion}
          </div>
        </div>
      </td>
      <td className="hidden lg:table-cell px-4 py-4 text-right">
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-900 tabular-nums">{saldo?.saldo_total ?? 0}</span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">unidades</span>
        </div>
      </td>
      <td className="hidden xl:table-cell px-4 py-4 text-right whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-900 tabular-nums">
            {formatCurrency(saldo?.valor_total ?? 0)}
          </span>
          {saldo?.costo_promedio && saldo.saldo_total > 0 && (
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
              CP: {formatCurrency(saldo.costo_promedio)}
            </span>
          )}
        </div>
      </td>

      <td className="hidden sm:table-cell px-4 py-4 text-center">
        <button
          onClick={p.estado !== 'en_desarrollo' ? onToggleActivo : undefined}
          disabled={p.estado === 'en_desarrollo'}
          className={cn('text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-xl border transition-all',
            p.estado === 'activo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' :
            p.estado === 'inactivo' ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200' :
            'bg-blue-50 text-blue-600 border-blue-100 cursor-default'
          )}
        >
          {p.estado === 'en_desarrollo' ? 'I+D' : p.estado === 'activo' ? 'Act.' : 'Inact.'}
        </button>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex justify-end gap-2 opacity-100 transition-all duration-300">
          <button
            onClick={onEdit}
            title="Editar producto"
            className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:shadow-md transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {p.estado === 'en_desarrollo' && (
            <button
              onClick={onDelete}
              title="Eliminar borrador"
              className="w-8 h-8 rounded-xl bg-white border border-rose-100 shadow-sm flex items-center justify-center text-rose-400 hover:text-rose-600 hover:border-rose-300 hover:shadow-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
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
    <form onSubmit={handleSubmit} className="space-y-8 p-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          {isEdit ? `Modificando Registro: ${product.referencia}` : 'Creación de Nueva Referencia'}
        </p>
        {isEdit && (
          <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", 
            estado === 'activo' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
          )}>
            {estado}
          </div>
        )}
      </div>

      {/* Tabs Premium */}
      {isEdit && (
        <div className="flex gap-2 rounded-[24px] bg-slate-50 p-1.5 border border-slate-100">
          <button
            type="button"
            onClick={() => setTab('detalles')}
            className={cn(
              "flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-[18px] transition-all",
              tab === 'detalles'
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
            )}
          >
            Detalles Técnicos
          </button>
          {tipo === 'fabricado' && (
            <button
              type="button"
              onClick={handleBomTabClick}
              className={cn(
                "flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-[18px] transition-all",
                tab === 'bom'
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              )}
            >
              Fórmula (BOM)
            </button>
          )}
        </div>
      )}

      {/* Tab: Detalles */}
      {tab === 'detalles' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* SECCIÓN 1: Identidad */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Referencia / Código *</label>
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

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo Producto *</label>
                  <div className="relative flex rounded-xl bg-slate-50 p-1 w-full border border-slate-100">
                    <div
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-slate-900 shadow transition-transform duration-300 ${
                        tipo === 'fabricado' ? 'translate-x-0' : 'translate-x-full'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setTipo('fabricado')}
                      className={`relative z-10 flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${
                        tipo === 'fabricado' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                      } ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Fabricado
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipo('comercializado')}
                      className={`relative z-10 flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${
                        tipo === 'comercializado' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                      } ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Comercial.
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Plan Distribución *</label>
                  <div className="relative flex rounded-xl bg-slate-50 p-1 w-full border border-slate-100">
                    <div
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-slate-900 shadow transition-transform duration-300 ${
                        tipoDistribucion === 'MTS' ? 'translate-x-0' : 'translate-x-full'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setTipoDistribucion('MTS')}
                      className={`relative z-10 flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${
                        tipoDistribucion === 'MTS' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      MTS (Stock)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoDistribucion('MTO')}
                      className={`relative z-10 flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${
                        tipoDistribucion === 'MTO' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      MTO (Orden)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Descripción y Comercial */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Descriptivo *</label>
                <input
                  value={nombre}
                  onChange={e => { nombreEditadoRef.current = true; setNombre(e.target.value) }}
                  required
                  placeholder="Ej: Camiseta algodón"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-slate-300 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Referencia Cliente (B2B)</label>
                <input
                  value={referenciaCliente}
                  onChange={e => setReferenciaCliente(e.target.value)}
                  placeholder="SKU-CLIENTE-123"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-slate-300 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Comercial</label>
                <input
                  value={nombreComercial}
                  onChange={e => setNombreComercial(e.target.value)}
                  placeholder="Ej: Premium, Ejecutivo"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-slate-300 transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Logística y Precios */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Color (Manual)</label>
                <input
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="Ej: Negro"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-slate-300 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Marca / Colección</label>
                <select
                  value={marcaId}
                  onChange={e => setMarcaId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-900 uppercase outline-none focus:bg-white focus:border-slate-300 transition-all cursor-pointer appearance-none"
                >
                  <option value="">— Selección —</option>
                  {marcas.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">N1 (P. Lista)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={precioN1}
                    onChange={e => setPrecioN1(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-6 pr-2 py-2 text-xs font-black text-slate-900 tabular-nums outline-none focus:bg-white focus:border-slate-300 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">N3 (Ex-Work)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={precioN3}
                    onChange={e => setPrecioN3(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-6 pr-2 py-2 text-xs font-black text-slate-900 tabular-nums outline-none focus:bg-white focus:border-slate-300 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Estatus Operativo</label>
                <select
                  value={estado}
                  onChange={e => setEstado(e.target.value as EstadoProducto)}
                  disabled={!isEdit || estado === 'inactivo'}
                  className={cn(
                    "w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-900 uppercase outline-none appearance-none transition-all",
                    (!isEdit || estado === 'inactivo') ? "opacity-50 cursor-not-allowed" : "focus:bg-white focus:border-slate-300 cursor-pointer"
                  )}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="en_desarrollo">I+D</option>
                </select>
              </div>
            </div>
          </div>

          {!isEdit && (
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-4 space-y-4">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Atributos de Ingeniería (Controlados por PLM)</label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {TIPOS_ATRIBUTO.map(tipoAtributo => {
                    const atributosDelTipo = atributosPT.filter(a => a.tipo === tipoAtributo)
                    return (
                      <div key={tipoAtributo} className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter block truncate px-1">
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
                          className="w-full text-[10px] font-black uppercase tracking-tighter rounded-xl bg-slate-50 border border-slate-100 px-2 py-1.5 text-slate-900 outline-none appearance-none hover:bg-white hover:border-slate-300 transition-all"
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
            </div>
          )}
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
          costoTotal={bomData.costoTotal}
          costoMateriales={bomData.costoMateriales}
          costoServicios={bomData.costoServicios}
          bomCompleto={bomCompletadoLocal}
          onBOMCompleted={() => setBomCompletadoLocal(true)}
          onBOMChanged={handleBOMChanged}
        />
      )}

      {/* FOOTER PREMIUM COMPACTO */}
      <div className="bg-slate-50/50 rounded-[24px] border border-slate-100 p-4 flex items-center justify-between mt-4">
        <div className="flex flex-col">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sincronización</p>
          <p className={cn("text-[10px] font-black uppercase tracking-tight", error ? "text-red-500" : "text-emerald-600")}>
            {error || "Datos Validados"}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDone}
            className="px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
          >
            Descartar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="px-8 py-2.5 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
          >
            {isEdit ? 'Actualizar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </form>
  )
}
