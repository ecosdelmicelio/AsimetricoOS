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

  return (ops ?? []).map(op => ({
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
      op_detalle(cantidad_asignada)
    `)
    .eq('id', op_id)
    .single() as {
      data: {
        id: string; codigo: string; estado: string; fecha_promesa: string; ov_id: string
        taller_id: string
        terceros: { nombre: string } | null
        ordenes_venta: { codigo: string; terceros: { nombre: string } | null } | null
        op_detalle: { cantidad_asignada: number }[]
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

  return {
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
    },
    inspeccion: inspeccionActiva,
    historialInspecciones: todasInspecciones.filter(i => i.resultado !== 'pendiente'),
  }
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

export async function createInspeccion(
  op_id: string,
  tipo: TipoInspeccion,
): Promise<{ data: Inspeccion | null; error?: string }> {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('inspecciones')
    .insert({
      op_id,
      tipo,
      resultado: 'pendiente',
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
  const muestra_revisada = parseInt(formData.get('muestra_revisada') as string, 10) || null
  const notas            = (formData.get('notas') as string) || null
  const cantidad_segundas = resultado === 'segundas'
    ? (parseInt(formData.get('cantidad_segundas') as string, 10) || null)
    : null

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

  // Advance OP state if inspection accepted or classified as segundas
  if (resultado === 'aceptada' || resultado === 'segundas') {
    const nextState = NEXT_STATE[estado_op]
    if (nextState) {
      await supabase
        .from('ordenes_produccion')
        .update({ estado: nextState })
        .eq('id', op_id)
    }
  }

  revalidatePath(`/calidad/${op_id}`)
  revalidatePath('/calidad')
  revalidatePath(`/ordenes-produccion/${op_id}`)
  return {}
}
