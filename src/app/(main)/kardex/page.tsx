import { Box } from 'lucide-react'
import { PageHeader } from '@/shared/components/page-header'
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
    <div className="space-y-8">
      <PageHeader
        title="Torre de Control de Inventarios"
        subtitle="Monitoreo en tiempo real de saldos y trazabilidad de movimientos"
        icon={Box}
      />

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
