import { KardexTabs } from '@/features/kardex/components/kardex-tabs'
import {
  getSaldosKardexMP,
  getSaldosKardexPT,
  getHistorialKardexMP,
  getHistorialKardexPT,
  getBodegas,
  getTiposMovimientoKardex,
} from '@/features/kardex/services/kardex-actions'
import { getMateriales } from '@/features/materiales/services/materiales-actions'
import { getProductos } from '@/features/productos/services/producto-actions'

export default async function KardexPage() {
  const [saldosMP, saldosPT, historialMP, historialPT, materiales, productos, bodegas, tiposMovimiento] =
    await Promise.all([
      getSaldosKardexMP(),
      getSaldosKardexPT(),
      getHistorialKardexMP(),
      getHistorialKardexPT(),
      getMateriales(),
      getProductos(),
      getBodegas(),
      getTiposMovimientoKardex(),
    ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-xs font-heading text-foreground font-bold">Kardex</h1>
        <p className="text-muted-foreground text-body-sm mt-1">
          Saldos actuales y historial de movimientos de inventario
        </p>
      </div>

      <KardexTabs
        saldosMP={saldosMP}
        saldosPT={saldosPT}
        historialMP={historialMP}
        historialPT={historialPT}
        materiales={materiales.map(m => ({ id: m.id, codigo: m.codigo, nombre: m.nombre }))}
        productos={productos.map(p => ({ id: p.id, referencia: p.referencia, nombre: p.nombre }))}
        bodegas={bodegas.map(b => ({ id: b.id, nombre: b.nombre }))}
        tiposMovimiento={tiposMovimiento.map(t => ({ id: t.id, nombre: t.nombre }))}
      />
    </div>
  )
}
