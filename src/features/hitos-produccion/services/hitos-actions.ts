'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Hito, TipoHito } from '@/features/hitos-produccion/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getHitosByOP(opId: string): Promise<Hito[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('hitos_produccion')
    .select('*')
    .eq('op_id', opId)
    .order('timestamp_registro', { ascending: false })
  return (data ?? []) as Hito[]
}

export async function reportarHito(input: {
  op_id: string
  hito: TipoHito
  cantidad: number
  producto_id?: string | null
  talla?: string | null
  notas?: string | null
}): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('hitos_produccion')
    .insert({
      op_id:       input.op_id,
      hito:        input.hito,
      cantidad:    input.cantidad,
      producto_id: input.producto_id ?? null,
      talla:       input.talla || null,
      notas:       input.notas?.trim() || null,
    }) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath(`/ordenes-produccion/${input.op_id}`)
  revalidatePath('/torre-control')
  revalidatePath('/ordenes-produccion')
  return {}
}
