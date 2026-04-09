'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Bodega } from '@/features/wms/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function getBodegas(): Promise<Bodega[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('bodegas')
    .select('*')
    .order('codigo') as { data: Bodega[] | null }

  return data ?? []
}

export async function getBodegasActivas(): Promise<Bodega[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('bodegas')
    .select('*')
    .eq('activo', true)
    .order('codigo') as { data: Bodega[] | null }

  return data ?? []
}

export async function createBodega(input: {
  nombre: string
  tipo: 'principal' | 'secundaria' | 'externa' | 'consignacion'
  tercero_id?: string
}): Promise<{ data: Bodega | null; error?: string }> {
  const supabase = db(await createClient())

  // Generar código automáticamente basado en el tipo
  const tipoPrefix = {
    principal: 'PRIN',
    secundaria: 'SEC',
    externa: 'EXT',
    consignacion: 'CONS',
  }[input.tipo]

  // Obtener el número más alto existente para este tipo
  const { data: existentes } = await supabase
    .from('bodegas')
    .select('codigo')
    .ilike('codigo', `${tipoPrefix}-%`) as { data: { codigo: string }[] | null }

  const numeros = (existentes ?? [])
    .map(b => {
      const match = b.codigo.match(/-(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .sort((a, b) => b - a)

  const siguienteNumero = (numeros[0] ?? 0) + 1
  const codigo = `${tipoPrefix}-${String(siguienteNumero).padStart(3, '0')}`

  const { data, error } = await supabase
    .from('bodegas')
    .insert({
      codigo,
      nombre: input.nombre.trim(),
      tipo: input.tipo,
      tercero_id: input.tercero_id || null,
      activo: true,
    })
    .select()
    .single() as { data: Bodega | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }

  revalidatePath('/configuracion')
  return { data }
}

export async function updateBodega(
  id: string,
  input: {
    nombre?: string
    tipo?: 'principal' | 'secundaria' | 'externa' | 'consignacion'
  },
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const updates: Record<string, unknown> = {}
  if (input.nombre) updates.nombre = input.nombre.trim()
  if (input.tipo) updates.tipo = input.tipo

  const { error } = await supabase
    .from('bodegas')
    .update(updates)
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return {}
}

export async function toggleBodega(id: string, activo: boolean): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('bodegas')
    .update({ activo })
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return {}
}

export async function setBodegaDefault(bodega_id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  // Actualizar o insertar la clave en configuracion
  const { error } = await supabase
    .from('configuracion')
    .upsert(
      {
        clave: 'bodega_default_id',
        valor: bodega_id,
        descripcion: 'ID de la bodega que actúa como principal por defecto',
        tipo: 'uuid',
      },
      { onConflict: 'clave' },
    ) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath('/configuracion')
  return {}
}

export async function getBodegaDefaultId(): Promise<string | null> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'bodega_default_id')
    .single() as { data: { valor: string } | null }

  return data?.valor ?? null
}

export interface InventarioItem {
  id: string
  bin_codigo: string
  bin_id: string
  tipo: 'producto' | 'material'
  codigo: string
  nombre: string
  talla: string | null
  cantidad: number
  unidad: string
}

export async function getInventarioBodega(bodegaId: string): Promise<InventarioItem[]> {
  const supabase = db(await createClient())

  // Obtener items de productos (recepcion_oc)
  const { data: productosData } = await supabase
    .from('recepcion_oc')
    .select(
      `
      id,
      cantidad_recibida,
      talla,
      producto_id,
      bin_id,
      bines (codigo, bodega_id),
      productos (codigo, nombre, referencia)
    `
    )
    .not('producto_id', 'is', null) as { data: any[] | null }

  // Filtrar por bodega y construir items
  const items: InventarioItem[] = (productosData ?? [])
    .filter(item => item.bines?.bodega_id === bodegaId && item.bin_id)
    .map(item => ({
      id: item.id,
      bin_codigo: item.bines?.codigo || '',
      bin_id: item.bin_id,
      tipo: 'producto' as const,
      codigo: item.productos?.codigo || '',
      nombre: item.productos?.nombre || item.productos?.referencia || '',
      talla: item.talla,
      cantidad: Number(item.cantidad_recibida),
      unidad: 'unidad',
    }))

  return items.sort((a, b) => a.bin_codigo.localeCompare(b.bin_codigo))
}
