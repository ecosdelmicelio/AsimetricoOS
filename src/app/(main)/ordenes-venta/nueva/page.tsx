'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { OVForm } from '@/features/ordenes-venta/components/ov-form'
import { createClient } from '@/shared/lib/supabase/client'

type Cliente = { id: string; nombre: string; plazo_pago_dias: number | null }
type Producto = {
  id: string
  nombre: string
  referencia: string
  color: string | null
  precio_base: number | null
  categoria: string | null
  origen_usa: boolean
  minimo_orden: number | null
  multiplo_orden: number | null
  leadtime_dias: number | null
}

export type ProductoAlias = {
  producto_id: string
  cliente_id: string
  sku_cliente: string
  nombre_comercial_cliente: string | null
  precio_acordado: number | null
}

export default function NuevaOVPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [aliases, setAliases] = useState<ProductoAlias[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()

        const [clientesRes, productosRes, aliasesRes] = await Promise.all([
          supabase
            .from('terceros')
            .select('id, nombre, tipos, plazo_pago_dias')
            .eq('estado', 'activo')
            .order('nombre'),
          supabase
            .from('productos')
            .select('id, nombre, referencia, precio_base, categoria, origen_usa, color, minimo_orden, multiplo_orden, leadtime_dias')
            .eq('estado', 'activo')
            .order('nombre'),
          supabase
            .from('producto_clientes')
            .select('producto_id, cliente_id, sku_cliente, nombre_comercial_cliente, precio_acordado')
            .eq('activo', true)
        ])

        const filteredClientes: Cliente[] = (clientesRes.data as any[])
          ?.filter(t => Array.isArray(t.tipos) && t.tipos.includes('cliente'))
          .map(t => ({ id: t.id, nombre: t.nombre, plazo_pago_dias: t.plazo_pago_dias })) || []

        const filteredProductos: Producto[] = productosRes.data as Producto[] || []
        const fetchedAliases: ProductoAlias[] = (aliasesRes.data as any[]) || []

        setClientes(filteredClientes)
        setProductos(filteredProductos)
        setAliases(fetchedAliases)
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
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header Premium */}
      <div className="flex items-center justify-between bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm mt-4">
        <div className="flex items-center gap-5">
          <Link
            href="/ordenes-venta"
            className="w-11 h-11 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:shadow-md transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Nueva Orden de Venta</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuración técnica de pedido y tallaje</p>
          </div>
        </div>
      </div>

      <OVForm clientes={clientes} productos={productos} aliases={aliases} />
    </div>
  )
}
