'use server'

import { createClient } from '@/shared/lib/supabase/server'
import type { Bin, BinContenido } from '../types'

function db(supabase: unknown): any { return supabase }

export async function generarCodigoBin(prefijo: string = 'ASI'): Promise<string> {
  const supabase = db(await createClient())
  const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const { data } = await supabase
    .from('bines')
    .select('codigo')
    .ilike('codigo', `${prefijo}-${hoy}%`) as { data: any[] | null }
  const contador = (data?.length ?? 0) + 1
  const secuencial = String(contador).padStart(5, '0')
  return `${prefijo}-${hoy}-${secuencial}`
}

export async function crearBin(
  posicionId: string,
  codigoManual?: string,
  tipo: 'caja_cliente' | 'interno' = 'interno',
  esFijo: boolean = false
): Promise<{ data?: Bin; error?: string }> {
  try {
    const supabase = db(await createClient())
    
    // Si no hay código manual, generamos uno
    let codigo = codigoManual
    if (!codigo) {
      // Necesitamos el prefijo de la posición para generar el código
      const { data: pos } = await supabase
        .from('bodega_posiciones')
        .select('codigo, bodega_id')
        .eq('id', posicionId)
        .single() as { data: any }
      
      const prefijo = pos?.codigo?.split('-')[0] || 'ASI'
      codigo = await generarCodigoBin(prefijo)
    }

    // Obtenemos la bodega_id de la posición
    const { data: posData } = await supabase
      .from('bodega_posiciones')
      .select('bodega_id')
      .eq('id', posicionId)
      .single() as { data: any }

    const { data, error } = await supabase
      .from('bines')
      .insert({
        codigo,
        tipo,
        bodega_id: posData?.bodega_id,
        posicion_id: posicionId,
        es_fijo: esFijo,
        estado: 'en_bodega',
      })
      .select() as { data: any[] | null; error: any }

    if (error) return { error: error.message }
    return { data: data?.[0] as Bin }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function getContenidoBin(binId: string): Promise<BinContenido | null> {
  const supabase = db(await createClient())
  const { data: bin } = await supabase
    .from('bines')
    .select(
      `
      id,
      codigo,
      estado,
      created_at,
      bodegas (nombre)
    `
    )
    .eq('id', binId)
    .single() as { data: any }
  if (!bin) return null
  const { data: items } = await supabase
    .from('recepcion_oc')
    .select(
      `
      id,
      producto_id,
      talla,
      cantidad_recibida,
      productos (referencia, nombre, color)
    `
    )
    .eq('bin_id', binId)
    .not('producto_id', 'is', null) as { data: any[] | null }
  return {
    id: bin.id,
    codigo: bin.codigo,
    bodega_nombre: bin.bodegas?.nombre,
    created_at: bin.created_at,
    items: (items ?? []).map(item => ({
      producto_id: item.producto_id,
      referencia: item.productos?.referencia || '',
      nombre: item.productos?.nombre || '',
      color: item.productos?.color || null,
      talla: item.talla || null,
      cantidad: Number(item.cantidad_recibida),
      recepcion_id: item.id,
    })),
  }
}

export async function getBinesByBodega(bodegaId: string, estado?: string): Promise<Bin[]> {
  const supabase = db(await createClient())
  let query = supabase
    .from('bines')
    .select(
      `
      id,
      codigo,
      tipo,
      bodega_id,
      posicion_id,
      es_fijo,
      estado,
      created_at,
      bodegas (nombre),
      bodega_posiciones (codigo)
    `
    )
    .eq('bodega_id', bodegaId)
  if (estado) {
    query = query.eq('estado', estado)
  }
  const { data } = await query.order('created_at', { ascending: false }) as { data: any[] | null }
  return (data ?? []).map(b => ({
    id: b.id,
    codigo: b.codigo,
    tipo: b.tipo,
    bodega_id: b.bodega_id,
    posicion_id: b.posicion_id,
    posicion_codigo: b.bodega_posiciones?.codigo,
    es_fijo: b.es_fijo,
    bodega_nombre: b.bodegas?.nombre,
    estado: b.estado,
    created_at: b.created_at,
  }))
}

export async function actualizarEstadoBin(binId: string, estado: string): Promise<Bin> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('bines')
    .update({ estado })
    .eq('id', binId)
    .select() as { data: any[] | null }
  if (!data?.[0]) {
    throw new Error('No se pudo actualizar el bin')
  }
  return data[0] as Bin
}

export async function getBinesByPosicion(posicionId: string): Promise<Bin[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('bines')
    .select('*')
    .eq('posicion_id', posicionId)
    .order('created_at', { ascending: false }) as { data: any[] | null }
  return (data ?? []) as Bin[]
}

export async function eliminarBin(id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  
  // Primero verificamos si tiene stock relacionado en recepcion_oc
  const { count } = await supabase
    .from('recepcion_oc')
    .select('*', { count: 'exact', head: true })
    .eq('bin_id', id)
  
  if (count && count > 0) {
    return { error: 'No se puede eliminar un bin que tiene movimientos o stock histórico.' }
  }

  const { error } = await supabase
    .from('bines')
    .delete()
    .eq('id', id)
  
  if (error) return { error: error.message }
  return {}
}
