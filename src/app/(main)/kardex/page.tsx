import { KardexDashboard } from '@/features/kardex/components/kardex-dashboard'
import {
  getSaldosKardexMP,
  getSaldosKardexPT,
  getSaldosPorBin,
  getHistorialKardexMP,
  getHistorialKardexPT,
  getBodegas,
  getTiposMovimientoKardex,
  getProductosActivos,
  getMaterialesActivos,
} from '@/features/kardex/services/kardex-actions'

export default async function KardexPage() {
  const [
    saldosMP,
    saldosPT,
    saldosBin,
    historialMP,
    historialPT,
    bodegas,
    tiposMovimiento,
    productos,
    materiales,
  ] = await Promise.all([
    getSaldosKardexMP(),
    getSaldosKardexPT(),
    getSaldosPorBin(),
    getHistorialKardexMP(),
    getHistorialKardexPT(),
    getBodegas(),
    getTiposMovimientoKardex(),
    getProductosActivos(),
    getMaterialesActivos(),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display-xs font-heading font-bold text-foreground">Kardex</h1>
        <p className="text-muted-foreground text-body-sm mt-1">
          Dashboard de inventario con saldos y movimientos
        </p>
      </div>

      <KardexDashboard
        saldosMP={saldosMP}
        saldosPT={saldosPT}
        saldosBin={saldosBin}
        historialMP={historialMP}
        historialPT={historialPT}
        materiales={materiales}
        productos={productos}
        bodegas={bodegas}
        tiposMovimiento={tiposMovimiento}
      />
    </div>
  )
}
