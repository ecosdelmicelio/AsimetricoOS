'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { AtributoMP, TipoAtributoMP, MaterialAtributo } from '@/features/materiales/types/atributos'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getAtributosMP(): Promise<AtributoMP[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('atributos_mp')
    .select('*')
    .order('tipo', { ascending: true })
    .order('valor', { ascending: true }) as { data: AtributoMP[] | null }
  return data ?? []
}

export async function getAtributosPorTipoMP(tipo: TipoAtributoMP): Promise<AtributoMP[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('atributos_mp')
    .select('*')
    .eq('tipo', tipo)
    .order('valor', { ascending: true }) as { data: AtributoMP[] | null }
  return data ?? []
}

export async function createAtributoMP(
  tipo: TipoAtributoMP,
  valor: string,
): Promise<{ data: AtributoMP | null; error?: string }> {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('atributos_mp')
    .insert({
      tipo,
      valor: valor.trim(),
    })
    .select()
    .single() as { data: AtributoMP | null; error: { message: string } | null }

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { data: null, error: `El valor "${valor}" ya existe para el tipo "${tipo}"` }
    }
    return { data: null, error: error.message }
  }

  revalidatePath('/configuracion')
  revalidatePath('/materiales')
  return { data }
}

export async function deleteAtributoMP(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('atributos_mp')
    .delete()
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  revalidatePath('/materiales')
  return {}
}

export async function asociarAtributosAMaterial(
  material_id: string,
  atributos: Record<TipoAtributoMP, string>,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const registros = Object.entries(atributos)
    .filter(([_, atributo_id]) => atributo_id)
    .map(([tipo, atributo_id]) => ({
      material_id,
      atributo_id,
      tipo,
    }))

  if (registros.length === 0) return {}

  const { error } = await supabase
    .from('material_atributos')
    .insert(registros) as { error: { message: string } | null }

  if (error) return { error: error.message }
  return {}
}
