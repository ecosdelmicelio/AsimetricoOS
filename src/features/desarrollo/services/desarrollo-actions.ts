'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  Desarrollo,
  DesarrolloConRelaciones,
  CreateDesarrolloInput,
  StatusDesarrollo,
} from '@/features/desarrollo/types'
import { crearNotificacion } from '@/shared/services/notification-actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function getDesarrollos() {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('desarrollo')
    .select(`
      *,
      terceros ( nombre ),
      productos!chasis_producto_id ( nombre, referencia ),
      desarrollo_versiones ( id, version_n, aprobado_ops, aprobado_cliente, aprobado_director ),
      profiles ( full_name )
    `)
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data: data as DesarrolloConRelaciones[], error: null }
}

// ─── GET ONE ──────────────────────────────────────────────────────────────────

export async function getDesarrolloById(id: string) {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('desarrollo')
    .select(`
      *,
      terceros ( nombre ),
      desarrollo_versiones (
        *,
        desarrollo_assets ( * ),
        desarrollo_hallazgos ( * ),
        desarrollo_costos ( * )
      ),
      desarrollo_transiciones ( *, profiles ( full_name ) ),
      desarrollo_ordenes ( * ),
      desarrollo_viabilidad_ops ( * ),
      desarrollo_condiciones ( * ),
      desarrollo_condiciones_material ( *, materiales(nombre) ),
      desarrollo_operaciones ( * ),
      profiles ( full_name )
    `)
    .eq('id', id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

async function generateSmartTempId(supabase: any, temporada: string, categoria: string) {
  const prefix = `${temporada.replace('-', '')}-${categoria.substring(0, 3).toUpperCase()}`
  
  // Buscar el último correlativo para este prefijo
  const { data } = await supabase
    .from('desarrollo')
    .select('temp_id')
    .like('temp_id', `${prefix}-%`)
    .order('temp_id', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const lastId = data[0].temp_id
    const parts = lastId.split('-')
    const lastNum = parseInt(parts[parts.length - 1])
    if (!isNaN(lastNum)) nextNum = lastNum + 1
  }

  return `${prefix}-${nextNum.toString().padStart(3, '0')}`
}

export async function createDesarrollo(input: CreateDesarrolloInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const smartId = await generateSmartTempId(supabase, input.temporada, input.categoria_producto)

  const { data, error } = await supabase
    .from('desarrollo')
    .insert({
      nombre_proyecto:      input.nombre_proyecto,
      categoria_producto:   input.categoria_producto,
      temp_id:              smartId,
      tipo_producto:        input.tipo_producto,
      prioridad:            input.prioridad,
      fecha_compromiso:     input.fecha_compromiso ?? null,
      cliente_id:           input.cliente_id ?? null,
      notas:                input.notas ?? null,
      chasis_producto_id:   input.chasis_producto_id ?? null,
      json_alta_resolucion: input.json_alta_resolucion ?? '{}',
      creado_por:           user.id,
      status:               'draft',
    })
    .select('id, temp_id')
    .single() as { data: Pick<Desarrollo, 'id' | 'temp_id'> | null; error: { message: string } | null }

  if (error || !data) return { error: error?.message ?? 'Error creando desarrollo' }

  // Crear versión 1 automáticamente
  await supabase.from('desarrollo_versiones').insert({
    desarrollo_id: data.id,
    version_n: 1,
  })

  // Registrar transición inicial
  await supabase.from('desarrollo_transiciones').insert({
    desarrollo_id:  data.id,
    estado_anterior: null,
    estado_nuevo:   'draft',
    usuario_id:     user.id,
    notas:          'Desarrollo creado',
  })

  revalidatePath('/desarrollo')
  return { data, error: null }
}

// ─── CAMBIO DE ESTADO ─────────────────────────────────────────────────────────

export async function cambiarStatusDesarrollo(
  id: string,
  nuevoStatus: StatusDesarrollo,
  notas?: string
) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener estado actual y calcular duración
  const { data: current } = await supabase
    .from('desarrollo')
    .select('status, updated_at')
    .eq('id', id)
    .single() as { data: Pick<Desarrollo, 'status' | 'updated_at'> | null }

  if (!current) return { error: 'Desarrollo no encontrado' }

  const duracionSeg = current.updated_at
    ? Math.floor((Date.now() - new Date(current.updated_at).getTime()) / 1000)
    : null

  // --- GATES SPRINT 7 ---
  
  // 1. Validar Gate de Draft -> Ops Review (Solicitud de Auditoría)
  if (nuevoStatus === 'ops_review') {
    // Verificar que existe Alta Resolución comercial
    const { data: dev } = await supabase
      .from('desarrollo')
      .select('json_alta_resolucion, tipo_producto')
      .eq('id', id)
      .single() as { data: { json_alta_resolucion: any; tipo_producto: string } | null }

    const ar = dev?.json_alta_resolucion
    if (!ar || !ar.telas_requeridas || !ar.colores_requeridos) {
      return { error: 'Faltan datos de Alta Resolución (Comercial) para solicitar auditoría.' }
    }

    // 1.1 Verificar BOM en la última versión
    const { data: versiones } = await supabase
      .from('desarrollo_versiones')
      .select('bom_data')
      .eq('desarrollo_id', id)
      .order('version_n', { ascending: false })
      .limit(1)

    const ultimaVersion = versiones?.[0]
    const bom = ultimaVersion?.bom_data as any
    const hasBomData = Array.isArray(bom) 
      ? bom.length > 0 
      : (bom && typeof bom === 'object' && Array.isArray(bom.materiales) && bom.materiales.length > 0)
    
    // NOTA: Podríamos ser flexibles aquí si es solo auditoría comercial, 
    // pero el sistema anterior requiere BOM para Ops Review.
    if (!hasBomData) {
      return { error: 'No se puede pasar a Revisión Ops sin definir un BOM (materiales) en la versión actual.' }
    }

    // 1.2 Verificar condiciones (dependiendo del tipo)
    if (dev?.tipo_producto === 'fabricado') {
      const { count } = await supabase
        .from('desarrollo_condiciones_material')
        .select('*', { count: 'exact', head: true })
        .eq('desarrollo_id', id)
      
      if (!count || count === 0) {
        return { error: 'Faltan las condiciones de mínimos de las materias primas para avanzar.' }
      }
    } else {
      const { count } = await supabase
        .from('desarrollo_condiciones')
        .select('*', { count: 'exact', head: true })
        .eq('desarrollo_id', id)
      
      if (!count || count === 0) {
        return { error: 'Faltan las condiciones comerciales del proveedor para avanzar.' }
      }
    }
  }

  // 2. Validar Gate de Ops Review -> Sampling (Certificación Ops)
  if (nuevoStatus === 'sampling') {
    const { data: dev } = await supabase
      .from('desarrollo')
      .select('tipo_muestra_asignada, disonancia_activa')
      .eq('id', id)
      .single() as { data: { tipo_muestra_asignada: string | null; disonancia_activa: boolean } | null }

    if (!dev?.tipo_muestra_asignada) {
      return { error: 'No se puede pasar a Muestreo sin una Certificación Operativa (Tipo A, B, C o D).' }
    }
    if (dev.disonancia_activa) {
      return { error: 'Disonancia activa deteniendo flujo. Resuelva la auditoría primero.' }
    }
  }

  // Actualizar estado
  const { error: updateError } = await supabase
    .from('desarrollo')
    .update({ status: nuevoStatus, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) return { error: updateError.message }

  // Registrar transición
  await supabase.from('desarrollo_transiciones').insert({
    desarrollo_id:    id,
    estado_anterior:  current.status,
    estado_nuevo:     nuevoStatus,
    duracion_fase_seg: duracionSeg,
    usuario_id:       user.id,
    notas:            notas ?? null,
  })

  revalidatePath('/desarrollo')
  revalidatePath(`/desarrollo/${id}`)
  return { error: null }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateDesarrollo(
  id: string,
  updates: Partial<CreateDesarrolloInput>
) {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('desarrollo')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/desarrollo')
  revalidatePath(`/desarrollo/${id}`)
  return { error: null }
}

// ─── DESCARTAR ────────────────────────────────────────────────────────────────

export async function descartarDesarrollo(id: string, motivo: string) {
  if (!motivo.trim()) return { error: 'El motivo de descarte es obligatorio' }
  return cambiarStatusDesarrollo(id, 'descartado', motivo)
}

// ─── CLIENTES (para selector) ─────────────────────────────────────────────────

export async function getClientesParaDesarrollo() {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('terceros')
    .select('id, nombre')
    .overlaps('tipos', ['cliente'])
    .order('nombre')

  if (error) return { data: [], error: error.message }
  return { data: data as { id: string; nombre: string }[], error: null }
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export async function getKPIInnovacionComercial() {
  const supabase = db(await createClient())

  const { data, error } = await supabase.rpc('kpi_innovacion_comercial')

  if (error) return { data: 0, error: error.message }
  return { data: typeof data === 'number' ? data : 0, error: null }
}

// ─── PRODUCTOS PADRE (Chasis) ──────────────────────────────────────────────────

export async function getProductosPadre() {
  const supabase = db(await createClient())

  // Por ahora traemos todos los productos activos para que sirvan de Chasis.
  // En el futuro podemos filtrar por una categoría específica o flag.
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, referencia')
    .eq('estado', 'activo')
    .order('nombre')

  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

// ─── PROMOCIÓN A PRODUCTO (Graduación) ──────────────────────────────────────────

export async function graduarDesarrollo(desarrolloId: string, referenciaFinal: string) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (!referenciaFinal) return { error: 'La referencia final es obligatoria' }

  // 1. Obtener desarrollo y última versión
  const { data: dev, error: devError } = await supabase
    .from('desarrollo')
    .select(`
      *,
      desarrollo_versiones (
        *,
        desarrollo_assets ( * )
      )
    `)
    .eq('id', desarrolloId)
    .single()

  if (devError || !dev) return { error: 'Desarrollo no encontrado' }
  
  // Encontrar la versión más alta
  const ultimaVersion = (dev.desarrollo_versiones as any[]).sort((a, b) => b.version_n - a.version_n)[0]

  if (!ultimaVersion) return { error: 'No hay versiones para graduar' }

  // 2. Crear el producto real
  const { data: producto, error: prodError } = await supabase
    .from('productos')
    .insert({
      referencia:     referenciaFinal,
      nombre:         dev.nombre_proyecto,
      categoria:      dev.categoria_producto,
      tipo_producto:  dev.tipo_producto,
      estado:         'activo',
      tallas:         ['XS', 'S', 'M', 'L', 'XL', 'XXL'], 
    })
    .select('id')
    .single()

  if (prodError) return { error: `Error creando producto: ${prodError.message}` }

  // 3. Heredar BOM
  const bom = ultimaVersion.bom_data as any
  const materiales = Array.isArray(bom) ? bom : (bom?.materiales || [])
  
  if (Array.isArray(materiales) && materiales.length > 0) {
    const bomInserts = materiales.map((item: any) => ({
      producto_id: producto.id,
      material_id: item.material_id,
      cantidad:    item.consumo || item.cantidad || 0,
      notas:       'Heredado de Desarrollo',
      tipo:        'materia_prima'
    }))
    await supabase.from('bom').insert(bomInserts)
  }

  // 4. Heredar Assets (Documentación)
  const assets = ultimaVersion.desarrollo_assets
  if (Array.isArray(assets) && assets.length > 0) {
    const assetInserts = assets.map((asset: any) => ({
      producto_id: producto.id,
      tipo:        asset.tipo === 'ficha_tecnica' ? 'ficha_tecnica' : 
                   asset.tipo === 'foto_muestra' ? 'foto' : 'otro',
      url:         asset.url,
      descripcion: asset.descripcion ?? 'Heredado de Desarrollo',
      created_por: user.id
    }))
    await supabase.from('producto_assets').insert(assetInserts)
  }

  // 5. Actualizar desarrollo
  await supabase
    .from('desarrollo')
    .update({ 
      status: 'graduated', 
      producto_final_id: producto.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', desarrolloId)

  // 6. Notificar
  await crearNotificacion({
    profile_role: 'orquestador',
    titulo: '🎓 Desarrollo Graduado',
    mensaje: `El proyecto "${dev.nombre_proyecto}" se ha convertido en el producto ${referenciaFinal}.`,
    data: { producto_id: producto.id, desarrollo_id: desarrolloId }
  })

  revalidatePath('/desarrollo')
  revalidatePath(`/desarrollo/${desarrolloId}`)
  revalidatePath('/catalogo')
  
  return { data: producto, error: null }
}

// ─── UPDATE COMERCIAL & CALIDAD ───────────────────────────────────────────────

export async function updateDesarrolloComercial(id: string, data: any) {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('desarrollo')
    .update({
      nombre_comercial:       data.nombre_comercial,
      subpartida_arancelaria: data.subpartida_arancelaria,
      composicion:            data.composicion,
      instrucciones_cuidado:  data.instrucciones_cuidado,
      notas:                  data.notas,
      updated_at:             new Date().toISOString()
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/desarrollo/${id}`)
  return { error: null }
}

export async function updateVersionQuality(versionId: string, puntos: any[]) {
  const supabase = db(await createClient())
  const { error } = await supabase
    .from('desarrollo_versiones')
    .update({
      puntos_criticos_calidad: puntos,
      updated_at:              new Date().toISOString()
    })
    .eq('id', versionId)

  if (error) return { error: error.message }
  revalidatePath('/desarrollo')
  return { error: null }
}
