'use client'

import { useState, useTransition } from 'react'
import { Plus, Edit2, Loader2, AlertTriangle, Star, Users, Tag, X, MapPin, Phone, Mail, UserCircle2 } from 'lucide-react'
import { createTercero, updateTercero } from '@/features/terceros/services/terceros-actions'
import { createMarca, updateMarca } from '@/features/configuracion/services/marcas-actions'
import type { MarcaConTercero } from '@/features/configuracion/services/marcas-actions'
import { createTerceroDireccion, updateTerceroDireccion } from '@/features/terceros/services/tercero-direcciones-actions'
import type { TerceroDireccion } from '@/features/terceros/services/tercero-direcciones-actions'
import { createTerceroContacto, updateTerceroContacto } from '@/features/terceros/services/tercero-contactos-actions'
import type { TerceroContacto } from '@/features/terceros/services/tercero-contactos-actions'
import type { CategoriaContacto } from '@/features/terceros/services/tercero-contactos-constants'
import { CATEGORIA_LABEL, CATEGORIA_COLOR } from '@/features/terceros/services/tercero-contactos-constants'
import { useDuplicateCheck } from '@/shared/hooks/use-duplicate-check'
import type { Tercero, TipoTercero, EstadoTercero } from '@/features/terceros/types'
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
}

export function TercerosPanel({ terceros, marcas, direcciones, contactos }: Props) {
  const [filter, setFilter]   = useState<TipoTercero | 'todos'>('todos')
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const visibles = filter === 'todos'
    ? terceros
    : terceros.filter(t => t.tipos.includes(filter))

  return (
    <div className="space-y-4">
      {/* Filtro por tipo */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-body-sm font-medium transition-all ${
                filter === tab.id
                  ? 'bg-primary-600 text-white shadow-neu-inset'
                  : 'bg-neu-base shadow-neu text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.id !== 'todos' && (
                <span className="ml-1.5 text-xs opacity-70">
                  {terceros.filter(t => t.tipos.includes(tab.id as TipoTercero)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neu-base shadow-neu text-primary-700 font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo tercero
          </button>
        )}
      </div>

      {/* Form creación */}
      {showForm && (
        <TerceroForm onDone={() => setShowForm(false)} marcas={[]} dirs={[]} contactos={[]} />
      )}

      {/* Lista vacía */}
      {visibles.length === 0 && !showForm && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Sin terceros</p>
          <p className="text-body-sm text-muted-foreground mt-1">
            {filter === 'todos' ? 'Agrega clientes, satélites o proveedores' : `No hay ${FILTER_TABS.find(t => t.id === filter)?.label.toLowerCase()} registrados`}
          </p>
        </div>
      )}

      {/* Lista */}
      {visibles.length > 0 && (
        <div className="space-y-2">
          {visibles.map(t => {
            const terceroMarcas    = marcas.filter(m => m.tercero_id === t.id)
            const terceroDirs      = direcciones.filter(d => d.tercero_id === t.id)
            const terceroContactos = contactos.filter(c => c.tercero_id === t.id)
            return editingId === t.id
              ? <TerceroForm key={t.id} tercero={t} marcas={terceroMarcas} dirs={terceroDirs} contactos={terceroContactos} onDone={() => setEditingId(null)} />
              : <TerceroRow key={t.id} tercero={t} marcas={terceroMarcas} dirs={terceroDirs} contactos={terceroContactos} onEdit={() => { setEditingId(t.id); setShowForm(false) }} />
          })}
        </div>
      )}
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
    <div className="rounded-xl bg-neu-base shadow-neu px-4 py-3 flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground text-body-sm">{t.nombre}</span>
          {t.nit && (
            <span className="text-xs text-muted-foreground font-mono">NIT {t.nit}</span>
          )}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${cfg.className}`}>
            {cfg.label}
          </span>
        </div>

        {/* Badges de tipo */}
        <div className="flex gap-1 flex-wrap">
          {t.tipos.map(tipo => (
            <span key={tipo} className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_COLOR[tipo]}`}>
              {TIPO_LABEL[tipo]}
            </span>
          ))}
        </div>

        {/* Marcas y direcciones */}
        {(activeMarcas.length > 0 || activeDirs.length > 0) && (
          <div className="flex gap-1 flex-wrap">
            {activeMarcas.map(m => (
              <span key={m.id} className="inline-flex items-center gap-0.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                <Tag className="w-2.5 h-2.5" />
                {m.nombre}
              </span>
            ))}
            {activeDirs.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                <MapPin className="w-2.5 h-2.5" />
                {activeDirs.length === 1 ? activeDirs[0].nombre : `${activeDirs.length} dir. entrega`}
              </span>
            )}
            {activeContactos.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                <UserCircle2 className="w-2.5 h-2.5" />
                {activeContactos.length === 1 ? activeContactos[0].nombre : `${activeContactos.length} contactos`}
              </span>
            )}
          </div>
        )}

        {/* Info secundaria */}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {t.email && <span>{t.email}</span>}
          {t.telefono && <span>{t.telefono}</span>}
          {t.tipos.includes('satelite') && t.capacidad_diaria != null && (
            <span>{t.capacidad_diaria} uds/día</span>
          )}
          {t.tipos.includes('proveedor_mp') && t.calificacion != null && (
            <span className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < t.calificacion! ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                />
              ))}
            </span>
          )}
          {t.tipos.includes('proveedor_mp') && t.porcentaje_anticipo != null && t.porcentaje_anticipo > 0 && (
            <span>Anticipo: {t.porcentaje_anticipo}%</span>
          )}
          {t.tipos.includes('proveedor_mp') && t.descuento_pago_anticipado != null && t.descuento_pago_anticipado > 0 && (
            <span className="text-green-600">Dto. anticipo: {t.descuento_pago_anticipado}%</span>
          )}
        </div>
      </div>

      <button
        onClick={onEdit}
        className="w-8 h-8 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

/* ─── Form ─── */
function TerceroForm({ tercero, marcas = [], dirs = [], contactos = [], onDone }: { tercero?: Tercero; marcas?: MarcaConTercero[]; dirs?: TerceroDireccion[]; contactos?: TerceroContacto[]; onDone: () => void }) {
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

  // Satélite
  const [capDiaria, setCapDiaria]     = useState(tercero?.capacidad_diaria?.toString() ?? '')
  const [leadTime, setLeadTime]       = useState(tercero?.lead_time_dias?.toString() ?? '')
  const [valorRef, setValorRef]       = useState(tercero?.valor_servicio_ref?.toString() ?? '')

  // Proveedor
  const [anticipo, setAnticipo]       = useState(tercero?.porcentaje_anticipo?.toString() ?? '')
  const [calificacion, setCalificacion] = useState(tercero?.calificacion ?? 0)
  const [descuento, setDescuento]     = useState(tercero?.descuento_pago_anticipado?.toString() ?? '')

  const esSatelite   = tipos.includes('satelite')
  const esProveedor  = tipos.includes('proveedor_mp')

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
    <div className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {isEdit ? `Editando — ${tercero.nombre}` : 'Nuevo tercero'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Tipos (multi-check) ── */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Tipo de tercero *
          </label>
          <div className="flex gap-2 flex-wrap">
            {TIPOS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTipo(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-body-sm font-medium transition-all ${
                  tipos.includes(t)
                    ? `border-current ${TIPO_COLOR[t]}`
                    : 'border-transparent bg-neu-base shadow-neu text-muted-foreground hover:text-foreground'
                }`}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Datos básicos ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Nombre */}
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-foreground">Nombre / Razón social *</label>
              {checkingNombre && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            <div className={`rounded-xl bg-neu-base shadow-neu px-3 py-2 ${nombreDuplicado ? 'ring-1 ring-amber-400' : ''}`}>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                placeholder="Empresa S.A.S."
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            {nombreDuplicado && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="text-[10px]">Ya existe un tercero con este nombre</span>
              </div>
            )}
          </div>

          {/* NIT */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">NIT / Cédula</label>
            <div className="rounded-xl bg-neu-base shadow-neu px-3 py-2">
              <input
                value={nit}
                onChange={e => setNit(e.target.value)}
                placeholder="900.123.456-7"
                className="w-full bg-transparent text-body-sm font-mono text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Teléfono */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Teléfono</label>
            <div className="rounded-xl bg-neu-base shadow-neu px-3 py-2">
              <input
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="+57 300 000 0000"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Email de contacto</label>
            <div className="rounded-xl bg-neu-base shadow-neu px-3 py-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contacto@empresa.com"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Email facturación */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Email facturación electrónica</label>
            <div className="rounded-xl bg-neu-base shadow-neu px-3 py-2">
              <input
                type="email"
                value={emailFact}
                onChange={e => setEmailFact(e.target.value)}
                placeholder="facturacion@empresa.com"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-foreground">Dirección</label>
            <div className="rounded-xl bg-neu-base shadow-neu px-3 py-2">
              <input
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                placeholder="Calle 00 # 00-00, Medellín"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* ── Estado ── */}
        {isEdit && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</label>
            <div className="flex gap-2">
              {(Object.entries(ESTADO_CONFIG) as [EstadoTercero, typeof ESTADO_CONFIG[EstadoTercero]][]).map(([val, cfg]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEstado(val)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    estado === val ? `border-current ${cfg.className}` : 'border-transparent bg-neu-base shadow-neu text-muted-foreground'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Satélite ── */}
        {esSatelite && (
          <div className="space-y-2 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Datos de Satélite</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Capacidad uds/día</label>
                <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                  <input
                    type="number" min={0}
                    value={capDiaria}
                    onChange={e => setCapDiaria(e.target.value)}
                    placeholder="120"
                    className="w-full bg-transparent text-body-sm text-foreground outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Lead time (días)</label>
                <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                  <input
                    type="number" min={0}
                    value={leadTime}
                    onChange={e => setLeadTime(e.target.value)}
                    placeholder="3"
                    className="w-full bg-transparent text-body-sm text-foreground outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Valor servicio ref. (COP)</label>
                <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                  <input
                    type="number" min={0}
                    value={valorRef}
                    onChange={e => setValorRef(e.target.value)}
                    placeholder="15000"
                    className="w-full bg-transparent text-body-sm text-foreground outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Proveedor MP ── */}
        {esProveedor && (
          <div className="space-y-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Datos de Proveedor</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Calificación */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Calificación</label>
                <div className="flex gap-1 items-center h-9">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCalificacion(calificacion === n ? 0 : n)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-5 h-5 ${n <= calificacion ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Anticipo */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">% Anticipo requerido</label>
                <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2 flex items-center gap-1">
                  <input
                    type="number" min={0} max={100} step={5}
                    value={anticipo}
                    onChange={e => setAnticipo(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent text-body-sm text-foreground outline-none"
                  />
                  <span className="text-muted-foreground text-body-sm shrink-0">%</span>
                </div>
              </div>

              {/* Descuento pago anticipado */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">% Dto. pago anticipado</label>
                <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2 flex items-center gap-1">
                  <input
                    type="number" min={0} max={100} step={0.5}
                    value={descuento}
                    onChange={e => setDescuento(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent text-body-sm text-foreground outline-none"
                  />
                  <span className="text-muted-foreground text-body-sm shrink-0">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Marcas (solo en edición) ── */}
        {isEdit && (
          <MarcasInlineSection terceroId={tercero.id} initialMarcas={marcas} />
        )}

        {/* ── Direcciones de entrega (solo en edición) ── */}
        {isEdit && (
          <DireccionesInlineSection terceroId={tercero.id} initialDirs={dirs} />
        )}

        {/* ── Directorio de contactos (solo en edición) ── */}
        {isEdit && (
          <ContactosInlineSection terceroId={tercero.id} initialContactos={contactos} />
        )}

        {error && <p className="text-red-600 text-body-sm">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2 rounded-xl bg-neu-base shadow-neu text-body-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending || tipos.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear tercero'}
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
    <div className="space-y-2.5 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Marcas</p>

      {/* Chips activas */}
      <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
        {activas.map(m => (
          <span key={m.id} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            <Tag className="w-2.5 h-2.5 shrink-0" />
            {m.nombre}
            <button
              type="button"
              onClick={() => handleToggle(m)}
              disabled={togglingId === m.id}
              className="ml-0.5 text-blue-400 hover:text-blue-700 transition-colors disabled:opacity-40"
              title="Desactivar"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {activas.length === 0 && (
          <span className="text-xs text-muted-foreground italic">Sin marcas activas</span>
        )}
      </div>

      {/* Chips inactivas (reactivar con clic) */}
      {inactivas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {inactivas.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleToggle(m)}
              disabled={togglingId === m.id}
              title="Reactivar"
              className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-400 line-through px-2 py-0.5 rounded-full hover:bg-blue-50 hover:text-blue-600 hover:no-underline transition-colors disabled:opacity-40"
            >
              <Tag className="w-2.5 h-2.5 shrink-0" />
              {m.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Input nueva marca */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 rounded-lg bg-neu-base shadow-neu px-3 py-1.5">
          <input
            value={newNombre}
            onChange={e => setNewNombre(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            placeholder="Nueva marca…"
            className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newNombre.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neu-base shadow-neu text-blue-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Agregar
        </button>
      </div>

      {addError && <p className="text-xs text-red-600">{addError}</p>}
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
    <div className="space-y-2.5 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Directorio de contactos</p>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Agregar
          </button>
        )}
      </div>

      {/* Contactos activos */}
      <div className="space-y-2">
        {activos.map(c => (
          <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg bg-white/70 px-3 py-2">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-sm font-semibold text-foreground">{c.nombre}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORIA_COLOR[c.categoria]}`}>
                  {CATEGORIA_LABEL[c.categoria]}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                {c.celular && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5 shrink-0" />
                    {c.celular}
                  </span>
                )}
                {c.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-2.5 h-2.5 shrink-0" />
                    {c.email}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle(c)}
              disabled={togglingId === c.id}
              title="Desactivar contacto"
              className="mt-0.5 text-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-40 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {activos.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground italic">Sin contactos registrados</p>
        )}
      </div>

      {/* Inactivos */}
      {inactivos.length > 0 && (
        <div className="space-y-1">
          {inactivos.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-100 px-3 py-1.5 opacity-60">
              <p className="text-xs text-gray-500 line-through truncate">{c.nombre} · {CATEGORIA_LABEL[c.categoria]}</p>
              <button
                type="button"
                onClick={() => handleToggle(c)}
                disabled={togglingId === c.id}
                title="Reactivar"
                className="text-xs text-gray-500 hover:text-indigo-700 underline shrink-0 disabled:opacity-40"
              >
                Reactivar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario nuevo contacto */}
      {showForm && (
        <div className="space-y-2 pt-2 border-t border-indigo-200">
          <p className="text-xs font-medium text-indigo-700">Nuevo contacto</p>

          {/* Categoría */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setNewCat(cat)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                  newCat === cat
                    ? `${CATEGORIA_COLOR[cat]} border-current`
                    : 'border-transparent bg-white/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {CATEGORIA_LABEL[cat]}
              </button>
            ))}
          </div>

          {/* Campos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg bg-neu-base shadow-neu px-3 py-1.5">
              <input
                value={newNombre}
                onChange={e => setNewNombre(e.target.value)}
                placeholder="Nombre completo *"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="rounded-lg bg-neu-base shadow-neu px-3 py-1.5 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
              <input
                value={newCelular}
                onChange={e => setNewCelular(e.target.value)}
                placeholder="Celular / WhatsApp"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="rounded-lg bg-neu-base shadow-neu px-3 py-1.5 flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Email corporativo"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newNombre.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neu-base shadow-neu text-indigo-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Agregar contacto
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setAddError(null) }}
              className="text-xs text-muted-foreground hover:text-foreground px-2"
            >
              Cancelar
            </button>
          </div>

          {addError && <p className="text-xs text-red-600">{addError}</p>}
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
    <div className="space-y-2.5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Direcciones de entrega</p>

      {/* Activas */}
      <div className="space-y-1.5">
        {activas.map(d => (
          <div key={d.id} className="flex items-start justify-between gap-2 rounded-lg bg-white/70 px-3 py-2">
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-foreground truncate">{d.nombre}</p>
              <p className="text-xs text-muted-foreground truncate">{d.direccion}{d.ciudad ? ` — ${d.ciudad}` : ''}</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle(d)}
              disabled={togglingId === d.id}
              title="Desactivar"
              className="mt-0.5 text-amber-400 hover:text-amber-700 transition-colors disabled:opacity-40 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {activas.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Sin direcciones de entrega</p>
        )}
      </div>

      {/* Inactivas */}
      {inactivas.length > 0 && (
        <div className="space-y-1">
          {inactivas.map(d => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-100 px-3 py-1.5 opacity-60">
              <p className="text-xs text-gray-500 line-through truncate">{d.nombre} — {d.direccion}</p>
              <button
                type="button"
                onClick={() => handleToggle(d)}
                disabled={togglingId === d.id}
                title="Reactivar"
                className="text-xs text-gray-500 hover:text-amber-700 underline shrink-0 disabled:opacity-40"
              >
                Reactivar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form nueva dirección */}
      <div className="space-y-2 pt-1 border-t border-amber-200">
        <p className="text-xs font-medium text-amber-700">Nueva dirección</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-1.5">
            <input
              value={newNombre}
              onChange={e => setNewNombre(e.target.value)}
              placeholder="Nombre (ej: Almacén Centro)"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-1.5">
            <input
              value={newDireccion}
              onChange={e => setNewDir(e.target.value)}
              placeholder="Dirección completa"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="rounded-lg bg-neu-base shadow-neu px-3 py-1.5">
            <input
              value={newCiudad}
              onChange={e => setNewCiudad(e.target.value)}
              placeholder="Ciudad (opcional)"
              className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newNombre.trim() || !newDireccion.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neu-base shadow-neu text-amber-700 font-semibold text-body-sm transition-all active:shadow-neu-inset disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Agregar dirección
        </button>
        {addError && <p className="text-xs text-red-600">{addError}</p>}
      </div>
    </div>
  )
}
