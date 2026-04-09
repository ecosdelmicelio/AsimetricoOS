'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Bodega } from '@/features/wms/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function getBodegas(): Promise<Bodega[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('bodegas')
    .select('*')
    .order('codigo') as { data: Bodega[] | null }

  return data ?? []
}

export async function getBodegasActivas(): Promise<Bodega[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('bodegas')
    .select('*')
    .eq('activo', true)
    .order('codigo') as { data: Bodega[] | null }

  return data ?? []
}

export async function createBodega(input: {
  codigo: string
  nombre: string
  tipo: 'principal' | 'secundaria' | 'externa' | 'consignacion'
  tercero_id?: string
}): Promise<{ data: Bodega | null; error?: string }> {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('bodegas')
    .insert({
      codigo: input.codigo.toUpperCase().trim(),
      nombre: input.nombre.trim(),
      tipo: input.tipo,
      tercero_id: input.tercero_id || null,
      activo: true,
    })
    .select()
    .single() as { data: Bodega | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }

  revalidatePath('/configuracion')
  return { data }
}

export async function updateBodega(
  id: string,
  input: {
    nombre?: string
    tipo?: 'principal' | 'secundaria' | 'externa' | 'consignacion'
  },
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const updates: Record<string, unknown> = {}
  if (input.nombre) updates.nombre = input.nombre.trim()
  if (input.tipo) updates.tipo = input.tipo

  const { error } = await supabase
    .from('bodegas')
    .update(updates)
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return {}
}

export async function toggleBodega(id: string, activo: boolean): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('bodegas')
    .update({ activo })
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return {}
}

export async function setBodegaDefault(bodega_id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  // Actualizar o insertar la clave en configuracion
  const { error } = await supabase
    .from('configuracion')
    .upsert(
      {
        clave: 'bodega_default_id',
        valor: bodega_id,
        descripcion: 'ID de la bodega que actúa como principal por defecto',
        tipo: 'uuid',
      },
      { onConflict: 'clave' },
    ) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return {}
}

export async function getBodegaDefaultId(): Promise<string | null> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'bodega_default_id')
    .single() as { data: { valor: string } | null }

  return data?.valor ?? null
}
