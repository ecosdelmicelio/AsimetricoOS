'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { InsumoParaReporte, ResumenLiquidacion, LineaComparativo, CppPorProducto, ServicioRef } from '@/features/liquidacion/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

// ─── REPORTE DE INSUMOS ─────────────────────────────────────────────────────

export async function getInsumosParaReporte(opId: string): Promise<InsumoParaReporte[]> {
  const supabase = db(await createClient())

  // 1. Unidades por producto en esta OP
  const { data: opDetalle } = await supabase
    .from('op_detalle')
    .select('cantidad_asignada, producto_id')
    .eq('op_id', opId) as { data: { cantidad_asignada: number; producto_id: string }[] | null }

  const productosUnidades = new Map<string, number>()
  for (const d of opDetalle ?? []) {
    productosUnidades.set(d.producto_id, (productosUnidades.get(d.producto_id) ?? 0) + d.cantidad_asignada)
  }
  const productoIds = [...productosUnidades.keys()]
  if (productoIds.length === 0) return []

  // 2. Nombres y referencias de productos
  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre, referencia')
    .in('id', productoIds) as { data: { id: string; nombre: string; referencia: string }[] | null }

  const productosMap = new Map((productos ?? []).map(p => [p.id, p.nombre]))

  // 3. BOM: materiales NO tela y NO servicio, por producto
  const { data: bomItems } = await supabase
    .from('bom')
    .select('producto_id, material_id, cantidad, materiales!inner(nombre, unidad)')
    .in('producto_id', productoIds)
    .eq('tipo', 'materia_prima')
    .eq('reportable_en_corte', false)
    .eq('materiales.es_tela', false) as {
      data: {
        producto_id: string
        material_id: string
        cantidad: number
        materiales: { nombre: string; unidad: string }
      }[] | null
    }

  // 4. Reportes ya existentes (con producto_id)
  const { data: reportesExistentes } = await supabase
    .from('reporte_insumos')
    .select('producto_id, material_id, cantidad_usada, desperdicio, notas')
    .eq('op_id', opId) as {
      data: { producto_id: string; material_id: string; cantidad_usada: number; desperdicio: number; notas: string | null }[] | null
    }

  const reporteMap = new Map((reportesExistentes ?? []).map(r => [`${r.producto_id}:${r.material_id}`, r]))

  // Retornar una línea por (producto_id, material_id)
  return (bomItems ?? []).map(b => {
    const unidades = productosUnidades.get(b.producto_id) ?? 0
    const key = `${b.producto_id}:${b.material_id}`
    const reporte = reporteMap.get(key)
    return {
      material_id: b.material_id,
      producto_id: b.producto_id,
      producto_nombre: productosMap.get(b.producto_id) ?? 'Producto',
      cantidad_producto: unidades,
      nombre: b.materiales.nombre,
      unidad: b.materiales.unidad,
      cantidad_bom: b.cantidad * unidades,
      cantidad_usada: reporte?.cantidad_usada ?? 0,
      desperdicio: reporte?.desperdicio ?? 0,
      notas: reporte?.notas ?? null,
      ya_reportado: !!reporte,
    }
  })
}

export async function upsertReporteInsumos(
  opId: string,
  lineas: { material_id: string; producto_id: string; cantidad_usada: number; desperdicio: number; notas?: string }[]
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  for (const linea of lineas) {
    const { error } = await supabase
      .from('reporte_insumos')
      .upsert({
        op_id: opId,
        producto_id: linea.producto_id,
        material_id: linea.material_id,
        cantidad_usada: linea.cantidad_usada,
        desperdicio: linea.desperdicio,
        notas: linea.notas ?? null,
        reportado_por: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'op_id,producto_id,material_id' }) as { error: { message: string } | null }

    if (error) return { error: error.message }
  }

  // Transición automática: en_terminado → en_entregas
  await supabase
    .from('ordenes_produccion')
    .update({ estado: 'en_entregas' })
    .eq('id', opId)
    .eq('estado', 'en_terminado')

  revalidatePath(`/ordenes-produccion/${opId}`)
  return {}
}

export async function guardarBodegaDestino(
  opId: string,
  bodegaId: string,
  _opCodigo: string,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('ordenes_produccion')
    .update({ bodega_destino_id: bodegaId })
    .eq('id', opId) as { error: { message: string } | null }

  if (error) return { error: error.message }

  revalidatePath(`/ordenes-produccion/${opId}`)
  return {}
}

// ─── LIQUIDACIÓN ─────────────────────────────────────────────────────────────

export async function calcularResumenLiquidacion(opId: string): Promise<ResumenLiquidacion> {
  const supabase = db(await createClient())

  // Total unidades de la OP y productos
  const { data: opDetalle } = await supabase
    .from('op_detalle')
    .select('cantidad_asignada, producto_id')
    .eq('op_id', opId) as { data: { cantidad_asignada: number; producto_id: string }[] | null }

  const totalUnidadesOP = (opDetalle ?? []).reduce((s, d) => s + d.cantidad_asignada, 0)
  const productoIds = [...new Set((opDetalle ?? []).map(d => d.producto_id))]

  // Total entregado (entregas aceptadas)
  const { data: entregasAceptadas } = await supabase
    .from('entregas')
    .select('entrega_detalle(producto_id, cantidad_entregada)')
    .eq('op_id', opId)
    .eq('estado', 'aceptada') as {
      data: { entrega_detalle: { producto_id: string; cantidad_entregada: number }[] }[] | null
    }

  const cantidad_entregada = (entregasAceptadas ?? []).reduce(
    (s, e) => s + e.entrega_detalle.reduce((ss, d) => ss + d.cantidad_entregada, 0), 0
  )

  // Calcular unidades REALES entregadas por producto para BOM teórico exacto
  const productosUnidades = new Map<string, number>()
  for (const entrega of entregasAceptadas ?? []) {
    for (const d of entrega.entrega_detalle) {
      if (d.producto_id && d.cantidad_entregada) {
        productosUnidades.set(d.producto_id, (productosUnidades.get(d.producto_id) ?? 0) + d.cantidad_entregada)
      }
    }
  }

  // Nombres y referencias de productos (para CPP por producto)
  const { data: productosInfo } = await supabase
    .from('productos')
    .select('id, nombre, referencia, precio_base')
    .in('id', productoIds) as { data: { id: string; nombre: string; referencia: string; precio_base: number | null }[] | null }
  const productosNombreMap = new Map((productosInfo ?? []).map(p => [p.id, p.nombre]))
  const referenciasMap = new Map((productosInfo ?? []).map(p => [p.id, p.referencia]))
  const costosEstandarMap = new Map((productosInfo ?? []).map(p => [p.id, p.precio_base ?? 0]))

  const comparativo: LineaComparativo[] = []

  // ── TELAS (de reporte_corte_material) ──────────────────────────────────────
  const { data: telasBOM } = await supabase
    .from('bom')
    .select('producto_id, material_id, cantidad, materiales!inner(nombre, unidad, costo_unit, es_tela)')
    .in('producto_id', productoIds)
    .eq('tipo', 'materia_prima')
    .eq('reportable_en_corte', true) as {
      data: {
        producto_id: string
        material_id: string
        cantidad: number
        materiales: { nombre: string; unidad: string; costo_unit: number; es_tela: boolean }
      }[] | null
    }

  // reporte_corte_material no tiene op_id directo — join via reporte_corte
  const { data: reporteCorteIdsLiq } = await supabase
    .from('reporte_corte')
    .select('id')
    .eq('op_id', opId) as { data: { id: string }[] | null }

  const { data: telasReporte } = await supabase
    .from('reporte_corte_material')
    .select('material_id, metros_usados, materiales!inner(nombre, unidad, costo_unit)')
    .in('reporte_id', (reporteCorteIdsLiq ?? []).map(r => r.id))
    .not('material_id', 'is', null) as {
      data: {
        material_id: string
        metros_usados: number
        materiales: { nombre: string; unidad: string; costo_unit: number }
      }[] | null
    }

  // Agrupar metros reales por material
  const metrosRealesMap = new Map<string, { metros: number; nombre: string; unidad: string; costo_unit: number }>()
  for (const t of telasReporte ?? []) {
    if (!t.material_id) continue
    const prev = metrosRealesMap.get(t.material_id)
    metrosRealesMap.set(t.material_id, {
      metros: (prev?.metros ?? 0) + (t.metros_usados ?? 0),
      nombre: t.materiales.nombre,
      unidad: t.materiales.unidad,
      costo_unit: t.materiales.costo_unit,
    })
  }

  // BOM teórico de telas (deduplicado por material)
  const telasBOMMap = new Map<string, { cantidad: number; nombre: string; unidad: string; costo_unit: number }>()
  for (const b of telasBOM ?? []) {
    const unidades = productosUnidades.get(b.producto_id) ?? 0
    const prev = telasBOMMap.get(b.material_id)
    telasBOMMap.set(b.material_id, {
      cantidad: (prev?.cantidad ?? 0) + b.cantidad * unidades,
      nombre: b.materiales.nombre,
      unidad: b.materiales.unidad,
      costo_unit: b.materiales.costo_unit,
    })
  }

  let costo_tela = 0
  for (const [material_id, real] of metrosRealesMap) {
    const bom = telasBOMMap.get(material_id)
    const teorico = bom?.cantidad ?? 0
    const diferencia = real.metros - teorico
    const pct = teorico > 0 ? ((real.metros - teorico) / teorico) * 100 : 0
    const costo_total = real.metros * real.costo_unit
    costo_tela += costo_total
    comparativo.push({
      tipo: 'tela',
      nombre: real.nombre,
      unidad: real.unidad,
      teorico,
      real: real.metros,
      diferencia,
      porcentaje_desvio: pct,
      costo_unitario: real.costo_unit,
      costo_total,
    })
  }

  // ── INSUMOS (de reporte_insumos) ───────────────────────────────────────────


  const { data: insumosReporte } = await supabase
    .from('reporte_insumos')
    .select('producto_id, material_id, cantidad_usada, materiales!inner(nombre, unidad, costo_unit)')
    .eq('op_id', opId) as {
      data: {
        producto_id: string
        material_id: string
        cantidad_usada: number
        materiales: { nombre: string; unidad: string; costo_unit: number }
      }[] | null
    }

  const { data: insumosBOM } = await supabase
    .from('bom')
    .select('producto_id, material_id, cantidad, materiales!inner(nombre, unidad, costo_unit)')
    .in('producto_id', productoIds)
    .eq('tipo', 'materia_prima')
    .eq('reportable_en_corte', false) as {
      data: {
        producto_id: string
        material_id: string
        cantidad: number
        materiales: { nombre: string; unidad: string; costo_unit: number }
      }[] | null
    }

  // BOM teórico usa unidades específicas de cada producto (no el total OP)
  const insumosBOMMap = new Map<string, { cantidad: number; nombre: string; unidad: string; costo_unit: number }>()
  for (const b of insumosBOM ?? []) {
    const unidades = productosUnidades.get(b.producto_id) ?? 0
    const prev = insumosBOMMap.get(b.material_id)
    insumosBOMMap.set(b.material_id, {
      cantidad: (prev?.cantidad ?? 0) + b.cantidad * unidades,
      nombre: b.materiales.nombre,
      unidad: b.materiales.unidad,
      costo_unit: b.materiales.costo_unit,
    })
  }

  let costo_insumos = 0
  // Acumular costo de insumos por producto (para CPP individual)
  const costoInsumosPorProducto = new Map<string, number>()
  for (const insumo of insumosReporte ?? []) {
    const bom = insumosBOMMap.get(insumo.material_id)
    const teorico = bom?.cantidad ?? 0
    const diferencia = insumo.cantidad_usada - teorico
    const pct = teorico > 0 ? ((insumo.cantidad_usada - teorico) / teorico) * 100 : 0
    const costo_total = insumo.cantidad_usada * insumo.materiales.costo_unit
    costo_insumos += costo_total
    costoInsumosPorProducto.set(
      insumo.producto_id,
      (costoInsumosPorProducto.get(insumo.producto_id) ?? 0) + costo_total
    )
    comparativo.push({
      tipo: 'insumo',
      nombre: insumo.materiales.nombre,
      unidad: insumo.materiales.unidad,
      teorico,
      real: insumo.cantidad_usada,
      diferencia,
      porcentaje_desvio: pct,
      costo_unitario: insumo.materiales.costo_unit,
      costo_total,
    })
  }

  // ── SERVICIOS GLOBALES (de op_servicios, prorrateados por unidades) ──────────
  const { data: opServicios } = await supabase
    .from('op_servicios')
    .select('tarifa_unitaria, cantidad_por_unidad, servicios_operativos!inner(nombre, tipo_proceso)')
    .eq('op_id', opId) as {
      data: {
        tarifa_unitaria: number
        cantidad_por_unidad: number
        servicios_operativos: { nombre: string; tipo_proceso: string }
      }[] | null
    }

  let costo_servicios = 0
  for (const srv of opServicios ?? []) {
    const teorico = srv.cantidad_por_unidad * totalUnidadesOP
    const real = srv.cantidad_por_unidad * cantidad_entregada
    const diferencia = real - teorico
    const pct = teorico > 0 ? ((real - teorico) / teorico) * 100 : 0
    const costo_total = real * srv.tarifa_unitaria
    costo_servicios += costo_total
    comparativo.push({
      tipo: 'servicio',
      nombre: srv.servicios_operativos.nombre,
      unidad: 'ud',
      teorico,
      real,
      diferencia,
      porcentaje_desvio: pct,
      costo_unitario: srv.tarifa_unitaria,
      costo_total,
    })
  }

  // ── SERVICIOS POR REFERENCIA (directos, de liquidacion_servicios_ref) ────────
  const { data: serviciosRef } = await supabase
    .from('liquidacion_servicios_ref')
    .select('producto_id, nombre_servicio, tarifa_unitaria, cantidad, costo_total')
    .eq('op_id', opId) as {
      data: {
        producto_id: string
        nombre_servicio: string
        tarifa_unitaria: number
        cantidad: number
        costo_total: number
      }[] | null
    }

  // Acumular costo de servicios directos por producto
  const costoServiciosRefPorProducto = new Map<string, number>()
  let costo_servicios_ref = 0
  for (const sr of serviciosRef ?? []) {
    costoServiciosRefPorProducto.set(
      sr.producto_id,
      (costoServiciosRefPorProducto.get(sr.producto_id) ?? 0) + sr.costo_total
    )
    costo_servicios_ref += sr.costo_total
    comparativo.push({
      tipo: 'servicio',
      nombre: `${sr.nombre_servicio} (por ref)`,
      unidad: 'ud',
      teorico: 0,
      real: sr.cantidad,
      diferencia: 0,
      porcentaje_desvio: 0,
      costo_unitario: sr.tarifa_unitaria,
      costo_total: sr.costo_total,
    })
  }

  const costo_total = costo_tela + costo_insumos + costo_servicios + costo_servicios_ref
  const cpp = cantidad_entregada > 0 ? costo_total / cantidad_entregada : 0

  // CPP individual por producto:
  // - Tela: prorrateada por proporción de unidades
  // - Servicios globales: prorrateados por proporción de unidades
  // - Insumos: directos por producto_id desde reporte_insumos
  // - Servicios por ref: directos por producto_id desde liquidacion_servicios_ref
  const cpp_por_producto: CppPorProducto[] = []
  for (const [producto_id, unidades] of productosUnidades) {
    const proporcion = cantidad_entregada > 0 ? unidades / cantidad_entregada : 0
    const ct = costo_tela * proporcion
    const cs = (costo_servicios * proporcion) + (costoServiciosRefPorProducto.get(producto_id) ?? 0)
    const ci = costoInsumosPorProducto.get(producto_id) ?? 0
    const total = ct + ci + cs
    cpp_por_producto.push({
      producto_id,
      producto_nombre: productosNombreMap.get(producto_id) ?? '',
      referencia: referenciasMap.get(producto_id) ?? '',
      unidades,
      costo_tela: ct,
      costo_insumos: ci,
      costo_servicios: cs,
      costo_total: total,
      cpp: unidades > 0 ? total / unidades : 0,
      costo_estandar: costosEstandarMap.get(producto_id) ?? 0,
    })
  }

  return {
    costo_tela,
    costo_insumos,
    costo_servicios,
    costo_total,
    cantidad_entregada,
    cpp,
    comparativo,
    cpp_por_producto,
  }
}

export async function aprobarLiquidacion(opId: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // 1. Calcular resumen
  const resumen = await calcularResumenLiquidacion(opId)

  // 2. Guardar o actualizar liquidacion_op
  const { error: liqError } = await supabase
    .from('liquidacion_op')
    .upsert({
      op_id: opId,
      costo_tela: resumen.costo_tela,
      costo_insumos: resumen.costo_insumos,
      costo_servicios: resumen.costo_servicios,
      costo_total: resumen.costo_total,
      cantidad_entregada: resumen.cantidad_entregada,
      cpp: resumen.cpp,
      estado: 'aprobada',
      aprobado_por: user.id,
      fecha_aprobacion: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'op_id' }) as { error: { message: string } | null }

  if (liqError) return { error: liqError.message }

  // 3. Generar movimientos de kardex (descarga de inventario)
  const bodegaTallerData = await supabase
    .from('ordenes_produccion')
    .select('bodega_taller_id')
    .eq('id', opId)
    .single() as { data: { bodega_taller_id: string | null } | null }

  const bodega_id = bodegaTallerData.data?.bodega_taller_id
  if (!bodega_id) return { error: 'La OP no tiene bodega de taller asociada' }

  // Obtener tipo_movimiento ids
  const { data: tiposMovimiento } = await supabase
    .from('kardex_tipos_movimiento')
    .select('id, codigo') as {
      data: { id: string; codigo: string }[] | null
    }

  const tipoCorte = tiposMovimiento?.find(t => t.codigo === 'SALIDA_CORTE')?.id
  const tipoInsumos = tiposMovimiento?.find(t => t.codigo === 'SALIDA_INSUMOS_TALLER')?.id

  if (!tipoCorte || !tipoInsumos) return { error: 'No se encontraron tipos de movimiento' }

  const now = new Date().toISOString()

  // Descargar telas (desde reporte_corte_material)
  const { data: reporteIds } = await supabase
    .from('reporte_corte')
    .select('id')
    .eq('op_id', opId) as { data: { id: string }[] | null }

  const { data: telasReale } = await supabase
    .from('reporte_corte_material')
    .select('material_id, metros_usados, materiales!inner(costo_unit, unidad)')
    .in('reporte_id', (reporteIds ?? []).map(r => r.id)) as {
      data: {
        material_id: string
        metros_usados: number
        materiales: { costo_unit: number; unidad: string }
      }[] | null
    }

  // Agrupar telas por material
  const telasAgrupadas = new Map<string, { metros: number; costo_unit: number; unidad: string }>()
  for (const t of telasReale ?? []) {
    const prev = telasAgrupadas.get(t.material_id)
    telasAgrupadas.set(t.material_id, {
      metros: (prev?.metros ?? 0) + t.metros_usados,
      costo_unit: t.materiales.costo_unit,
      unidad: t.materiales.unidad,
    })
  }

  for (const [material_id, tela] of telasAgrupadas) {
    await supabase.from('kardex').insert({
      material_id,
      bodega_id,
      tipo_movimiento_id: tipoCorte,
      documento_tipo: 'op',
      documento_id: opId,
      cantidad: -tela.metros,
      unidad: tela.unidad,
      costo_unitario: tela.costo_unit,
      costo_total: -(tela.metros * tela.costo_unit),
      fecha_movimiento: now,
      registrado_por: user.id,
      notas: `Liquidación OP`,
    })
  }

  // Descargar insumos (desde reporte_insumos)
  const { data: insumosReporte } = await supabase
    .from('reporte_insumos')
    .select('material_id, cantidad_usada, materiales!inner(costo_unit, unidad)')
    .eq('op_id', opId) as {
      data: {
        material_id: string
        cantidad_usada: number
        materiales: { costo_unit: number; unidad: string }
      }[] | null
    }

  for (const insumo of insumosReporte ?? []) {
    await supabase.from('kardex').insert({
      material_id: insumo.material_id,
      bodega_id,
      tipo_movimiento_id: tipoInsumos,
      documento_tipo: 'op',
      documento_id: opId,
      cantidad: -insumo.cantidad_usada,
      unidad: insumo.materiales.unidad,
      costo_unitario: insumo.materiales.costo_unit,
      costo_total: -(insumo.cantidad_usada * insumo.materiales.costo_unit),
      fecha_movimiento: now,
      registrado_por: user.id,
      notas: `Liquidación OP`,
    })
  }

  // 4. Ingresar PT al kardex en bodega destino y registrar desperdicios
  const opData = await supabase
    .from('ordenes_produccion')
    .select('bodega_destino_id, bin_destino_codigo, op_detalle(producto_id, cantidad_asignada, talla, productos(costo_unit))')
    .eq('id', opId)
    .single() as {
      data: {
        bodega_destino_id: string | null
        bin_destino_codigo: string | null
        op_detalle: {
          producto_id: string
          cantidad_asignada: number
          talla: string
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          productos: { costo_unit: number } | null
        }[]
      } | null
    }

  const bodegaDestino = opData.data?.bodega_destino_id
  const binCodigo = opData.data?.bin_destino_codigo

  if (!bodegaDestino) {
    return { error: 'La OP no tiene bodega de destino configurada. Ve al panel de Entregas y selecciona la bodega de destino antes de aprobar.' }
  }

  if (true) {
    const tipoEntrada = tiposMovimiento?.find(t => t.codigo === 'ENTRADA_CONFECCION')?.id
    const tipoDesp = tiposMovimiento?.find(t => t.codigo === 'DESPERDICIO_CORTE')?.id

    // Ingresar PT al kardex (agrupado por producto + talla)
    // Usar CPP calculado por producto (no el costo catálogo estático)
    const cppMap = new Map(resumen.cpp_por_producto.map(c => [c.producto_id, c.cpp]))
    if (tipoEntrada && opData.data?.op_detalle) {
      const ptMovimientos = opData.data.op_detalle.map(d => {
        const costoUnit = cppMap.get(d.producto_id) ?? d.productos?.costo_unit ?? 0
        return {
          producto_id: d.producto_id,
          bodega_id: bodegaDestino,
          tipo_movimiento_id: tipoEntrada,
          documento_tipo: 'op',
          documento_id: opId,
          cantidad: d.cantidad_asignada,
          unidad: 'ud',
          talla: d.talla,
          costo_unitario: costoUnit,
          costo_total: d.cantidad_asignada * costoUnit,
          fecha_movimiento: now,
          registrado_por: user.id,
          notas: `Entrada por confección OP${binCodigo ? ` · BIN: ${binCodigo}` : ''}`,
        }
      })

      const { error: ptError } = await supabase.from('kardex').insert(ptMovimientos) as { error: { message: string } | null }
      if (ptError) return { error: `Error ingresando PT: ${ptError.message}` }
    }

    // Registrar desperdicios al kardex (de reporte_corte_material.desperdicio_kg)
    if (tipoDesp) {
      const { data: desperdicioDatos } = await supabase
        .from('reporte_corte_material')
        .select('material_id, desperdicio_kg, materiales!inner(costo_unit, unidad)')
        .in('reporte_id', (reporteIds ?? []).map(r => r.id))
        .gt('desperdicio_kg', 0) as {
          data: {
            material_id: string
            desperdicio_kg: number
            materiales: { costo_unit: number; unidad: string }
          }[] | null
        }

      // Agrupar desperdicios por material
      const despMap = new Map<string, { kg: number; costo_unit: number; unidad: string }>()
      for (const d of desperdicioDatos ?? []) {
        const prev = despMap.get(d.material_id)
        despMap.set(d.material_id, {
          kg: (prev?.kg ?? 0) + d.desperdicio_kg,
          costo_unit: d.materiales.costo_unit,
          unidad: d.materiales.unidad,
        })
      }

      for (const [material_id, desp] of despMap) {
        await supabase.from('kardex').insert({
          material_id,
          bodega_id,
          tipo_movimiento_id: tipoDesp,
          documento_tipo: 'op',
          documento_id: opId,
          cantidad: -desp.kg,
          unidad: 'kg',
          costo_unitario: desp.costo_unit,
          costo_total: -(desp.kg * desp.costo_unit),
          fecha_movimiento: now,
          registrado_por: user.id,
          notas: `Desperdicio de corte OP`,
        })
      }
    }
  }

  // 5. Actualizar estado OP a liquidada
  await supabase
    .from('ordenes_produccion')
    .update({ estado: 'liquidada' })
    .eq('id', opId)

  revalidatePath(`/ordenes-produccion/${opId}`)
  revalidatePath('/ordenes-produccion')
  return {}
}

export async function anularLiquidacion(opId: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // 1. Verificar que la liquidación existe y está aprobada
  const { data: liq } = await supabase
    .from('liquidacion_op')
    .select('id, estado')
    .eq('op_id', opId)
    .maybeSingle() as { data: { id: string; estado: string } | null }

  if (!liq) return { error: 'No existe liquidación para esta OP' }
  if (liq.estado !== 'aprobada') return { error: 'La liquidación no está aprobada' }

  // 2. Obtener tipos de movimiento para las reversas
  const { data: tiposMovimiento } = await supabase
    .from('kardex_tipos_movimiento')
    .select('id, codigo') as { data: { id: string; codigo: string }[] | null }

  const tipoAjuste = tiposMovimiento?.find(t => t.codigo === 'AJUSTE_INVENTARIO')?.id
  if (!tipoAjuste) return { error: 'No se encontró tipo de movimiento AJUSTE_INVENTARIO' }

  const codigosLiquidacion = ['SALIDA_CORTE', 'SALIDA_INSUMOS_TALLER', 'ENTRADA_CONFECCION', 'DESPERDICIO_CORTE']
  const idsLiquidacion = new Set(
    (tiposMovimiento ?? [])
      .filter(t => codigosLiquidacion.includes(t.codigo))
      .map(t => t.id)
  )

  // 3. Obtener todos los movimientos de kardex generados por esta OP
  const { data: movimientos } = await supabase
    .from('kardex')
    .select('id, material_id, producto_id, bodega_id, tipo_movimiento_id, cantidad, unidad, costo_unitario, costo_total, talla, bin_id')
    .eq('documento_tipo', 'op')
    .eq('documento_id', opId)
    .in('tipo_movimiento_id', [...idsLiquidacion]) as {
      data: {
        id: string
        material_id: string | null
        producto_id: string | null
        bodega_id: string
        tipo_movimiento_id: string
        cantidad: number
        unidad: string
        costo_unitario: number
        costo_total: number
        talla: string | null
        bin_id: string | null
      }[] | null
    }

  if (!movimientos || movimientos.length === 0) {
    // No hay movimientos — igual anulamos el estado
  } else {
    // 4. Crear movimientos inversos (reversa)
    const now = new Date().toISOString()
    const reversas = movimientos.map(m => ({
      material_id: m.material_id,
      producto_id: m.producto_id,
      bodega_id: m.bodega_id,
      tipo_movimiento_id: tipoAjuste,
      documento_tipo: 'op_anulacion',
      documento_id: opId,
      cantidad: -m.cantidad,
      unidad: m.unidad,
      talla: m.talla,
      bin_id: m.bin_id,
      costo_unitario: m.costo_unitario,
      costo_total: -m.costo_total,
      fecha_movimiento: now,
      registrado_por: user.id,
      notas: `Reversa por anulación de liquidación OP`,
    }))

    const { error: reversaError } = await supabase.from('kardex').insert(reversas) as { error: { message: string } | null }
    if (reversaError) return { error: `Error creando reversas de kardex: ${reversaError.message}` }
  }

  // 5. Marcar liquidación como anulada
  const { error: liqError } = await supabase
    .from('liquidacion_op')
    .update({ estado: 'anulada', updated_at: new Date().toISOString() })
    .eq('op_id', opId) as { error: { message: string } | null }

  if (liqError) return { error: liqError.message }

  // 6. Revertir estado de OP a entregada (pre-liquidación)
  await supabase
    .from('ordenes_produccion')
    .update({ estado: 'entregada' })
    .eq('id', opId)

  revalidatePath(`/ordenes-produccion/${opId}`)
  revalidatePath('/ordenes-produccion')
  return {}
}

// Stub para compatibilidad con EntregasPanel (flujo anterior per-entrega ya no aplica)
export async function getLiquidacionesByOP(_opId: string): Promise<{ id: string; entrega_id: string | null }[]> {
  return []
}

export async function getLiquidacionOP(opId: string) {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('liquidacion_op')
    .select('*')
    .eq('op_id', opId)
    .maybeSingle() as { data: {
      id: string; op_id: string; costo_tela: number; costo_insumos: number
      costo_servicios: number; costo_total: number; cantidad_entregada: number
      cpp: number | null; estado: string; aprobado_por: string | null
      fecha_aprobacion: string | null; created_at: string
    } | null }
  return data
}

// ─── SERVICIOS POR REFERENCIA ─────────────────────────────────────────────────

/** Servicios del BOM por producto — para mostrar en el dropdown de liquidación */
export async function getServiciosBOMParaOP(
  productoIds: string[]
): Promise<{ producto_id: string; servicio_nombre: string; cantidad_bom: number }[]> {
  if (productoIds.length === 0) return []
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('bom')
    .select('producto_id, cantidad, servicios_operativos!inner(nombre)')
    .in('producto_id', productoIds)
    .eq('tipo', 'servicio') as {
      data: { producto_id: string; cantidad: number; servicios_operativos: { nombre: string } }[] | null
    }
  return (data ?? []).map(r => ({
    producto_id: r.producto_id,
    servicio_nombre: r.servicios_operativos.nombre,
    cantidad_bom: r.cantidad,
  }))
}

export async function getServiciosRef(opId: string): Promise<ServicioRef[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('liquidacion_servicios_ref')
    .select('id, producto_id, nombre_servicio, tarifa_unitaria, cantidad, costo_total, productos!inner(nombre, referencia)')
    .eq('op_id', opId) as {
      data: {
        id: string
        producto_id: string
        nombre_servicio: string
        tarifa_unitaria: number
        cantidad: number
        costo_total: number
        productos: { nombre: string; referencia: string }
      }[] | null
    }
  return (data ?? []).map(r => ({
    id: r.id,
    producto_id: r.producto_id,
    producto_nombre: r.productos.nombre,
    referencia: r.productos.referencia,
    nombre_servicio: r.nombre_servicio,
    tarifa_unitaria: r.tarifa_unitaria,
    cantidad: r.cantidad,
    costo_total: r.costo_total,
  }))
}

export async function upsertServicioRef(
  opId: string,
  linea: { producto_id: string; nombre_servicio: string; tarifa_unitaria: number; cantidad: number }
): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('liquidacion_servicios_ref')
    .upsert({
      op_id: opId,
      producto_id: linea.producto_id,
      nombre_servicio: linea.nombre_servicio,
      tarifa_unitaria: linea.tarifa_unitaria,
      cantidad: linea.cantidad,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'op_id,producto_id,nombre_servicio' }) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath(`/ordenes-produccion/${opId}`)
  return {}
}

export async function deleteServicioRef(id: string, opId: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('liquidacion_servicios_ref')
    .delete()
    .eq('id', id) as { error: { message: string } | null }
  if (error) return { error: error.message }
  revalidatePath(`/ordenes-produccion/${opId}`)
  return {}
}
