import { Suspense } from 'react'
import { getAllTerceros } from '@/features/terceros/services/terceros-actions'
import { getMarcas } from '@/features/configuracion/services/marcas-actions'
import { getAllDirecciones } from '@/features/terceros/services/tercero-direcciones-actions'
import { getAllContactos } from '@/features/terceros/services/tercero-contactos-actions'
import { TercerosPanel } from '@/features/terceros/components/terceros-panel'

export const metadata = { title: 'Terceros' }

async function Content() {
  const [terceros, marcas, direcciones, contactos] = await Promise.all([
    getAllTerceros(),
    getMarcas(),
    getAllDirecciones(),
    getAllContactos(),
  ])
  return <TercerosPanel terceros={terceros} marcas={marcas} direcciones={direcciones} contactos={contactos} />
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
      <div>
        <h1 className="text-display-xs font-heading font-bold text-foreground">Terceros</h1>
        <p className="text-muted-foreground text-body-sm mt-1">
          Clientes, talleres satélites y proveedores de materia prima
        </p>
      </div>
      <Suspense fallback={<Skeleton />}>
        <Content />
      </Suspense>
    </div>
  )
}
