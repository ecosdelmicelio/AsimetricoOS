'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { AreaNegocio } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(s: unknown): any { return s }

export interface Empleado {
  id: string
  nombre: string
  cargo: string
  area: AreaNegocio
  salario_base: number
  nivel_riesgo_arl: 1 | 2 | 3 | 4 | 5
  fecha_ingreso: string
  estado: 'activo' | 'inactivo'
  created_at: string
}

export interface CostoEmpleado {
  salario_base: number
  pension: number
  salud: number
  arl: number
  sena: number
  icbf: number
  caja_compensacion: number
  prima: number
  cesantias: number
  intereses_cesantias: number
  vacaciones: number
  total_carga: number
  costo_total_mes: number
  porcentaje_total: number
}

export type CreateEmpleadoInput = Omit<Empleado, 'id' | 'created_at'>

// ─── PARAFISCALES CONFIG ────────────────────────────────────────────────────

export async function getParafiscalesConfig(): Promise<Record<string, number>> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('ajustes_sistema')
    .select('id, valor')
    .like('id', 'para_%')

  const config: Record<string, number> = {}
  for (const r of data ?? []) {
    config[r.id] = parseFloat(r.valor) || 0
  }
  return config
}

export async function updateParafiscal(id: string, valor: number) {
  const supabase = db(await createClient())
  await supabase
    .from('ajustes_sistema')
    .update({ valor: String(valor) })
    .eq('id', id)
  revalidatePath('/finanzas')
  revalidatePath('/configuracion')
}

// ─── CÁLCULO COSTO TOTAL ────────────────────────────────────────────────────

export async function calcularCostoEmpleado(
  salario_base: number,
  nivel_riesgo_arl: 1 | 2 | 3 | 4 | 5
): Promise<CostoEmpleado> {
  const c = await getParafiscalesConfig()

  const arlKey = `para_arl_nivel${nivel_riesgo_arl}` as keyof typeof c
  const arl = (c[arlKey] ?? 0.522) / 100

  const conceptos = {
    pension:              (c['para_pension_empleador']   ?? 12)   / 100,
    salud:                (c['para_salud_empleador']     ?? 8.5)  / 100,
    arl,
    sena:                 (c['para_sena']                ?? 2)    / 100,
    icbf:                 (c['para_icbf']                ?? 3)    / 100,
    caja_compensacion:    (c['para_caja_compensacion']   ?? 4)    / 100,
    prima:                (c['para_prima']               ?? 8.33) / 100,
    cesantias:            (c['para_cesantias']           ?? 8.33) / 100,
    intereses_cesantias:  (c['para_intereses_cesantias'] ?? 1)    / 100,
    vacaciones:           (c['para_vacaciones']          ?? 4.17) / 100,
  }

  const porcentaje_total = Object.values(conceptos).reduce((a, b) => a + b, 0)
  const total_carga = salario_base * porcentaje_total
  const costo_total_mes = salario_base + total_carga

  return {
    salario_base,
    pension:              salario_base * conceptos.pension,
    salud:                salario_base * conceptos.salud,
    arl:                  salario_base * arl,
    sena:                 salario_base * conceptos.sena,
    icbf:                 salario_base * conceptos.icbf,
    caja_compensacion:    salario_base * conceptos.caja_compensacion,
    prima:                salario_base * conceptos.prima,
    cesantias:            salario_base * conceptos.cesantias,
    intereses_cesantias:  salario_base * conceptos.intereses_cesantias,
    vacaciones:           salario_base * conceptos.vacaciones,
    total_carga,
    costo_total_mes,
    porcentaje_total: porcentaje_total * 100,
  }
}

// ─── CRUD EMPLEADOS ─────────────────────────────────────────────────────────

export async function getEmpleados(area?: AreaNegocio): Promise<Empleado[]> {
  const supabase = db(await createClient())
  let q = supabase.from('empleados').select('*').order('nombre')
  if (area) q = q.eq('area', area)
  const { data } = await q as { data: Empleado[] | null }
  return data ?? []
}

export async function createEmpleado(input: CreateEmpleadoInput) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('empleados')
    .insert(input)
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/finanzas')
  return { data }
}

export async function updateEmpleado(id: string, input: Partial<CreateEmpleadoInput>) {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('empleados')
    .update(input)
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/finanzas')
  return {}
}

// ─── NÓMINA TOTAL POR ÁREA ──────────────────────────────────────────────────

export async function getNominaPorArea(): Promise<Record<string, number>> {
  const empleados = await getEmpleados()
  const c = await getParafiscalesConfig()

  const porcentaje_base = [
    c['para_pension_empleador'], c['para_salud_empleador'],
    c['para_sena'], c['para_icbf'], c['para_caja_compensacion'],
    c['para_prima'], c['para_cesantias'], c['para_intereses_cesantias'],
    c['para_vacaciones']
  ].reduce((a, b) => a + (b ?? 0), 0) / 100

  const result: Record<string, number> = {}
  for (const emp of empleados) {
    if (emp.estado !== 'activo') continue
    const arlKey = `para_arl_nivel${emp.nivel_riesgo_arl}`
    const arl = (c[arlKey] ?? 0.522) / 100
    const costo = emp.salario_base * (1 + porcentaje_base + arl)
    result[emp.area] = (result[emp.area] ?? 0) + costo
  }
  return result
}
