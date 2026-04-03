'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export interface TipoMovimiento {
  id: string
  codigo: string
  nombre: string
  categoria: 'entrada' | 'salida' | 'ajuste'
  descripcion: string | null
  activo: boolean
  created_at: string
}

export async function getTiposMovimiento(): Promise<TipoMovimiento[]> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('kardex_tipos_movimiento')
    .select('*')
    .order('codigo') as { data: TipoMovimiento[] | null; error: { message: string } | null }

  if (error) return []
  return data ?? []
}

export async function createTipoMovimiento(input: {
  codigo: string
  nombre: string
  categoria: 'entrada' | 'salida' | 'ajuste'
  descripcion?: string
}): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('kardex_tipos_movimiento')
    .insert({
      codigo: input.codigo.toUpperCase().trim(),
      nombre: input.nombre.trim(),
      categoria: input.categoria,
      descripcion: input.descripcion?.trim() || null,
      activo: true,
    }) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return {}
}

export async function toggleTipoMovimiento(id: string, activo: boolean): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('kardex_tipos_movimiento')
    .update({ activo })
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return {}
}
