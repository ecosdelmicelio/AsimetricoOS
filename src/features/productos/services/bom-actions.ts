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
  tipo_proceso: 'corte' | 'confeccion' | 'maquillado' | 'lavanderia' | 'otro'
  tarifa_unitaria: number
  descripcion: string | null
  activo: boolean
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
    .select('*')
    .eq('activo', true)
    .order('tipo_proceso, codigo') as { data: ServicioOperativo[] | null }
  return data ?? []
}

export async function getBOMProducto(producto_id: string): Promise<BOMResumen> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('bom')
    .select(`
      id, producto_id, tipo, material_id, servicio_id, cantidad, notas, reportable_en_corte, created_at,
      materiales(id, codigo, nombre, unidad, costo_unit, activo),
      servicios_operativos(id, codigo, nombre, tipo_proceso, tarifa_unitaria, descripcion, activo)
    `)
    .eq('producto_id', producto_id)
    .order('created_at', { ascending: true }) as {
      data: {
        id: string
        producto_id: string
        tipo: string
        material_id: string | null
        servicio_id: string | null
        cantidad: number
        notas: string | null
        reportable_en_corte: boolean
        materiales: Material | null
        servicios_operativos: ServicioOperativo | null
      }[] | null
    }

  const lineas = data ?? []

  const materialesLineas = lineas
    .filter(l => l.tipo === 'materia_prima' && l.materiales)
    .map(l => ({
      ...l,
      tipo: 'materia_prima' as const,
      materiales: l.materiales!,
      reportable_en_corte: l.reportable_en_corte ?? true,
    })) as BOMLineaMaterial[]

  const serviciosLineas = lineas
    .filter(l => l.tipo === 'servicio' && l.servicios_operativos)
    .map(l => ({ ...l, tipo: 'servicio' as const, servicios_operativos: l.servicios_operativos! })) as BOMLineaServicio[]

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

  const { error } = await supabase
    .from('bom')
    .insert({
      producto_id,
      tipo: 'materia_prima',
      material_id,
      cantidad,
      notas: notas ?? null,
      reportable_en_corte,
    }) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/productos')
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
  revalidatePath('/productos')
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
  revalidatePath('/productos')
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
  revalidatePath('/productos')
  return {}
}

export async function markBOMCompleted(producto_id: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('productos')
    .update({ bom_completo: true })
    .eq('id', producto_id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/productos')
  return {}
}
