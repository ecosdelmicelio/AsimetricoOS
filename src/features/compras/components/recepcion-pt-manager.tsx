'use client'

import { useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { RecepcionPTConBins } from './recepcion-pt-con-bins'
import { BinExport } from '@/features/bines/components/bin-export'
import { crearRecepcionesOCConBins } from '../services/compras-actions'
import type { BinContenido } from '@/features/bines/types'

interface Props {
  ocId: string
  bodegaId: string
  productosActivos: Array<{
    id: string
    referencia: string
    nombre: string
    color?: string | null
  }>
  usuarioId?: string
}

interface BinCreado {
  binId: string
  contenido: BinContenido
}

export function RecepcionPTManager({
  ocId,
  bodegaId,
  productosActivos,
  usuarioId,
}: Props) {
  const [paso, setPaso] = useState<'formulario' | 'confirmacion'>('formulario')
  const [binesCreados, setBinesCreados] = useState<BinCreado[]>([])
  const [mostrarExport, setMostrarExport] = useState<number | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGuardarRecepcion = useCallback(
    async (bins: any[]) => {
      setCargando(true)
      setError(null)

      try {
        const recepciones = bins
          .filter(bin => bin.items.length > 0)
          .map(bin => ({
            ocId,
            bodegaId,
            items: bin.items.map((item: any) => ({
              producto_id: item.producto_id,
              talla: item.talla,
              cantidad: item.cantidad,
            })),
          }))

        const resultados = await crearRecepcionesOCConBins(recepciones, usuarioId)

        setBinesCreados(resultados)
        setPaso('confirmacion')
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error desconocido'
        setError(mensaje)
        console.error('Error al guardar recepción:', err)
      } finally {
        setCargando(false)
      }
    },
    [ocId, bodegaId, usuarioId]
  )

  if (paso === 'confirmacion' && binesCreados.length > 0) {
    return (
      <div className="space-y-6">
        {mostrarExport !== null && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-display-xs font-bold text-foreground">
                  Exportar {binesCreados[mostrarExport].contenido.codigo}
                </h3>
                <button
                  onClick={() => setMostrarExport(null)}
                  className="text-muted-foreground hover:text-foreground text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                <BinExport bin={binesCreados[mostrarExport].contenido} />
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-green-50 border-2 border-green-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
              ✓
            </div>
            <h2 className="text-display-xs font-bold text-green-900">
              Recepción Guardada Exitosamente
            </h2>
          </div>

          <p className="text-body-sm text-green-800 mb-6">
            Se crearon <strong>{binesCreados.length}</strong> caja(s) con{' '}
            <strong>
              {binesCreados.reduce((sum, b) => sum + b.contenido.items.length, 0)}
            </strong>{' '}
            referencias.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {binesCreados.map((bin, idx) => (
              <div key={bin.binId} className="rounded-lg border border-green-200 bg-white p-4">
                <div className="mb-4">
                  <h3 className="font-mono font-bold text-foreground text-body-md mb-1">
                    {bin.contenido.codigo}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {bin.contenido.items.length} referencias · {' '}
                    {bin.contenido.items.reduce((sum, item) => sum + item.cantidad, 0)} unidades
                  </p>
                </div>

                <div className="mb-4 max-h-32 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-black/10">
                        <th className="text-left py-1 font-semibold">Ref</th>
                        <th className="text-right py-1 font-semibold">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bin.contenido.items.map(item => (
                        <tr key={item.recepcion_id} className="border-b border-black/5">
                          <td className="py-1">{item.referencia}</td>
                          <td className="text-right">{item.cantidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => setMostrarExport(idx)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white font-semibold text-body-sm transition-all hover:bg-primary-700"
                >
                  <Download className="w-4 h-4" />
                  Descargar Etiqueta
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-green-200">
            <button
              onClick={() => {
                setPaso('formulario')
                setBinesCreados([])
                setError(null)
              }}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold text-body-sm transition-all hover:bg-green-700"
            >
              Registrar Otro Ingreso
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-body-sm text-red-900">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-neu-base shadow-neu p-6">
        <h2 className="text-body-lg font-semibold text-foreground mb-4">
          Agrupar Recepción en Cajas/Bins
        </h2>
        <p className="text-body-sm text-muted-foreground mb-6">
          Organiza las referencias recibidas en cajas físicas. Cada caja recibirá un código único
          que puedes descargar como etiqueta.
        </p>

        <RecepcionPTConBins
          ocId={ocId}
          bodegaId={bodegaId}
          productosActivos={productosActivos}
          onGuardar={handleGuardarRecepcion}
        />
      </div>

      {cargando && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
            <p className="text-body-sm font-semibold text-foreground">
              Creando bins y registrando recepción...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
