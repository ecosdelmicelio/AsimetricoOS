'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { CreateOPInput, OrdenProduccion, OPConDetalle, EstadoOP } from '@/features/ordenes-produccion/types'
import type { HistorialEstado } from '@/features/ordenes-venta/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function createOrdenProduccion(input: CreateOPInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // 0. Obtener bodega_taller_id del taller (tercero)
  const { data: taller } = await supabase
    .from('terceros')
    .select('bodega_taller_id')
    .eq('id', input.taller_id)
    .single() as { data: { bodega_taller_id: string | null } | null }

  // 1. Crear cabecera OP
  const { data: op, error: opError } = await supabase
    .from('ordenes_produccion')
    .insert({
      ov_id: input.ov_id,
      taller_id: input.taller_id,
      bodega_taller_id: taller?.bodega_taller_id ?? null,
      fecha_promesa: input.fecha_promesa,
      notas: input.notas ?? null,
      creado_por: user.id,
      estado: 'programada',
    })
    .select('id, codigo')
    .single() as { data: Pick<OrdenProduccion, 'id' | 'codigo'> | null; error: { message: string } | null }

  if (opError || !op) return { error: opError?.message ?? 'Error creando OP' }

  // 1.5. Validar disponibilidad: traer la OV para saber los totales
  const { data: ov, error: ovError } = await supabase
    .from('ordenes_venta')
    .select('ov_detalle ( id, producto_id, talla, cantidad )')
    .eq('id', input.ov_id)
    .single() as { data: { ov_detalle: { id: string; producto_id: string; talla: string; cantidad: number }[] } | null; error: { message: string } | null }

  if (ovError || !ov) return { error: 'Error validando OV' }

  // Traer lo ya asignado a otras OPs activas (no canceladas)
  const { data: asignados } = await supabase
    .from('op_detalle')
    .select(`
      producto_id, talla, cantidad_asignada,
      ordenes_produccion!inner ( ov_id, estado, id )
    `)
    .eq('ordenes_produccion.ov_id', input.ov_id)
    .neq('ordenes_produccion.estado', 'cancelada')
    .neq('ordenes_produccion.id', op.id) as {
      data: {
        producto_id: string
        talla: string
        cantidad_asignada: number
        ordenes_produccion: { ov_id: string; estado: string; id: string }
      }[] | null
    }

  // Calcular disponible por producto + talla
  const asignadoMap = new Map<string, number>()
  ;(asignados ?? []).forEach(a => {
    const key = `${a.producto_id}:${a.talla}`
    asignadoMap.set(key, (asignadoMap.get(key) ?? 0) + a.cantidad_asignada)
  })

  // Validar que cada línea del input no supere lo disponible
  for (const linea of input.lineas) {
    const ovLinea = ov.ov_detalle.find(l => l.producto_id === linea.producto_id && l.talla === linea.talla)
    if (!ovLinea) return { error: `Línea no encontrada en OV: ${linea.producto_id}/${linea.talla}` }

    const asignado = asignadoMap.get(`${linea.producto_id}:${linea.talla}`) ?? 0
    const disponible = ovLinea.cantidad - asignado
    if (linea.cantidad_asignada > disponible) {
      return { error: `Sobreasignación: talla ${linea.talla} solo tiene ${disponible} unidades disponibles (OV: ${ovLinea.cantidad}, ya asignado: ${asignado})` }
    }
  }

  // 2. Insertar líneas de detalle
  const detalles = input.lineas.map(l => ({
    op_id: op.id,
    producto_id: l.producto_id,
    talla: l.talla,
    cantidad_asignada: l.cantidad_asignada,
  }))

  const { error: detError } = await supabase.from('op_detalle').insert(detalles) as {
    error: { message: string } | null
  }
  if (detError) return { error: detError.message }

  // 2.5. Poblar op_servicios del BOM (servicios únicos de todos los productos)
  const productoIds = [...new Set(input.lineas.map(l => l.producto_id))]
  const { data: bomServicios } = await supabase
    .from('bom')
    .select('servicio_id, cantidad, servicios_operativos!inner(id, tarifa_unitaria)')
    .in('producto_id', productoIds)
    .eq('tipo', 'servicio')
    .not('servicio_id', 'is', null) as {
      data: { servicio_id: string; cantidad: number; servicios_operativos: { id: string; tarifa_unitaria: number } }[] | null
    }

  if (bomServicios && bomServicios.length > 0) {
    // Usar servicios del input si vienen (tarifas ajustadas), si no usar BOM
    const serviciosInput = input.servicios ?? []
    const serviciosMap = new Map(serviciosInput.map(s => [s.servicio_id, s]))

    // Deduplicar por servicio_id (un servicio puede estar en múltiples productos del BOM)
    const serviciosUnicos = new Map<string, { servicio_id: string; tarifa_unitaria: number; cantidad_por_unidad: number }>()
    for (const b of bomServicios) {
      if (!serviciosUnicos.has(b.servicio_id)) {
        const override = serviciosMap.get(b.servicio_id)
        serviciosUnicos.set(b.servicio_id, {
          servicio_id: b.servicio_id,
          tarifa_unitaria: override?.tarifa_unitaria ?? b.servicios_operativos.tarifa_unitaria,
          cantidad_por_unidad: b.cantidad,
        })
      }
    }

    const opServiciosRows = [...serviciosUnicos.values()].map(s => ({
      op_id: op.id,
      servicio_id: s.servicio_id,
      tarifa_unitaria: s.tarifa_unitaria,
      cantidad_por_unidad: s.cantidad_por_unidad,
    }))

    await supabase.from('op_servicios').insert(opServiciosRows)
  }

  // 3. Si la OV todavía no está en producción, actualizarla
  await supabase
    .from('ordenes_venta')
    .update({ estado: 'en_produccion' })
    .eq('id', input.ov_id)
    .neq('estado', 'en_produccion')

  revalidatePath('/ordenes-produccion')
  revalidatePath(`/ordenes-venta/${input.ov_id}`)
  return { data: { id: op.id, codigo: op.codigo } }
}

export async function updateEstadoOP(id: string, estado: EstadoOP) {
  const supabase = db(await createClient())
  const { data: op, error } = await supabase
    .from('ordenes_produccion')
    .update({ estado })
    .eq('id', id)
    .select('ov_id')
    .single() as { data: { ov_id: string } | null; error: { message: string } | null }

  if (error) return { error: error.message }

  // Check if OV should be updated automatically
  if (estado === 'completada' && op?.ov_id) {
    const { data: ov } = await supabase
      .from('ordenes_venta')
      .select('estado, ov_detalle(cantidad)')
      .eq('id', op.ov_id)
      .single() as { data: { estado: string; ov_detalle: { cantidad: number }[] } | null }

    if (ov && ov.estado !== 'completada') {
      const ovUnits = ov.ov_detalle.reduce((sum, d) => sum + d.cantidad, 0)

      const { data: ops } = await supabase
        .from('ordenes_produccion')
        .select('estado, op_detalle(cantidad_asignada)')
        .eq('ov_id', op.ov_id)
        .neq('estado', 'cancelada') as { data: { estado: string; op_detalle: { cantidad_asignada: number }[] }[] | null }

      if (ops && ops.length > 0) {
        const allCompleted = ops.every(o => o.estado === 'completada')
        const totalOpUnits = ops.reduce((sum, o) => {
          return sum + o.op_detalle.reduce((s, d) => s + d.cantidad_asignada, 0)
        }, 0)

        if (allCompleted && totalOpUnits >= ovUnits) {
          await supabase.from('ordenes_venta').update({ estado: 'completada' }).eq('id', op.ov_id)
          revalidatePath('/ordenes-venta')
          revalidatePath(`/ordenes-venta/${op.ov_id}`)
        }
      }
    }
  }

  revalidatePath('/ordenes-produccion')
  revalidatePath(`/ordenes-produccion/${id}`)
  return { data: true }
}

export async function cancelOrdenProduccion(id: string) {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('ordenes_produccion')
    .update({ estado: 'cancelada' })
    .eq('id', id) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/ordenes-produccion')
  revalidatePath(`/ordenes-produccion/${id}`)
  return { data: true }
}

export async function getOPsByOV(ovId: string) {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('ordenes_produccion')
    .select('*, terceros!taller_id ( nombre ), op_detalle ( cantidad_asignada )')
    .eq('ov_id', ovId)
    .neq('estado', 'cancelada')
    .order('created_at', { ascending: false })
  
  return data ?? []
}

export async function getOrdenesProduccion() {
  try {
    const supabase = db(await createClient())
    const { data, error } = await supabase
      .from('ordenes_produccion')
      .select(`
        *,
        terceros!taller_id ( nombre ),
        ordenes_venta ( 
          id,
          codigo, 
          terceros!cliente_id ( nombre ) 
        ),
        op_detalle ( 
          cantidad_asignada,
          producto_id,
          productos ( precio_base )
        ),
        entregas ( 
          id, 
          estado, 
          fecha_entrega,
          entrega_detalle ( cantidad_entregada ) 
        ),
        liquidaciones ( costo_total ),
        reporte_corte ( id )
      `)
      .neq('estado', 'cancelada')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(' [OP_SERVICE] Error fetching OPs:', error.message)
      return { error: error.message, data: [] }
    }

    // Safety check for OV codes
    if (data) {
      const missingOVs = data.filter((op: any) => !op.ordenes_venta)
      if (missingOVs.length > 0) {
        console.warn(` [OP_SERVICE] Found ${missingOVs.length} OPs without linked OV metadata.`)
      }
    }

    return { data: (data as any) ?? [] }
  } catch (e: any) {
    console.error(' [OP_SERVICE] Critical failure:', e.message)
    return { error: e.message, data: [] }
  }
}

export async function getOrdenProduccionById(id: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('ordenes_produccion')
    .select(`
      *,
      terceros!taller_id ( nombre ),
      ordenes_venta ( codigo, terceros!cliente_id ( nombre ) ),
      op_detalle ( *, productos ( nombre, referencia, color, origen_usa ) )
    `)
    .eq('id', id)
    .single() as { data: OPConDetalle | null; error: { message: string } | null }

  if (error) return { error: error.message, data: null }
  return { data }
}

export async function getHistorialOP(opId: string) {
  const supabase = db(await createClient())
  const { data, error } = await supabase
    .from('historial_estados')
    .select('*, profiles ( full_name )')
    .eq('entidad', 'op')
    .eq('entidad_id', opId)
    .order('timestamp_cambio', { ascending: true }) as {
      data: HistorialEstado[] | null
      error: { message: string } | null
    }

  if (error) return { error: error.message, data: [] as HistorialEstado[] }
  return { data: data ?? [] }
}

export async function getTalleres() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('terceros')
    .select('id, nombre, capacidad_diaria')
    .overlaps('tipos', ['satelite'])
    .eq('estado', 'activo')
    .order('nombre')
  return (data ?? []) as { id: string; nombre: string; capacidad_diaria: number | null }[]
}

export async function getServiciosBOM(productoIds: string[]) {
  const supabase = db(await createClient())
  if (productoIds.length === 0) return []

  const { data } = await supabase
    .from('bom')
    .select('servicio_id, cantidad, servicios_operativos!inner(id, codigo, nombre, tipo_proceso, tarifa_unitaria)')
    .in('producto_id', productoIds)
    .eq('tipo', 'servicio')
    .not('servicio_id', 'is', null) as {
      data: {
        servicio_id: string
        cantidad: number
        servicios_operativos: { id: string; codigo: string; nombre: string; tipo_proceso: string; tarifa_unitaria: number }
      }[] | null
    }

  // Deduplicar por servicio_id
  const map = new Map<string, { servicio_id: string; nombre: string; codigo: string; tipo_proceso: string; tarifa_unitaria: number; cantidad_por_unidad: number }>()
  for (const b of data ?? []) {
    if (!map.has(b.servicio_id)) {
      map.set(b.servicio_id, {
        servicio_id: b.servicio_id,
        nombre: b.servicios_operativos.nombre,
        codigo: b.servicios_operativos.codigo,
        tipo_proceso: b.servicios_operativos.tipo_proceso,
        tarifa_unitaria: b.servicios_operativos.tarifa_unitaria,
        cantidad_por_unidad: b.cantidad,
      })
    }
  }
  return [...map.values()]
}

export async function getOVsConfirmadas() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('ordenes_venta')
    .select(`
      id, codigo, fecha_entrega,
      terceros!cliente_id ( nombre ),
      ov_detalle ( id, producto_id, talla, cantidad, precio_pactado, productos ( nombre, referencia ) )
    `)
    .in('estado', ['confirmada', 'en_produccion'])
    .order('created_at', { ascending: false }) as {
      data: {
        id: string
        codigo: string
        fecha_entrega: string
        terceros: { nombre: string } | null
        ov_detalle: {
          id: string
          producto_id: string
          talla: string
          cantidad: number
          precio_pactado: number
          productos: { nombre: string; referencia: string } | null
        }[]
      }[] | null
    }

  const ovs = data ?? []
  if (ovs.length === 0) return []

  // 2. Traer lo ya asignado a OPs activas (no canceladas)
  const ovIds = ovs.map(o => o.id)
  const { data: asignados } = await supabase
    .from('op_detalle')
    .select(`
      producto_id, talla, cantidad_asignada,
      ordenes_produccion!inner ( ov_id, estado )
    `)
    .in('ordenes_produccion.ov_id', ovIds)
    .neq('ordenes_produccion.estado', 'cancelada') as {
      data: {
        producto_id: string
        talla: string
        cantidad_asignada: number
        ordenes_produccion: { ov_id: string; estado: string }
      }[] | null
    }

  // 3. Calcular disponible por OV + producto + talla
  const asignadoMap = new Map<string, number>()
  ;(asignados ?? []).forEach(a => {
    const key = `${a.ordenes_produccion.ov_id}:${a.producto_id}:${a.talla}`
    asignadoMap.set(key, (asignadoMap.get(key) ?? 0) + a.cantidad_asignada)
  })

  // 4. Agregar cantidad_disponible a cada línea de ov_detalle
  const ovsConDisponibilidad = ovs.map(ov => ({
    ...ov,
    ov_detalle: ov.ov_detalle.map(linea => {
      const asignado = asignadoMap.get(`${ov.id}:${linea.producto_id}:${linea.talla}`) ?? 0
      return {
        ...linea,
        cantidad_disponible: Math.max(0, linea.cantidad - asignado),
      }
    }),
  }))

  // 5. Filtrar OVs que no tienen NINGUNA unidad disponible
  return ovsConDisponibilidad.filter(ov =>
    ov.ov_detalle.some(linea => linea.cantidad_disponible > 0)
  )
}
