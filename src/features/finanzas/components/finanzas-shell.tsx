'use client'

import React, { useState, useEffect } from 'react'
import { FinanceSummaryCards } from './finance-summary-cards'
import { CarteraPanel } from './cartera-panel'
import { RegistrarPagoModal } from './registrar-pago-modal'
import type { CarteraItem, FinanzasSummary } from '../types'
import { getFinanzasCartera, getFinanzasSummary } from '../services/finanzas-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function FinanzasShell() {
  const [cartera, setCartera] = useState<CarteraItem[]>([])
  const [summary, setSummary] = useState<FinanzasSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<CarteraItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  async function loadData() {
    setLoading(true)
    const [carteraRes, summaryRes] = await Promise.all([
      getFinanzasCartera(),
      getFinanzasSummary()
    ])

    if (carteraRes.error) toast.error(carteraRes.error)
    if (summaryRes.error) toast.error(summaryRes.error)

    setCartera(carteraRes.data || [])
    setSummary(summaryRes.data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function handleOpenModal(item: CarteraItem) {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Calculando estados financieros...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Summary Section */}
      {summary && (
        <FinanceSummaryCards 
          ingresos={summary.total_ingresos}
          egresos={summary.total_egresos}
          balance={summary.balance}
        />
      )}

      {/* Cartera Section */}
      <CarteraPanel 
        data={cartera} 
        onRegistrarPago={handleOpenModal} 
      />

      <RegistrarPagoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        item={selectedItem}
      />
    </div>
  )
}
