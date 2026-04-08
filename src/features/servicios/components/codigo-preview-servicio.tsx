'use client'

import { useEffect, useMemo } from 'react'
import { AlertTriangle, Lightbulb } from 'lucide-react'
import { generarCodigo, recomendarNombre, esCodigoCompleto, obtenerRecomendaciones } from '@/shared/lib/code-generator'
import type { TipoServicioAtributo } from '@/features/servicios/types/servicios'

interface Props {
  tipos: TipoServicioAtributo[]
  subtipos: TipoServicioAtributo[]
  detalles: TipoServicioAtributo[]
  atributo1Id: string | null
  atributo2Id: string | null
  atributo3Id?: string | null
  descripcion?: string
  onCodigoChange: (codigo: string, completo: boolean) => void
  onNombreRecomendado?: (nombre: string) => void
}

export function CodigoPreviewServicio({
  tipos,
  subtipos,
  detalles,
  atributo1Id,
  atributo2Id,
  atributo3Id,
  descripcion,
  onCodigoChange,
  onNombreRecomendado,
}: Props) {
  const preview = useMemo(() => {
    const atributo1 = tipos.find(a => a.id === atributo1Id)
    const atributo2 = subtipos.find(a => a.id === atributo2Id)
    const atributo3 = atributo3Id ? detalles.find(a => a.id === atributo3Id) : undefined

    // Genera código inteligente considerando descripción
    const codigo = generarCodigo(atributo1, atributo2, 1, descripcion)
    const completo = esCodigoCompleto(codigo)

    // Recomienda nombre basado en atributos
    const nombreRecomendado = recomendarNombre([atributo1, atributo2, atributo3])

    // Obtiene recomendaciones
    const recomendaciones = obtenerRecomendaciones(atributo1, atributo2, descripcion)

    const tieneAbreviacion1 = !atributo1 || !!atributo1.abreviatura
    const tieneAbreviacion2 = !atributo2 || !!atributo2.abreviatura

    return {
      codigo,
      completo,
      tieneAbreviacion1,
      tieneAbreviacion2,
      atributo1,
      atributo2,
      atributo3,
      nombreRecomendado,
      recomendaciones,
    }
  }, [atributo1Id, atributo2Id, atributo3Id, tipos, subtipos, detalles, descripcion])

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

      {!preview.tieneAbreviacion1 && preview.atributo1 && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            El tipo <span className="font-semibold">"{preview.atributo1.nombre}"</span> no tiene abreviatura configurada
          </p>
        </div>
      )}

      {!preview.tieneAbreviacion2 && preview.atributo2 && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">
            El subtipo <span className="font-semibold">"{preview.atributo2.nombre}"</span> no tiene abreviatura configurada
          </p>
        </div>
      )}

      {preview.recomendaciones.sugerencia && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex gap-2">
          <Lightbulb className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">{preview.recomendaciones.sugerencia}</p>
        </div>
      )}
    </div>
  )
}
