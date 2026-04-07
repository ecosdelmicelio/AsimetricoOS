'use client'

import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { buildCodigoMP } from '@/shared/lib/codigo-builder-utils'
import type { AtributoMP, TipoAtributoMP } from '@/features/materiales/types/atributos'

interface Props {
  atributos: Record<TipoAtributoMP, AtributoMP[]>
  seleccionados: Record<TipoAtributoMP, string>
  onCodigoChange: (codigo: string, completo: boolean) => void
}

export function CodigoPreviewMP({ atributos, seleccionados, onCodigoChange }: Props) {
  // Los 4 tipos requeridos para el código MP
  const TIPOS_REQUERIDOS: TipoAtributoMP[] = ['tipo', 'subtipo', 'color', 'diseño']

  // Obtener abreviaciones de los atributos seleccionados
  const abreviacionesSeleccionadas = useMemo(() => {
    const result: Partial<Record<TipoAtributoMP, string>> = {}

    TIPOS_REQUERIDOS.forEach(tipo => {
      const atributoId = seleccionados[tipo]
      if (atributoId) {
        const atributo = atributos[tipo]?.find(a => a.id === atributoId)
        if (atributo?.abreviacion) {
          result[tipo] = atributo.abreviacion
        }
      }
    })

    return result
  }, [atributos, seleccionados])

  // Validar que todos los atributos requeridos estén seleccionados Y tengan abreviación
  const tieneTodos = useMemo(() => {
    return TIPOS_REQUERIDOS.every(tipo => abreviacionesSeleccionadas[tipo])
  }, [abreviacionesSeleccionadas])

  // Atributos incompletos (seleccionados pero sin abreviación)
  const atributosIncompletos = useMemo(() => {
    return TIPOS_REQUERIDOS.filter(tipo => {
      const atributoId = seleccionados[tipo]
      if (!atributoId) return false // No seleccionado
      const atributo = atributos[tipo]?.find(a => a.id === atributoId)
      return !atributo?.abreviacion // Seleccionado pero sin abreviación
    })
  }, [atributos, seleccionados])

  // Construir código o mostrar placeholder
  const codigoMP = useMemo(() => {
    if (tieneTodos) {
      return buildCodigoMP({
        tipo: abreviacionesSeleccionadas.tipo!,
        subtipo: abreviacionesSeleccionadas.subtipo!,
        color: abreviacionesSeleccionadas.color!,
        diseno: abreviacionesSeleccionadas.diseño!,
      })
    }

    // Mostrar placeholder: TT-SS-COL-DDDD
    const parts = [
      abreviacionesSeleccionadas.tipo || '__',
      abreviacionesSeleccionadas.subtipo || '__',
      abreviacionesSeleccionadas.color || '___',
      abreviacionesSeleccionadas.diseño || '____',
    ]

    return parts.join('-')
  }, [tieneTodos, abreviacionesSeleccionadas])

  // Notificar cambios al padre
  useMemo(() => {
    onCodigoChange(tieneTodos ? codigoMP : '', tieneTodos)
  }, [codigoMP, tieneTodos, onCodigoChange])

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-neu-base shadow-neu-inset px-3 py-2">
        <div className="font-mono text-sm text-foreground">{codigoMP}</div>
      </div>

      {atributosIncompletos.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700">
            <p className="font-medium mb-1">Configurar abreviaciones:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {atributosIncompletos.map(tipo => (
                <li key={tipo}>
                  {atributos[tipo]?.find(a => a.id === seleccionados[tipo])?.valor || tipo}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
