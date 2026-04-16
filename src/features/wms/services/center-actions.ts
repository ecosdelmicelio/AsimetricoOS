'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { getOrdenCompraById, getOrdenesCompra } from '@/features/compras/services/compras-actions'
import { getOrdenesVenta } from '@/features/ordenes-venta/services/ov-actions'
import { getZonasByBodega } from '@/features/wms/services/zonas-actions'
import { getPosicionesByBodega } from '@/features/wms/services/posiciones-actions'
import { getBinesEnBodega } from '@/features/wms/services/ajustes-actions'
import type { 
  OCListItem, 
  OrdenCompraConDetalle 
} from '@/features/compras/types'
import type { 
  OVConDetalle 
} from '@/features/ordenes-venta/types'
import type { 
  Bodega, 
  Zona, 
  Posicion, 
  BinEnBodega 
} from '@/features/wms/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

/**
 * Obtiene operaciones pendientes de recibir (OCs y Traslados entrantes).
 */
export async function getCenterPendingOperations(bodegaId: string): Promise<any[]> {
  const [purchases, transfers] = await Promise.all([
    getOrdenesCompra(),
    import('@/features/wms/services/traslados-actions').then(m => m.getTraslados(bodegaId))
  ])
  
  // 1. OCs Pendientes
  const pendingOCs = purchases
    .filter(oc => !['completada', 'finalizada'].includes((oc.estado_documental || 'pendiente').toLowerCase()))
    .map(oc => ({
      id: oc.id,
      tipo: 'OC',
      codigo: oc.codigo,
      label_formatted: oc.codigo,
      sublabel_formatted: `${oc.terceros?.nombre || 'Proveedor'} — ${oc.tipo === 'materia_prima' ? '📦 MP' : '👕 PT'}`,
      metadata: oc
    }))

  // 2. Traslados entrantes pendientes
  const pendingTRs = transfers
    .filter(tr => tr.bodega_destino_id === bodegaId && tr.estado === 'pendiente')
    .map(tr => ({
      id: tr.id,
      tipo: 'TRS',
      codigo: tr.codigo,
      label_formatted: tr.codigo,
      sublabel_formatted: `Traslado Interno — Desde: ${tr.bodega_origen_id.substring(0,8)}`,
      metadata: tr
    }))

  return [...pendingOCs, ...pendingTRs]
}

/**
 * Marca una orden como completada manualmente.
 */
export async function markOrderAsCompleted(id: string) {
  const { updateOCStatus } = await import('@/features/compras/services/compras-actions')
  const res = await updateOCStatus(id, 'completada')
  if (res.error) return { success: false, error: res.error }
  return { success: true }
}

/**
 * Agregador de jerarquía para navegación visual.
 */
export async function getWarehouseHierarchy(bodegaId: string) {
  const [zonas, posiciones, bines] = await Promise.all([
    getZonasByBodega(bodegaId),
    getPosicionesByBodega(bodegaId),
    getBinesEnBodega(bodegaId)
  ])

  return {
    zonas,
    posiciones,
    bines
  }
}

/**
 * Obtiene estadísticas de inventario (Stock, Valor, Capacidad) para una bodega.
 */
export async function getWarehouseStats(bodegaId: string) {
  const supabase = db(await createClient())
  
  // 1. Valor e Inventario (desde recepciones)
  const { data: recData } = await supabase
    .from('recepcion_oc')
    .select('cantidad_recibida, precio_unitario')
    .eq('bodega_id', bodegaId) as { data: any[] | null }

  const totalUnits = (recData ?? []).reduce((sum, item) => sum + Number(item.cantidad_recibida || 0), 0)
  const totalValue = (recData ?? []).reduce((sum, item) => {
    const qty = Number(item.cantidad_recibida || 0)
    const price = Number(item.precio_unitario || 0)
    return sum + (qty * price)
  }, 0)

  // 2. Capacidad y Ocupación (desde posiciones)
  const { data: posData } = await supabase
    .from('bodega_posiciones')
    .select(`
      capacidad_bines,
      bines:bines(count)
    `)
    .eq('bodega_id', bodegaId) as { data: any[] | null }

  const capacity = (posData ?? []).reduce((sum, p) => sum + (p.capacidad_bines || 0), 0)
  const occupied = (posData ?? []).reduce((sum, p) => sum + (p.bines?.[0]?.count || 0), 0)

  return { totalUnits, totalValue, capacity, occupied }
}

/**
 * Obtiene estadísticas para una zona específica.
 */
export async function getZoneStats(zonaId: string) {
  const supabase = db(await createClient())
  
  const { data: posData } = await supabase
    .from('bodega_posiciones')
    .select(`
      capacidad_bines,
      bines:bines(count)
    `)
    .eq('zona_id', zonaId) as { data: any[] | null }

  const capacity = (posData ?? []).reduce((sum, p) => sum + (p.capacidad_bines || 0), 0)
  const occupied = (posData ?? []).reduce((sum, p) => sum + (p.bines?.[0]?.count || 0), 0)

  return { capacity, occupied }
}

/**
 * Obtiene estadísticas de inventario para una posición específica.
 */
export async function getPositionStats(posicionId: string) {
  const supabase = db(await createClient())
  
  // 1. Valor e Inventario
  const { data: recData } = await supabase
    .from('recepcion_oc')
    .select('cantidad_recibida, precio_unitario')
    .eq('posicion_id', posicionId) as { data: any[] | null }

  const totalUnits = (recData ?? []).reduce((sum, item) => sum + Number(item.cantidad_recibida || 0), 0)
  const totalValue = (recData ?? []).reduce((sum, item) => {
    const qty = Number(item.cantidad_recibida || 0)
    const price = Number(item.precio_unitario || 0)
    return sum + (qty * price)
  }, 0)

  // 2. Capacidad
  const { data: posData } = await supabase
    .from('bodega_posiciones')
    .select('capacidad_bines')
    .eq('id', posicionId)
    .single() as { data: any | null }

  const { count } = await supabase
    .from('bines')
    .select('*', { count: 'exact', head: true })
    .eq('posicion_id', posicionId) as { count: number }

  return { 
    totalUnits, 
    totalValue, 
    capacity: posData?.capacidad_bines || 0,
    occupied: count || 0
  }
}

/**
 * Motivos estándar para ajustes.
 */
export async function getAdjustmentReasons() {
  return [
    { id: 'found', nombre: 'Encontrado / Sobrante', icono: 'PlusCircle', tipo: 'entrada' },
    { id: 'correction_plus', nombre: 'Corrección Auditoría (+)', icono: 'ShieldCheck', tipo: 'entrada' },
    { id: 'damaged', nombre: 'Dañado / Defectuoso', icono: 'Trash2', tipo: 'salida' },
    { id: 'lost', nombre: 'Extraviado / No encontrado', icono: 'Search', tipo: 'salida' },
    { id: 'correction_minus', nombre: 'Corrección Auditoría (-)', icono: 'ShieldAlert', tipo: 'salida' },
    { id: 'sample', nombre: 'Muestra / Uso Interno', icono: 'Gift', tipo: 'salida' },
  ]
}

/**
 * Obtiene los items de una OC para mostrar como iconos.
 * Soporta tanto prendas como materia prima.
 */
export async function getOCItemsGrid(ocId: string): Promise<GridItem[]> {
  try {
    const oc = await getOrdenCompraById(ocId)
    if (!oc) return [{ id: 'error', label: 'OC No Encontrada', sublabel: `ID: ${ocId}`, icon: 'AlertCircle' }]
    
    const items: GridItem[] = []
    const supabase = await createClient()

    // Obtener lo ya recibido para deducirlo de lo esperado
    const { data: recibidos } = await supabase
      .from('recepcion_oc')
      .select('producto_id, talla, material_id, cantidad_recibida, estado')
      .eq('oc_id', ocId)
      .neq('estado', 'revertida')
      
    // Mapa de recibido: key -> cantidad
    const recMap = new Map<string, number>()
    if (recibidos) {
      recibidos.forEach(r => {
        let key = ''
        if (oc.tipo === 'producto_terminado') key = `${r.producto_id}_${r.talla}`
        else if (oc.tipo === 'materia_prima') key = `${r.material_id}`
        
        recMap.set(key, (recMap.get(key) || 0) + Number(r.cantidad_recibida))
      })
    }

    // PT (Producto Terminado) - Agrupado por Referencia
    if (oc.oc_detalle && oc.oc_detalle.length > 0) {
      const grouped = new Map<string, any[]>()
      oc.oc_detalle.forEach(d => {
        // Calcular pendiente
        const received = recMap.get(`${d.producto_id}_${d.talla}`) || 0
        const pending = d.cantidad - received
        if (pending > 0) {
          const list = grouped.get(d.producto_id) || []
          list.push({ ...d, cantidad_pendiente: pending })
          grouped.set(d.producto_id, list)
        }
      })

      grouped.forEach((details, prodId) => {
        const first = details[0]
        const totalPendingQty = details.reduce((sum, d) => sum + d.cantidad_pendiente, 0)
        const tallasStr = details.map(d => `${d.talla}(${d.cantidad_pendiente})`).join(' · ')
        
        items.push({
          id: `GROUP|${prodId}`,
          label: first.productos?.nombre || 'Producto',
          sublabel: `${first.productos?.referencia}\nFaltan: ${tallasStr}`,
          count: totalPendingQty,
          price: first.precio_pactado, 
          icon: 'Shirt',
          metadata: { 
            isGroup: true,
            producto_id: prodId,
            children: details.map(d => ({
              id: d.id,
              label: `${first.productos?.nombre} (${d.talla})`,
              sublabel: `${first.productos?.referencia} — ${d.talla}`,
              count: d.cantidad_pendiente,
              price: d.precio_pactado,
              metadata: { producto_id: d.producto_id, talla: d.talla }
            }))
          }
        })
      })
    }

    // MP (Materia Prima) - Se mantiene individual por rollo/ítem
    if (oc.oc_detalle_mp && oc.oc_detalle_mp.length > 0) {
      oc.oc_detalle_mp.forEach(d => {
        const received = recMap.get(`${d.material_id}`) || 0
        const pending = d.cantidad - received
        if (pending > 0) {
          items.push({
            id: d.id,
            label: d.materiales?.nombre || 'Material',
            sublabel: `${d.materiales?.codigo} — ${d.materiales?.unidad}`,
            count: pending,
            price: d.precio_unitario,
            icon: 'Package',
            metadata: { material_id: d.material_id, talla: 'UNICA' }
          })
        }
      })
    }
    
    if (items.length === 0) {
      return [{ id: 'empty', label: 'OC sin productos', sublabel: 'Verifica la OC', icon: 'Info' }]
    }

    return items
  } catch (err: any) {
    return [{ id: 'error', label: 'Error al cargar OC', sublabel: err.message, icon: 'AlertCircle' }]
  }
}

/**
 * Obtiene los productos dentro de un bin.
 */
export async function getBinItemsGrid(binId: string): Promise<GridItem[]> {
  const { getContenidoBin } = await import('@/features/bines/services/bines-actions')
  const contenido = await getContenidoBin(binId)
  if (!contenido) return []
  
  return contenido.items.map(i => ({
    id: `${i.producto_id || i.recepcion_id}|${i.talla}`,
    label: i.nombre,
    sublabel: `${i.talla} — ${i.referencia}`,
    count: i.cantidad,
    icon: 'Package',
    metadata: {
      producto_id: i.producto_id,
      talla: i.talla,
      referencia: i.referencia,
      unidad: i.unidad || 'unidades'
    }
  }))
}

/**
 * Obtiene los productos solicitados en una OV para mostrar como iconos.
 */
export async function getOVItemsGrid(ovId: string): Promise<GridItem[]> {
  const { getOrdenVentaById } = await import('@/features/ordenes-venta/services/ov-actions')
  const ov = await getOrdenVentaById(ovId)
  if (!ov.data) return []
  
  return ov.data.ov_detalle.map(d => ({
    id: d.id,
    label: d.productos?.nombre || 'Producto',
    sublabel: `${d.talla} — ${d.productos?.referencia}`,
    count: d.cantidad,
    icon: 'Shirt'
  }))
}

/**
 * Obtiene los bines que tienen stock de los productos de una OV.
 * Usado para sugerir ubicaciones de despacho.
 */
export async function getSuggestedBinesForOVGrid(ovId: string): Promise<GridItem[]> {
  const { getBinesDisponiblesParaOV } = await import('@/features/ordenes-venta/services/despachos-actions')
  const availableBines = await getBinesDisponiblesParaOV(ovId)
  
  return availableBines.map(b => ({
    id: b.id,
    label: b.codigo,
    sublabel: b.items.map((i: any) => `${i.cantidad} items`).join(', '),
    icon: 'Box'
  }))
}

/**
 * Procesador Central de Movimientos.
 * ...
 */
export async function processUnifiedMovement(input: {
  mode: 'INGRESAR' | 'TRASLADAR' | 'DESPACHAR' | 'AJUSTAR'
  sourceId: string
  targetId: string
  itemId?: string
  cantidad: number
  precioUnitario?: number
  notas?: string
  bodegaId?: string
  metadata?: any
  items?: Array<{
    producto_id: string
    talla: string
    cantidad: number
    unidad: string
  }>
}) {
  const { mode, sourceId, targetId, itemId, cantidad, precioUnitario, notas, bodegaId, metadata, items } = input

  // Handle Virtual "New Bin" creation if requested
  let finalTargetId = targetId
  if (targetId.startsWith('NEW_BIN|')) {
    const [, posId, posLabel] = targetId.split('|')
    const { crearBin } = await import('@/features/bines/services/bines-actions')
    
    let descriptiveCode = undefined

    // CEREBRO DE NOMENCLATURA: Ingresos por OC
    if (mode === 'INGRESAR') {
      try {
        const { getOrdenCompraById } = await import('@/features/compras/services/compras-actions')
        const oc = await getOrdenCompraById(sourceId)
        
        const ocData = (oc as any)?.data
        const ocNum = ocData?.codigo || (sourceId.length > 8 ? sourceId.substring(0, 8) : sourceId)
        const tipo = metadata?.producto_id ? 'COM' : 'FAB'
        
        // Limpiamos el nombre del producto para el código (opcional)
        const rawName = metadata?.label || 'CAJA'
        const cleanName = rawName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 4)
        const hash = Math.random().toString(36).substring(2, 6).toUpperCase()
        
        descriptiveCode = `${ocNum}-${cleanName}-${hash}`.toUpperCase()
      } catch (err) {
        console.error('Error in naming cerebro:', err)
      }
    }

    // El servicio ahora maneja el código automáticamente si no se pasa descriptivo
    const { data: bin, error } = await crearBin(posId, descriptiveCode, 'interno')
    
    if (error || !bin) {
      return { error: `Error creando bin: ${error}` }
    }
    finalTargetId = bin.id
  }

  switch (mode) {
    case 'INGRESAR': {
      const { crearRecepcionesOCConBins } = await import('@/features/compras/services/compras-actions')
      
      let receiptItems = []
      
      if (input.items && input.items.length > 0) {
        receiptItems = input.items.map((i: any) => ({
          producto_id: i.producto_id || null,
          material_id: i.material_id || null,
          talla: i.talla || '...',
          cantidad: i.cantidad,
          bin_id: finalTargetId,
          precio_unitario: i.precio_unitario || precioUnitario
        }))
      } else {
        const meta = input.metadata || {}
        receiptItems = [{ 
          producto_id: meta.producto_id || null, 
          material_id: meta.material_id || null,
          talla: meta.talla || '...', 
          cantidad, 
          bin_id: finalTargetId,
          precio_unitario: precioUnitario
        }]
      }
      
      return await crearRecepcionesOCConBins([{
        ocId: sourceId,
        bodegaId: bodegaId || '', 
        items: receiptItems
      }])
    }

    case 'TRASLADAR': {
      const { crearTraslado, confirmarTraslado } = await import('@/features/wms/services/traslados-actions')
      const meta = metadata || {}
      
      const tipo = (cantidad === 0 && (!items || items.length === 0)) ? 'bin_completo' : 'bin_a_bin'
      
      // FIX: Si es traslado de bin completo a posición, bin_destino_id debe ser null para evitar FK Error.
      // Guardamos la posición destino en las notas para que confirmarTraslado la use.
      const res = await crearTraslado({
        tipo,
        bodega_origen_id: bodegaId || '', 
        bodega_destino_id: bodegaId || '',
        bin_origen_id: sourceId,
        bin_destino_id: tipo === 'bin_completo' ? undefined : targetId, 
        items: items && items.length > 0 ? items : (cantidad > 0 ? [{ 
          producto_id: meta.producto_id, 
          talla: meta.talla, 
          cantidad, 
          unidad: 'unidades' 
        }] : []),
        notas: (notas || 'Traslado rápido Command Center') + (tipo === 'bin_completo' ? ` [TARGET_POS:${targetId}]` : '')
      })
      
      if (res.data) {
        const confRes = await confirmarTraslado(res.data.id)
        if (confRes?.error) return { error: confRes.error }
      }
      return res
    }

    case 'AJUSTAR': {
      const { crearAjuste } = await import('@/features/wms/services/ajustes-actions')
      const meta = metadata || {}
      const isInput = metadata?.adjustmentType === 'entrada'
      
      return await crearAjuste({
        tipo: isInput ? 'entrada' : 'salida',
        bodegaId: bodegaId || '',
        binId: targetId, // El bin donde se hace el ajuste
        notas: notas || 'Ajuste manual desde Command Center',
        items: [{ 
          productoId: meta.producto_id, 
          talla: meta.talla, 
          cantidad, 
          unidad: 'unidades',
          costoUnitario: meta.precio_unitario || 0
        }]
      })
    }

    case 'DESPACHAR': {
      const { createDespacho } = await import('@/features/ordenes-venta/services/despachos-actions')
      return await createDespacho({
        ov_id: sourceId,
        tipo_envio: 'externo',
        total_bultos: 1,
        lineas: [{
          producto_id: itemId || '',
          talla: '...', // Extrapolar de la selección
          cantidad,
          bin_id: targetId
        }]
      })
    }

    default:
      return { error: `Movimiento ${mode} no implementado completamente en el procesador.` }
  }
}
