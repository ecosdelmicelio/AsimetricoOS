'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { AjusteInventario, BinEnBodega } from '@/features/wms/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

async function generarCodigoAjuste(): Promise<string> {
  const fecha = new Date()
  const yyyymmdd = fecha.toISOString().split('T')[0].replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ADJ-${yyyymmdd}-${random}`
}

export async function getBinesEnBodega(bodegaId: string): Promise<BinEnBodega[]> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('bines')
    .select('id, codigo, posicion, estado, tipo')
    .eq('bodega_id', bodegaId)
    .eq('estado', 'en_bodega')
    .order('codigo') as { data: BinEnBodega[] | null }

  return data ?? []
}

export async function crearBinEnBodega(
  bodegaId: string,
  posicion?: string,
): Promise<{ data: BinEnBodega | null; error?: string }> {
  const supabase = db(await createClient())

  // Generar código de bin
  const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const { data: existentes } = await supabase
    .from('bines')
    .select('codigo')
    .ilike('codigo', `BIN-${hoy}%`) as { data: { codigo: string }[] | null }

  const contador = (existentes?.length ?? 0) + 1
  const codigo = `BIN-${hoy}-${String(contador).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('bines')
    .insert({
      codigo,
      tipo: 'interno',
      bodega_id: bodegaId,
      posicion: posicion?.trim() || null,
      estado: 'en_bodega',
    })
    .select('id, codigo, posicion, estado, tipo')
    .single() as { data: BinEnBodega | null; error: { message: string } | null }

  if (error || !data) {
    return { data: null, error: error?.message || 'Error creando bin' }
  }

  revalidatePath('/wms')
  return { data }
}

export async function crearAjuste(input: {
  tipo: 'entrada' | 'salida'
  bodegaId: string
  binId: string
  notas: string
  items: Array<{
    productoId?: string
    materialId?: string
    talla?: string
    cantidad: number
    unidad: string
    costoUnitario?: number
  }>
}): Promise<{ data: AjusteInventario | null; error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()

  // Validaciones
  if (!input.notas.trim()) {
    return { data: null, error: 'Las notas son obligatorias' }
  }
  if (input.items.length === 0) {
    return { data: null, error: 'Agrega al menos un ítem' }
  }

  // Validar que el bin pertenece a la bodega
  const { data: bin } = await supabase
    .from('bines')
    .select('id, bodega_id')
    .eq('id', input.binId)
    .single() as { data: { id: string; bodega_id: string } | null }

  if (!bin || bin.bodega_id !== input.bodegaId) {
    return { data: null, error: 'El bin no pertenece a la bodega seleccionada' }
  }

  // Obtener tipo de movimiento kardex
  const codigoKardex = input.tipo === 'entrada' ? 'AJUSTE_ENTRADA' : 'AJUSTE_SALIDA'
  const { data: tipoMovimiento } = await supabase
    .from('kardex_tipos_movimiento')
    .select('id')
    .eq('codigo', codigoKardex)
    .single() as { data: { id: string } | null }

  if (!tipoMovimiento) {
    return { data: null, error: `Tipo de movimiento ${codigoKardex} no encontrado` }
  }

  // Crear ajuste
  const codigo = await generarCodigoAjuste()

  const { data: ajuste, error: ajusteError } = await supabase
    .from('ajustes_inventario')
    .insert({
      codigo,
      tipo: input.tipo,
      bodega_id: input.bodegaId,
      bin_id: input.binId,
      notas: input.notas.trim(),
      estado: 'confirmado',
      registrado_por: user?.id ?? null,
      fecha_ajuste: new Date().toISOString(),
    })
    .select('*')
    .single() as { data: AjusteInventario | null; error: { message: string } | null }

  if (ajusteError || !ajuste) {
    return { data: null, error: ajusteError?.message || 'Error creando ajuste' }
  }

  // Insertar ítems
  const itemsInsert = input.items.map(item => ({
    ajuste_id: ajuste.id,
    producto_id: item.productoId || null,
    material_id: item.materialId || null,
    talla: item.talla || null,
    cantidad: item.cantidad,
    unidad: item.unidad,
    costo_unitario: item.costoUnitario ?? null,
  }))

  const { error: itemsError } = await supabase
    .from('ajuste_items')
    .insert(itemsInsert) as { error: { message: string } | null }

  if (itemsError) {
    await supabase.from('ajustes_inventario').delete().eq('id', ajuste.id)
    return { data: null, error: `Error insertando ítems: ${itemsError.message}` }
  }

  // Generar movimientos kardex (uno por ítem)
  const signo = input.tipo === 'entrada' ? 1 : -1
  const movimientos = input.items.map(item => ({
    producto_id: item.productoId || null,
    material_id: item.materialId || null,
    bodega_id: input.bodegaId,
    bin_id: input.binId,
    tipo_movimiento_id: tipoMovimiento.id,
    documento_tipo: 'ajuste',
    documento_id: ajuste.id,
    cantidad: signo * item.cantidad,
    unidad: item.unidad,
    talla: item.talla || null,
    costo_unitario: item.costoUnitario ?? 0,
    costo_total: signo * item.cantidad * (item.costoUnitario ?? 0),
    saldo_ponderado: 0,
    fecha_movimiento: new Date().toISOString(),
    registrado_por: user?.id ?? null,
    notas: `${ajuste.codigo} — ${input.notas.trim()}`,
  }))

  const { error: kardexError } = await supabase
    .from('kardex')
    .insert(movimientos) as { error: { message: string } | null }

  if (kardexError) {
    // Rollback
    await supabase.from('ajuste_items').delete().eq('ajuste_id', ajuste.id)
    await supabase.from('ajustes_inventario').delete().eq('id', ajuste.id)
    return { data: null, error: `Error creando movimientos kardex: ${kardexError.message}` }
  }

  revalidatePath('/wms')
  return { data: ajuste }
}

export async function getAjustes(bodegaId?: string): Promise<AjusteInventario[]> {
  const supabase = db(await createClient())

  let query = supabase
    .from('ajustes_inventario')
    .select(`
      *,
      bines (codigo, posicion),
      ajuste_items (*)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (bodegaId) {
    query = query.eq('bodega_id', bodegaId)
  }

  const { data } = await query as { data: AjusteInventario[] | null }

  return data ?? []
}
