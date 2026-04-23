'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { TipoDefecto } from '@/features/calidad/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function createTipoDefecto(
  input: Omit<TipoDefecto, 'id'>
): Promise<{ data?: TipoDefecto; error?: string }> {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('tipos_defecto')
    .insert([{
      codigo: input.codigo,
      categoria: input.categoria,
      descripcion: input.descripcion,
      gravedad_sugerida: input.gravedad_sugerida,
      puntos_penalidad: input.puntos_penalidad,
      activo: input.activo,
      tipos_producto_aplicables: input.tipos_producto_aplicables ?? []
    }])
    .select()
    .single() as { data: TipoDefecto | null; error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return { data: data! }
}

export async function updateTipoDefecto(
  id: string,
  input: Partial<Omit<TipoDefecto, 'id'>>
): Promise<{ data?: TipoDefecto; error?: string }> {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('tipos_defecto')
    .update(input)
    .eq('id', id)
    .select()
    .single() as { data: TipoDefecto | null; error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return { data: data! }
}

export async function deleteTipoDefecto(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('tipos_defecto')
    .delete()
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return {}
}
