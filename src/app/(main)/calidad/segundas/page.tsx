import { SegundasDashboard } from '@/features/calidad/components/segundas-dashboard'
import { getSegundasTracking } from '@/features/calidad/services/calidad-actions'
import { AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Control de Segundas | Calidad | Asimetrico',
}

export default async function SegundasPage() {
  const segundas = await getSegundasTracking()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tighter text-slate-900 flex items-center gap-2 uppercase">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          Control Global de Segundas
        </h1>
        <p className="text-slate-500 font-medium text-sm mt-1">
          Monitor de prendas retenidas en bodega de segundas y en proceso de recuperación.
        </p>
      </div>

      <SegundasDashboard segundas={segundas} />
    </div>
  )
}
