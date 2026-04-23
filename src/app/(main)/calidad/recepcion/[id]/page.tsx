import { notFound } from 'next/navigation'
import { getRecepcionById, getTiposDefectoFiltrados } from '@/features/calidad/services/calidad-actions'
import { RecepcionInspeccionForm } from '@/features/calidad/components/recepcion-inspeccion-form'
import { PageHeader } from '@/shared/components/page-header'
import { ShieldAlert, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RecepcionInspeccionPage({ params }: Props) {
  const { id } = await params
  const recepcion = await getRecepcionById(id)

  if (!recepcion) notFound()

  // Determinar el tipo de producto/material para filtrar defectos
  const tipoItem = recepcion.material_id 
    ? recepcion.materiales?.tipo 
    : recepcion.productos?.tipo_producto

  const tiposDefecto = await getTiposDefectoFiltrados(tipoItem)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link 
          href="/calidad" 
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
            <ChevronLeft className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Volver al Hub</span>
        </Link>
      </div>

      <PageHeader
        title="Inspección de Ingreso"
        subtitle={`Validación técnica para recepción ${recepcion.ordenes_compra?.codigo}`}
        icon={ShieldAlert}
      />

      <RecepcionInspeccionForm 
        recepcion={recepcion} 
        tiposDefecto={tiposDefecto} 
      />
    </div>
  )
}
