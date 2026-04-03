'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import type { CodigoSchema, SegmentoSeleccion } from '@/features/codigo-schema/types'

const SEGMENT_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
]

interface Props {
  schema: CodigoSchema | null
  onChange: (result: { codigo: string; completo: boolean; selecciones: SegmentoSeleccion[] }) => void
  disabled?: boolean
}

export function CodigoBuilder({ schema, onChange, disabled }: Props) {
  const [selecciones, setSelecciones] = useState<Record<string, string>>({})
  const [descripciones, setDescripciones] = useState<Record<string, string>>({})

  const codigoActual = useCallback(() => {
    if (!schema) return ''
    return schema.segmentos
      .map(seg => {
        if (seg.tipo === 'selector') return selecciones[seg.id] ?? ''
        // auto_ref: placeholder hasta que se guarda
        return '?'.repeat(seg.longitud)
      })
      .join('')
  }, [schema, selecciones])

  const esCompleto = useCallback(() => {
    if (!schema) return false
    return schema.segmentos.every(seg => {
      if (seg.tipo === 'selector') return !!selecciones[seg.id]
      if (seg.tipo === 'auto_ref') return !!descripciones[seg.id]?.trim()
      return false
    })
  }, [schema, selecciones, descripciones])

  useEffect(() => {
    if (!schema) return
    const segs: SegmentoSeleccion[] = schema.segmentos.map(seg => ({
      segmento_id: seg.id,
      clave: seg.clave,
      tipo: seg.tipo,
      longitud: seg.longitud,
      valor: seg.tipo === 'selector' ? (selecciones[seg.id] ?? '') : '?'.repeat(seg.longitud),
      descripcion: seg.tipo === 'auto_ref' ? descripciones[seg.id] : undefined,
    }))
    onChange({ codigo: codigoActual(), completo: esCompleto(), selecciones: segs })
  }, [selecciones, descripciones, schema, codigoActual, esCompleto, onChange])

  if (!schema) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-body-sm text-amber-700">
          Sin esquema configurado.{' '}
          <Link href="/configuracion" className="font-semibold underline">
            Configura el esquema aquí
          </Link>
        </p>
      </div>
    )
  }

  if (schema.segmentos.length === 0) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <p className="text-body-sm text-amber-700">
          El esquema no tiene segmentos.{' '}
          <Link href="/configuracion" className="font-semibold underline">
            Agrega segmentos en Configuración
          </Link>
        </p>
      </div>
    )
  }

  const codigo = codigoActual()
  const longitudTotal = schema.segmentos.reduce((s, seg) => s + seg.longitud, 0)
  const longitudActual = schema.segmentos.reduce((s, seg) => {
    if (seg.tipo === 'selector') return s + (selecciones[seg.id]?.length ?? 0)
    return s // auto_ref no cuenta hasta guardar
  }, 0)

  return (
    <div className="space-y-4">
      {/* Selectores por segmento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {schema.segmentos.map((seg, i) => {
          const colorClass = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
          const activos = seg.valores.filter(v => v.activo)

          return (
            <div key={seg.id} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colorClass}`}>
                  {seg.clave}
                </span>
                <label className="text-xs font-medium text-foreground">{seg.etiqueta}</label>
                <span className="text-[10px] text-muted-foreground">({seg.longitud}ch)</span>
              </div>

              {seg.tipo === 'selector' ? (
                <div className={`rounded-lg bg-neu-base shadow-neu px-3 py-2 transition-all ${
                  selecciones[seg.id] ? 'ring-1 ring-primary-300' : ''
                }`}>
                  <select
                    value={selecciones[seg.id] ?? ''}
                    onChange={e => setSelecciones(prev => ({ ...prev, [seg.id]: e.target.value }))}
                    disabled={disabled || activos.length === 0}
                    className="w-full bg-transparent text-body-sm text-foreground outline-none appearance-none"
                  >
                    <option value="">— Seleccionar —</option>
                    {activos.map(v => (
                      <option key={v.id} value={v.valor}>
                        {v.valor} · {v.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-lg bg-neu-base shadow-neu px-3 py-2">
                  <input
                    value={descripciones[seg.id] ?? ''}
                    onChange={e => setDescripciones(prev => ({ ...prev, [seg.id]: e.target.value }))}
                    placeholder="Descripción del ítem..."
                    disabled={disabled}
                    className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              )}

              {seg.tipo === 'selector' && activos.length === 0 && (
                <p className="text-[10px] text-amber-600">
                  Sin valores.{' '}
                  <Link href="/configuracion" className="underline">Agregar</Link>
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Preview del código */}
      <div className="rounded-xl bg-neu-base shadow-neu-inset px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Preview del código
          </span>
          <span className={`text-xs font-mono ${
            esCompleto() ? 'text-green-600' : 'text-muted-foreground'
          }`}>
            {longitudActual}/{longitudTotal} ch
          </span>
        </div>

        {/* Pastillas por segmento */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {schema.segmentos.map((seg, i) => {
            const colorClass = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
            const val = seg.tipo === 'selector'
              ? (selecciones[seg.id] || '·'.repeat(seg.longitud))
              : (descripciones[seg.id] ? `#${String(seg.ultimo_ref + 1).padStart(seg.longitud, '0')}` : '?'.repeat(seg.longitud))

            return (
              <span key={seg.id} className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${colorClass}`}>
                {val}
              </span>
            )
          })}
        </div>

        {/* Código ensamblado */}
        <div className="font-mono text-lg font-bold text-foreground tracking-widest">
          {codigo || '—'}
        </div>
      </div>
    </div>
  )
}
