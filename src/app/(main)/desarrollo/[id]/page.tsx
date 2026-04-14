import { notFound } from 'next/navigation'
import { getDesarrolloById } from '@/features/desarrollo/services/desarrollo-actions'
import { getTalleresParaMuestra, getProveedoresParaMuestra } from '@/features/desarrollo/services/muestra-actions'
import { DesarrolloDetail } from '@/features/desarrollo/components/desarrollo-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DesarrolloDetailPage({ params }: Props) {
  const { id } = await params
  const [{ data, error }, { data: talleres }, { data: proveedores }] = await Promise.all([
    getDesarrolloById(id),
    getTalleresParaMuestra(),
    getProveedoresParaMuestra(),
  ])

  if (error || !data) notFound()

  return <DesarrolloDetail desarrollo={data} talleres={talleres} proveedores={proveedores} />
}
