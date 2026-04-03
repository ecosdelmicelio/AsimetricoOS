import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, FileText, Package } from 'lucide-react'
import { getOrdenCompraById, getMateriales, getRecepcionesByOC } from '@/features/compras/services/compras-actions'
import { OCDocBadge, OCGreigeBadge } from './oc-status-badge'
import { RollosPanel } from './rollos-panel'
import { RecepcionOC } from './recepcion-oc'
import { DocEstadoSelector } from './doc-estado-selector'
import { formatDate } from '@/shared/lib/utils'

interface Props {
  id: string
}

export async function CompraDetail({ id }: Props) {
  const [oc, materiales, recepciones] = await Promise.all([
    getOrdenCompraById(id),
    getMateriales(),
    getRecepcionesByOC(id),
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

      {/* Rollos */}
      <RollosPanel ocId={oc.id} rollos={oc.rollos} materiales={materiales} />

      {/* Recepciones */}
      <RecepcionOC oc={oc} recepciones={recepciones} />
    </div>
  )
}
