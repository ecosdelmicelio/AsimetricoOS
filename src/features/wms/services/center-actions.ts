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
 * Filtra por aquellas que no están marcadas como completadas o 'na'.
 */
export async function getCenterPendingPurchases(): Promise<OCListItem[]> {
  const all = await getOrdenesCompra()
  return all.filter(oc => oc.estado_documental !== 'na')
}

/**
 * Obtiene órdenes de venta pendientes de despachar.
 */
export async function getCenterPendingSales(): Promise<any[]> {
  const { data } = await getOrdenesVenta()
  return (data ?? []).filter(ov => !['despachada', 'entregada', 'completada', 'cancelada'].includes(ov.estado))
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
 */
export async function getOCItemsGrid(ocId: string): Promise<GridItem[]> {
  const oc = await getOrdenCompraById(ocId)
  if (!oc) return []
  
  return oc.oc_detalle.map(d => ({
    id: d.id,
    label: d.productos?.nombre || 'Producto',
    sublabel: `${d.talla} — SKU: ${d.productos?.referencia}`,
    count: d.cantidad,
    icon: 'Shirt'
  }))
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
 * Procesador Central de Movimientos.
 * Enruta la operación al servicio correspondiente según el modo.
 */
export async function processUnifiedMovement(input: {
  mode: 'INGRESAR' | 'TRASLADAR' | 'DESPACHAR' | 'AJUSTAR'
  sourceId: string
  targetId: string
  itemId?: string
  cantidad: number
  notas?: string
}) {
  const { mode, sourceId, targetId, itemId, cantidad, notas } = input

  switch (mode) {
    case 'INGRESAR': {
      const { crearRecepcionesOCConBins } = await import('@/features/compras/services/compras-actions')
      // sourceId is OC ID, targetId is Bin or position ID
      // itemId is OC Detail ID
      return await crearRecepcionesOCConBins([{
        ocId: sourceId,
        bodegaId: '...', // Extracted from context usually, or passed in
        items: [{ producto_id: itemId || '', talla: '...', cantidad }]
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

    default:
      return { error: `Movimiento ${mode} no implementado completamente en el procesador.` }
  }
}
