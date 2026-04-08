'use client'

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { TipoServicioAtributo } from '@/features/servicios/types/servicios'

interface Props {
  tipos: TipoServicioAtributo[]
  subtipos: TipoServicioAtributo[]
  atributo1Id: string | null
  atributo2Id: string | null
  onCodigoChange: (codigo: string, completo: boolean) => void
}

export function CodigoPreviewServicio({
  tipos,
  subtipos,
  atributo1Id,
  atributo2Id,
  onCodigoChange,
}: Props) {
  const preview = useMemo(() => {
    const atributo1 = tipos.find(a => a.id === atributo1Id)
    const atributo2 = subtipos.find(a => a.id === atributo2Id)

    const abr1 = atributo1?.abreviatura || '__'
    const abr2 = atributo2?.abreviatura || '___'
    const codigo = `${abr1}-${abr2}-001`
    const completo = !!atributo1 && !!atributo2

    // Notificar cambio
    onCodigoChange(codigo, completo)

    const tieneAbreviacion1 = !atributo1 || !!atributo1.abreviatura
    const tieneAbreviacion2 = !atributo2 || !!atributo2.abreviatura

    return {
      codigo,
      completo,
      tieneAbreviacion1,
      tieneAbreviacion2,
      atributo1,
      atributo2,
    }
  }, [atributo1Id, atributo2Id, tipos, subtipos, onCodigoChange])

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-neu-base shadow-neu p-4">
        <p className="text-xs text-muted-foreground font-medium mb-2">CÓDIGO GENERADO</p>
        <p className={`text-display-xs font-mono font-bold ${preview.completo ? 'text-primary-600' : 'text-muted-foreground'}`}>
          {preview.codigo}
        </p>
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
    </div>
  )
}
