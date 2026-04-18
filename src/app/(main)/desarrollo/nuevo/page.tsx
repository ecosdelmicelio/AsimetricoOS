import { FlaskConical } from 'lucide-react'
import { PageHeader } from '@/shared/components/page-header'
import { DesarrolloForm } from '@/features/desarrollo/components/desarrollo-form'
import { getClientesParaDesarrollo, getProductosPadre } from '@/features/desarrollo/services/desarrollo-actions'

export default async function NuevoDesarrolloPage() {
  const [clientesRes, chasisRes] = await Promise.all([
    getClientesParaDesarrollo(),
    getProductosPadre()
  ])

  const clientes = clientesRes.data || []
  const chasis = chasisRes.data || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Desarrollo (Sprint 7)"
        subtitle="Inicia un Formulario de Alta Resolución para el laboratorio"
        icon={FlaskConical}
      />
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <DesarrolloForm clientes={clientes} chasis={chasis} />
      </div>
    </div>
  )
}
