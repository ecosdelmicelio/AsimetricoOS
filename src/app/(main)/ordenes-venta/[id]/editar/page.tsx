'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { OVForm } from '@/features/ordenes-venta/components/ov-form'
import { createClient } from '@/shared/lib/supabase/client'
import type { OVConDetalle } from '@/features/ordenes-venta/types'

type Cliente = { id: string; nombre: string }
type Producto = {
  id: string
  nombre: string
  referencia: string
  color: string | null
  precio_base: number | null
  categoria: string | null
  origen_usa: boolean
}

interface Props {
  params: Promise<{ id: string }>
}

export default function EditarOVPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [ov, setOv] = useState<OVConDetalle | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()

        // Fetch OV, Clientes and Productos
        const [ovRes, clientesRes, productosRes] = await Promise.all([
          supabase
            .from('ordenes_venta')
            .select('*, terceros!cliente_id ( nombre ), ov_detalle ( *, productos ( nombre, referencia, color, origen_usa ) )')
            .eq('id', id)
            .single(),
          supabase
            .from('terceros')
            .select('id, nombre, tipos')
            .eq('estado', 'activo')
            .order('nombre'),
          supabase
            .from('productos')
            .select('id, nombre, referencia, precio_base, categoria, origen_usa, color')
            .eq('estado', 'activo')
            .order('nombre'),
        ])

        if (ovRes.error) throw new Error('No se pudo encontrar la orden')
        
        const data = ovRes.data as OVConDetalle
        if (data.estado !== 'borrador') {
          setError('Solo se pueden editar órdenes en estado borrador')
          return
        }

        setOv(data)

        const filteredClientes: Cliente[] = (clientesRes.data as any[])
          ?.filter(t => Array.isArray(t.tipos) && t.tipos.includes('cliente'))
          .map(t => ({ id: t.id, nombre: t.nombre })) || []

        setClientes(filteredClientes)
        setProductos(productosRes.data as Producto[] || [])
      } catch (err: any) {
        setError(err.message || 'Error cargando datos')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
          <p className="text-muted-foreground">Cargando datos de la orden...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-8 rounded-2xl bg-neu-base shadow-neu text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-display-xs font-bold text-foreground">Acceso Denegado</h2>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Link
          href={`/ordenes-venta/${id}`}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neu-base shadow-neu text-primary-700 font-bold text-body-sm transition-all active:shadow-neu-inset"
        >
          Volver al detalle
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/ordenes-venta/${id}`}
          className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-display-xs font-heading font-bold text-foreground">Editar Borrador</h1>
            <span className="text-body-xs font-mono bg-neu-base shadow-neu-inset px-2 py-0.5 rounded text-muted-foreground">
              {ov?.codigo}
            </span>
          </div>
          <p className="text-muted-foreground text-body-sm mt-0.5">Modifica las cantidades o productos de esta orden</p>
        </div>
      </div>

      {ov && (
        <OVForm 
          clientes={clientes} 
          productos={productos} 
          initialData={ov} 
        />
      )}
    </div>
  )
}
