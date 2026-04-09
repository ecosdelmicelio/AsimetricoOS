/**
 * Helper centralizado para obtener la bodega default del sistema.
 * Reemplaza todos los `.eq('tipo', 'principal')` hardcodeados.
 */

import { createClient } from '@/shared/lib/supabase/server'

export async function getBodegaDefault() {
  const supabase = await createClient()

  // 1. Obtener bodega_default_id de configuracion
  const { data: configData } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'bodega_default_id')
    .single()

  if (!configData?.valor) {
    throw new Error('bodega_default_id no configurada en tabla configuracion')
  }

  const bodega_default_id = configData.valor

  // 2. Obtener la bodega completa
  const { data: bodega } = await supabase
    .from('bodegas')
    .select('*')
    .eq('id', bodega_default_id)
    .single()

  if (!bodega) {
    throw new Error(
      `Bodega default con ID ${bodega_default_id} no encontrada`,
    )
  }

  return bodega
}

/**
 * Obtener solo el ID de la bodega default (más rápido si solo necesitas el ID)
 */
export async function getBodegaDefaultId(): Promise<string> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'bodega_default_id')
    .single()

  if (!data?.valor) {
    throw new Error('bodega_default_id no configurada en tabla configuracion')
  }

  return data.valor
}
