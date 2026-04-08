'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { Material, UnidadMaterial, TipoMP, CreateMaterialInput, UpdateMaterialInput } from '@/features/materiales/types'
import { asociarAtributosAMaterial } from '@/features/materiales/services/atributo-actions'
import type { TipoAtributoMP } from '@/features/materiales/types/atributos'

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

export async function createMaterial(input: CreateMaterialInput & {
  atributos?: Record<TipoAtributoMP, string>
}): Promise<{ data?: { id: string } | null; error?: string }> {
  const supabase = db(await createClient())

  let codigo = input.codigo.toUpperCase().trim()
  if (input.autoRefs && input.autoRefs.length > 0) {
    for (const ref of input.autoRefs) {
      const num = await nextRefNumero(ref.segmento_id)
      const numStr = String(num).padStart(ref.longitud, '0')
      codigo = codigo.replace('?'.repeat(ref.longitud), numStr)
    }
  }

  const { data, error } = await supabase
    .from('materiales')
    .insert({
      codigo,
      nombre: input.nombre.trim(),
      unidad: input.unidad,
      costo_unit: input.costo_unit,
      referencia_proveedor: input.referencia_proveedor?.trim() || null,
      partida_arancelaria: input.partida_arancelaria?.trim() || null,
      tipo_mp: input.tipo_mp ?? 'nacional',
      rendimiento_kg: input.rendimiento_kg ?? null,
      schema_id: input.schema_id ?? null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error) return { error: error.message }

  // Asociar atributos si fueron proporcionados
  if (input.atributos && data) {
    const attrError = await asociarAtributosAMaterial(
      data.id,
      input.atributos as Record<TipoAtributoMP, string>,
    )
    if (attrError.error) {
      return { data, error: `Material creado pero error al asociar atributos: ${attrError.error}` }
    }
  }

  revalidatePath('/productos')
  return { data }
}

export async function updateMaterial(
  id: string,
  input: UpdateMaterialInput,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('materiales')
    .update({
      ...(input.nombre !== undefined && { nombre: input.nombre.trim() }),
      ...(input.unidad !== undefined && { unidad: input.unidad }),
      ...(input.costo_unit !== undefined && { costo_unit: input.costo_unit }),
      ...(input.referencia_proveedor !== undefined && { referencia_proveedor: input.referencia_proveedor?.trim() || null }),
      ...(input.partida_arancelaria !== undefined && { partida_arancelaria: input.partida_arancelaria?.trim() || null }),
      ...(input.tipo_mp !== undefined && { tipo_mp: input.tipo_mp }),
      ...(input.activo !== undefined && { activo: input.activo }),
      ...(input.rendimiento_kg !== undefined && { rendimiento_kg: input.rendimiento_kg }),
    })
    .eq('id', id) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath('/productos')
  return {}
}

export async function toggleMaterialActivo(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { data: material } = await supabase
    .from('materiales')
    .select('activo')
    .eq('id', id)
    .single() as { data: { activo: boolean } | null }

  if (!material) {
    return { error: 'Material no encontrado' }
  }

  const { error } = await supabase
    .from('materiales')
    .update({ activo: !material.activo })
    .eq('id', id) as { error: { message: string } | null }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/productos')
  return {}
}
