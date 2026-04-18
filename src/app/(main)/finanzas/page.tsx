import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/shared/components/page-header'
import { FinanzasShell } from '@/features/finanzas/components/finanzas-shell'

export const metadata = {
  title: 'Finanzas e Inteligencia | Asimétrico OS',
  description: 'Gestión de tesorería, cartera y flujo de caja estratégico.',
}

export default function FinanzasPage() {
  return (
    <div className="space-y-6 h-full">
      <PageHeader 
        title="Finanzas e Inteligencia"
        subtitle="Control de tesorería, visualización de cartera y balances de flujo de caja"
        icon={BarChart3}
      />

      <FinanzasShell />
    </div>
  )
}
