'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export interface Material {
  id: string
  codigo: string
  nombre: string
  unidad: string
  costo_unit: number
  activo: boolean
}

export interface ServicioOperativo {
  id: string
  codigo: string
  nombre: string
  tarifa_unitaria: number
  tipo_proceso?: string
  atributo1?: { valor: string }
}

export interface BOMLineaMaterial {
  id: string
  producto_id: string
  tipo: 'materia_prima'
  material_id: string
  cantidad: number
  notas: string | null
  reportable_en_corte: boolean
  materiales: Material
}

export interface BOMLineaServicio {
  id: string
  producto_id: string
  tipo: 'servicio'
  servicio_id: string
  cantidad: number
  notas: string | null
  servicios_operativos: ServicioOperativo
}

export type BOMLinea = BOMLineaMaterial | BOMLineaServicio

export interface BOMResumen {
  materiales: BOMLineaMaterial[]
  servicios: BOMLineaServicio[]
  costo_materiales: number
  costo_servicios: number
  costo_total: number
}

export async function getMateriales(): Promise<Material[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('materiales')
    .select('*')
    .eq('activo', true)
    .order('codigo') as { data: Material[] | null }
  return data ?? []
}

export async function getServiciosOperativos(): Promise<ServicioOperativo[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('servicios_operativos')
    .select('*, atributo1:atributo1_id(*)')
    .order('codigo') as { data: any[] | null }
  
  return (data ?? []).map(s => ({
    ...s,
    tipo_proceso: s.atributo1?.nombre || 'otro'
  }))
}

export async function getBOMProducto(producto_id: string): Promise<BOMResumen> {
  const supabase = db(await createClient())

  const { data: bomLineas, error } = await supabase
    .from('bom')
    .select('*')
    .eq('producto_id', producto_id)
    .order('created_at', { ascending: true }) as {
      data: any[] | null
      error: { message: string } | null
    }

  if (error) {
    console.error(`[getBOMProducto] Error fetching BOM for product ${producto_id}:`, error)
    return {
      materiales: [],
      servicios: [],
      costo_materiales: 0,
      costo_servicios: 0,
      costo_total: 0,
    }
  }

  const lineas = bomLineas ?? []

  // Extraer IDs únicos para precargar en batch
  const materialIds = Array.from(new Set(lineas.filter(l => l.tipo === 'materia_prima' && l.material_id).map(l => l.material_id as string)))
  const servicioIds = Array.from(new Set(lineas.filter(l => l.tipo === 'servicio' && l.servicio_id).map(l => l.servicio_id as string)))

  // Fetch dictionary de Materiales
  let materialesMap: Record<string, Material> = {}
  if (materialIds.length > 0) {
    const { data: mats } = await supabase.from('materiales').select('*').in('id', materialIds) as { data: Material[] | null }
    if (mats) {
      materialesMap = mats.reduce((acc, m) => { acc[m.id] = m; return acc }, {} as Record<string, Material>)
    }
  }

  // Fetch dictionary de Servicios
  let serviciosMap: Record<string, ServicioOperativo> = {}
  if (servicioIds.length > 0) {
    const { data: servs } = await supabase.from('servicios_operativos').select('*').in('id', servicioIds) as { data: ServicioOperativo[] | null }
    if (servs) {
      serviciosMap = servs.reduce((acc, s) => { acc[s.id] = s; return acc }, {} as Record<string, ServicioOperativo>)
    }
  }

  // Cruzar manualmente en memoria
  const materialesLineas: BOMLineaMaterial[] = []
  const serviciosLineas: BOMLineaServicio[] = []

  for (const l of lineas) {
    if (l.tipo === 'materia_prima' && l.material_id) {
      const mat = materialesMap[l.material_id]
      if (mat) {
        materialesLineas.push({
          ...l,
          tipo: 'materia_prima',
          materiales: mat,
          reportable_en_corte: l.reportable_en_corte ?? true,
        })
      }
    } else if (l.tipo === 'servicio' && l.servicio_id) {
      const serv = serviciosMap[l.servicio_id]
      if (serv) {
        serviciosLineas.push({
          ...l,
          tipo: 'servicio',
          servicios_operativos: serv,
        })
      }
    }
  }

  const costo_materiales = materialesLineas.reduce((s, l) => s + l.cantidad * l.materiales.costo_unit, 0)
  const costo_servicios = serviciosLineas.reduce((s, l) => s + l.cantidad * l.servicios_operativos.tarifa_unitaria, 0)

  return {
    materiales: materialesLineas,
    servicios: serviciosLineas,
    costo_materiales,
    costo_servicios,
    costo_total: costo_materiales + costo_servicios,
  }
}

export async function addBOMMaterial(
  producto_id: string,
  material_id: string,
  cantidad: number,
  notas?: string,
  reportable_en_corte: boolean = true,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('bom')
    .insert({
      producto_id,
      tipo: 'materia_prima',
      material_id,
      cantidad,
      notas: notas ?? null,
      reportable_en_corte,
    })
    .select()
    .single() as { data: any | null; error: { message: string; details?: string } | null }

  if (error) {
    console.error('Error insertando material en BOM:', error)
    return { error: error.message || 'Error desconocido al insertar' }
  }
  if (!data) {
    return { error: 'Se insertó pero la base de datos no lo retornó (Póliza de seguridad RLS impidió lectura).' }
  }
  revalidatePath('/', 'layout')
  return {}
}

export async function addBOMServicio(
  producto_id: string,
  servicio_id: string,
  cantidad: number,
  notas?: string,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('bom')
    .insert({
      producto_id,
      tipo: 'servicio',
      servicio_id,
      cantidad,
      notas: notas ?? null,
    }) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function updateBOMLinea(
  linea_id: string,
  producto_id: string,
  cantidad: number,
  notas?: string,
  reportable_en_corte?: boolean,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const updateData: Record<string, any> = {
    cantidad,
    notas: notas ?? null,
  }

  if (reportable_en_corte !== undefined) {
    updateData.reportable_en_corte = reportable_en_corte
  }

  const { error } = await supabase
    .from('bom')
    .update(updateData)
    .eq('id', linea_id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteBOMLinea(
  linea_id: string,
  producto_id: string,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('bom')
    .delete()
    .eq('id', linea_id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function markBOMCompleted(producto_id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('productos')
    .update({ bom_completo: true })
    .eq('id', producto_id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function toggleBOMCompleted(producto_id: string, completado: boolean): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('productos')
    .update({ bom_completo: completado })
    .eq('id', producto_id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}
