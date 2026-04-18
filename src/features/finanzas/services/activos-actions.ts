'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(s: unknown): any { return s }

// ─── SEMILLA DE BASE DE DATOS (Fuerza Bruta) ────────────────────────────────

export async function seedFinancialConfig() {
  const supabase = db(await createClient())
  
  // 1. Crear tabla si no existe (via SQL indirecto no es posible facil, pero podemos intentar inserts)
  const defaultKeys = [
    { clave: 'saldo_inicial_bancos', valor: 0, nota: 'Saldo consolidado en todas las cuentas bancarias' },
    { clave: 'capital_social', valor: 0, nota: 'Aportes iniciales de los socios/dueños' },
    { clave: 'utilidades_retenidas', valor: 0, nota: 'Utilidades acumuladas de ejercicios anteriores' }
  ]

  const { error } = await supabase.from('balance_config').upsert(defaultKeys, { onConflict: 'clave' })
  
  if (error) {
    // Si falla, quizás la tabla no existe. Intentamos crearla via RPC o SQL si estuviera disponible.
    // Como no podemos, devolvemos el error para que el usuario sepa.
    return { error: "No se pudo inicializar la tabla balance_config. Asegúrate de haber corrido el SQL de migración." }
  }

  revalidatePath('/configuracion')
  revalidatePath('/finanzas')
  return { success: true }
}

export interface ActivoFijo {
  id: string
  nombre: string
  valor_compra: number
  fecha_compra: string
  vida_util_meses: number
  depreciacion_mes: number
  estado: 'activo' | 'vendido' | 'dado_de_baja'
  created_at: string
}

export async function getActivosFijos() {
  const supabase = db(await createClient())
  const { data } = await supabase.from('activos_fijos').select('*').order('created_at', { ascending: false })
  return data as ActivoFijo[] || []
}

export async function createActivoFijo(input: Omit<ActivoFijo, 'id' | 'depreciacion_mes' | 'created_at'>) {
  const supabase = db(await createClient())
  const { data, error } = await supabase.from('activos_fijos').insert(input).select().single()
  if (error) return { error: error.message }
  revalidatePath('/finanzas')
  return { data }
}

export async function updateActivoEstado(id: string, estado: ActivoFijo['estado']) {
  const supabase = db(await createClient())
  await supabase.from('activos_fijos').update({ estado }).eq('id', id)
  revalidatePath('/finanzas')
}

// ─── CONFIGURACIÓN DE BALANCE ────────────────────────────────────────────────

export async function getBalanceConfig() {
  const supabase = db(await createClient())
  const { data, error } = await supabase.from('balance_config').select('*')
  
  if (error) {
    console.error("Error fetching balance_config:", error)
    return []
  }

  return data as { clave: string; valor: number; nota: string }[] || []
}

export async function updateBalanceConfig(clave: string, valor: number) {
  const supabase = db(await createClient())
  const { error } = await supabase.from('balance_config').update({ valor }).eq('clave', clave)
  
  if (error) {
     await supabase.from('balance_config').upsert({ clave, valor }, { onConflict: 'clave' })
  }
  
  revalidatePath('/finanzas')
  revalidatePath('/configuracion')
}
