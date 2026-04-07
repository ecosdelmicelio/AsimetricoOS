import { getSchemaByEntidad } from '@/features/codigo-schema/services/schema-actions'
import { getCalidadConfig } from '@/features/calidad/services/calidad-config-actions'
import { getTiposMovimiento } from '@/features/configuracion/services/tipos-movimiento-actions'
import { getAtributosPT } from '@/features/productos/services/atributo-actions'
import { getAtributosMP } from '@/features/materiales/services/atributo-actions'
import { ConfiguracionTabs } from '@/features/configuracion/components/configuracion-tabs'
import { createClient } from '@/shared/lib/supabase/server'

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
  const [schemaProducto, schemaMaterial, schemaServicio, tiposDefecto, tiposMovimiento, calidadConfig, atributosPT, atributosMP] =
    await Promise.all([
      getSchemaByEntidad('producto'),
      getSchemaByEntidad('material'),
      getSchemaByEntidad('servicio'),
      getTiposDefecto(),
      getTiposMovimiento(),
      getCalidadConfig(),
      getAtributosPT(),
      getAtributosMP(),
    ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-xs font-heading text-foreground font-bold">Configuración</h1>
        <p className="text-muted-foreground text-body-sm mt-1">
          Esquemas de códigos, tablas maestras y parámetros del sistema
        </p>
      </div>

      <ConfiguracionTabs
        schemaProducto={schemaProducto}
        schemaMaterial={schemaMaterial}
        schemaServicio={schemaServicio}
        tiposDefecto={tiposDefecto}
        tiposMovimiento={tiposMovimiento}
        calidadConfig={calidadConfig}
        atributosPT={atributosPT}
        atributosMP={atributosMP}
      />
    </div>
  )
}
