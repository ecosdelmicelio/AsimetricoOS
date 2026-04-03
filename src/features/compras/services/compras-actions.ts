'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  OrdenCompra,
  OrdenCompraConDetalle,
  OCListItem,
  EstadoDocumental,
  EstadoGreige,
} from '@/features/compras/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

function calcFechaEntrega(fechaOC: string, greige: EstadoGreige): string {
  const d = new Date(fechaOC)
  d.setDate(d.getDate() + (greige === 'en_crudo' ? 15 : 30))
  return d.toISOString().split('T')[0]
}

export async function getOrdenesCompra(): Promise<OCListItem[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('ordenes_compra')
    .select('*, terceros!proveedor_id(nombre), rollos(id)')
    .order('created_at', { ascending: false }) as { data: OCListItem[] | null }
  return data ?? []
}

export async function getOrdenCompraById(id: string): Promise<OrdenCompraConDetalle | null> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('ordenes_compra')
    .select(`
      *,
      terceros!proveedor_id(nombre),
      rollos(*, materiales(codigo, nombre, unidad))
    `)
    .eq('id', id)
    .single() as { data: OrdenCompraConDetalle | null }
  return data
}

export async function createOrdenCompra(input: {
  proveedor_id?: string
  estado_greige: EstadoGreige
  estado_documental: EstadoDocumental
  fecha_oc: string
  notas?: string
}): Promise<{ data: OrdenCompra | null; error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()

  const fecha_entrega_est = calcFechaEntrega(input.fecha_oc, input.estado_greige)

  const { data, error } = await supabase
    .from('ordenes_compra')
    .insert({
      proveedor_id:       input.proveedor_id || null,
      estado_greige:      input.estado_greige,
      estado_documental:  input.estado_documental,
      fecha_oc:           input.fecha_oc,
      fecha_entrega_est,
      notas:              input.notas?.trim() || null,
      creado_por:         user?.id ?? null,
    })
    .select()
    .single() as { data: OrdenCompra | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }
  revalidatePath('/compras')
  return { data }
}

export async function updateEstadoDocumental(
  id: string,
  estado_documental: EstadoDocumental,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('ordenes_compra')
    .update({ estado_documental })
    .eq('id', id) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath('/compras')
  revalidatePath(`/compras/${id}`)
  return {}
}

export async function addRollo(input: {
  oc_id: string
  material_id: string
  peso_real_kg: number
  rendimiento_real?: number
  notas?: string
}): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('rollos')
    .insert({
      oc_id:            input.oc_id,
      material_id:      input.material_id,
      peso_real_kg:     input.peso_real_kg,
      rendimiento_real: input.rendimiento_real ?? null,
      saldo_kg:         input.peso_real_kg,   // starts full
      notas:            input.notas?.trim() || null,
    }) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath(`/compras/${input.oc_id}`)
  return {}
}

export async function deleteRollo(id: string, oc_id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('rollos')
    .delete()
    .eq('id', id) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath(`/compras/${oc_id}`)
  return {}
}

export async function getProveedores() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('terceros')
    .select('id, nombre')
    .overlaps('tipos', ['proveedor_mp'])
    .eq('estado', 'activo')
    .order('nombre')
  return (data ?? []) as { id: string; nombre: string }[]
}

export async function getMateriales() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('materiales')
    .select('id, codigo, nombre, unidad')
    .eq('activo', true)
    .order('nombre')
  return (data ?? []) as { id: string; codigo: string; nombre: string; unidad: string }[]
}
