import Link from 'next/link'
import { ArrowLeft, Package, Calendar, User, FileText, Factory, Globe } from 'lucide-react'
import { getOrdenVentaById, getHistorialOV } from '@/features/ordenes-venta/services/ov-actions'
import { OVStatusBadge } from './ov-status-badge'
import { OVActions } from './ov-actions'
import { HistorialEstados } from '@/shared/components/historial-estados'
import { formatDate, formatCurrency } from '@/shared/lib/utils'

interface Props {
  id: string
}

export async function OVDetail({ id }: Props) {
  const [{ data: ov, error }, { data: historial }] = await Promise.all([
    getOrdenVentaById(id),
    getHistorialOV(id),
  ])

  if (error || !ov) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 text-center">
        <p className="text-foreground font-medium">Orden no encontrada</p>
        <Link href="/ordenes-venta" className="text-primary-600 text-body-sm mt-2 inline-block">
          ← Volver a la lista
        </Link>
      </div>
    )
  }

  const cliente = ov.terceros
  const detalles = ov.ov_detalle ?? []

  // Agrupar por producto
  const porProducto = detalles.reduce<
    Record<string, {
      nombre: string
      referencia: string
      lineas: typeof detalles
    }>
  >((acc, det) => {
    const pid = det.productos?.referencia ?? 'sin-ref'
    if (!acc[pid]) {
      acc[pid] = {
        nombre: det.productos?.nombre ?? 'Producto desconocido',
        referencia: det.productos?.referencia ?? '',
        lineas: [],
      }
    }
    acc[pid].lineas.push(det)
    return acc
  }, {})

  const totalUnidades = detalles.reduce((s, d) => s + d.cantidad, 0)
  const totalValor = detalles.reduce((s, d) => s + d.cantidad * d.precio_pactado, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ordenes-venta"
            className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-display-xs font-heading font-bold text-foreground">{ov.codigo}</h1>
              <OVStatusBadge estado={ov.estado} />
            </div>
            <p className="text-muted-foreground text-body-sm mt-0.5">
              {cliente?.nombre ?? 'Cliente desconocido'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(ov.estado === 'confirmada' || ov.estado === 'en_produccion') && (
            <Link
              href={`/ordenes-produccion/nueva?ov=${id}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-neu-base shadow-neu text-muted-foreground font-semibold text-body-sm transition-all active:shadow-neu-inset hover:shadow-neu-lg"
            >
              <Factory className="w-4 h-4" />
              Crear OP
            </Link>
          )}
          <OVActions ovId={id} estadoActual={ov.estado} />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoCard icon={<User className="w-4 h-4" />} label="Cliente" value={cliente?.nombre ?? '—'} />
        <InfoCard icon={<Calendar className="w-4 h-4" />} label="Entrega" value={formatDate(ov.fecha_entrega)} />
        <InfoCard icon={<Package className="w-4 h-4" />} label="Unidades" value={totalUnidades.toString()} />
        <InfoCard icon={<FileText className="w-4 h-4" />} label="Total" value={formatCurrency(totalValor)} />
      </div>

      {/* Banner Origen USA — se muestra si cualquier producto tiene origen_usa */}
      {detalles.some(d => d.productos?.origen_usa) && (
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50 border border-blue-200 px-5 py-3">
          <Globe className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <p className="text-body-sm font-semibold text-blue-700">Origen USA 🇺🇸</p>
            <p className="text-xs text-blue-600">
              Esta orden contiene productos que requieren etiquetas en inglés, composición de fibras y origen &quot;Made in Colombia&quot;
            </p>
          </div>
        </div>
      )}

      {/* Notas */}
      {ov.notas && (
        <div className="rounded-2xl bg-neu-base shadow-neu p-5">
          <p className="text-body-sm font-medium text-muted-foreground mb-1">Notas</p>
          <p className="text-body-sm text-foreground">{ov.notas}</p>
        </div>
      )}

      {/* Detalle por producto */}
      <div className="space-y-3">
        <h2 className="font-semibold text-foreground text-body-md">Detalle de Productos</h2>

        {Object.values(porProducto).map(({ nombre, referencia, lineas }) => {
          const subtotal = lineas.reduce((s, l) => s + l.cantidad * l.precio_pactado, 0)
          const uds = lineas.reduce((s, l) => s + l.cantidad, 0)

          return (
            <div key={referencia} className="rounded-2xl bg-neu-base shadow-neu overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-body-sm">{referencia}</span>
                  <span className="text-muted-foreground text-body-sm">{nombre}</span>
                  {lineas[0]?.productos?.origen_usa && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                      <Globe className="w-2.5 h-2.5" />
                      USA
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-semibold text-foreground text-body-sm">{uds} uds</span>
                  <span className="text-muted-foreground text-body-sm ml-2">{formatCurrency(subtotal)}</span>
                </div>
              </div>
              <div className="px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  {lineas.map(l => (
                    <div
                      key={l.id}
                      className="flex items-center gap-2 rounded-xl bg-neu-base shadow-neu-inset px-3 py-2"
                    >
                      <span className="text-xs font-bold text-foreground w-8 text-center">{l.talla}</span>
                      <span className="text-xs text-muted-foreground">×</span>
                      <span className="text-xs font-semibold text-foreground">{l.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Total final */}
      <div className="rounded-2xl bg-neu-base shadow-neu p-5 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-body-sm">Valor total de la OV</p>
          <p className="text-display-xs font-bold text-foreground">{formatCurrency(totalValor)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-body-sm">Fecha pedido</p>
          <p className="text-body-sm font-medium text-foreground">{formatDate(ov.created_at ?? '')}</p>
        </div>
      </div>

      {/* Historial de estados */}
      <HistorialEstados
        historial={historial}
        createdAt={ov.created_at ?? ov.fecha_pedido}
        createdBy={null}
      />
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-neu-base shadow-neu p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-body-sm">{label}</span>
      </div>
      <p className="font-semibold text-foreground text-body-sm truncate">{value}</p>
    </div>
  )
}
