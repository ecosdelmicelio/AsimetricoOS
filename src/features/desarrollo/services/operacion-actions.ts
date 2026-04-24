'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { DesarrolloOperacion } from '@/features/desarrollo/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function getOperacionesByVersion(versionId: string) {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('desarrollo_operaciones')
    .select('*')
    .eq('version_id', versionId)
    .order('orden', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: data as DesarrolloOperacion[], error: null }
}

export async function upsertOperaciones(
  desarrolloId: string,
  versionId: string,
  operaciones: Partial<DesarrolloOperacion>[]
) {
  const supabase = db(await createClient())

  // Preparar inserts/updates con IDs correctos
  const finalOps = operaciones.map((op, index) => ({
    ...op,
    desarrollo_id: desarrolloId,
    version_id: versionId,
    orden: index, // El orden se define por la posición en el array
  }))

  const { error } = await supabase
    .from('desarrollo_operaciones')
    .upsert(finalOps, { onConflict: 'id' })

  if (error) return { error: error.message }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { error: null }
}

export async function deleteOperacion(id: string, desarrolloId: string) {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('desarrollo_operaciones')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { error: null }
}
