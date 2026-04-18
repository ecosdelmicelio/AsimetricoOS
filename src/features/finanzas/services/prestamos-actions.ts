'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { calcularCuotaFrances, generarTablaAmortizacion } from '../utils/finanzas-utils'
import type { AreaNegocio } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(s: unknown): any { return s }

export interface Prestamo {
  id: string
  descripcion: string
  entidad: string
  monto_inicial: number
  saldo_actual: number
  tasa_interes_mes: number  // % mensual
  plazo_meses: number
  fecha_inicio: string
  cuota_mensual: number
  estado: 'activo' | 'cancelado' | 'en_mora'
  created_at: string
}

export interface CreatePrestamoInput {
  descripcion: string
  entidad: string
  monto_inicial: number
  saldo_actual: number
  tasa_interes_mes: number
  plazo_meses: number
  fecha_inicio: string
}

// ─── CRUD PRÉSTAMOS ─────────────────────────────────────────────────────────

export async function getPrestamos(): Promise<Prestamo[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('prestamos')
    .select('*')
    .order('fecha_inicio', { ascending: false }) as { data: Prestamo[] | null }
  return data ?? []
}

export async function createPrestamo(input: CreatePrestamoInput) {
  const supabase = db(await createClient())
  const cuota = calcularCuotaFrances(input.monto_inicial, input.tasa_interes_mes, input.plazo_meses)

  const { data, error } = await supabase
    .from('prestamos')
    .insert({ ...input, cuota_mensual: cuota })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/finanzas')
  return { data }
}

// ─── PROYECCIÓN DE CUOTAS PRÓXIMAS (para Flujo de Caja) ────────────────────

export async function getCuotasProximas(diasHorizonte: number = 90) {
  const prestamos = await getPrestamos()
  const hoy = new Date()
  const limite = new Date()
  limite.setDate(limite.getDate() + diasHorizonte)

  const cuotas: { fecha: string; monto: number; prestamo: string; interes: number; capital: number }[] = []

  for (const p of prestamos) {
    if (p.estado !== 'activo') continue
    const tabla = generarTablaAmortizacion(p.saldo_actual, p.tasa_interes_mes, p.plazo_meses, p.fecha_inicio)
    for (const c of tabla) {
      const fecha = new Date(c.fecha)
      if (fecha >= hoy && fecha <= limite) {
        cuotas.push({
          fecha: c.fecha,
          monto: c.cuota,
          prestamo: p.descripcion,
          interes: c.interes,
          capital: c.capital,
        })
      }
    }
  }
  return cuotas.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// ─── TOTALES PARA P&L ───────────────────────────────────────────────────────

export async function getInteresesMes(mes: number, anio: number): Promise<number> {
  const prestamos = await getPrestamos()
  let totalIntereses = 0

  for (const p of prestamos) {
    if (p.estado !== 'activo') continue
    const tabla = generarTablaAmortizacion(p.saldo_actual, p.tasa_interes_mes, p.plazo_meses, p.fecha_inicio)
    const cuotaMes = tabla.find(c => {
      const d = new Date(c.fecha)
      return d.getMonth() + 1 === mes && d.getFullYear() === anio
    })
    if (cuotaMes) totalIntereses += cuotaMes.interes
  }
  return totalIntereses
}
