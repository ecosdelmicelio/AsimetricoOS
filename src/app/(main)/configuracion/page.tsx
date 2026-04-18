import { getCalidadConfig } from '@/features/calidad/services/calidad-config-actions'
import { getTiposMovimiento } from '@/features/configuracion/services/tipos-movimiento-actions'
import { getAtributosPT } from '@/features/productos/services/atributo-actions'
import { getAtributosMP } from '@/features/materiales/services/atributo-actions'
import { getTipoServicioAtributos } from '@/features/servicios/services/atributo-servicio-actions'
import { getBodegas, getBodegaDefaultId } from '@/features/wms/services/bodegas-actions'
import { getAjustes } from '@/features/configuracion/services/ajustes-actions'
import { ConfiguracionTabs } from '@/features/configuracion/components/configuracion-tabs'
import { PageHeader } from '@/shared/components/page-header'
import { Settings2 } from 'lucide-react'
import { createClient } from '@/shared/lib/supabase/server'
import { getBalanceConfig, getActivosFijos } from '@/features/finanzas/services/activos-actions'
import { getEmpleados, getParafiscalesConfig } from '@/features/finanzas/services/empleados-actions'
import { getSocios } from '@/features/finanzas/services/socios-actions'

export const dynamic = 'force-dynamic' // Forzar carga fresca en cada visita
export const revalidate = 0

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

async function getTiposDefecto() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('tipos_defecto')
    .select('id, codigo, nombre, categoria')
    .order('codigo')
  return data ?? []
}

export default async function ConfiguracionPage() {
  const [
    tiposDefecto, 
    tiposMovimiento, 
    calidadConfig, 
    atributosPT, 
    atributosMP, 
    atributosServicios, 
    bodegas, 
    bodegaDefaultId, 
    ajustes,
    balanceConfig,
    activos,
    empleados,
    parafiscales,
    socios
  ] = await Promise.all([
    getTiposDefecto(),
    getTiposMovimiento(),
    getCalidadConfig(),
    getAtributosPT(),
    getAtributosMP(),
    getTipoServicioAtributos(),
    getBodegas(),
    getBodegaDefaultId(),
    getAjustes(),
    getBalanceConfig(),
    getActivosFijos(),
    getEmpleados(),
    getParafiscalesConfig(),
    getSocios()
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        subtitle="Esquemas de códigos, tablas maestras y parámetros del sistema"
        icon={Settings2}
      />

      <ConfiguracionTabs
        tiposDefecto={tiposDefecto}
        tiposMovimiento={tiposMovimiento}
        calidadConfig={calidadConfig}
        atributosPT={atributosPT}
        atributosMP={atributosMP}
        atributosServicios={atributosServicios}
        bodegas={bodegas}
        bodegaDefaultId={bodegaDefaultId}
        ajustes={ajustes.data || []}
        // Finanzas & HR
        balanceConfig={balanceConfig}
        activos={activos}
        empleados={empleados}
        parafiscales={parafiscales}
        socios={socios}
      />
    </div>
  )
}
