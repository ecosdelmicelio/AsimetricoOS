import { Suspense } from 'react'
import { getOrdenVentaById } from '@/features/ordenes-venta/services/ov-actions'
import { getDespachosByOV, getBinesDisponiblesParaOV } from '@/features/ordenes-venta/services/despachos-actions'
import { OVDespachos } from '@/features/ordenes-venta/components/ov-despachos'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ ov_id?: string }>
}

export default async function NuevoDespachoPage({ searchParams }: Props) {
  const { ov_id } = await searchParams

  if (!ov_id) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-black text-slate-800">Error de Referencia</h1>
        <p className="text-slate-500 mt-2">No se especificó una Orden de Venta para el despacho.</p>
        <Link href="/despachos" className="mt-4 inline-block text-primary-600 font-bold underline">Volver al Dashboard</Link>
      </div>
    )
  }

  const { data: ov } = await getOrdenVentaById(ov_id)
  if (!ov) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-black text-slate-800">Orden no encontrada</h1>
        <Link href="/despachos" className="mt-4 inline-block text-primary-600 font-bold underline">Volver al Dashboard</Link>
      </div>
    )
  }

  const [despachos, bines] = await Promise.all([
    getDespachosByOV(ov_id),
    getBinesDisponiblesParaOV(ov_id)
  ])

  return (
    <main className="max-w-6xl mx-auto p-6 lg:p-12">
      <div className="mb-10 flex items-center gap-4">
        <Link 
          href="/despachos" 
          className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Preparación de Despacho</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Orden de Venta: {ov.codigo} • {ov.terceros?.nombre}</p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden p-8 sm:p-12">
        <Suspense fallback={<div className="py-20 text-center animate-pulse font-black text-slate-200">CARGANDO TERMINAL DE LOGÍSTICA...</div>}>
          <OVDespachos 
            ovId={ov_id}
            despachos={despachos}
            binesDisponibles={bines}
            detallesOV={ov.ov_detalle || []}
            estado={ov.estado}
          />
        </Suspense>
      </div>
    </main>
  )
}
