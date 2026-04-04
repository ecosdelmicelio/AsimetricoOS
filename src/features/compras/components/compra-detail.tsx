import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, FileText, Package } from 'lucide-react'
import { getOrdenCompraById, getMateriales, getRecepcionesByOC, getBodegaPrincipal } from '@/features/compras/services/compras-actions'
import { getProductosActivos } from '@/features/kardex/services/kardex-actions'
import { OCDocBadge, OCGreigeBadge } from './oc-status-badge'
import { RecepcionOC } from './recepcion-oc'
import { RecepcionPTManager } from './recepcion-pt-manager'
import { DocEstadoSelector } from './doc-estado-selector'
import { formatDate } from '@/shared/lib/utils'

interface Props {
  id: string
}

export async function CompraDetail({ id }: Props) {
  const [oc, materiales, recepciones, productosActivos, bodegaPrincipal] = await Promise.all([
    getOrdenCompraById(id),
    getMateriales(),
    getRecepcionesByOC(id),
    getProductosActivos(),
    getBodegaPrincipal(),
  ])

  if (!oc) notFound()

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/compras"
          className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Compras
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-display-xs font-heading font-bold text-foreground">{oc.codigo}</h1>
            <p className="text-muted-foreground text-body-sm mt-1">
              {oc.terceros?.nombre ?? 'Sin proveedor'}
            </p>
          </div>
          <OCDocBadge estado={oc.estado_documental} />
        </div>
      </div>

      {/* Datos generales */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-6">
        <h2 className="font-semibold text-foreground text-body-md mb-4">Datos de la orden</h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado tela</p>
            <OCGreigeBadge estado={oc.estado_greige} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5" />
              Fecha OC
            </div>
            <p className="text-body-sm text-foreground font-medium">{formatDate(oc.fecha_oc)}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5" />
              Entrega est.
            </div>
            <p className="text-body-sm text-foreground font-medium">{formatDate(oc.fecha_entrega_est)}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Package className="w-3.5 h-3.5" />
              Rollos
            </div>
            <p className="text-body-sm text-foreground font-medium">{oc.rollos.length}</p>
          </div>
        </div>

        {oc.notas && (
          <div className="mt-4 rounded-xl bg-neu-base shadow-neu-inset px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
              <FileText className="w-3.5 h-3.5" />
              Notas
            </div>
            <p className="text-body-sm text-foreground">{oc.notas}</p>
          </div>
        )}
      </div>

      {/* Estado documental (editable) */}
      <DocEstadoSelector ocId={oc.id} estadoActual={oc.estado_documental} />

      {/* Líneas solicitadas en la OC */}
      {oc.tipo === 'materia_prima' ? (
        // MP: Mostrar oc_detalle_mp
        oc.oc_detalle_mp && oc.oc_detalle_mp.length > 0 ? (
          <div className="rounded-2xl bg-neu-base shadow-neu p-6">
            <h2 className="font-semibold text-foreground text-body-md mb-4">Materiales Solicitados</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left py-2 px-3 font-semibold">Código</th>
                    <th className="text-left py-2 px-3 font-semibold">Material</th>
                    <th className="text-right py-2 px-3 font-semibold">Cantidad</th>
                    <th className="text-right py-2 px-3 font-semibold">Precio Unit</th>
                    <th className="text-right py-2 px-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {oc.oc_detalle_mp.map((detalle: any) => (
                    <tr key={detalle.id} className="border-b border-black/5">
                      <td className="py-2 px-3 font-mono text-muted-foreground">{detalle.materiales?.codigo}</td>
                      <td className="py-2 px-3">{detalle.materiales?.nombre}</td>
                      <td className="py-2 px-3 text-right">{detalle.cantidad} {detalle.materiales?.unidad}</td>
                      <td className="py-2 px-3 text-right">${detalle.precio_unitario?.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-semibold">${(detalle.cantidad * detalle.precio_unitario).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-black/10 flex justify-end">
                <div className="text-right">
                  <p className="text-muted-foreground text-body-xs">Total OC</p>
                  <p className="text-display-sm font-bold text-foreground">
                    ${oc.oc_detalle_mp.reduce((sum: number, d: any) => sum + (d.cantidad * d.precio_unitario), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null
      ) : (
        // PT: Mostrar productos de oc_detalle
        oc.oc_detalle && oc.oc_detalle.length > 0 ? (
          <div className="rounded-2xl bg-neu-base shadow-neu p-6">
            <h2 className="font-semibold text-foreground text-body-md mb-4">Productos Solicitados</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="text-left py-2 px-3 font-semibold">Referencia</th>
                    <th className="text-left py-2 px-3 font-semibold">Talla</th>
                    <th className="text-right py-2 px-3 font-semibold">Cantidad</th>
                    <th className="text-right py-2 px-3 font-semibold">Precio</th>
                    <th className="text-right py-2 px-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {oc.oc_detalle.map((detalle: any, idx: number) => (
                    <tr key={idx} className="border-b border-black/5">
                      <td className="py-2 px-3">
                        <p className="font-medium">{detalle.productos?.referencia}</p>
                        <p className="text-xs text-muted-foreground">{detalle.productos?.nombre}</p>
                      </td>
                      <td className="py-2 px-3">{detalle.talla}</td>
                      <td className="py-2 px-3 text-right">{detalle.cantidad}</td>
                      <td className="py-2 px-3 text-right">${detalle.precio_pactado?.toFixed(2) ?? '—'}</td>
                      <td className="py-2 px-3 text-right font-semibold">${(detalle.cantidad * (detalle.precio_pactado ?? 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-black/10 flex justify-end">
                <div className="text-right">
                  <p className="text-muted-foreground text-body-xs">Total OC</p>
                  <p className="text-display-sm font-bold text-foreground">
                    ${oc.oc_detalle.reduce((sum: number, d: any) => sum + (d.cantidad * (d.precio_pactado ?? 0)), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null
      )}

      {/* Recepciones */}
      <RecepcionOC oc={oc} recepciones={recepciones} />

      {/* Recepción PT (si aplica) */}
      {oc.tipo === 'producto_terminado' && bodegaPrincipal && (
        <RecepcionPTManager
          ocId={oc.id}
          bodegaId={bodegaPrincipal.id}
          productosActivos={productosActivos}
        />
      )}
    </div>
  )
}
