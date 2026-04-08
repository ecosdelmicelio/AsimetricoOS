'use client'

import { useEffect, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { generarCodigoPT, recomendarNombre, esCodigoCompleto } from '@/shared/lib/code-generator'
import type { AtributoPT } from '@/features/productos/types/atributos'

interface Props {
  atributos: AtributoPT[]
  generoId: string | null
  tipoId: string | null
  fitId: string | null
  colorId: string | null
  disenoId: string | null
  onCodigoChange: (codigo: string, completo: boolean) => void
  onNombreRecomendado?: (nombre: string) => void
}

export function CodigoPreviewPT({
  atributos,
  generoId,
  tipoId,
  fitId,
  colorId,
  disenoId,
  onCodigoChange,
  onNombreRecomendado,
}: Props) {
  const preview = useMemo(() => {
    const atributoGenero = atributos.find(a => a.id === generoId)
    const atributoTipo = atributos.find(a => a.id === tipoId)
    const atributoFit = atributos.find(a => a.id === fitId)
    const atributoColor = atributos.find(a => a.id === colorId)
    const atributoDiseño = atributos.find(a => a.id === disenoId)

    // Genera código inteligente
    const codigo = generarCodigoPT(
      atributoGenero,
      atributoTipo,
      atributoFit,
      atributoColor,
      atributoDiseño,
    )
    const completo = esCodigoCompleto(codigo)

    // Recomienda nombre basado en atributos
    const nombreRecomendado = recomendarNombre([atributoGenero, atributoTipo, atributoFit, atributoColor, atributoDiseño])

    const tieneAbreviacionGenero = !atributoGenero || !!atributoGenero.abreviacion
    const tieneAbreviacionTipo = !atributoTipo || !!atributoTipo.abreviacion
    const tieneAbreviacionFit = !atributoFit || !!atributoFit.abreviacion
    const tieneAbreviacionColor = !atributoColor || !!atributoColor.abreviacion
    const tieneAbreviacionDiseño = !atributoDiseño || !!atributoDiseño.abreviacion

    return {
      codigo,
      completo,
      tieneAbreviacionGenero,
      tieneAbreviacionTipo,
      tieneAbreviacionFit,
      tieneAbreviacionColor,
      tieneAbreviacionDiseño,
      atributoGenero,
      atributoTipo,
      atributoFit,
      atributoColor,
      atributoDiseño,
      nombreRecomendado,
    }
  }, [generoId, tipoId, fitId, colorId, disenoId, atributos])

  // Notify changes without causing setState-during-render
  useEffect(() => {
    onCodigoChange(preview.codigo, preview.completo)
  }, [preview.codigo, preview.completo, onCodigoChange])

  // Notify recommended name
  useEffect(() => {
    if (onNombreRecomendado && preview.nombreRecomendado) {
      onNombreRecomendado(preview.nombreRecomendado)
    }
  }, [preview.nombreRecomendado, onNombreRecomendado])

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-neu-base shadow-neu p-4">
        <p className="text-xs text-muted-foreground font-medium mb-2">CÓDIGO GENERADO</p>
        <p className={`text-display-xs font-mono font-bold ${preview.completo ? 'text-primary-600' : 'text-muted-foreground'}`}>
          {preview.codigo}
        </p>
        {!preview.completo && (
          <p className="text-xs text-muted-foreground mt-1">Completa los atributos para generar el código final</p>
        )}
      </div>

      {!preview.tieneAbreviacionGenero && preview.atributoGenero && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            El género <span className="font-semibold">"{preview.atributoGenero.valor}"</span> no tiene abreviatura configurada
          </p>
        </div>
      )}

      {!preview.tieneAbreviacionTipo && preview.atributoTipo && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            El tipo <span className="font-semibold">"{preview.atributoTipo.valor}"</span> no tiene abreviatura configurada
          </p>
        </div>
      )}

      {!preview.tieneAbreviacionFit && preview.atributoFit && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            El fit <span className="font-semibold">"{preview.atributoFit.valor}"</span> no tiene abreviatura configurada
          </p>
        </div>
      )}

      {!preview.tieneAbreviacionColor && preview.atributoColor && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            El color <span className="font-semibold">"{preview.atributoColor.valor}"</span> no tiene abreviatura configurada
          </p>
        </div>
      )}

      {!preview.tieneAbreviacionDiseño && preview.atributoDiseño && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            El diseño <span className="font-semibold">"{preview.atributoDiseño.valor}"</span> no tiene abreviatura configurada
          </p>
        </div>
      )}
    </div>
  )
}
