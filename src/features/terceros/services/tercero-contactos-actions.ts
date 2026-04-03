'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { CategoriaContacto } from './tercero-contactos-constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export interface TerceroContacto {
  id:         string
  tercero_id: string
  nombre:     string
  celular:    string | null
  email:      string | null
  categoria:  CategoriaContacto
  activo:     boolean
  created_at: string
}

export async function getAllContactos(): Promise<TerceroContacto[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('tercero_contactos')
    .select('*')
    .order('tercero_id')
    .order('created_at')
  return (data ?? []) as TerceroContacto[]
}

export async function createTerceroContacto(input: {
  tercero_id: string
  nombre:     string
  celular?:   string
  email?:     string
  categoria:  CategoriaContacto
}): Promise<{ data?: TerceroContacto; error?: string }> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('tercero_contactos')
    .insert({
      tercero_id: input.tercero_id,
      nombre:     input.nombre.trim(),
      celular:    input.celular?.trim() || null,
      email:      input.email?.trim() || null,
      categoria:  input.categoria,
    })
    .select()
    .single() as { data: TerceroContacto | null; error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath('/terceros')
  return { data: data ?? undefined }
}

export async function updateTerceroContacto(
  id: string,
  input: {
    nombre?:    string
    celular?:   string | null
    email?:     string | null
    categoria?: CategoriaContacto
    activo?:    boolean
  },
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const payload: Record<string, unknown> = {}
  if (input.nombre    !== undefined) payload.nombre    = input.nombre.trim()
  if (input.celular   !== undefined) payload.celular   = input.celular?.trim() || null
  if (input.email     !== undefined) payload.email     = input.email?.trim() || null
  if (input.categoria !== undefined) payload.categoria = input.categoria
  if (input.activo    !== undefined) payload.activo    = input.activo

  const { error } = await supabase
    .from('tercero_contactos')
    .update(payload)
    .eq('id', id) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath('/terceros')
  return {}
}
