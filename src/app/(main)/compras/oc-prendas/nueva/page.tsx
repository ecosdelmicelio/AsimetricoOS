'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { OCPrendasForm } from '@/features/compras/components/oc-prendas-form'
import { createClient } from '@/shared/lib/supabase/client'

type Proveedor = { id: string; nombre: string }
type Producto = {
  id: string
  nombre: string
  referencia: string
  color: string | null
  precio_base: number | null
  categoria: string | null
  origen_usa: boolean
}

export default function NuevaOCPrendasPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()

        const [proveedoresRes, productosRes] = await Promise.all([
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

        const filteredProveedores: Proveedor[] = (proveedoresRes.data as any[])
          ?.filter(t => Array.isArray(t.tipos) && t.tipos.includes('proveedor_prendas'))
          .map(t => ({ id: t.id, nombre: t.nombre })) || []

        const filteredProductos: Producto[] = productosRes.data as Producto[] || []

        setProveedores(filteredProveedores)
        setProductos(filteredProductos)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/compras"
          className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-display-xs font-heading font-bold text-foreground">Nueva OC de Prendas</h1>
          <p className="text-muted-foreground text-body-sm mt-0.5">Configura el pedido y las cantidades por talla</p>
        </div>
      </div>

      <OCPrendasForm proveedores={proveedores} productos={productos} />
    </div>
  )
}
