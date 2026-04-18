'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { CreatePagoInput, Pago } from '../types/pagos'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function registrarPago(input: CreatePagoInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // 1. Insertar el pago
  const { data: pago, error: pagoError } = await supabase
    .from('pagos')
    .insert({
      ...input,
      registrado_por: user.id
    })
    .select()
    .single() as { data: Pago | null; error: { message: string } | null }

  if (pagoError || !pago) return { error: pagoError?.message ?? 'Error registrando el pago' }

  // 2. Actualizar el documento vinculado si existe
  if (input.documento_id && ['ov', 'oc'].includes(input.documento_tipo)) {
    const table = input.documento_tipo === 'ov' ? 'ordenes_venta' : 'ordenes_compra'
    
    // Obtener valores actuales
    const { data: doc } = await supabase
      .from(table)
      .select('total_facturado, total_pagado')
      .eq('id', input.documento_id)
      .single()

    if (doc) {
      const nuevoTotalPagado = (Number(doc.total_pagado) || 0) + Number(input.monto)
      const facturado = Number(doc.total_facturado) || 0
      
      let nuevoEstadoPago = 'parcial'
      if (nuevoTotalPagado >= facturado && facturado > 0) {
        nuevoEstadoPago = 'pagada'
      } else if (nuevoTotalPagado === 0) {
        nuevoEstadoPago = 'pendiente'
      }

      await supabase
        .from(table)
        .update({
          total_pagado: nuevoTotalPagado,
          estado_pago: nuevoEstadoPago,
          fecha_ultimo_pago: input.fecha_pago
        })
        .eq('id', input.documento_id)
    }
  }

  revalidatePath('/ordenes-venta')
  revalidatePath('/compras')
  if (input.documento_id) {
    revalidatePath(`/${input.documento_tipo === 'ov' ? 'ordenes-venta' : 'compras'}/${input.documento_id}`)
  }

  return { data: pago, error: null }
}

export async function updateFacturacion(
  tipo: 'ov' | 'oc',
  id: string,
  data: {
    numero_factura?: string,
    fecha_factura?: string,
    plazo_pago_dias?: number,
    total_facturado?: number
  }
) {
  const supabase = db(await createClient())
  const table = tipo === 'ov' ? 'ordenes_venta' : 'ordenes_compra'

  // Ajustar nombres de campos según la tabla (OC usa _proveedor)
  const updates: any = { ...data }
  if (tipo === 'oc') {
    if (data.numero_factura) {
      updates.numero_factura_proveedor = data.numero_factura
      delete updates.numero_factura
    }
    if (data.fecha_factura) {
      updates.fecha_factura_proveedor = data.fecha_factura
      delete updates.fecha_factura
    }
  }

  // Calcular fecha_vencimiento si hay fecha y plazo
  if (updates.fecha_factura || updates.fecha_factura_proveedor) {
    const fechaBase = updates.fecha_factura || updates.fecha_factura_proveedor
    const plazo = updates.plazo_pago_dias || 30
    const d = new Date(fechaBase)
    d.setDate(d.getDate() + plazo)
    updates.fecha_vencimiento = d.toISOString().split('T')[0]
  }

  const { error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/${tipo === 'ov' ? 'ordenes-venta' : 'compras'}/${id}`)
  return { error: null }
}

export async function getPagosPorDocumento(documento_id: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('pagos')
    .select(`
      *,
      profiles:registrado_por ( full_name )
    `)
    .eq('documento_id', documento_id)
    .order('fecha_pago', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data, error: null }
}
