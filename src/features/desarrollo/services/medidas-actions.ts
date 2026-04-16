'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CategoriaProducto, DesarrolloMedidaTemplate } from '../types'

/**
 * Obtiene la plantilla de medidas para una categoría y fit específicos.
 * Si no se especifica fit, trae la predeterminada (is_default).
 */
export async function getMedidasTemplate(
  categoria: CategoriaProducto,
  clienteId?: string | null,
  nombreFit?: string
) {
  const supabase = await createClient()
  
  let query = supabase
    .from('desarrollo_medidas_templates')
    .select('*')
    .eq('categoria_producto', categoria)

  if (clienteId) {
    query = query.eq('cliente_id', clienteId)
  }

  if (nombreFit) {
    query = query.eq('nombre_fit', nombreFit)
  } else {
    query = query.eq('is_default', true)
  }

  const { data, error } = await query.single()

  if (error && error.code !== 'PGRST116') { // Ignorar error de "no encontrado"
    console.error('Error fetching medidas template:', error)
    return { data: null, error: error.message }
  }

  return { data: data as DesarrolloMedidaTemplate | null, error: null }
}

/**
 * Obtiene todos los fits disponibles para una categoría.
 */
export async function getFitsPorCategoria(categoria: CategoriaProducto, clienteId?: string | null) {
  const supabase = await createClient()
  
  let query = supabase
    .from('desarrollo_medidas_templates')
    .select('id, nombre_fit, is_default')
    .eq('categoria_producto', categoria)

  if (clienteId) {
    query = query.eq('cliente_id', clienteId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching fits:', error)
    return { data: [], error: error.message }
  }

  return { data: data || [], error: null }
}

/**
 * Guarda o actualiza una plantilla (Solo Director de Diseño).
 */
export async function guardarMedidasTemplate(template: Omit<DesarrolloMedidaTemplate, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('desarrollo_medidas_templates')
    .upsert({
      categoria_producto: template.categoria_producto,
      cliente_id:         template.cliente_id,
      nombre_fit:         template.nombre_fit,
      is_default:         template.is_default,
      puntos_medida:      template.puntos_medida,
      updated_at:         new Date().toISOString()
    }, {
      onConflict: 'categoria_producto, cliente_id, nombre_fit'
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving template:', error)
    return { error: error.message }
  }

  revalidatePath('/desarrollo')
  return { data, error: null }
}
