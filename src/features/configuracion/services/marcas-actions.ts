'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export interface Marca {
  id: string
  nombre: string
  tercero_id: string | null
  activo: boolean
  created_at: string
}

export interface MarcaConTercero extends Marca {
  tercero_nombre: string | null
}

export async function getMarcas(): Promise<MarcaConTercero[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('marcas')
    .select('*, terceros(nombre)')
    .order('nombre') as {
      data: (Marca & { terceros: { nombre: string } | null })[] | null
    }
  return (data ?? []).map(m => ({
    ...m,
    tercero_nombre: m.terceros?.nombre ?? null,
  }))
}

export async function createMarca(input: {
  nombre: string
  tercero_id: string | null
}): Promise<{ data?: MarcaConTercero; error?: string }> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('marcas')
    .insert({
      nombre:     input.nombre.trim(),
      tercero_id: input.tercero_id || null,
    })
    .select('*, terceros(nombre)')
    .single() as { data: (Marca & { terceros: { nombre: string } | null }) | null; error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  revalidatePath('/terceros')
  if (!data) return {}
  return { data: { ...data, tercero_nombre: data.terceros?.nombre ?? null } }
}

export async function updateMarca(
  id: string,
  input: { nombre?: string; tercero_id?: string | null; activo?: boolean },
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const payload: Record<string, unknown> = {}
  if (input.nombre !== undefined)     payload.nombre = input.nombre.trim()
  if (input.tercero_id !== undefined) payload.tercero_id = input.tercero_id || null
  if (input.activo !== undefined)     payload.activo = input.activo

  const { error } = await supabase
    .from('marcas')
    .update(payload)
    .eq('id', id) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  revalidatePath('/terceros')
  return {}
}
