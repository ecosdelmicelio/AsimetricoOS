import { getOrdenVentaById } from '@/features/ordenes-venta/services/ov-actions'
import { getOPsByOV } from '@/features/ordenes-produccion/services/op-actions'
import { getDespachosByOV } from '@/features/ordenes-venta/services/despachos-actions'
import { OVTrackerContent } from '@/features/ordenes-venta/components/ov-tracker-content'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TrackerPage({ params }: Props) {
  const { id } = await params

  const [
    { data: ov, error },
    ops,
    despachos
  ] = await Promise.all([
    getOrdenVentaById(id),
    getOPsByOV(id),
    getDespachosByOV(id),
  ])

  if (error || !ov) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Orden No Encontrada</h1>
          <p className="text-slate-500 mb-6 text-sm">Verifica el código de seguimiento o contacta a soporte.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-primary-600 font-bold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <nav className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-slate-200 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-200">
              A
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Asimétrico OS</p>
              <h2 className="text-base font-black text-slate-900 leading-tight tracking-tight">Customer Tracker</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400">ORDER:</span>
            <span className="text-sm font-black text-primary-700">{ov.codigo}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 mt-8">
        <OVTrackerContent 
          ov={ov} 
          ops={ops} 
          despachos={despachos} 
        />
      </main>

      <footer className="mt-20 text-center px-6">
        <p className="text-xs text-slate-400 font-medium italic">
          Manufacturado con excelencia por Asimétrico Lab Co. 🇨🇴
        </p>
      </footer>
    </div>
  )
}
