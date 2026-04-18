'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(s: unknown): any { return s }

export interface CuentaBancaria {
  id: string
  nombre: string
  tipo: 'caja_fisica' | 'banco' | 'billetera_digital' | 'tarjeta_credito'
  entidad: string
  numero_cuenta: string
  saldo_actual: number
  activa: boolean
}

export interface MovimientoTesoreria {
  id: string
  fecha: string
  cuenta_id: string
  tipo: 'ingreso' | 'egreso' | 'transferencia' | 'ajuste'
  monto: number
  concepto: string
  categoria?: string
  tercero_id?: string
  documento_referencia?: string
}

export async function getCuentasBancarias() {
  const supabase = db(await createClient())
  const { data } = await supabase.from('cuentas_bancarias').select('*').order('nombre')
  return data as CuentaBancaria[] || []
}

export async function createCuentaBancaria(input: Omit<CuentaBancaria, 'id' | 'saldo_actual' | 'activa'>) {
  const supabase = db(await createClient())
  const { data, error } = await supabase.from('cuentas_bancarias').insert({
    ...input,
    saldo_actual: 0,
    activa: true
  }).select().single()

  revalidatePath('/finanzas')
  return { data, error: error?.message }
}

export async function registrarMovimiento(input: Omit<MovimientoTesoreria, 'id' | 'fecha'>) {
  const supabase = db(await createClient())
  const { data, error } = await supabase.from('movimientos_tesoreria').insert(input).select().single()

  revalidatePath('/finanzas')
  return { data, error: error?.message }
}

export async function realizarTransferencia(origenId: string, destinoId: string, monto: number, concepto: string) {
  const supabase = db(await createClient())
  
  // Egreso en origen
  const { error: errorOrigen } = await supabase.from('movimientos_tesoreria').insert({
    cuenta_id: origenId,
    tipo: 'egreso',
    monto,
    concepto: `[Transferencia] ${concepto}`,
    categoria: 'transferencia'
  })

  if (errorOrigen) return { error: errorOrigen.message }

  // Ingreso en destino
  const { error: errorDestino } = await supabase.from('movimientos_tesoreria').insert({
    cuenta_id: destinoId,
    tipo: 'ingreso',
    monto,
    concepto: `[Transferencia] ${concepto}`,
    categoria: 'transferencia'
  })

  revalidatePath('/finanzas')
  return { error: errorDestino?.message }
}

export async function getMovimientosRecent(limit = 20) {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('movimientos_tesoreria')
    .select('*, cuentas_bancarias(nombre)')
    .order('fecha', { ascending: false })
    .limit(limit)
  
  return data || []
}
