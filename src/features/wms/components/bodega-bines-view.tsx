'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, MapPin, Lock, Package } from 'lucide-react'
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
                    className="bg-neu-base border border-neu-300 rounded-2xl overflow-hidden shadow-neu-sm transition-all hover:shadow-neu"
                  >
                    <button
                      onClick={() => handleExpandBin(bin.id)}
                      className="w-full text-left px-5 py-4 hover:bg-neu-100/50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${bin.es_fijo ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
                          {bin.es_fijo ? <Lock className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm flex items-center gap-2">
                            {bin.codigo}
                            {bin.es_fijo && (
                              <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Fijo</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                              {bin.tipo.replace(/_/g, ' ')}
                            </span>
                            {bin.posicion_codigo && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-neu-300" />
                                <span className="text-[10px] text-primary-600 font-bold flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {bin.posicion_codigo}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-neu-400 transition-transform ${
                          expandedBin === bin.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expandedBin === bin.id && (
                      <div className="border-t border-neu-200 bg-neu-50/30">
                        <BinCard contenido={contenidos[bin.id]} />
                      </div>
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
