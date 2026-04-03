'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, PackageSearch, Loader2, AlertTriangle } from 'lucide-react'
import { closeInspeccion } from '@/features/calidad/services/calidad-actions'
import type { ResultadoInspeccion } from '@/features/calidad/types'

interface Props {
  inspeccion_id:       string
  op_id:               string
  estado_op:           string
  tieneDefectoCritico: boolean
  muestraSugerida:     number
}

export function CerrarInspeccionForm({
  inspeccion_id,
  op_id,
  estado_op,
  tieneDefectoCritico,
  muestraSugerida,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resultado, setResultado] = useState<ResultadoInspeccion | null>(
    tieneDefectoCritico ? 'rechazada' : null
  )
  const [cantidadSegundas, setCantidadSegundas] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Sincronizar cuando un defecto crítico se agrega en tiempo real
  useEffect(() => {
    if (tieneDefectoCritico) setResultado('rechazada')
  }, [tieneDefectoCritico])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!resultado) return
    if (resultado === 'segundas' && !cantidadSegundas) {
      setError('Indica cuántas prendas son de segunda calidad')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('inspeccion_id', inspeccion_id)
    formData.set('op_id', op_id)
    formData.set('estado_op', estado_op)
    formData.set('resultado', resultado)
    if (resultado === 'segundas') {
      formData.set('cantidad_segundas', cantidadSegundas)
    }

    startTransition(async () => {
      const res = await closeInspeccion(formData)
      if (res.error) {
        setError(res.error)
      } else {
        router.push('/calidad')
      }
    })
  }

  const criticoBloquea = tieneDefectoCritico

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-4">
      <h3 className="font-semibold text-foreground text-body-md">Cerrar inspección</h3>

      {/* Banner rechazo automático por crítico */}
      {tieneDefectoCritico && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-3">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-red-700 text-xs font-semibold leading-snug">
            Se registró al menos un defecto CRÍTICO. El resultado es <strong>Rechazada</strong> de forma automática.
          </p>
        </div>
      )}

      {/* Resultado — 3 opciones */}
      <div className="space-y-1.5">
        <p className="text-body-sm text-muted-foreground">Resultado *</p>
        <div className="grid grid-cols-3 gap-2">

          {/* Aceptada */}
          <button
            type="button"
            disabled={criticoBloquea}
            onClick={() => !criticoBloquea && setResultado('aceptada')}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 font-semibold text-body-sm transition-all ${
              resultado === 'aceptada'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-transparent bg-neu-base shadow-neu text-muted-foreground hover:text-foreground'
            } ${criticoBloquea ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <CheckCircle className="w-4 h-4" />
            Aceptada
          </button>

          {/* Rechazada */}
          <button
            type="button"
            onClick={() => setResultado('rechazada')}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 font-semibold text-body-sm transition-all ${
              resultado === 'rechazada'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-transparent bg-neu-base shadow-neu text-muted-foreground hover:text-foreground'
            }`}
          >
            <XCircle className="w-4 h-4" />
            Rechazada
          </button>

          {/* Segundas */}
          <button
            type="button"
            disabled={criticoBloquea}
            onClick={() => !criticoBloquea && setResultado('segundas')}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 font-semibold text-body-sm transition-all ${
              resultado === 'segundas'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-transparent bg-neu-base shadow-neu text-muted-foreground hover:text-foreground'
            } ${criticoBloquea ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <PackageSearch className="w-4 h-4" />
            Segundas
          </button>
        </div>
      </div>

      {/* Cantidad Segundas */}
      {resultado === 'segundas' && (
        <div className="space-y-1.5">
          <label className="text-body-sm text-muted-foreground">Prendas de segunda calidad *</label>
          <input
            type="number"
            min={1}
            value={cantidadSegundas}
            onChange={e => setCantidadSegundas(e.target.value)}
            placeholder="Cantidad"
            className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 text-body-sm text-foreground focus:outline-none"
          />
          <div className="flex items-start gap-2 rounded-xl bg-purple-50 border border-purple-200 px-3 py-2.5">
            <PackageSearch className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <p className="text-purple-700 text-xs font-semibold leading-snug">
              Las prendas marcadas como Segundas salen del flujo normal de producción.
            </p>
          </div>
        </div>
      )}

      {/* Prendas revisadas */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Prendas revisadas</label>
        <input
          type="number"
          name="muestra_revisada"
          min={0}
          placeholder={`${muestraSugerida}`}
          className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 text-body-sm text-foreground focus:outline-none"
        />
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <label className="text-body-sm text-muted-foreground">Notas de cierre</label>
        <textarea
          name="notas"
          rows={2}
          placeholder="Observaciones finales..."
          className="w-full rounded-xl bg-neu-base shadow-neu-inset px-3 py-2.5 text-body-sm text-foreground focus:outline-none resize-none"
        />
      </div>

      {/* Banners de resultado */}
      {resultado === 'aceptada' && (
        <p className="text-body-sm text-green-600 bg-green-50 rounded-xl px-3 py-2">
          La OP avanzará al siguiente estado automáticamente.
        </p>
      )}
      {resultado === 'rechazada' && !tieneDefectoCritico && (
        <p className="text-body-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
          La OP quedará pendiente para re-inspección.
        </p>
      )}

      {error && <p className="text-red-600 text-body-sm">{error}</p>}

      <button
        type="submit"
        disabled={pending || !resultado}
        className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Cerrar inspección
      </button>
    </form>
  )
}
