'use client'

import { Printer } from 'lucide-react'

export function ClientPrintHandler() {
  return (
    <button 
      onClick={() => window.print()}
      className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black shadow-xl shadow-primary-100 transition-all active:scale-95 text-sm"
    >
      <Printer className="w-4 h-4" /> Imprimir Reporte
    </button>
  )
}
