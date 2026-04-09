import { Suspense } from 'react'
import { createClient } from '@/shared/lib/supabase/server'
import { getAllTerceros } from '@/features/terceros/services/terceros-actions'
import { getMarcas } from '@/features/configuracion/services/marcas-actions'
import { getAllDirecciones } from '@/features/terceros/services/tercero-direcciones-actions'
import { getAllContactos } from '@/features/terceros/services/tercero-contactos-actions'
import { TercerosPanel } from '@/features/terceros/components/terceros-panel'
import { PageHeader } from '@/shared/components/page-header'
import { Users } from 'lucide-react'

export const metadata = { title: 'Terceros' }

async function Content() {
  const supabase = await createClient()
  const [terceros, marcas, direcciones, contactos] = await Promise.all([
    getAllTerceros(),
    getMarcas(),
    getAllDirecciones(),
    getAllContactos(),
  ])
  const { data: bodegasData } = await supabase
    .from('bodegas')
    .select('id, nombre')
    .order('nombre') as { data: Array<{ id: string; nombre: string }> | null }

  const bodegas = bodegasData ?? []
  return <TercerosPanel terceros={terceros} marcas={marcas} direcciones={direcciones} contactos={contactos} bodegas={bodegas} />
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="h-16 rounded-xl bg-neu-base shadow-neu animate-pulse" />
      ))}
    </div>
  )
}

export default function TercerosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio de Terceros"
        subtitle="Clientes, talleres satélites y proveedores"
        icon={Users}
      />
      <Suspense fallback={<Skeleton />}>
        <Content />
      </Suspense>
    </div>
  )
}
