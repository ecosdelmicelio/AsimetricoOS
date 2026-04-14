import { FlaskConical } from 'lucide-react'
import { PageHeader } from '@/shared/components/page-header'
import { DesarrolloForm } from '@/features/desarrollo/components/desarrollo-form'
import { getClientesParaDesarrollo } from '@/features/desarrollo/services/desarrollo-actions'

export default async function NuevoDesarrolloPage() {
  const { data: clientes } = await getClientesParaDesarrollo()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Desarrollo"
        subtitle="Inicia el ciclo de vida de un nuevo producto"
        icon={FlaskConical}
      />
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <DesarrolloForm clientes={clientes} />
      </div>
    </div>
  )
}
