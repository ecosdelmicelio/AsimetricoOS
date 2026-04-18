'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { PresupuestoArea } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getPresupuestos(anio: number) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('presupuestos_area')
    .select('*')
    .eq('anio', anio)
    .order('area') as { data: PresupuestoArea[] | null; error: any }

  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}

export async function updatePresupuesto(input: {
  area: string
  mes: number
  anio: number
  monto_limite: number
}) {
  const supabase = db(await createClient())
  
  const { data, error } = await supabase
    .from('presupuestos_area')
    .upsert(input, { onConflict: 'area, mes, anio' })
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath('/finanzas/presupuestos')
  return { data }
}

export async function getConsolidadoBudget(mes: number, anio: number) {
  const supabase = db(await createClient())
  
  // 1. Obtener presupuestos de ese mes
  const { data: presupuestos } = await supabase
    .from('presupuestos_area')
    .select('*')
    .eq('mes', mes)
    .eq('anio', anio) as { data: PresupuestoArea[] | null }

  // 2. Obtener gastos reales de ese mes
  const startDate = `${anio}-${String(mes).padStart(2, '0')}-01`
  const nextMonth = mes === 12 ? 1 : mes + 1
  const nextYear = mes === 12 ? anio + 1 : anio
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const { data: gastos } = await supabase
    .from('gastos')
    .select('area, monto_total')
    .gte('fecha', startDate)
    .lt('fecha', endDate)

  // 3. Cruzar
  const areas = [
    'Comercial', 'Mercadeo', 'Administrativo', 'Operaciones', 
    'Desarrollo', 'Logistica', 'Talento_Humano'
  ]

  const consolidado = areas.map(a => {
    const p = presupuestos?.find(x => x.area === a)?.monto_limite || 0
    const r = gastos?.filter(x => x.area === a).reduce((sum, g) => sum + Number(g.monto_total), 0) || 0
    return {
      area: a,
      presupuestado: p,
      real: r,
      diferencia: p - r,
      porcentaje: p > 0 ? (r / p) * 100 : 0
    }
  })

  return consolidado
}
