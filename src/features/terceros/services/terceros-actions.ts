'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Tercero, TipoTercero, CreateTerceroInput, UpdateTerceroInput } from '@/features/terceros/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getTerceros(tipo?: TipoTercero): Promise<Tercero[]> {
  const supabase = db(await createClient())
  let query = supabase.from('terceros').select('*').order('nombre')
  if (tipo) query = query.overlaps('tipos', [tipo])
  const { data } = await query as { data: Tercero[] | null }
  return data ?? []
}

export async function getAllTerceros(): Promise<Tercero[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('terceros')
    .select('*')
    .order('nombre') as { data: Tercero[] | null }
  return data ?? []
}

export async function createTercero(
  input: CreateTerceroInput,
): Promise<{ data: Tercero | null; error?: string }> {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('terceros')
    .insert({
      nombre:                    input.nombre.trim(),
      tipos:                     input.tipos,
      nit:                       input.nit?.trim() || null,
      email:                     input.email?.trim() || null,
      email_facturacion:         input.email_facturacion?.trim() || null,
      telefono:                  input.telefono?.trim() || null,
      direccion:                 input.direccion?.trim() || null,
      capacidad_diaria:          input.capacidad_diaria ?? null,
      lead_time_dias:            input.lead_time_dias ?? null,
      valor_servicio_ref:        input.valor_servicio_ref ?? null,
      porcentaje_anticipo:       input.porcentaje_anticipo ?? null,
      calificacion:              input.calificacion ?? null,
      descuento_pago_anticipado: input.descuento_pago_anticipado ?? null,
      bodega_taller_id:          input.bodega_taller_id ?? null,
      estado:                    'activo',
    })
    .select()
    .single() as { data: Tercero | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }
  revalidatePath('/terceros')
  return { data }
}

export async function updateTercero(
  id: string,
  input: UpdateTerceroInput,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const p: Record<string, unknown> = {}

  if (input.nombre !== undefined)                    p.nombre = input.nombre.trim()
  if (input.tipos !== undefined)                     p.tipos = input.tipos
  if (input.nit !== undefined)                       p.nit = input.nit.trim() || null
  if (input.email !== undefined)                     p.email = input.email.trim() || null
  if (input.email_facturacion !== undefined)         p.email_facturacion = input.email_facturacion.trim() || null
  if (input.telefono !== undefined)                  p.telefono = input.telefono.trim() || null
  if (input.direccion !== undefined)                 p.direccion = input.direccion.trim() || null
  if (input.estado !== undefined)                    p.estado = input.estado
  if (input.capacidad_diaria !== undefined)          p.capacidad_diaria = input.capacidad_diaria || null
  if (input.lead_time_dias !== undefined)            p.lead_time_dias = input.lead_time_dias || null
  if (input.valor_servicio_ref !== undefined)        p.valor_servicio_ref = input.valor_servicio_ref || null
  if (input.porcentaje_anticipo !== undefined)       p.porcentaje_anticipo = input.porcentaje_anticipo ?? null
  if (input.calificacion !== undefined)              p.calificacion = input.calificacion || null
  if (input.descuento_pago_anticipado !== undefined) p.descuento_pago_anticipado = input.descuento_pago_anticipado ?? null
  if (input.bodega_taller_id !== undefined)          p.bodega_taller_id = input.bodega_taller_id || null

  const { error } = await supabase
    .from('terceros')
    .update(p)
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/terceros')
  return {}
}
