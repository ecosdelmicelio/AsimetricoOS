'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { updateProducto } from '@/features/productos/services/producto-actions'
import type { EstadoProducto } from '@/features/productos/types'

interface Props {
  productoId: string
  estadoActual: EstadoProducto
}

export function ProductoEstadoToggle({ productoId, estadoActual }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const esActivo = estadoActual === 'activo'

  function handleToggle() {
    startTransition(async () => {
      await updateProducto(productoId, {
        estado: esActivo ? 'descontinuado' : 'activo',
      })
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-body-sm font-semibold transition-all disabled:opacity-50 ${
        esActivo
          ? 'bg-neu-base shadow-neu text-muted-foreground hover:text-red-600'
          : 'bg-green-50 text-green-700 hover:bg-green-100'
      }`}
    >
      {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {esActivo ? 'Descontinuar' : 'Reactivar'}
    </button>
  )
}
