'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { TipoDefecto, Inspeccion, InspeccionConNovedades, OPParaInspeccion, GravedadDefecto, ResultadoInspeccion, TipoInspeccion, TallerCalidadStats } from '@/features/calidad/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

const ESTADOS_CALIDAD = ['dupro_pendiente'] as const

const NEXT_STATE: Record<string, string> = {
  dupro_pendiente: 'en_terminado',
}

export async function getOPsParaInspeccion(): Promise<OPParaInspeccion[]> {
  const supabase = db(await createClient())

  const { data: ops } = await supabase
    .from('ordenes_produccion')
    .select(`
      id, codigo, estado, fecha_promesa,
      terceros!taller_id(nombre),
      ordenes_venta(codigo, terceros!cliente_id(nombre)),
      inspecciones(id, tipo, resultado, timestamp_inicio, timestamp_cierre, created_at,
        muestra_revisada, inspector_id, notas, op_id)
    `)
    .in('estado', ESTADOS_CALIDAD)
    .order('fecha_promesa', { ascending: true }) as {
      data: {
        id: string
        codigo: string
        estado: string
        fecha_promesa: string
        terceros: { nombre: string } | null
        ordenes_venta: { codigo: string; terceros: { nombre: string } | null } | null
        inspecciones: Inspeccion[]
      }[] | null
    }

  return (ops ?? [])
    .filter(op => {
      const hasPending = op.inspecciones?.some(i => i.resultado === 'pendiente')
      const hasClosedDupro = op.inspecciones?.some(i => i.tipo === 'dupro' && i.resultado !== 'pendiente')
      
      // Si hay una inspección pendiente, siempre mostrar.
      if (hasPending) return true
      
      // Si no hay inspecciones de tipo 'dupro' cerradas, es la primera vez (mostrar).
      if (!hasClosedDupro) return true
      
      // En cualquier otro caso (DupuPro ya hecho y nada pendiente), ocultar.
      return false
    })
    .map(op => ({
      id: op.id,
      codigo: op.codigo,
      estado: op.estado,
      fecha_promesa: op.fecha_promesa,
      taller: op.terceros?.nombre ?? '—',
      cliente: op.ordenes_venta?.terceros?.nombre ?? '—',
      ov_codigo: op.ordenes_venta?.codigo ?? '—',
      inspeccion_pendiente: op.inspecciones?.find(i => i.resultado === 'pendiente') ?? null,
    }))
}

export async function getRecepcionesEnCuarentena() {
  const supabase = db(await createClient())
  
  const { data } = await supabase
    .from('recepcion_oc')
    .select(`
      *,
      ordenes_compra(codigo, tipo, terceros!proveedor_id(nombre)),
      materiales(codigo, nombre, unidad),
      productos(referencia, nombre)
    `)
    .eq('estado', 'en_cuarentena')
    .order('fecha_recepcion', { ascending: false })
  return data ?? []
}

export async function getTiposDefectoFiltrados(tipoItem?: string) {
  const supabase = db(await createClient())
  let query = supabase.from('tipos_defecto').select('*').eq('activo', true)
  
  if (tipoItem) {
    const { data } = await query
    return (data ?? []).filter((td: any) => 
      !td.tipos_producto_aplicables || 
      td.tipos_producto_aplicables.length === 0 || 
      td.tipos_producto_aplicables.includes(tipoItem)
    )
  }
  
  const { data } = await query
  return data ?? []
}

export async function getRecepcionById(id: string) {
  const supabase = db(await createClient())
  
  const { data } = await supabase
    .from('recepcion_oc')
    .select(`
      *,
      ordenes_compra(codigo, tipo, terceros!proveedor_id(nombre)),
      materiales(codigo, nombre, unidad, tipo),
      productos(referencia, nombre, tipo_producto)
    `)
    .eq('id', id)
    .single() as { data: any | null }
    
  return data
}

export async function procesarInspeccionRecepcion(input: {
  recepcion_id: string
  resultado: 'aprobado' | 'rechazado'
  novedades: { tipo_defecto_id: string; cantidad: number; notas?: string }[]
  notas?: string
}) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  const { getBodegaDefault } = await import('@/shared/lib/bodega-default')

  // 1. Obtener detalles de la recepción
  const { data: recepcion } = await supabase
    .from('recepcion_oc')
    .select('*, ordenes_compra(tipo)')
    .eq('id', input.recepcion_id)
    .single() as { data: any | null }

  if (!recepcion) throw new Error('Recepción no encontrada')

  // 2. Crear el registro de inspección
  const { data: inspeccion, error: insError } = await supabase
    .from('inspecciones')
    .insert({
      recepcion_id: input.recepcion_id,
      tipo: 'recepcion_compra',
      muestra_revisada: recepcion.cantidad_recibida,
      cantidad_inspeccionada: recepcion.cantidad_recibida,
      inspector_id: user?.id,
      resultado: input.resultado,
      timestamp_inicio: new Date().toISOString(),
      timestamp_cierre: new Date().toISOString(),
      notas: input.notas
    })
    .select('id')
    .single() as { data: { id: string } | null; error: any }

  if (insError) throw new Error(`Error creando inspección: ${insError.message}`)

  // 3. Insertar novedades de defectos
  if (input.novedades.length > 0) {
    const novInserts = input.novedades.map(n => ({
      inspeccion_id: inspeccion.id,
      tipo_defecto_id: n.tipo_defecto_id,
      cantidad: n.cantidad,
      notas: n.notas
    }))
    await supabase.from('inspeccion_novedades').insert(novInserts)
  }

  // 4. Determinar bodegas
  const { data: bCuarentena } = await supabase.from('bodegas').select('id').eq('codigo', 'BOD-CUARENTENA').single() as any
  const { data: bDesperdicio } = await supabase.from('bodegas').select('id').eq('codigo', 'BOD-DESPERDICIO').single() as any
  const bDefault = await getBodegaDefault()

  if (!bCuarentena) throw new Error('Bodega de Cuarentena no configurada')
  
  const targetBodegaId = input.resultado === 'aprobado' ? bDefault.id : (bDesperdicio?.id || bCuarentena.id)

  // 5. Transferencia física en Kardex
  const { data: tipoMovSalida } = await supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'SALIDA_TRASLADO').single() as any
  const { data: tipoMovEntrada } = await supabase.from('kardex_tipos_movimiento').select('id').eq('codigo', 'ENTRADA_TRASLADO').single() as any

  const unidad = recepcion.material_id ? 'kg' : 'unidades'
  const costoTotal = (recepcion.cantidad_recibida * (recepcion.precio_unitario || 0))

  const movimientos = [
    {
      material_id: recepcion.material_id,
      producto_id: recepcion.producto_id,
      bodega_id: bCuarentena.id,
      tipo_movimiento_id: tipoMovSalida.id,
      documento_tipo: 'inspeccion',
      documento_id: inspeccion.id,
      cantidad: -recepcion.cantidad_recibida,
      unidad,
      costo_unitario: recepcion.precio_unitario || 0,
      costo_total: -costoTotal,
      talla: recepcion.talla,
      fecha_movimiento: new Date().toISOString(),
      registrado_por: user?.id,
      notas: `Salida Cuarentena - Inspección ${input.resultado.toUpperCase()}`
    },
    {
      material_id: recepcion.material_id,
      producto_id: recepcion.producto_id,
      bodega_id: targetBodegaId,
      tipo_movimiento_id: tipoMovEntrada.id,
      documento_tipo: 'inspeccion',
      documento_id: inspeccion.id,
      cantidad: recepcion.cantidad_recibida,
      unidad,
      costo_unitario: recepcion.precio_unitario || 0,
      costo_total: costoTotal,
      talla: recepcion.talla,
      fecha_movimiento: new Date().toISOString(),
      registrado_por: user?.id,
      notas: `Entrada tras Inspección - Resultado: ${input.resultado.toUpperCase()}`
    }
  ]

  await supabase.from('kardex').insert(movimientos)

  // 6. Actualizar estado de la recepción
  await supabase
    .from('recepcion_oc')
    .update({ estado: input.resultado === 'aprobado' ? 'recibido' : 'rechazado' })
    .eq('id', input.recepcion_id)

  // 7. Si fue aprobado y es MP, actualizar el saldo disponible central
  if (input.resultado === 'aprobado' && recepcion.material_id) {
    await supabase.rpc('actualizar_saldo_material', {
      p_material_id: recepcion.material_id,
      p_cantidad: recepcion.cantidad_recibida
    })
  }

  revalidatePath('/calidad')
  return { success: true }
}


export async function getOPConInspeccion(op_id: string): Promise<{
  op: {
    id: string; codigo: string; estado: string; fecha_promesa: string
    taller: string; cliente: string; ov_codigo: string; ov_id: string
    taller_id: string; total_unidades: number
  } | null
  inspeccion: InspeccionConNovedades | null
  historialInspecciones: Inspeccion[]
}> {
  const supabase = db(await createClient())

  const { data: op } = await supabase
    .from('ordenes_produccion')
    .select(`
      id, codigo, estado, fecha_promesa, ov_id, taller_id,
      terceros!taller_id(nombre),
      ordenes_venta(codigo, terceros!cliente_id(nombre)),
      op_detalle(
        cantidad_asignada,
        producto_id,
        talla,
        productos(nombre, referencia, color)
      )
    `)
    .eq('id', op_id)
    .single() as {
      data: {
        id: string; codigo: string; estado: string; fecha_promesa: string; ov_id: string
        taller_id: string
        terceros: { nombre: string } | null
        ordenes_venta: { codigo: string; terceros: { nombre: string } | null } | null
        op_detalle: { 
          cantidad_asignada: number; 
          producto_id: string; 
          talla: string;
          productos: { nombre: string; referencia: string } | null 
        }[]
      } | null
    }

  if (!op) return { op: null, inspeccion: null, historialInspecciones: [] }

  const { data: inspecciones } = await supabase
    .from('inspecciones')
    .select(`
      id, op_id, tipo, muestra_revisada, inspector_id, resultado,
      timestamp_inicio, timestamp_cierre, notas, created_at,
      novedades_calidad(
        id, inspeccion_id, tipo_defecto_id, gravedad, cantidad_afectada,
        foto_url, descripcion, timestamp_registro,
        tipos_defecto(id, codigo, categoria, descripcion, gravedad_sugerida, puntos_penalidad, activo)
      )
    `)
    .eq('op_id', op_id)
    .order('created_at', { ascending: false }) as {
      data: InspeccionConNovedades[] | null
    }

  const todasInspecciones = inspecciones ?? []
  const inspeccionActiva = todasInspecciones.find(i => i.resultado === 'pendiente') ?? null
  const total_unidades = (op.op_detalle ?? []).reduce((s, d) => s + d.cantidad_asignada, 0)

  const resultado = {
    op: {
      id: op.id,
      codigo: op.codigo,
      estado: op.estado,
      fecha_promesa: op.fecha_promesa,
      ov_id: op.ov_id,
      taller_id: op.taller_id,
      taller: op.terceros?.nombre ?? '—',
      cliente: op.ordenes_venta?.terceros?.nombre ?? '—',
      ov_codigo: op.ordenes_venta?.codigo ?? '—',
      total_unidades,
      productos: Object.values(op.op_detalle.reduce((acc, d) => {
        if (!acc[d.producto_id]) {
          acc[d.producto_id] = {
            id: d.producto_id,
            nombre: d.productos?.nombre ?? 'Producto',
            referencia: d.productos?.referencia ?? 'Ref',
            color: d.productos?.color ?? null,
            talla: d.talla,
            cantidad: 0
          }
        }
        acc[d.producto_id].cantidad += d.cantidad_asignada
        return acc
      }, {} as Record<string, { id: string; nombre: string; referencia: string; color: string | null; talla: string; cantidad: number }>))
    },
    inspeccion: inspeccionActiva ? {
      ...inspeccionActiva,
      esReproceso: (inspeccionActiva as any).tipo === 'reproceso'
    } : null,
    historialInspecciones: todasInspecciones.filter(i => i.resultado !== 'pendiente'),
  }

  // Si es un reproceso, sobreescribimos los productos con los items específicos del reproceso
  if (resultado.inspeccion && (resultado.inspeccion as any).esReproceso) {
    const { data: itemsReproceso } = await supabase
      .from('inspeccion_items_reproceso')
      .select(`
        id,
        producto_id,
        talla,
        cantidad,
        productos (nombre, referencia, color)
      `)
      .eq('inspeccion_id', (resultado.inspeccion as any).id)

    if (itemsReproceso && itemsReproceso.length > 0) {
      resultado.op.productos = itemsReproceso.map(item => ({
        id: item.producto_id,
        nombre: (item.productos as any)?.nombre ?? 'Producto',
        referencia: (item.productos as any)?.referencia ?? 'Ref',
        color: (item.productos as any)?.color ?? null,
        talla: item.talla,
        cantidad: item.cantidad,
      }))
    } else {
      // Si por alguna razón no hay items, dejamos la lista vacía para no cargar toda la OP
      resultado.op.productos = []
    }
  }

  return resultado
}

export async function getTiposDefecto(): Promise<TipoDefecto[]> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('tipos_defecto')
    .select('id, codigo, categoria, descripcion, gravedad_sugerida, puntos_penalidad, activo')
    .eq('activo', true)
    .order('codigo') as { data: TipoDefecto[] | null }
  return data ?? []
}

export async function createTipoDefecto(input: {
  descripcion:       string
  categoria:         string
  gravedad_sugerida: GravedadDefecto
}): Promise<{ data?: TipoDefecto; error?: string }> {
  const supabase = db(await createClient())

  // Auto-generar el siguiente código DEF-XXX
  const { data: last } = await supabase
    .from('tipos_defecto')
    .select('codigo')
    .order('codigo', { ascending: false })
    .limit(1)
    .single() as { data: { codigo: string } | null }

  const lastNum = last?.codigo ? parseInt(last.codigo.replace('DEF-', ''), 10) : 0
  const codigo = `DEF-${String(lastNum + 1).padStart(3, '0')}`

  const puntos: Record<GravedadDefecto, number> = { menor: 1, mayor: 5, critico: 10 }

  const { data, error } = await supabase
    .from('tipos_defecto')
    .insert({
      codigo,
      categoria:         input.categoria,
      descripcion:       input.descripcion.trim(),
      gravedad_sugerida: input.gravedad_sugerida,
      puntos_penalidad:  puntos[input.gravedad_sugerida],
      activo:            true,
    })
    .select('id, codigo, categoria, descripcion, gravedad_sugerida, puntos_penalidad, activo')
    .single() as { data: TipoDefecto | null; error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return { data: data ?? undefined }
}

export async function iniciarDupro(opId: string): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  // Crear inspección DUPRO pendiente
  const { error: insError } = await supabase
    .from('inspecciones')
    .insert({
      op_id: opId,
      tipo: 'dupro',
      resultado: 'pendiente',
      timestamp_inicio: new Date().toISOString(),
    }) as { error: { message: string } | null }

  if (insError) return { error: insError.message }

  // Transición: en_confeccion → dupro_pendiente
  await supabase
    .from('ordenes_produccion')
    .update({ estado: 'dupro_pendiente' })
    .eq('id', opId)
    .eq('estado', 'en_confeccion')

  revalidatePath(`/ordenes-produccion/${opId}`)
  revalidatePath('/calidad')
  return {}
}

export async function createInspeccion(
  op_id: string,
  tipo: TipoInspeccion,
  reporteCorteid?: string,
): Promise<{ data: Inspeccion | null; error?: string }> {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('inspecciones')
    .insert({
      op_id,
      tipo,
      resultado: 'pendiente',
      reporte_corte_id: reporteCorteid || null,
      timestamp_inicio: new Date().toISOString(),
    })
    .select()
    .single() as { data: Inspeccion | null; error: { message: string } | null }

  if (error) return { data: null, error: error.message }
  revalidatePath(`/calidad/${op_id}`)
  return { data }
}

export async function addNovedad(formData: FormData): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const inspeccion_id = formData.get('inspeccion_id') as string
  const op_id = formData.get('op_id') as string
  const tipo_defecto_id = formData.get('tipo_defecto_id') as string
  const gravedad = formData.get('gravedad') as GravedadDefecto
  const cantidad_afectada = parseInt(formData.get('cantidad_afectada') as string, 10)
  const descripcion = (formData.get('descripcion') as string) || null
  const foto = formData.get('foto') as File | null

  let foto_url: string | null = null
  if (foto && foto.size > 0) {
    const ext = foto.name.split('.').pop() ?? 'jpg'
    const path = `inspecciones/${inspeccion_id}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await foto.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('calidad-fotos')
      .upload(path, buffer, { contentType: foto.type })

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('calidad-fotos')
        .getPublicUrl(path)
      foto_url = urlData.publicUrl
    }
  }

  const { error } = await supabase
    .from('novedades_calidad')
    .insert({
      inspeccion_id,
      tipo_defecto_id,
      gravedad,
      cantidad_afectada,
      descripcion,
      foto_url,
    }) as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath(`/calidad/${op_id}`)
  return {}
}

export async function getTallerCalidadStats(taller_id: string): Promise<TallerCalidadStats> {
  const supabase = db(await createClient())

  // 1. Aggregate inspection outcomes for all OPs from this taller
  const { data: statsRows } = await supabase
    .from('inspecciones')
    .select('resultado, ordenes_produccion!inner(taller_id)')
    .eq('ordenes_produccion.taller_id', taller_id)
    .neq('resultado', 'pendiente') as {
      data: { resultado: string; ordenes_produccion: { taller_id: string } }[] | null
    }

  const rows = statsRows ?? []
  const total_cerradas = rows.length
  const aceptadas = rows.filter(r => r.resultado === 'aceptada').length
  const rechazadas = rows.filter(r => r.resultado === 'rechazada').length
  const ftt = total_cerradas > 0 ? Math.round((aceptadas / total_cerradas) * 100) : 0

  // 2. Top defects for this taller
  const { data: defectoRows } = await supabase
    .from('novedades_calidad')
    .select(`
      tipo_defecto_id,
      tipos_defecto(codigo, descripcion),
      inspecciones!inner(op_id, ordenes_produccion!inner(taller_id))
    `)
    .eq('inspecciones.ordenes_produccion.taller_id', taller_id) as {
      data: {
        tipo_defecto_id: string
        tipos_defecto: { codigo: string; descripcion: string } | null
        inspecciones: { op_id: string; ordenes_produccion: { taller_id: string } }
      }[] | null
    }

  // Count occurrences per tipo_defecto
  const conteo = new Map<string, { codigo: string; descripcion: string; veces: number }>()
  for (const row of defectoRows ?? []) {
    if (!row.tipo_defecto_id || !row.tipos_defecto) continue
    const key = row.tipo_defecto_id
    const prev = conteo.get(key)
    if (prev) {
      prev.veces += 1
    } else {
      conteo.set(key, { codigo: row.tipos_defecto.codigo, descripcion: row.tipos_defecto.descripcion, veces: 1 })
    }
  }

  const top_defectos = [...conteo.values()]
    .sort((a, b) => b.veces - a.veces)
    .slice(0, 3)

  return { total_cerradas, aceptadas, rechazadas, ftt, top_defectos }
}

export async function closeInspeccion(formData: FormData): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const inspeccion_id    = formData.get('inspeccion_id') as string
  const op_id            = formData.get('op_id') as string
  const estado_op        = formData.get('estado_op') as string
  const resultado        = formData.get('resultado') as ResultadoInspeccion
  const muestra_revisada = parseInt(formData.get('muestra_revisada') as string, 10) || 0
  const notas            = (formData.get('notas') as string) || null
  const cantidad_segundas = resultado === 'segundas'
    ? (parseInt(formData.get('cantidad_segundas') as string, 10) || null)
    : null

  const { data: { user } } = await supabase.auth.getUser()
  
  // Obtener info de la inspección (tipo y reporte_corte_id)
  const { data: inspeccionData } = await supabase
    .from('inspecciones')
    .select('tipo, reporte_corte_id, cantidad_cortada')
    .eq('id', inspeccion_id)
    .single() as { data: { tipo: string; reporte_corte_id: string | null; cantidad_cortada: number | null } | null }

  const { error: inspeccionError } = await supabase
    .from('inspecciones')
    .update({
      resultado,
      muestra_revisada,
      notas,
      cantidad_segundas,
      timestamp_cierre: new Date().toISOString(),
    })
    .eq('id', inspeccion_id) as { error: { message: string } | null }

  if (inspeccionError) return { error: inspeccionError.message }

  // Si es DUPRO aceptada y está vinculada a un corte → crear FRI automáticamente
  if (inspeccionData?.tipo === 'dupro' && resultado === 'aceptada' && inspeccionData?.reporte_corte_id) {
    try {
      await supabase
        .from('inspecciones')
        .insert({
          op_id,
          reporte_corte_id: inspeccionData.reporte_corte_id,
          tipo: 'fri',
          resultado: 'pendiente',
          cantidad_cortada: inspeccionData.cantidad_cortada,
          timestamp_inicio: new Date().toISOString(),
        })
    } catch (err) {
      console.error('Error creando FRI automática:', err)
      // No bloquear el cierre de DUPRO
    }
  }

  // Advance OP state if inspection accepted or classified as segundas
  if (resultado === 'aceptada' || resultado === 'segundas') {
    const nextState = NEXT_STATE[estado_op]
    if (nextState) {
      // VALIDACIÓN: No permitir mover a 'en_terminado' si hay segundas pendientes de reproceso/decisión
      if (nextState === 'en_terminado') {
        const { data: segundasPendientes } = await supabase
          .from('view_segundas_tracking')
          .select('kardex_id')
          .eq('op_id', op_id)
          .limit(1)

        if (segundasPendientes && segundasPendientes.length > 0) {
          // Si hay segundas, bloqueamos el avance a 'en_terminado'
          // Pero dejamos que la inspección se cierre. La OP se quedará en su estado actual (o dupro_pendiente).
          // NOTA: Para no bloquear la UI de golpe sin aviso, podríamos devolver un mensaje, 
          // pero aquí simplemente no actualizamos el estado si no se cumple.
        } else {
          await supabase
            .from('ordenes_produccion')
            .update({ estado: nextState })
            .eq('id', op_id)
        }
      } else {
        await supabase
          .from('ordenes_produccion')
          .update({ estado: nextState })
          .eq('id', op_id)
      }
    }
  }

  // 1. Obtener configuraciones de bodegas una sola vez
  const { data: config } = await supabase
    .from('calidad_config')
    .select('bodega_segundas_id, bodega_desperdicio_id')
    .single() as { data: { bodega_segundas_id: string | null; bodega_desperdicio_id: string | null } | null }

  // 2. Obtener tipos de movimiento necesarios
  const { data: tiposKardex } = await supabase
    .from('kardex_tipos_movimiento')
    .select('id, codigo')
    .in('codigo', ['ENTRADA_SEGUNDAS', 'SALIDA_DESPERDICIO'])

  const entradaSegundasId = tiposKardex?.find(t => t.codigo === 'ENTRADA_SEGUNDAS')?.id
  const salidaDesperdicioId = tiposKardex?.find(t => t.codigo === 'SALIDA_DESPERDICIO')?.id

  // Si hubo segundas, registrar movimiento en Kardex de Bodega Segundas
  const segundasDetalleRaw = formData.get('segundas_detalle') as string
  if (resultado === 'segundas' && segundasDetalleRaw && config?.bodega_segundas_id && entradaSegundasId) {
    const segundasDetalle = JSON.parse(segundasDetalleRaw) as { producto_id: string, talla: string, cantidad: number }[]
    
    for (const item of segundasDetalle) {
      if (item.cantidad <= 0) continue
      await supabase.from('kardex').insert({
        producto_id: item.producto_id,
        bodega_id: config.bodega_segundas_id,
        tipo_movimiento_id: entradaSegundasId,
        documento_tipo: 'op',
        documento_id: op_id,
        cantidad: item.cantidad,
        talla: item.talla,
        unidad: 'ud',
        costo_unitario: 0,
        costo_total: 0,
        fecha_movimiento: new Date().toISOString(),
        registrado_por: user.id,
        notas: `Segundas reportadas en inspección ${inspeccionData?.tipo || ''}`,
      })
    }
  }

  // Si hubo desperdicio reportado directamente (nuevo)
  const desperdicioDetalleRaw = formData.get('desperdicio_detalle') as string
  if (desperdicioDetalleRaw && config?.bodega_desperdicio_id && salidaDesperdicioId) {
    const desperdicioDetalle = JSON.parse(desperdicioDetalleRaw) as { producto_id: string, talla: string, cantidad: number }[]
    
    for (const item of desperdicioDetalle) {
      if (item.cantidad <= 0) continue
      await supabase.from('kardex').insert({
        producto_id: item.producto_id,
        bodega_id: config.bodega_desperdicio_id,
        tipo_movimiento_id: salidaDesperdicioId,
        documento_tipo: 'op',
        documento_id: op_id,
        cantidad: item.cantidad,
        talla: item.talla,
        unidad: 'ud',
        costo_unitario: 0,
        costo_total: 0,
        fecha_movimiento: new Date().toISOString(),
        registrado_por: user.id,
        notas: `Desperdicio reportado directamente en inspección ${inspeccionData?.tipo || ''}`,
      })
    }
  }
  revalidatePath(`/calidad/${op_id}`)
  revalidatePath('/calidad')
  revalidatePath(`/ordenes-produccion/${op_id}`)
  return {}
}

export interface SegundasTracking {
  kardex_id: string
  fecha_movimiento: string
  cantidad: number
  talla: string
  notas: string | null
  producto_id: string
  producto_referencia: string
  producto_nombre: string
  op_id: string
  op_codigo: string
  taller_id: string | null
  taller_nombre: string | null
  ov_id: string | null
  ov_codigo: string | null
  en_reproceso: boolean
  n_intentos: number
}

/**
 * Obtiene el tracking consolidado de todas las prendas en segundas.
 */
export async function getSegundasTracking(): Promise<SegundasTracking[]> {
  const supabase = db(await createClient())
  
  const { data } = await supabase
    .from('view_segundas_tracking')
    .select('*')
    .order('fecha_movimiento', { ascending: false })

  return data ?? []
}

/**
 * Obtiene el tracking consolidado de segundas para una OP específica.
 */
export async function getSegundasPorOP(opId: string): Promise<SegundasTracking[]> {
  const supabase = db(await createClient())
  
  const { data } = await supabase
    .from('view_segundas_tracking')
    .select('*')
    .eq('op_id', opId)
    .order('fecha_movimiento', { ascending: false })

  return data ?? []
}

/**
 * Inicia el proceso de reproceso para un lote de segundas.
 * Devuelve las prendas al taller y marca la OP con una nueva inspección requerida.
 */
export async function iniciarReprocesoSegundas(kardexId: string, opId: string, productoId: string, cantidad: number, talla: string) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  try {
    // 1. Obtener la bodega de segundas de la config
    const { data: config } = await supabase
      .from('calidad_config')
      .select('bodega_segundas_id')
      .single() as { data: { bodega_segundas_id: string | null } | null }

    // 2. Obtener tipo_movimiento_id para TRASLADO_SALIDA
    const { data: tipoMov } = await supabase
      .from('kardex_tipos_movimiento')
      .select('id')
      .eq('codigo', 'TRASLADO_SALIDA')
      .single() as { data: { id: string } | null }

    if (config?.bodega_segundas_id && tipoMov) {
      // 3. Crear el movimiento de Kardex (Salida de Segundas)
      const { error: kardexError } = await supabase.from('kardex').insert({
        producto_id: productoId,
        bodega_id: config.bodega_segundas_id,
        tipo_movimiento_id: tipoMov.id,
        documento_tipo: 'op',
        documento_id: opId,
        cantidad: -Math.abs(cantidad),
        talla: talla,
        unidad: 'ud',
        costo_unitario: 0,
        costo_total: 0,
        fecha_movimiento: new Date().toISOString(),
        registrado_por: user.id,
        notas: `Salida de segundas para reproceso (Talla: ${talla})`,
      })
      if (kardexError) throw new Error(`Kardex: ${kardexError.message}`)
    }

    // 4. Buscar o crear una inspección de tipo 'reproceso' que esté pendiente
    let { data: inspExistente } = await supabase
      .from('inspecciones')
      .select('id')
      .eq('op_id', opId)
      .eq('tipo', 'reproceso')
      .eq('resultado', 'pendiente')
      .single()

    let finalInspId = inspExistente?.id

    if (!finalInspId) {
      const { data: nuevaInsp, error: inspError } = await supabase.from('inspecciones').insert({
        op_id: opId,
        tipo: 'reproceso',
        resultado: 'pendiente',
        inspector_id: user.id,
        timestamp_inicio: new Date().toISOString(),
      }).select().single()
      
      if (inspError) throw new Error(`Inspección: ${inspError.message}`)
      finalInspId = nuevaInsp.id
    }

    // 5. Registrar el item específico en el detalle del reproceso
    const { data: itemExistente } = await supabase
      .from('inspeccion_items_reproceso')
      .select('id, cantidad')
      .eq('inspeccion_id', finalInspId)
      .eq('producto_id', productoId)
      .eq('talla', talla)
      .single()

    if (itemExistente) {
      await supabase
        .from('inspeccion_items_reproceso')
        .update({ cantidad: itemExistente.cantidad + cantidad })
        .eq('id', itemExistente.id)
    } else {
      await supabase
        .from('inspeccion_items_reproceso')
        .insert({
          inspeccion_id: finalInspId,
          producto_id: productoId,
          talla: talla,
          cantidad: cantidad
        })
    }
    
    // 6. Cambiar estado de la OP a dupro_pendiente (o un estado específico de reproceso si existiera)
    const { error: opError } = await supabase
      .from('ordenes_produccion')
      .update({ estado: 'dupro_pendiente' })
      .eq('id', opId)
    if (opError) throw new Error(`OP: ${opError.message}`)

    revalidatePath(`/ordenes-produccion/${opId}`)
    revalidatePath('/calidad')
    revalidatePath('/calidad/segundas')
    
    return { success: true }
  } catch (err: any) {
    console.error('Error en iniciarReprocesoSegundas:', err)
    return { error: err.message }
  }
}

/**
 * Registra unidades como desperdicio definitivo (salida de segundas y entrada a desperdicio).
 */
export async function registrarDesperdicio(kardexId: string, opId: string, productoId: string, cantidad: number, talla: string) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  try {
    // 1. Obtener configuraciones de bodegas
    const { data: config } = await supabase
      .from('calidad_config')
      .select('bodega_segundas_id, bodega_desperdicio_id')
      .single() as { data: { bodega_segundas_id: string | null; bodega_desperdicio_id: string | null } | null }

    // 2. Obtener tipos de movimiento
    const { data: tipos } = await supabase
      .from('kardex_tipos_movimiento')
      .select('id, codigo')
      .in('codigo', ['TRASLADO_SALIDA', 'SALIDA_DESPERDICIO'])

    const trasladoSalidaId = tipos?.find(t => t.codigo === 'TRASLADO_SALIDA')?.id
    const desperdicioId = tipos?.find(t => t.codigo === 'SALIDA_DESPERDICIO')?.id

    if (config?.bodega_segundas_id && trasladoSalidaId) {
      // 3. Salida de Bodega Segundas
      await supabase.from('kardex').insert({
        producto_id: productoId,
        bodega_id: config.bodega_segundas_id,
        tipo_movimiento_id: trasladoSalidaId,
        documento_tipo: 'op',
        documento_id: opId,
        cantidad: -Math.abs(cantidad),
        talla: talla,
        unidad: 'ud',
        costo_unitario: 0,
        costo_total: 0,
        fecha_movimiento: new Date().toISOString(),
        registrado_por: user.id,
        notas: `Salida de segundas por descarte definitivo (Talla: ${talla})`,
      })

      // 4. Entrada a Bodega Desperdicio (si existe configurada)
      if (config.bodega_desperdicio_id && desperdicioId) {
        await supabase.from('kardex').insert({
          producto_id: productoId,
          bodega_id: config.bodega_desperdicio_id,
          tipo_movimiento_id: desperdicioId,
          documento_tipo: 'op',
          documento_id: opId,
          cantidad: Math.abs(cantidad),
          talla: talla,
          unidad: 'ud',
          costo_unitario: 0,
          costo_total: 0,
          fecha_movimiento: new Date().toISOString(),
          registrado_por: user.id,
          notas: `Ingreso a desperdicio desde segundas (Talla: ${talla})`,
        })
      }
    }

    revalidatePath(`/ordenes-produccion/${opId}`)
    revalidatePath('/calidad/segundas')
    return { success: true }
  } catch (err: any) {
    console.error('Error en registrarDesperdicio:', err)
    return { error: err.message }
  }
}

// ─── ANALÍTICA DE CALIDAD ───────────────────────────────────────────────────

export async function getParetoDefectos(filters: { taller_id?: string; fecha_inicio?: string; fecha_fin?: string } = {}) {
  const supabase = db(await createClient())
  
  let query = supabase
    .from('novedades_calidad')
    .select(`
      cantidad_afectada,
      tipo_defecto:tipos_defecto (id, descripcion, categoria),
      inspeccion:inspecciones!inner (
        op_id,
        op:ordenes_produccion!inner (taller_id)
      )
    `)

  if (filters.taller_id) {
    query = query.eq('inspeccion.op.taller_id', filters.taller_id)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error Pareto:', error)
    return []
  }

  // Agrupar por defecto
  const counts: Record<string, { descripcion: string; categoria: string; total: number }> = {}
  data.forEach((n: any) => {
    const d = n.tipo_defecto
    if (!d) return
    if (!counts[d.id]) {
      counts[d.id] = { descripcion: d.descripcion, categoria: d.categoria, total: 0 }
    }
    counts[d.id].total += (n.cantidad_afectada || 0)
  })

  return Object.values(counts).sort((a, b) => b.total - a.total)
}

export async function getRankingTalleres() {
  const supabase = db(await createClient())
  
  const { data: talleres } = await supabase
    .from('terceros')
    .select('id, nombre')
    .contains('tipos', ['taller'])

  if (!talleres) return []

  const ranking = await Promise.all(talleres.map(async (taller) => {
    // Obtener inspecciones de este taller
    const { data: insp } = await supabase
      .from('inspecciones')
      .select(`
        resultado, 
        cantidad_inspeccionada, 
        cantidad_segundas,
        op:ordenes_produccion!inner(taller_id)
      `)
      .eq('op.taller_id', taller.id)
      .eq('resultado', 'aceptada') as any

    const totalInsp = (insp ?? []).reduce((s: number, i: any) => s + (i.cantidad_inspeccionada || 0), 0)
    const totalSeg = (insp ?? []).reduce((s: number, i: any) => s + (i.cantidad_segundas || 0), 0)
    
    const defectRate = totalInsp > 0 ? (totalSeg / totalInsp) * 100 : 0
    const score = Math.max(0, 100 - (defectRate * 5))

    return {
      taller_id: taller.id,
      nombre: taller.nombre,
      score: Math.round(score),
      defectRate: defectRate.toFixed(1),
      totalInspeccionado: totalInsp
    }
  }))

  return ranking.sort((a, b) => b.score - a.score)
}
