'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Material, UnidadMaterial } from '@/features/materiales/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

async function nextRefNumero(segmento_id: string): Promise<number> {
  const supabase = db(await createClient())
  const { data } = await supabase.rpc('next_ref_numero', { p_segmento_id: segmento_id })
  return (data as number) ?? 1
}

export async function getMateriales(soloActivos = false): Promise<Material[]> {
  const supabase = db(await createClient())
  let query = supabase
    .from('materiales')
    .select('*')
    .order('codigo')
  if (soloActivos) query = query.eq('activo', true)
  const { data } = await query as { data: Material[] | null }
  return data ?? []
}

export async function createMaterial(input: {
  codigo: string
  nombre: string
  unidad: UnidadMaterial
  costo_unit: number
  descripcion?: string
  autoRefs?: { segmento_id: string; longitud: number }[]
  schema_id?: string
}): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  // Reemplazar placeholders '?' con números secuenciales
  let codigo = input.codigo.toUpperCase().trim()
  if (input.autoRefs && input.autoRefs.length > 0) {
    for (const ref of input.autoRefs) {
      const num = await nextRefNumero(ref.segmento_id)
      const numStr = String(num).padStart(ref.longitud, '0')
      codigo = codigo.replace('?'.repeat(ref.longitud), numStr)
    }
  }

  const { error } = await supabase
    .from('materiales')
    .insert({
      codigo,
      nombre:      input.nombre.trim(),
      unidad:      input.unidad,
      costo_unit:  input.costo_unit,
      descripcion: input.descripcion?.trim() || null,
      schema_id:   input.schema_id ?? null,
    }) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/productos')
  return {}
}

export async function updateMaterial(
  id: string,
  input: {
    nombre?: string
    unidad?: UnidadMaterial
    costo_unit?: number
    descripcion?: string
    activo?: boolean
  },
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('materiales')
    .update({
      ...(input.nombre !== undefined     && { nombre:      input.nombre.trim() }),
      ...(input.unidad !== undefined     && { unidad:      input.unidad }),
      ...(input.costo_unit !== undefined && { costo_unit:  input.costo_unit }),
      ...(input.descripcion !== undefined && { descripcion: input.descripcion?.trim() || null }),
      ...(input.activo !== undefined     && { activo:      input.activo }),
    })
    .eq('id', id) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath('/productos')
  return {}
}
