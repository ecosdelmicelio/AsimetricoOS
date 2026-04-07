'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { AtributoPT, TipoAtributo } from '@/features/productos/types/atributos'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getAtributosPT(): Promise<AtributoPT[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('atributos_pt')
    .select('*')
    .order('tipo', { ascending: true })
    .order('valor', { ascending: true }) as { data: AtributoPT[] | null }
  return data ?? []
}

export async function getAtributosPorTipo(tipo: TipoAtributo): Promise<AtributoPT[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('atributos_pt')
    .select('*')
    .eq('tipo', tipo)
    .order('valor', { ascending: true }) as { data: AtributoPT[] | null }
  return data ?? []
}

export async function createAtributoPT(
  tipo: TipoAtributo,
  valor: string,
): Promise<{ data: AtributoPT | null; error?: string }> {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('atributos_pt')
    .insert({
      tipo,
      valor: valor.trim(),
    })
    .select()
    .single() as { data: AtributoPT | null; error: { message: string } | null }

  if (error) {
    // Constraint violation: valor duplicado para este tipo
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { data: null, error: `El valor "${valor}" ya existe para el tipo "${tipo}"` }
    }
    return { data: null, error: error.message }
  }

  revalidatePath('/configuracion')
  revalidatePath('/productos/nuevo')
  return { data }
}

export async function deleteAtributoPT(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('atributos_pt')
    .delete()
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  revalidatePath('/productos/nuevo')
  return {}
}

export async function asociarAtributosAProducto(
  producto_id: string,
  atributos: Record<TipoAtributo, string>,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  // Insertar relaciones
  const registros = Object.entries(atributos)
    .filter(([_, atributo_id]) => atributo_id) // Solo si hay valor
    .map(([tipo, atributo_id]) => ({
      producto_id,
      atributo_id,
      tipo,
    }))

  if (registros.length === 0) return {}

  const { error } = await supabase
    .from('producto_atributos')
    .insert(registros) as { error: { message: string } | null }

  if (error) return { error: error.message }
  return {}
}
