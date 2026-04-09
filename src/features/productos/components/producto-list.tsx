import Link from 'next/link'
import { ChevronRight, Package } from 'lucide-react'
import { getProductos } from '@/features/productos/services/producto-actions'
import { getSaldosTotalesPorProducto } from '@/features/kardex/services/kardex-actions'
import { formatCurrency } from '@/shared/lib/utils'

export async function ProductoList() {
  const [productos, saldosTotales] = await Promise.all([
    getProductos(),
    getSaldosTotalesPorProducto(),
  ])

  if (productos.length === 0) {
    return (
      <div className="rounded-2xl bg-neu-base shadow-neu p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-inset flex items-center justify-center mx-auto mb-3">
          <Package className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">Sin productos aún</p>
        <p className="text-muted-foreground text-body-sm mt-1">
          Crea tu primer producto para empezar
        </p>
      </div>
    )
  }

  // Agrupar por categoría
  const porCategoria = productos.reduce<Record<string, typeof productos>>((acc, p) => {
    const cat = p.categoria
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(porCategoria).map(([categoria, items]) => (
        <section key={categoria} className="space-y-2">
          <h2 className="text-body-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
            {categoria} ({items.length})
          </h2>
          <div className="space-y-2">
            {items.map(p => (
              <Link
                key={p.id}
                href={`/catalogo/${p.id}`}
                className="flex items-center justify-between rounded-xl bg-neu-base shadow-neu px-4 py-3 transition-all hover:shadow-neu-lg active:shadow-neu-inset"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg">
                      {p.referencia}
                    </span>
                    <span className="font-semibold text-foreground text-body-sm truncate">
                      {p.nombre}
                    </span>
                    {p.estado === 'inactivo' && (
                      <span className="text-xs text-muted-foreground bg-neu-base shadow-neu-inset px-2 py-0.5 rounded-lg">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {p.precio_base && (
                      <p className="text-muted-foreground text-body-sm">
                        Precio base: {formatCurrency(p.precio_base)}
                      </p>
                    )}
                    {(saldosTotales[p.id] ?? 0) > 0 && (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-lg whitespace-nowrap">
                        {saldosTotales[p.id]} uds
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
