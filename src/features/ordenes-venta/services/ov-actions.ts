'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { LineaOV, OrdenVenta, OVConDetalle, HistorialEstado } from '@/features/ordenes-venta/types'
export interface CreateOVInput {
  cliente_id: string
  fecha_entrega: string
  notas?: string
  lineas: LineaOV[]
}

// Cast helper: Supabase's typed client can't infer new tables until types are
// regenerated and the TS cache is cleared. We explicitly cast query results instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function createOrdenVenta(input: CreateOVInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // 1. Crear cabecera OV
  const { data: ov, error: ovError } = await supabase
    .from('ordenes_venta')
    .insert({
      cliente_id: input.cliente_id,
      fecha_entrega: input.fecha_entrega,
      notas: input.notas ?? null,
      creado_por: user.id,
      estado: 'borrador',
    })
    .select('id, codigo')
    .single() as { data: Pick<OrdenVenta, 'id' | 'codigo'> | null; error: { message: string } | null }

  if (ovError || !ov) return { error: ovError?.message ?? 'Error creando OV' }

  // 2. Insertar líneas de detalle
  const detalles = input.lineas.map(l => ({
    ov_id: ov.id,
    producto_id: l.producto_id,
    talla: l.talla,
    cantidad: l.cantidad,
    precio_pactado: l.precio_pactado,
  }))

  const { error: detError } = await supabase.from('ov_detalle').insert(detalles) as {
    error: { message: string } | null
  }
  if (detError) return { error: detError.message }

  revalidatePath('/ordenes-venta')
  return { data: { id: ov.id, codigo: ov.codigo } }
}

export async function updateEstadoOV(id: string, estado: string) {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('ordenes_venta')
    .update({ estado })
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/ordenes-venta')
  revalidatePath(`/ordenes-venta/${id}`)
  return { data: true }
}

export async function getOrdenesVenta() {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('ordenes_venta')
    .select('*, terceros!cliente_id ( nombre )')
    .order('created_at', { ascending: false }) as {
      data: (OrdenVenta & { terceros: { nombre: string } | null })[] | null
      error: { message: string } | null
    }

  if (error) return { error: error.message, data: [] as (OrdenVenta & { terceros: { nombre: string } | null })[] }
  return { data: data ?? [] }
}

export async function getOrdenVentaById(id: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('ordenes_venta')
    .select('*, terceros!cliente_id ( nombre ), ov_detalle ( *, productos ( nombre, referencia, color, origen_usa ) )')
    .eq('id', id)
    .single() as { data: OVConDetalle | null; error: { message: string } | null }

  if (error) return { error: error.message, data: null }
  return { data }
}

export async function getClientes() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('terceros')
    .select('id, nombre')
    .overlaps('tipos', ['cliente'])
    .eq('estado', 'activo')
    .order('nombre')
  return (data ?? []) as { id: string; nombre: string }[]
}

export async function getProductos() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('productos')
    .select('id, nombre, referencia, precio_base, categoria, origen_usa')
    .eq('estado', 'activo')
    .order('nombre')
  return (data ?? []) as {
    id: string
    nombre: string
    referencia: string
    precio_base: number | null
    categoria: string
    origen_usa: boolean
  }[]
}

export async function getHistorialOV(ovId: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('historial_estados')
    .select('*, profiles ( full_name )')
    .eq('entidad', 'ov')
    .eq('entidad_id', ovId)
    .order('timestamp_cambio', { ascending: true }) as {
      data: HistorialEstado[] | null
      error: { message: string } | null
    }

  if (error) return { error: error.message, data: [] as HistorialEstado[] }
  return { data: data ?? [] }
}
