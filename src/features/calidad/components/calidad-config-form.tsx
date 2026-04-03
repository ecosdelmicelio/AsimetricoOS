'use client'

import { useState, useTransition } from 'react'
import { Loader2, Save, ChevronDown } from 'lucide-react'
import { updateCalidadConfig } from '@/features/calidad/services/calidad-config-actions'
import { calcMuestraSugerida, AQL_NIVELES } from '@/features/calidad/lib/aql'
import type { CalidadConfig } from '@/features/calidad/types'

interface Props { config: CalidadConfig }

const FRI_METODOS = [
  { value: 'sqrt', label: '√ Lote',       sub: 'ISO simplificado' },
  { value: 'pct',  label: '% Fijo',        sub: 'Configurable' },
  { value: 'aql',  label: 'Tabla Militar', sub: 'ISO 2859-1 AQL' },
] as const

const INSPECCION_NIVELES = [
  { value: 'I',   label: 'I',   sub: 'Reducida'  },
  { value: 'II',  label: 'II',  sub: 'Normal'    },
  { value: 'III', label: 'III', sub: 'Estricta'  },
] as const

export function CalidadConfigForm({ config }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError]           = useState<string | null>(null)
  const [saved, setSaved]           = useState(false)

  const [duproPct,       setDuproPct]       = useState(config.dupro_pct)
  const [friMetodo,      setFriMetodo]      = useState<CalidadConfig['fri_metodo']>(config.fri_metodo)
  const [friPct,         setFriPct]         = useState(config.fri_pct)
  const [aqlNivel,       setAqlNivel]       = useState(config.aql_nivel)
  const [inspeccionNivel,setInspeccionNivel]= useState<CalidadConfig['inspeccion_nivel']>(config.inspeccion_nivel)

  // Preview dinámica para 100 prendas
  const previewConfig: CalidadConfig = {
    ...config,
    dupro_pct: duproPct,
    fri_metodo: friMetodo,
    fri_pct: friPct,
    aql_nivel: aqlNivel,
    inspeccion_nivel: inspeccionNivel,
  }
  const previewDupro = calcMuestraSugerida(100, 'dupro', previewConfig)
  const previewFri   = calcMuestraSugerida(100, 'fri',   previewConfig)

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateCalidadConfig({
        dupro_pct:        duproPct,
        fri_metodo:       friMetodo,
        fri_pct:          friPct,
        aql_nivel:        aqlNivel,
        inspeccion_nivel: inspeccionNivel,
      })
      if (res.error) { setError(res.error); return }
      setSaved(true)
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-body-sm text-muted-foreground">
        Parámetros que controlan el cálculo de muestras en las inspecciones DuPro y FRI.
      </p>

      {/* DUPRO */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-3">
        <div>
          <p className="font-semibold text-foreground text-body-sm">Muestreo DuPro</p>
          <p className="text-xs text-muted-foreground mt-0.5">Porcentaje del lote a inspeccionar durante producción</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={100}
            value={duproPct}
            onChange={e => setDuproPct(parseFloat(e.target.value) || 30)}
            className="w-24 rounded-xl bg-neu-base shadow-neu-inset px-3 py-2 text-body-sm text-foreground focus:outline-none"
          />
          <span className="text-muted-foreground text-body-sm">%</span>
          <span className="text-xs text-muted-foreground ml-2">
            Para 100 prendas → <strong className="text-foreground">{previewDupro} prendas</strong>
          </span>
        </div>
      </div>

      {/* FRI */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-5 space-y-4">
        <div>
          <p className="font-semibold text-foreground text-body-sm">Método FRI (Inspección Final)</p>
          <p className="text-xs text-muted-foreground mt-0.5">Cómo se calcula la muestra de prendas a revisar</p>
        </div>

        {/* Selector método */}
        <div className="grid grid-cols-3 gap-2">
          {FRI_METODOS.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => setFriMetodo(m.value)}
              className={`flex flex-col items-center text-center py-3 px-2 rounded-xl border-2 transition-all ${
                friMetodo === m.value
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-transparent bg-neu-base shadow-neu text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="font-semibold text-body-sm">{m.label}</span>
              <span className="text-xs mt-0.5 opacity-75">{m.sub}</span>
            </button>
          ))}
        </div>

        {/* % Fijo */}
        {friMetodo === 'pct' && (
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={100}
              value={friPct}
              onChange={e => setFriPct(parseFloat(e.target.value) || 10)}
              className="w-24 rounded-xl bg-neu-base shadow-neu-inset px-3 py-2 text-body-sm text-foreground focus:outline-none"
            />
            <span className="text-muted-foreground text-body-sm">%</span>
          </div>
        )}

        {/* AQL */}
        {friMetodo === 'aql' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Nivel de inspección */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Nivel de inspección</label>
                <div className="flex gap-2">
                  {INSPECCION_NIVELES.map(n => (
                    <button
                      key={n.value}
                      type="button"
                      onClick={() => setInspeccionNivel(n.value)}
                      className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                        inspeccionNivel === n.value
                          ? 'border-primary-400 bg-primary-50 text-primary-700'
                          : 'border-transparent bg-neu-base shadow-neu text-muted-foreground'
                      }`}
                    >
                      <div>{n.label}</div>
                      <div className="font-normal opacity-75">{n.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nivel AQL */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Nivel AQL</label>
                <div className="relative rounded-xl bg-neu-base shadow-neu-inset">
                  <select
                    value={aqlNivel}
                    onChange={e => setAqlNivel(e.target.value)}
                    className="w-full rounded-xl bg-transparent px-3 py-2.5 text-body-sm text-foreground focus:outline-none appearance-none"
                  >
                    {AQL_NIVELES.map(a => (
                      <option key={a.value} value={a.value}>
                        {a.recommended ? `⭐ ${a.label}` : a.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground">⭐ = recomendado para confección</p>
              </div>
            </div>
          </div>
        )}

        {/* Preview FRI */}
        <div className="rounded-xl bg-neu-base shadow-neu-inset px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Para 100 prendas (FRI) → muestra: <strong className="text-foreground">{previewFri} prendas</strong>
            {friMetodo === 'aql' && (
              <span className="ml-1 text-muted-foreground">
                · Nivel {inspeccionNivel} · AQL {aqlNivel}
              </span>
            )}
          </p>
        </div>
      </div>

      {error && <p className="text-red-600 text-body-sm">{error}</p>}
      {saved && <p className="text-green-600 text-body-sm">Configuración guardada.</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-body-sm hover:bg-primary-700 transition-all disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar configuración
      </button>
    </div>
  )
}
