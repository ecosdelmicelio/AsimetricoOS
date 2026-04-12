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
 * Obtiene órdenes de compra pendientes de recibir.
 * Muestra información de estado y tipo para facilitar la identificación.
 */
export async function getCenterPendingPurchases(): Promise<any[]> {
  const all = await getOrdenesCompra()
  
  // Filtramos las que ya están completadas o finalizadas
  const pending = all.filter(oc => {
    const status = (oc.estado_documental || 'pendiente').toLowerCase()
    return !['completada', 'finalizada'].includes(status)
  })

  return pending.map(oc => ({
    ...oc,
    label_formatted: oc.codigo,
    sublabel_formatted: `${oc.terceros?.nombre || 'Proveedor'} — ${oc.tipo === 'materia_prima' ? '📦 MP' : '👕 PT'} (${oc.estado_documental || 'Pendiente'})`
  }))
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

    // PT (Producto Terminado) - Agrupado por Referencia
    if (oc.oc_detalle && oc.oc_detalle.length > 0) {
      const grouped = new Map<string, any[]>()
      oc.oc_detalle.forEach(d => {
        const list = grouped.get(d.producto_id) || []
        list.push(d)
        grouped.set(d.producto_id, list)
      })

      grouped.forEach((details, prodId) => {
        const first = details[0]
        const totalQty = details.reduce((sum, d) => sum + d.cantidad, 0)
        const tallasStr = details.map(d => `${d.talla}(${d.cantidad})`).join(' · ')
        
        items.push({
          id: `GROUP|${prodId}`,
          label: first.productos?.nombre || 'Producto',
          sublabel: `${first.productos?.referencia}\n${tallasStr}`,
          count: totalQty,
          price: first.precio_pactado, 
          icon: 'Shirt',
          metadata: { 
            isGroup: true,
            producto_id: prodId,
            children: details.map(d => ({
              id: d.id,
              label: `${first.productos?.nombre} (${d.talla})`,
              sublabel: `${first.productos?.referencia} — ${d.talla}`,
              count: d.cantidad,
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
        items.push({
          id: d.id,
          label: d.materiales?.nombre || 'Material',
          sublabel: `${d.materiales?.codigo} — ${d.materiales?.unidad}`,
          count: d.cantidad,
          price: d.precio_unitario,
          icon: 'Package',
          metadata: { material_id: d.material_id, talla: 'UNICA' }
        })
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
    id: i.producto_id || i.recepcion_id,
    label: i.nombre,
    sublabel: `${i.talla} — ${i.referencia}`,
    count: i.cantidad,
    icon: 'Package'
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
}) {
  const { mode, sourceId, targetId, itemId, cantidad, precioUnitario, notas, bodegaId, metadata } = input

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
        
        const ocNum = (oc as any)?.data?.numero_orden || (sourceId.length > 8 ? sourceId.substring(0, 8) : sourceId)
        const tipo = metadata?.producto_id ? 'COM' : 'FAB'
        
        // Limpiamos el nombre del producto para el código
        const rawName = metadata?.label || 'ITEM'
        const cleanName = rawName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '')
        
        descriptiveCode = `${ocNum}-${tipo}-${cleanName}`.toUpperCase()
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
      const meta = (input as any).metadata || {}
      
      return await crearRecepcionesOCConBins([{
        ocId: sourceId,
        bodegaId: bodegaId || '', 
        items: [{ 
          producto_id: meta.producto_id || null, 
          material_id: meta.material_id || null,
          talla: meta.talla || '...', 
          cantidad, 
          bin_id: finalTargetId,
          precio_unitario: precioUnitario
        }]
      }])
    }

    case 'TRASLADAR': {
      const { crearTraslado, confirmarTraslado } = await import('@/features/wms/services/traslados-actions')
      const res = await crearTraslado({
        tipo: 'bin_a_bin',
        bodega_origen_id: '...', 
        bodega_destino_id: '...',
        bin_origen_id: sourceId,
        bin_destino_id: targetId,
        items: [{ bin_id: sourceId, cantidad, unidad: 'unidades' }],
        notas
      })
      if (res.data) await confirmarTraslado(res.data.id)
      return res
    }

    case 'AJUSTAR': {
      const { crearAjuste } = await import('@/features/wms/services/ajustes-actions')
      const isInput = sourceId.includes('found') || sourceId.includes('plus')
      return await crearAjuste({
        tipo: isInput ? 'entrada' : 'salida',
        bodegaId: '...',
        binId: isInput ? targetId : sourceId,
        notas: notas || 'Ajuste visual Command Center',
        items: [{ cantidad, unidad: 'unidades' }]
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
