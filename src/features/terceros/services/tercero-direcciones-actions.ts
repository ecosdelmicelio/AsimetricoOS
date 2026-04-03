'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export interface TerceroDireccion {
  id: string
  tercero_id: string
  nombre: string
  direccion: string
  ciudad: string | null
  activa: boolean
  created_at: string
}

export async function getTerceroDirecciones(terceroId: string): Promise<TerceroDireccion[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('tercero_direcciones')
    .select('*')
    .eq('tercero_id', terceroId)
    .order('created_at')
  return (data ?? []) as TerceroDireccion[]
}

export async function getAllDirecciones(): Promise<TerceroDireccion[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('tercero_direcciones')
    .select('*')
    .order('tercero_id')
    .order('created_at')
  return (data ?? []) as TerceroDireccion[]
}

export async function createTerceroDireccion(input: {
  tercero_id: string
  nombre: string
  direccion: string
  ciudad?: string
}): Promise<{ data?: TerceroDireccion; error?: string }> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('tercero_direcciones')
    .insert({
      tercero_id: input.tercero_id,
      nombre:     input.nombre.trim(),
      direccion:  input.direccion.trim(),
      ciudad:     input.ciudad?.trim() || null,
    })
    .select()
    .single() as { data: TerceroDireccion | null; error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath('/terceros')
  return { data: data ?? undefined }
}

export async function updateTerceroDireccion(
  id: string,
  input: { nombre?: string; direccion?: string; ciudad?: string | null; activa?: boolean },
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const payload: Record<string, unknown> = {}
  if (input.nombre    !== undefined) payload.nombre    = input.nombre.trim()
  if (input.direccion !== undefined) payload.direccion = input.direccion.trim()
  if (input.ciudad    !== undefined) payload.ciudad    = input.ciudad?.trim() || null
  if (input.activa    !== undefined) payload.activa    = input.activa

  const { error } = await supabase
    .from('tercero_direcciones')
    .update(payload)
    .eq('id', id) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath('/terceros')
  return {}
}
