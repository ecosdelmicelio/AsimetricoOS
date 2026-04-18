'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit2, Loader2, AlertTriangle, Star, Users, Tag, X, MapPin, Phone, Mail, UserCircle2, ShieldCheck, TrendingUp, Info } from 'lucide-react'
import { createTercero, updateTercero, getSugerenciaNivel } from '@/features/terceros/services/terceros-actions'
import { createMarca, updateMarca } from '@/features/configuracion/services/marcas-actions'
import type { MarcaConTercero } from '@/features/configuracion/services/marcas-actions'
import { createTerceroDireccion, updateTerceroDireccion } from '@/features/terceros/services/tercero-direcciones-actions'
import type { TerceroDireccion } from '@/features/terceros/services/tercero-direcciones-actions'
import { createTerceroContacto, updateTerceroContacto } from '@/features/terceros/services/tercero-contactos-actions'
import type { TerceroContacto } from '@/features/terceros/services/tercero-contactos-actions'
import type { CategoriaContacto } from '@/features/terceros/services/tercero-contactos-constants'
import { CATEGORIA_LABEL, CATEGORIA_COLOR } from '@/features/terceros/services/tercero-contactos-constants'
import { useDuplicateCheck } from '@/shared/hooks/use-duplicate-check'
import { useEffect } from 'react' // Added useEffect
import type { Tercero, TipoTercero, EstadoTercero, NivelCliente } from '@/features/terceros/types'
import {
  TIPO_LABEL,
  TIPO_COLOR,
  ESTADO_CONFIG,
} from '@/features/terceros/types'

const TIPOS: TipoTercero[] = ['cliente', 'satelite', 'proveedor_mp']
const FILTER_TABS: { id: TipoTercero | 'todos'; label: string }[] = [
  { id: 'todos',       label: 'Todos' },
  { id: 'cliente',     label: 'Clientes' },
  { id: 'satelite',    label: 'Satélites' },
  { id: 'proveedor_mp', label: 'Proveedores' },
]

interface Props {
  terceros:   Tercero[]
  marcas:     MarcaConTercero[]
  direcciones: TerceroDireccion[]
  contactos:  TerceroContacto[]
  bodegas:    Array<{ id: string; nombre: string }>
}

export function TercerosPanel({ terceros, marcas, direcciones, contactos, bodegas }: Props) {
  const [filter, setFilter]   = useState<TipoTercero | 'todos'>('todos')
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const visibles = filter === 'todos'
    ? terceros
    : terceros.filter(t => t.tipos.includes(filter))

  return (
    <div className="space-y-4">
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Filtro por tipo - Premium Segmented Control */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white/50 p-2 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex gap-1 flex-wrap p-1 bg-slate-100/50 rounded-[24px]">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === tab.id
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {tab.label}
              {tab.id !== 'todos' && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[8px] ${filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {terceros.filter(t => t.tipos.includes(tab.id as TipoTercero)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null) }}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
          >
            <Plus className="w-4 h-4" />
            Vincular Nuevo Tercero
          </button>
        )}
      </div>

      {/* Form creación */}
      {showForm && (
        <TerceroForm onDone={() => setShowForm(false)} marcas={[]} dirs={[]} contactos={[]} bodegas={bodegas} />
      )}

      {/* Lista vacía - Premium View */}
      {visibles.length === 0 && !showForm && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-24 flex flex-col items-center text-center max-w-2xl mx-auto mt-12 group">
          <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mb-8 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform duration-500">
            <Users className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-900 font-black text-2xl tracking-tighter uppercase">Sin Conexiones Activas</p>
          <p className="text-slate-400 text-sm mt-3 max-w-sm font-medium leading-relaxed">
            {filter === 'todos' 
              ? 'Tu ecosistema de proveedores, clientes y talleres está esperando. Comienza a vincular los pilares de tu cadena de suministro.' 
              : `Aún no has registrado ningún ${FILTER_TABS.find(t => t.id === filter)?.label.toLowerCase()} en la plataforma.`}
          </p>
          <button
            onClick={() => { setShowForm(true); setEditingId(null) }}
            className="mt-10 flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Plus className="w-5 h-5" />
            Crear Primer Tercero
          </button>
        </div>
      )}

      {/* Lista Grid */}
      {visibles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visibles.map(t => {
            const terceroMarcas    = marcas.filter(m => m.tercero_id === t.id)
            const terceroDirs      = direcciones.filter(d => d.tercero_id === t.id)
            const terceroContactos = contactos.filter(c => c.tercero_id === t.id)
            return (
              <div key={t.id} className="min-w-0">
                {editingId === t.id
                  ? <TerceroForm tercero={t} marcas={terceroMarcas} dirs={terceroDirs} contactos={terceroContactos} bodegas={bodegas} onDone={() => setEditingId(null)} />
                  : <TerceroRow tercero={t} marcas={terceroMarcas} dirs={terceroDirs} contactos={terceroContactos} onEdit={() => { setEditingId(t.id); setShowForm(false) }} />
                }
              </div>
            )
          })}
        </div>
      )}
    </div>
  </div>
  )
}

/* ─── Row ─── */
function TerceroRow({ tercero: t, marcas, dirs, contactos, onEdit }: { tercero: Tercero; marcas: MarcaConTercero[]; dirs: TerceroDireccion[]; contactos: TerceroContacto[]; onEdit: () => void }) {
  const cfg = ESTADO_CONFIG[t.estado] ?? ESTADO_CONFIG.activo
  const activeMarcas    = marcas.filter(m => m.activo)
  const activeDirs      = dirs.filter(d => d.activa)
  const activeContactos = contactos.filter(c => c.activo)
  
  return (
    <div className="group h-full bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-500 flex flex-col relative overflow-hidden">
      {/* Background Accent Deco */}
      <div className="absolute -right-8 -top-8 w-40 h-40 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
      
      {/* Header Info */}
      <div className="relative mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5 flex-wrap">
            {t.tipos.map(tipo => (
              <span key={tipo} className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border ${TIPO_COLOR[tipo]}`}>
                {TIPO_LABEL[tipo]}
              </span>
            ))}
          </div>
          <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${cfg.className}`}>
            {cfg.label}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 text-xl tracking-tighter uppercase leading-none truncate group-hover:text-primary-600 transition-colors">
              {t.nombre}
            </h3>
            {t.nit && (
              <p className="text-[10px] font-mono font-black text-slate-400 mt-2 uppercase tracking-widest">
                Tax ID: {t.nit}
              </p>
            )}
          </div>
          <button
            onClick={onEdit}
            className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-slate-900 hover:border-slate-200 hover:shadow-sm transition-all shrink-0"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Stats / Contacts - DISPLAY ALL INFO COMPACTED */}
      <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> Comunicación
          </p>
          <p className="text-[11px] font-black text-slate-700 truncate">{t.telefono || 'Sin Teléfono'}</p>
          <p className="text-[9px] font-black text-slate-400 truncate mt-1">{t.email || 'Sin Email'}</p>
        </div>
        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" /> Perfil Comercial
          </p>
          <p className="text-[11px] font-black text-slate-700">
            {t.tipos.includes('cliente') ? `Nivel ${t.nivel_cliente || 'N1'}` : 'Vínculo Op'}
          </p>
          <p className="text-[9px] font-black text-slate-400 mt-1">
            {t.tipos.includes('cliente') ? `${t.plazo_pago_dias || 30}d Plazo` : 'Términos Std'}
          </p>
        </div>
      </div>

      {/* Specific Infos (Satelite/Proveedor) */}
      {(t.tipos.includes('satelite') || t.tipos.includes('proveedor_mp')) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {t.tipos.includes('satelite') && t.capacidad_diaria != null && (
             <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[9px] font-black text-violet-700 uppercase tracking-widest">Cap: {t.capacidad_diaria} u/d</span>
             </div>
          )}
          {t.tipos.includes('proveedor_mp') && t.calificacion != null && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
               <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
               <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Rate {t.calificacion}/5</span>
            </div>
          )}
          {t.tipos.includes('proveedor_mp') && t.porcentaje_anticipo != null && (
            <div className={`bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 flex items-center gap-2 ${t.porcentaje_anticipo === 0 ? 'opacity-50' : ''}`}>
               <Info className="w-3.5 h-3.5 text-emerald-500" />
               <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Ant: {t.porcentaje_anticipo}%</span>
            </div>
          )}
        </div>
      )}

      {/* Relationships Footer */}
      <div className="mt-auto pt-6 border-t border-slate-50 flex flex-col gap-3">
        {/* Marcas */}
        {activeMarcas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeMarcas.map(m => (
              <span key={m.id} className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                <Tag className="w-3 h-3" />
                {m.nombre}
              </span>
            ))}
          </div>
        )}

        {/* Direcciones / Contactos Counters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
              {activeDirs.length === 0 ? 'Sin Direcciones' : activeDirs.length === 1 ? '1 Punto Entrega' : `${activeDirs.length} Puntos Entrega`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <UserCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
              {activeContactos.length === 0 ? 'Sin Contactos' : activeContactos.length === 1 ? '1 Línea Directa' : `${activeContactos.length} Líneas Directas`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Form ─── */
function TerceroForm({ tercero, marcas = [], dirs = [], contactos = [], bodegas = [], onDone }: { tercero?: Tercero; marcas?: MarcaConTercero[]; dirs?: TerceroDireccion[]; contactos?: TerceroContacto[]; bodegas?: Array<{ id: string; nombre: string }>; onDone: () => void }) {
  const isEdit = !!tercero
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Campos básicos
  const [nombre, setNombre]   = useState(tercero?.nombre ?? '')
  const [nit, setNit]         = useState(tercero?.nit ?? '')
  const [tipos, setTipos]     = useState<TipoTercero[]>(tercero?.tipos ?? ['cliente'])
  const [estado, setEstado]   = useState<EstadoTercero>(tercero?.estado ?? 'activo')
  const [email, setEmail]     = useState(tercero?.email ?? '')
  const [emailFact, setEmailFact] = useState(tercero?.email_facturacion ?? '')
  const [telefono, setTelefono] = useState(tercero?.telefono ?? '')
  const [direccion, setDireccion] = useState(tercero?.direccion ?? '')
  const [nivelCliente, setNivelCliente] = useState<NivelCliente>(tercero?.nivel_cliente ?? 'N1')
  const [plazoPago, setPlazoPago]       = useState(tercero?.plazo_pago_dias?.toString() ?? '30')
  const [sugerencia, setSugerencia]     = useState<{ sugerencia: NivelCliente; unidades_anuales: number } | null>(null)

  // Satélites
  const [capDiaria, setCapDiaria] = useState(tercero?.capacidad_diaria?.toString() ?? '')
  const [leadTime, setLeadTime]   = useState(tercero?.lead_time_dias?.toString() ?? '')
  const [valorRef, setValorRef]   = useState(tercero?.valor_servicio_ref?.toString() ?? '')
  const [bodegaTallerId, setBodegaTallerId] = useState(tercero?.bodega_taller_id ?? '')

  // Proveedores
  const [anticipo, setAnticipo]   = useState(tercero?.porcentaje_anticipo?.toString() ?? '')
  const [calificacion, setCalificacion] = useState(tercero?.calificacion ?? 0)
  const [descuento, setDescuento] = useState(tercero?.descuento_pago_anticipado?.toString() ?? '')

  const esCliente    = tipos.includes('cliente')
  const esSatelite   = tipos.includes('satelite')
  const esProveedor  = tipos.includes('proveedor_mp')

  useEffect(() => {
    if (isEdit && esCliente) {
      getSugerenciaNivel(tercero.id).then(setSugerencia)
    }
  }, [tercero?.id, esCliente, isEdit])

  const { isDuplicate: nombreDuplicado, checking: checkingNombre } = useDuplicateCheck({
    table: 'terceros',
    field: 'nombre',
    value: nombre,
    excludeId: tercero?.id,
    enabled: nombre.trim().length > 2,
  })

  function toggleTipo(t: TipoTercero) {
    setTipos(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (tipos.length === 0) { setError('Selecciona al menos un tipo'); return }
    setError(null)

    const input = {
      nombre:                    nombre.trim(),
      tipos,
      nit:                       nit.trim() || undefined,
      email:                     email.trim() || undefined,
      email_facturacion:         emailFact.trim() || undefined,
      telefono:                  telefono.trim() || undefined,
      direccion:                 direccion.trim() || undefined,
      estado,
      capacidad_diaria:          esSatelite && capDiaria ? parseInt(capDiaria) : undefined,
      lead_time_dias:            esSatelite && leadTime ? parseInt(leadTime) : undefined,
      valor_servicio_ref:        esSatelite && valorRef ? parseFloat(valorRef) : undefined,
      porcentaje_anticipo:       esProveedor && anticipo ? parseFloat(anticipo) : undefined,
      calificacion:              esProveedor && calificacion > 0 ? calificacion : undefined,
      descuento_pago_anticipado: esProveedor && descuento ? parseFloat(descuento) : undefined,
      bodega_taller_id:          bodegaTallerId || undefined,
      nivel_cliente:             esCliente ? nivelCliente : undefined,
      plazo_pago_dias:           esCliente ? parseInt(plazoPago) : undefined,
    }

    startTransition(async () => {
      const res = isEdit
        ? await updateTercero(tercero.id, input)
        : await createTercero(input)
      if (res.error) { setError(res.error); return }
      onDone()
    })
  }

  return (
    <div className="md:col-span-2 xl:col-span-3 bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
      <div className="bg-slate-900 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <UserCircle2 className="w-6 h-6 text-white" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Módulo de Vinculación</p>
              <h2 className="text-white font-black text-lg tracking-tight uppercase">{isEdit ? `Editando: ${tercero.nombre}` : 'Registro de Nuevo Tercero'}</h2>
           </div>
        </div>
        <button onClick={onDone} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all">
           <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-10">
        {/* SECCIÓN 1: IDENTIDAD Y TIPO */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-1 h-4 bg-primary-500 rounded-full" />
             <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">1. Identidad Estratégica</h3>
          </div>
          
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Roles en la Cadena de Suministro *</label>
            <div className="flex gap-2 flex-wrap">
              {TIPOS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTipo(t)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    tipos.includes(t)
                      ? `bg-slate-900 text-white border-slate-900 shadow-lg`
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Razón Social / Nombre Comercial *</label>
                {checkingNombre && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" />}
              </div>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                placeholder="Ej: Textiles del Futuro S.A.S."
                className={`w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 uppercase tracking-tight focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all ${nombreDuplicado ? 'border-amber-400 bg-amber-50' : ''}`}
              />
              {nombreDuplicado && (
                <div className="flex items-center gap-2 mt-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Advertencia: Este nombre ya está en uso</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">NIT / Documento</label>
              <input
                value={nit}
                onChange={e => setNit(e.target.value)}
                placeholder="900.000.000-0"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Estado Activo</label>
              <div className="flex gap-2">
                {(Object.entries(ESTADO_CONFIG) as [EstadoTercero, typeof ESTADO_CONFIG[EstadoTercero]][]).map(([val, cfg]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEstado(val)}
                    className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                      estado === val ? `bg-slate-900 text-white border-slate-900 shadow-md` : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: CONTACTO Y UBICACIÓN */}
        <div className="space-y-6 pt-8 border-t border-slate-100">
          <div className="flex items-center gap-3">
             <div className="w-1 h-4 bg-indigo-500 rounded-full" />
             <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">2. Canal de Comunicación</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Teléfono Principal</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Dirección Principal</label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={direccion}
                    onChange={e => setDireccion(e.target.value)}
                    placeholder="Calle 00 # 00-00, Oficina 000"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Email Comercial</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contacto@empresa.com"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Email Facturación</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={emailFact}
                    onChange={e => setEmailFact(e.target.value)}
                    placeholder="facturacion@empresa.com"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: PERFILES ESPECIALIZADOS */}
        {(esCliente || esSatelite || esProveedor) && (
          <div className="space-y-8 pt-8 border-t border-slate-100">
             <div className="flex items-center gap-3">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">3. Configuración por Rol</h3>
             </div>

             <div className="grid grid-cols-1 gap-6">
                {/* Panel CLIENTE */}
                {esCliente && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-[32px] p-6 space-y-6">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                       <TrendingUp className="w-4 h-4" /> Clasificación Financiera de Cliente
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nivel / Tier</label>
                          {sugerencia && (
                            <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg uppercase">
                              Sugerido: {sugerencia.sugerencia}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {(['N1', 'N2', 'N3'] as NivelCliente[]).map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setNivelCliente(n)}
                              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black border transition-all ${
                                nivelCliente === n ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-blue-200 text-blue-400 hover:border-blue-400'
                              }`}
                            >
                              Nivel {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Días de Plazo de Pago</label>
                        <div className="bg-white border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                           <input
                             type="number"
                             value={plazoPago}
                             onChange={e => setPlazoPago(e.target.value)}
                             className="w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                             placeholder="30"
                           />
                           <span className="text-[10px] font-black text-blue-300 uppercase">Días</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Panel SATÉLITE */}
                {esSatelite && (
                  <div className="bg-violet-50/50 border border-violet-100 rounded-[32px] p-6 space-y-6">
                    <p className="text-[10px] font-black text-violet-700 uppercase tracking-widest flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4" /> Especificaciones de Producción Satélite
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Capacidad Diaria (uds)</label>
                        <input
                          type="number" min={0}
                          value={capDiaria}
                          onChange={e => setCapDiaria(e.target.value)}
                          placeholder="120"
                          className="w-full bg-white border border-violet-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Lead Time (días)</label>
                        <input
                          type="number" min={0}
                          value={leadTime}
                          onChange={e => setLeadTime(e.target.value)}
                          placeholder="3"
                          className="w-full bg-white border border-violet-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Valor Ref. Confección</label>
                        <div className="bg-white border border-violet-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                           <span className="text-slate-400 text-xs">$</span>
                           <input
                             type="number" min={0}
                             value={valorRef}
                             onChange={e => setValorRef(e.target.value)}
                             placeholder="15000"
                             className="w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                           />
                        </div>
                      </div>
                      <div className="md:col-span-3 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Bodega de Taller Asignada</label>
                        <select
                          value={bodegaTallerId}
                          onChange={e => setBodegaTallerId(e.target.value)}
                          className="w-full bg-white border border-violet-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none"
                        >
                          <option value="">— Ninguna (Materiales no se trackean en este taller) —</option>
                          {bodegas.map(b => (
                            <option key={b.id} value={b.id}>{b.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Panel PROVEEDOR MP */}
                {esProveedor && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-[32px] p-6 space-y-6">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                       <Tag className="w-4 h-4" /> Condiciones de Proveedor de Materiales
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Calificación Interna</label>
                        <div className="flex gap-2 items-center bg-white border border-emerald-100 h-11 px-4 rounded-xl">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setCalificacion(calificacion === n ? 0 : n)}
                              className="transition-transform hover:scale-125"
                            >
                              <Star className={`w-4 h-4 ${n <= calificacion ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">% Anticipo Mandatorio</label>
                        <div className="bg-white border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                           <input
                             type="number" min={0} max={100}
                             value={anticipo}
                             onChange={e => setAnticipo(e.target.value)}
                             className="w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                             placeholder="50"
                           />
                           <span className="text-[10px] font-black text-emerald-300">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">% Dto. Pago Anticipado</label>
                        <div className="bg-white border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                           <input
                             type="number" min={0}
                             value={descuento}
                             onChange={e => setDescuento(e.target.value)}
                             className="w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                             placeholder="5"
                           />
                           <span className="text-[10px] font-black text-emerald-300">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* SECCIÓN 4: RELACIONES DINÁMICAS (Solo en Edición) */}
        {isEdit && (
          <div className="space-y-8 pt-8 border-t border-slate-100 overflow-visible">
            <div className="flex items-center gap-3">
               <div className="w-1 h-4 bg-slate-900 rounded-full" />
               <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">4. Ecosistema de Datos</h3>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               <MarcasInlineSection terceroId={tercero.id} initialMarcas={marcas} />
               <ContactosInlineSection terceroId={tercero.id} initialContactos={contactos} />
               <div className="xl:col-span-2">
                 <DireccionesInlineSection terceroId={tercero.id} initialDirs={dirs} />
               </div>
            </div>
          </div>
        )}

        {/* ERROR FEEDBACK */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-[20px] flex items-center gap-3 text-red-600">
             <AlertTriangle className="w-5 h-5 shrink-0" />
             <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed">{error}</p>
          </div>
        )}

        {/* FOOTER ACCIONES */}
        <div className="pt-8 border-t border-slate-100 flex justify-end gap-3 sticky bottom-4">
          <button
            type="button"
            onClick={onDone}
            className="px-8 py-3 rounded-2xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Descartar Cambios
          </button>
          <button
            type="submit"
            disabled={pending || tipos.length === 0}
            className="flex items-center gap-2 px-10 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Sincronizar Maestro' : 'Crear Registro Maestro'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Marcas inline (solo en edición) ─── */
function MarcasInlineSection({
  terceroId,
  initialMarcas,
}: {
  terceroId: string
  initialMarcas: MarcaConTercero[]
}) {
  const [marcas, setMarcas]   = useState<MarcaConTercero[]>(initialMarcas)
  const [newNombre, setNewNombre] = useState('')
  const [addError, setAddError]  = useState<string | null>(null)
  const [adding, startAdd]       = useTransition()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function handleAdd() {
    const nombre = newNombre.trim()
    if (!nombre) return
    setAddError(null)
    startAdd(async () => {
      const res = await createMarca({ nombre, tercero_id: terceroId })
      if (res.error) { setAddError(res.error); return }
      if (res.data) {
        setMarcas(prev => [...prev, res.data!])
        setNewNombre('')
      }
    })
  }

  function handleToggle(marca: MarcaConTercero) {
    setTogglingId(marca.id)
    updateMarca(marca.id, { activo: !marca.activo }).then(res => {
      if (!res.error) {
        setMarcas(prev => prev.map(m => m.id === marca.id ? { ...m, activo: !m.activo } : m))
      }
      setTogglingId(null)
    })
  }

  const activas   = marcas.filter(m => m.activo)
  const inactivas = marcas.filter(m => !m.activo)

  return (
    <div className="space-y-6 rounded-[32px] bg-blue-50/50 border border-blue-100 p-6">
      <div className="flex items-center justify-between">
         <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
            <Tag className="w-4 h-4" /> Portafolio de Marcas
         </p>
         <div className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
            {activas.length} Activas
         </div>
      </div>

      {/* Chips Area */}
      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {activas.map(m => (
          <span key={m.id} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-sm group/badge">
            {m.nombre}
            <button
              type="button"
              onClick={() => handleToggle(m)}
              disabled={togglingId === m.id}
              className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-all disabled:opacity-40"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {activas.length === 0 && (
          <p className="text-xs font-black text-blue-400/50 uppercase italic tracking-widest">Sin marcas registradas</p>
        )}
      </div>

      {/* Inactivas Area */}
      {inactivas.length > 0 && (
        <div className="pt-4 border-t border-blue-100 flex flex-wrap gap-2">
          {inactivas.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleToggle(m)}
              disabled={togglingId === m.id}
              className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 px-3 py-1 rounded-full hover:bg-blue-600 hover:text-white transition-all disabled:opacity-40"
            >
              {m.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Input de rápida adición */}
      <div className="bg-white border border-blue-100 rounded-2xl p-1.5 flex gap-2">
        <input
          value={newNombre}
          onChange={e => setNewNombre(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder="Nombre de nueva marca…"
          className="flex-1 bg-transparent px-4 py-2 text-sm font-black text-slate-800 placeholder:text-slate-300 outline-none uppercase"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newNombre.trim()}
          className="px-6 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md"
        >
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Añadir'}
        </button>
      </div>
      {addError && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2">{addError}</p>}
    </div>
  )
}

/* ─── Directorio de contactos inline (solo en edición) ─── */
const CATEGORIAS: CategoriaContacto[] = ['comercial', 'tesoreria', 'contabilidad', 'id', 'dueno', 'taller', 'logistica']

function ContactosInlineSection({
  terceroId,
  initialContactos,
}: {
  terceroId: string
  initialContactos: TerceroContacto[]
}) {
  const [contactos, setContactos]   = useState<TerceroContacto[]>(initialContactos)
  const [showForm, setShowForm]     = useState(false)
  const [newNombre, setNewNombre]   = useState('')
  const [newCelular, setNewCelular] = useState('')
  const [newEmail, setNewEmail]     = useState('')
  const [newCat, setNewCat]         = useState<CategoriaContacto>('comercial')
  const [addError, setAddError]     = useState<string | null>(null)
  const [adding, startAdd]          = useTransition()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function handleAdd() {
    if (!newNombre.trim()) { setAddError('El nombre es requerido'); return }
    setAddError(null)
    startAdd(async () => {
      const res = await createTerceroContacto({
        tercero_id: terceroId,
        nombre:     newNombre.trim(),
        celular:    newCelular.trim() || undefined,
        email:      newEmail.trim() || undefined,
        categoria:  newCat,
      })
      if (res.error) { setAddError(res.error); return }
      if (res.data) {
        setContactos(prev => [...prev, res.data!])
        setNewNombre(''); setNewCelular(''); setNewEmail('')
        setNewCat('comercial'); setShowForm(false)
      }
    })
  }

  function handleToggle(c: TerceroContacto) {
    setTogglingId(c.id)
    updateTerceroContacto(c.id, { activo: !c.activo }).then(res => {
      if (!res.error) {
        setContactos(prev => prev.map(x => x.id === c.id ? { ...x, activo: !x.activo } : x))
      }
      setTogglingId(null)
    })
  }

  const activos   = contactos.filter(c => c.activo)
  const inactivos = contactos.filter(c => !c.activo)

  return (
    <div className="space-y-6 rounded-[32px] bg-indigo-50/50 border border-indigo-100 p-6">
      <div className="flex items-center justify-between">
         <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
            <UserCircle2 className="w-4 h-4" /> Líneas Directas de Contacto
         </p>
         {!showForm && (
           <button
             type="button"
             onClick={() => setShowForm(true)}
             className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md"
           >
             <Plus className="w-3.5 h-3.5" /> Nuevo Contacto
           </button>
         )}
      </div>

      <div className="space-y-3">
        {activos.map(c => (
          <div key={c.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white border border-indigo-50 p-4 group/row hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-4 min-w-0">
               <div className={`w-8 h-8 rounded-lg ${CATEGORIA_COLOR[c.categoria]} flex items-center justify-center shrink-0`}>
                  <UserCircle2 className="w-4 h-4 text-white opacity-80" />
               </div>
               <div className="min-w-0">
                 <div className="flex items-center gap-2">
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{c.nombre}</p>
                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{CATEGORIA_LABEL[c.categoria]}</span>
                 </div>
                 <div className="flex items-center gap-3 mt-1">
                    {c.celular && (
                      <span className="text-[9px] font-black text-slate-400 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" /> {c.celular}
                      </span>
                    )}
                    {c.email && (
                      <span className="text-[9px] font-black text-slate-400 flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5" /> {c.email}
                      </span>
                    )}
                 </div>
               </div>
            </div>
            <button
               type="button"
               onClick={() => handleToggle(c)}
               className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover/row:opacity-100"
            >
               <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {inactivos.length > 0 && (
          <div className="pt-2 flex flex-wrap gap-2">
            {inactivos.map(c => (
              <button key={c.id} onClick={() => handleToggle(c)} className="text-[9px] font-black uppercase text-slate-400 hover:text-indigo-600 line-through">
                {c.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-[28px] p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center">
             <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Configurar Nueva Línea</p>
             <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setNewCat(cat)}
                className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                  newCat === cat ? `${CATEGORIA_COLOR[cat]} border-current shadow-sm` : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}
              >
                {CATEGORIA_LABEL[cat]}
              </button>
            ))}
          </div>

          <div className="space-y-4">
             <input
               value={newNombre}
               onChange={e => setNewNombre(e.target.value)}
               placeholder="Nombre de la Persona *"
               className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 uppercase focus:outline-none"
             />
             <div className="grid grid-cols-2 gap-4">
                <input
                  value={newCelular}
                  onChange={e => setNewCelular(e.target.value)}
                  placeholder="WhatsApp / Celular"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 focus:outline-none"
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Email Corporativo"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 focus:outline-none"
                />
             </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newNombre.trim()}
            className="w-full py-3 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-100"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar Registro'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Direcciones de entrega inline (solo en edición) ─── */
function DireccionesInlineSection({
  terceroId,
  initialDirs,
}: {
  terceroId: string
  initialDirs: TerceroDireccion[]
}) {
  const [dirs, setDirs]         = useState<TerceroDireccion[]>(initialDirs)
  const [newNombre, setNewNombre]   = useState('')
  const [newDireccion, setNewDir]   = useState('')
  const [newCiudad, setNewCiudad]   = useState('')
  const [addError, setAddError]     = useState<string | null>(null)
  const [adding, startAdd]          = useTransition()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function handleAdd() {
    if (!newNombre.trim() || !newDireccion.trim()) { setAddError('Nombre y dirección son requeridos'); return }
    setAddError(null)
    startAdd(async () => {
      const res = await createTerceroDireccion({
        tercero_id: terceroId,
        nombre:     newNombre.trim(),
        direccion:  newDireccion.trim(),
        ciudad:     newCiudad.trim() || undefined,
      })
      if (res.error) { setAddError(res.error); return }
      if (res.data) {
        setDirs(prev => [...prev, res.data!])
        setNewNombre(''); setNewDir(''); setNewCiudad('')
      }
    })
  }

  function handleToggle(dir: TerceroDireccion) {
    setTogglingId(dir.id)
    updateTerceroDireccion(dir.id, { activa: !dir.activa }).then(res => {
      if (!res.error) {
        setDirs(prev => prev.map(d => d.id === dir.id ? { ...d, activa: !d.activa } : d))
      }
      setTogglingId(null)
    })
  }

  const activas   = dirs.filter(d => d.activa)
  const inactivas = dirs.filter(d => !d.activa)

  return (
    <div className="space-y-6 rounded-[32px] bg-amber-50/50 border border-amber-100 p-8">
      <div className="flex items-center justify-between">
         <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Puntos Logísticos / Entrega
         </p>
         <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-xl">
            {activas.length} Locaciones Detectadas
         </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activas.map(d => (
          <div key={d.id} className="bg-white border border-amber-50 rounded-2xl p-5 flex items-start justify-between group/row hover:border-amber-200 hover:shadow-md transition-all">
            <div className="min-w-0">
               <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {d.nombre}
               </h4>
               <p className="text-[10px] font-black text-slate-400 uppercase mt-2 leading-relaxed">
                  {d.direccion} {d.ciudad ? ` · ${d.ciudad}` : ''}
               </p>
            </div>
            <button
               onClick={() => handleToggle(d)}
               className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover/row:opacity-100"
            >
               <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {activas.length === 0 && (
           <div className="md:col-span-2 py-10 border-2 border-dashed border-amber-200 rounded-[28px] flex items-center justify-center">
              <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest italic">No hay puntos de entrega configurados para este tercero</p>
           </div>
        )}
      </div>

      {/* Rápida vinculación de dirección */}
      <div className="bg-white border border-amber-100 rounded-[28px] p-6 space-y-6">
        <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest">Añadir Nueva Locación Logística</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            value={newNombre} onChange={e => setNewNombre(e.target.value)}
            placeholder="Identificador (Punto Sur, Bodega 4...)"
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-900 uppercase focus:outline-none"
          />
          <input
            value={newDireccion} onChange={e => setNewDir(e.target.value)}
            placeholder="Dirección Física Exacta"
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-900 uppercase focus:outline-none"
          />
          <input
            value={newCiudad} onChange={e => setNewCiudad(e.target.value)}
            placeholder="Ciudad / Municipio"
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-900 uppercase focus:outline-none"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !newNombre.trim() || !newDireccion.trim()}
          className="w-full py-4 rounded-2xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-100 flex items-center justify-center gap-3 transition-all hover:bg-amber-700"
        >
          {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          Registrar Punto de Entrega
        </button>
        {addError && <p className="text-[10px] font-black text-red-500 uppercase">{addError}</p>}
      </div>
    </div>
  )
}
