'use server'

import { createClient } from '@/shared/lib/supabase/server'
import type { Bin, BinContenido } from '../types'

function db(supabase: unknown): any { return supabase }

export async function generarCodigoBin(prefijo: string = 'BN'): Promise<string> {
  const supabase = db(await createClient())
  
  // Buscamos el último bin con ese prefijo para seguir la secuencia
  const { data } = await supabase
    .from('bines')
    .select('codigo')
    .ilike('codigo', `${prefijo}-%`)
    .order('codigo', { ascending: false })
    .limit(1) as { data: any[] | null }

  let nextNumber = 1
  if (data && data.length > 0) {
    const lastCode = data[0].codigo
    const parts = lastCode.split('-')
    const lastNum = parseInt(parts[parts.length - 1])
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1
    }
  }

  const secuencial = String(nextNumber).padStart(3, '0')
  return `${prefijo}-${secuencial}`
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

    // Validar CAPACIDAD de la posición
    const { data: posCapData } = await supabase
      .from('bodega_posiciones')
      .select('capacidad_bines, bines:bines(count)')
      .eq('id', posicionId)
      .single() as { data: any }
    
    const capacity = posCapData?.capacidad_bines || 4
    const occupied = posCapData?.bines?.[0]?.count || 0

    if (occupied >= capacity) {
      return { error: `Capacidad máxima alcanzada (${capacity}). No se pueden agregar más bines a esta posición.` }
    }

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
  
  // 1. Obtener info básica del bin
  const { data: bin } = await supabase
    .from('bines')
    .select(`
      id,
      codigo,
      estado,
      created_at,
      bodegas (nombre)
    `)
    .eq('id', binId)
    .single() as { data: any }

  if (!bin) return null

  // 2. Obtener INVENTARIO REAL desde Kardex agrupado por producto y talla
  const { data: kardexItems } = await supabase
    .from('kardex')
    .select(`
      producto_id,
      material_id,
      talla,
      cantidad,
      productos (referencia, nombre, color),
      materiales (codigo, nombre, unidad)
    `)
    .eq('bin_id', binId) as { data: any[] | null }

  // 3. Agrupar items por Producto/Material + Talla
  const inventoryMap = new Map<string, any>()
  
  ;(kardexItems ?? []).forEach(item => {
    const isMaterial = !!item.material_id
    const entityId = item.material_id || item.producto_id
    const cleanTalla = (!item.talla || item.talla === '...' || item.talla === '') ? 'ÚNICA' : item.talla
    const key = `${entityId}-${cleanTalla}`
    
    if (inventoryMap.has(key)) {
      const existing = inventoryMap.get(key)
      existing.cantidad += Number(item.cantidad)
    } else {
      inventoryMap.set(key, {
        producto_id: item.producto_id,
        material_id: item.material_id,
        referencia: isMaterial ? item.materiales?.codigo : (item.productos?.referencia || 'N/A'),
        nombre: isMaterial ? item.materiales?.nombre : (item.productos?.nombre || 'Producto Desconocido'),
        color: item.productos?.color || null,
        talla: cleanTalla,
        cantidad: Number(item.cantidad)
      })
    }
  })

  // Filtrar solo los que tienen stock positivo
  const items = Array.from(inventoryMap.values()).filter(i => i.cantidad > 0)

  return {
    id: bin.id,
    codigo: bin.codigo,
    bodega_nombre: bin.bodegas?.nombre,
    created_at: bin.created_at,
    items: items.map((item, index) => ({
      ...item,
      recepcion_id: `${item.producto_id}-${index}` // ID temporal para compatibilidad
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
  try {
    const { data: bin } = await supabase.from('bines').select('es_fijo, codigo').eq('id', id).single()
    
    if (!bin) return { error: 'Bin no encontrado' }
    if (bin.es_fijo) {
      return { error: 'Este bin es parte de la estructura fija. Para eliminarlo, debes ir al editor de diseño y cambiar su tipo a variable.' }
    }

    // Estrategia "Ghost": Desvinculamos inmediatamente para que desaparezca de la vista del usuario.
    // Esto evita bloqueos por FK o historial de Kardex que el usuario no necesita ver ahora.
    const { error: unlinkError } = await supabase
      .from('bines')
      .update({ 
        posicion_id: null,
        // Cambiamos el código para liberar el nombre original si el usuario quiere crear uno nuevo con el mismo ID
        codigo: `${bin.codigo}_ARCHIVED_${Date.now()}`
      })
      .eq('id', id)
    
    if (unlinkError) {
      console.error('Error in Ghost Unlink:', unlinkError)
      return { error: unlinkError.message }
    }

    // Intentamos borrado físico por si acaso no tiene historia, pero no bloqueamos al usuario
    await supabase.from('bines').delete().eq('id', id)

    return {} // Éxito total para el usuario
  } catch (err: any) {
    console.error('CRITICAL ERROR in eliminarBin:', err)
    return { error: 'Error del sistema: ' + (err.message || String(err)) }
  }
}
