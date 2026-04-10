'use client'

import { useEffect, useState } from 'react'
import { getTraslados } from '@/features/wms/services/traslados-actions'
import type { Traslado } from '@/features/wms/types'

interface Props {
  bodegaId?: string
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  completado: 'bg-green-50 text-green-700 border-green-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
}

const TIPO_LABELS: Record<string, string> = {
  entre_bodegas: 'Entre Bodegas',
  bin_completo: 'Bin Completo',
  bin_a_bin: 'Bin a Bin',
}

export function TrasladosHistorial({ bodegaId }: Props) {
  const [traslados, setTraslados] = useState<Traslado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTraslados = async () => {
      setLoading(true)
      try {
        const data = await getTraslados(bodegaId)
        setTraslados(data)
      } catch (e) {
        console.error('Error cargando traslados:', e)
      }
      setLoading(false)
    }

    loadTraslados()
  }, [bodegaId])

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando traslados...</div>
  }

  if (traslados.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay traslados
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Historial de Traslados</h3>

      <div className="rounded-xl border border-neu-300 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neu-100 border-b border-neu-300">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Código</th>
              <th className="text-left px-4 py-2 font-medium">Tipo</th>
              <th className="text-left px-4 py-2 font-medium">Estado</th>
              <th className="text-left px-4 py-2 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neu-300">
            {traslados.map(traslado => (
              <tr key={traslado.id} className="hover:bg-neu-50">
                <td className="px-4 py-2 font-mono text-xs">{traslado.codigo}</td>
                <td className="px-4 py-2 text-xs">{TIPO_LABELS[traslado.tipo] || traslado.tipo}</td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded border ${
                      ESTADO_COLORS[traslado.estado] ||
                      'bg-neu-100 text-foreground'
                    }`}
                  >
                    {traslado.estado}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  {new Date(traslado.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
