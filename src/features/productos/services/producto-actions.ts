'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Producto, CreateProductoInput, UpdateProductoInput } from '@/features/productos/types'
import { asociarAtributosAProducto } from '@/features/productos/services/atributo-actions'
import type { TipoAtributo } from '@/features/productos/types/atributos'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

async function nextRefNumero(segmento_id: string): Promise<number> {
  const supabase = db(await createClient())
  const { data } = await supabase.rpc('next_ref_numero', { p_segmento_id: segmento_id })
  return (data as number) ?? 1
}

export async function getProductos(): Promise<Producto[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('productos')
    .select('*')
    .order('referencia', { ascending: true }) as { data: Producto[] | null }
  return data ?? []
}

export async function getProductoById(id: string): Promise<Producto | null> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single() as { data: Producto | null }
  return data
}

export async function createProducto(
  input: CreateProductoInput,
): Promise<{ data: Producto | null; error?: string }> {
  const supabase = db(await createClient())

  // Assemble final referencia — replace '?' placeholders with auto_ref sequence numbers
  let referencia = input.referencia.toUpperCase().trim()
  if (input.autoRefs && input.autoRefs.length > 0) {
    for (const ref of input.autoRefs) {
      const num = await nextRefNumero(ref.segmento_id)
      const numStr = String(num).padStart(ref.longitud, '0')
      referencia = referencia.replace('?'.repeat(ref.longitud), numStr)
    }
  }

  const { data, error } = await supabase
    .from('productos')
    .insert({
      referencia,
      nombre: input.nombre.trim(),
      categoria: input.categoria ?? '',
      color: input.color ?? null,
      origen_usa: input.origen_usa ?? false,
      precio_base: input.precio_base ?? null,
      precio_estandar: input.precio_estandar ?? null,
      precio_n3: input.precio_n3 ?? null,
      referencia_cliente: input.referencia_cliente ?? null,
      nombre_comercial: input.nombre_comercial ?? null,
      estado: 'activo',
      tipo_producto: input.tipo_producto ?? 'fabricado',
      marca_id: input.marca_id ?? null,
      schema_id: input.schema_id ?? null,
    })
    .select()
    .single() as { data: Producto | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }

  // Asociar atributos si fueron proporcionados
  if (input.atributos && data) {
    const attrError = await asociarAtributosAProducto(
      data.id,
      input.atributos as Record<TipoAtributo, string>,
    )
    if (attrError.error) {
      return { data, error: `Producto creado pero error al asociar atributos: ${attrError.error}` }
    }
  }

  revalidatePath('/productos')
  return { data }
}

export async function updateProducto(
  id: string,
  input: UpdateProductoInput,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.referencia !== undefined) payload.referencia = input.referencia.toUpperCase().trim()
  if (input.nombre !== undefined) payload.nombre = input.nombre.trim()
  if (input.categoria !== undefined) payload.categoria = input.categoria
  if (input.precio_base !== undefined) payload.precio_base = input.precio_base
  if (input.precio_estandar !== undefined) payload.precio_estandar = input.precio_estandar || null
  if (input.precio_n3 !== undefined) payload.precio_n3 = input.precio_n3 || null
  if (input.referencia_cliente !== undefined) payload.referencia_cliente = input.referencia_cliente || null
  if (input.nombre_comercial !== undefined) payload.nombre_comercial = input.nombre_comercial || null
  if (input.estado !== undefined) payload.estado = input.estado
  if (input.tipo_producto !== undefined) payload.tipo_producto = input.tipo_producto
  if (input.color !== undefined) payload.color = input.color || null
  if (input.origen_usa !== undefined) payload.origen_usa = input.origen_usa
  if (input.marca_id !== undefined) payload.marca_id = input.marca_id || null

  const { error } = await supabase
    .from('productos')
    .update(payload)
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  // Actualizar atributos si fueron proporcionados
  if (input.atributos) {
    const attrError = await asociarAtributosAProducto(
      id,
      input.atributos as Record<TipoAtributo, string>,
    )
    if (attrError.error) {
      return { error: `Producto actualizado pero error al actualizar atributos: ${attrError.error}` }
    }
  }

  revalidatePath('/productos')
  revalidatePath(`/productos/${id}`)
  return {}
}
