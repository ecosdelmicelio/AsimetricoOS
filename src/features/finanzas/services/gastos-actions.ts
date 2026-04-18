'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { CreateGastoInput, Gasto, CategoriaGasto } from '../types'
import { registrarPago } from '@/features/configuracion/services/pagos-actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getCategoriasGastos(): Promise<CategoriaGasto[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('categorias_gastos')
    .select('*')
    .order('nombre')
  return data ?? []
}

export async function createGasto(input: CreateGastoInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const monto_total = input.costo_unitario * input.cantidad

  // 1. Insertar el gasto
  const { data: gasto, error: gastoError } = await supabase
    .from('gastos')
    .insert({
      descripcion: input.descripcion,
      costo_unitario: input.costo_unitario,
      cantidad: input.cantidad,
      monto_total: monto_total,
      fecha: input.fecha,
      area: input.area,
      tipo: input.tipo,
      categoria_id: input.categoria_id || null,
      tercero_id: input.tercero_id || null,
      registrado_por: user.id
    })
    .select()
    .single() as { data: Gasto | null; error: { message: string } | null }

  if (gastoError || !gasto) return { error: gastoError?.message ?? 'Error creando gasto' }

  // 2. Integración automática con Pagos (Recomendación aprobada por el usuario)
  // Generamos un registro de egreso vinculado a este gasto
  const pagoResult = await registrarPago({
    tipo: 'egreso',
    documento_tipo: 'gasto',
    documento_id: gasto.id,
    tercero_id: input.tercero_id || '00000000-0000-0000-0000-000000000000', // GUID genérico si no hay tercero
    monto: monto_total,
    metodo_pago: input.metodo_pago,
    fecha_pago: input.fecha,
    notas: `Registro automático - Gasto: ${input.descripcion}`
  })

  if (pagoResult.error) {
    console.error('Error al registrar pago automático del gasto:', pagoResult.error)
    // No bloqueamos el retorno del gasto, pero lo logueamos
  }

  revalidatePath('/finanzas') // Próxima ruta a crear
  return { data: gasto }
}

export async function getGastos(filters?: { area?: string; mes?: number; anio?: number }) {
  const supabase = db(await createClient())
  let query = supabase
    .from('gastos')
    .select(`
      *,
      terceros ( nombre ),
      categorias_gastos ( nombre )
    `)
    .order('fecha', { ascending: false })

  if (filters?.area) query = query.eq('area', filters.area)
  if (filters?.mes) {
      // Filtrar por mes en PostgreSQL
      query = query.filter('fecha', 'gte', `${filters.anio}-${String(filters.mes).padStart(2, '0')}-01`)
      const nextMonth = filters.mes === 12 ? 1 : filters.mes + 1
      const nextYear = filters.mes === 12 ? (filters.anio || 2026) + 1 : filters.anio
      query = query.filter('fecha', 'lt', `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`)
  }

  const { data, error } = await query as { data: Gasto[] | null; error: any }
  
  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}
