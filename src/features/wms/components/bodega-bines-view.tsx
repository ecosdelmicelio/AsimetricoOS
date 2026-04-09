'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { getBinesByBodega, getContenidoBin } from '@/features/bines/services/bines-actions'
import { BinCard } from '@/features/wms/components/bin-card'
import type { Bodega } from '@/features/wms/types'
import type { Bin, BinContenido } from '@/features/bines/types'

interface Props {
  bodega: Bodega
}

export function BodegaBinesView({ bodega }: Props) {
  const [bines, setBines] = useState<Bin[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBin, setExpandedBin] = useState<string | null>(null)
  const [contenidos, setContenidos] = useState<Record<string, BinContenido | null>>({})

  useEffect(() => {
    const loadBines = async () => {
      setLoading(true)
      try {
        const binData = await getBinesByBodega(bodega.id)
        setBines(binData)
      } catch (e) {
        console.error('Error cargando bines:', e)
      }
      setLoading(false)
    }

    loadBines()
  }, [bodega.id])

  const handleExpandBin = async (binId: string) => {
    if (expandedBin === binId) {
      setExpandedBin(null)
      return
    }

    setExpandedBin(binId)

    // Cargar contenido si no está en caché
    if (!contenidos[binId]) {
      try {
        const contenido = await getContenidoBin(binId)
        setContenidos(prev => ({
          ...prev,
          [binId]: contenido,
        }))
      } catch (e) {
        console.error('Error cargando contenido del bin:', e)
      }
    }
  }

  const binesEnBodega = bines.filter(b => b.estado === 'en_bodega')
  const binesOtros = bines.filter(b => b.estado !== 'en_bodega')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{bodega.nombre}</h2>
        <p className="text-muted-foreground text-sm">
          {bodega.codigo} • {bines.length} bines totales
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Cargando bines...
        </div>
      ) : bines.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay bines en esta bodega
        </div>
      ) : (
        <>
          {/* Bines en bodega */}
          {binesEnBodega.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">
                En Bodega ({binesEnBodega.length})
              </h3>
              <div className="space-y-2">
                {binesEnBodega.map(bin => (
                  <div
                    key={bin.id}
                    className="bg-neu-base border border-neu-300 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => handleExpandBin(bin.id)}
                      className="w-full text-left px-4 py-3 hover:bg-neu-100 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-sm">{bin.codigo}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {bin.tipo.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          expandedBin === bin.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expandedBin === bin.id && (
                      <BinCard contenido={contenidos[bin.id]} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bines en tránsito / entregados */}
          {binesOtros.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Otros ({binesOtros.length})
              </h3>
              <div className="space-y-2">
                {binesOtros.map(bin => (
                  <div
                    key={bin.id}
                    className="bg-neu-base border border-neu-300 rounded-xl px-4 py-3 opacity-60"
                  >
                    <p className="font-semibold text-sm">{bin.codigo}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {bin.estado.replace(/_/g, ' ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
