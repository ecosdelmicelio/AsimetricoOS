'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

// ─── GENERAR OP DE MUESTRA (fabricados) ──────────────────────────────────────

export async function generarOpMuestra(
  desarrolloId: string,
  versionId: string,
  input: {
    taller_id:       string
    fecha_promesa:   string
    sin_costo?:      boolean
    notas?:          string
  }
) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener temp_id para las notas
  const { data: dev } = await supabase.from('desarrollo').select('temp_id').eq('id', desarrolloId).single()

  // Verificar que no haya ya una OP de muestra activa para esta versión
  const { data: existente } = await supabase
    .from('desarrollo_ordenes')
    .select('id')
    .eq('desarrollo_id', desarrolloId)
    .eq('version_id', versionId)
    .eq('tipo_orden', 'op_muestra')
    .limit(1)

  if (existente?.length) return { error: 'Ya existe una OP de muestra para esta versión' }

  // Generar código especial
  const { data: codigoData } = await supabase
    .rpc('generate_op_muestra_codigo')
    .single() as { data: string | null }

  const codigo = codigoData ?? `OP-M-${new Date().getFullYear()}-001`

  // Crear OP
  const { data: op, error: opError } = await supabase
    .from('ordenes_produccion')
    .insert({
      codigo,
      taller_id:      input.taller_id,
      ov_id:          null,
      fecha_promesa:  input.fecha_promesa,
      estado:         'programada',
      es_muestra:     true,
      desarrollo_id:  desarrolloId,
      notas:          input.notas ?? `OP muestra: ${dev?.temp_id}${input.sin_costo ? ' (SIN COSTO)' : ''}`,
      creado_por:     user.id,
    })
    .select('id, codigo')
    .single() as { data: { id: string; codigo: string } | null; error: { message: string } | null }

  if (opError || !op) return { error: opError?.message ?? 'Error creando OP de muestra' }

  // Enlazar en desarrollo_ordenes
  await supabase.from('desarrollo_ordenes').insert({
    desarrollo_id: desarrolloId,
    version_id:    versionId,
    tipo_orden:    'op_muestra',
    op_id:         op.id,
    estado:        'programada',
    sin_costo:     input.sin_costo ?? false,
  })

  revalidatePath(`/desarrollo/${desarrolloId}`)
  revalidatePath('/ordenes-produccion')
  return { data: op, error: null }
}

export async function generarOcMuestra(
  desarrolloId: string,
  versionId: string,
  input: {
    proveedor_id:      string
    fecha_entrega_est: string
    sin_costo?:        boolean
    notas?:            string
  }
) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener temp_id para las notas
  const { data: dev } = await supabase.from('desarrollo').select('temp_id').eq('id', desarrolloId).single()

  // Verificar que no haya ya una OC de muestra activa para esta versión
  const { data: existente } = await supabase
    .from('desarrollo_ordenes')
    .select('id')
    .eq('desarrollo_id', desarrolloId)
    .eq('version_id', versionId)
    .eq('tipo_orden', 'oc_muestra')
    .limit(1)

  if (existente?.length) return { error: 'Ya existe una OC de muestra para esta versión' }

  // Generar código especial
  const { data: codigoData } = await supabase
    .rpc('generate_oc_muestra_codigo')
    .single() as { data: string | null }

  const codigo = codigoData ?? `OC-M-${new Date().getFullYear()}-001`

  // Crear OC
  const { data: oc, error: ocError } = await supabase
    .from('ordenes_compra')
    .insert({
      codigo,
      proveedor_id:      input.proveedor_id,
      tipo:              'producto_terminado',
      estado_documental: 'na',
      estado_greige:     'otros',
      fecha_oc:          new Date().toISOString().split('T')[0],
      fecha_entrega_est: input.fecha_entrega_est,
      es_muestra:        true,
      desarrollo_id:     desarrolloId,
      notas:             input.notas ?? `OC muestra: ${dev?.temp_id}${input.sin_costo ? ' (SIN COSTO)' : ''}`,
      creado_por:        user.id,
    })
    .select('id, codigo')
    .single() as { data: { id: string; codigo: string } | null; error: { message: string } | null }

  if (ocError || !oc) return { error: ocError?.message ?? 'Error creando OC de muestra' }

  // Enlazar en desarrollo_ordenes
  await supabase.from('desarrollo_ordenes').insert({
    desarrollo_id: desarrolloId,
    version_id:    versionId,
    tipo_orden:    'oc_muestra',
    oc_id:         oc.id,
    estado:        'pendiente',
    sin_costo:     input.sin_costo ?? false,
  })

  revalidatePath(`/desarrollo/${desarrolloId}`)
  revalidatePath('/compras')
  return { data: oc, error: null }
}

// ─── APROBACIONES DE VERSIÓN ──────────────────────────────────────────────────

type CampoAprobacion = 'aprobado_ops' | 'aprobado_cliente' | 'aprobado_director'

export async function aprobarVersion(
  versionId: string,
  desarrolloId: string,
  campo: CampoAprobacion,
  valor: boolean
) {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('desarrollo_versiones')
    .update({ [campo]: valor })
    .eq('id', versionId)

  if (error) return { error: error.message }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { error: null }
}

// ─── VIABILIDAD OPS ───────────────────────────────────────────────────────────

export interface ViabilidadOpsInput {
  materiales_disponibles:  boolean
  moq_viable:              boolean
  leadtime_aceptable:      boolean
  proveedores_confirmados: boolean
  capacidad_produccion:    boolean
  riesgo_abastecimiento:   'bajo' | 'medio' | 'alto'
  demanda_proyectada?:     number
  notas_ops?:              string
  veredicto:               'aprobado' | 'aprobado_con_reservas' | 'rechazado'
  condiciones_aprobacion?: string
}

export async function registrarViabilidadOps(
  desarrolloId: string,
  versionId: string,
  input: ViabilidadOpsInput
) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Upsert: reemplaza evaluación existente para la misma versión
  const { error } = await supabase
    .from('desarrollo_viabilidad_ops')
    .upsert({
      desarrollo_id:           desarrolloId,
      version_id:              versionId,
      evaluado_por:            user.id,
      materiales_disponibles:  input.materiales_disponibles,
      moq_viable:              input.moq_viable,
      leadtime_aceptable:      input.leadtime_aceptable,
      proveedores_confirmados: input.proveedores_confirmados,
      capacidad_produccion:    input.capacidad_produccion,
      riesgo_abastecimiento:   input.riesgo_abastecimiento,
      demanda_proyectada:      input.demanda_proyectada ?? null,
      notas_ops:               input.notas_ops ?? null,
      veredicto:               input.veredicto,
      condiciones_aprobacion:  input.condiciones_aprobacion ?? null,
    }, { onConflict: 'desarrollo_id,version_id' })

  if (error) {
    // Si onConflict falla por constraint inexistente, hacer insert directo
    const { error: insertError } = await supabase
      .from('desarrollo_viabilidad_ops')
      .insert({
        desarrollo_id:           desarrolloId,
        version_id:              versionId,
        evaluado_por:            user.id,
        materiales_disponibles:  input.materiales_disponibles,
        moq_viable:              input.moq_viable,
        leadtime_aceptable:      input.leadtime_aceptable,
        proveedores_confirmados: input.proveedores_confirmados,
        capacidad_produccion:    input.capacidad_produccion,
        riesgo_abastecimiento:   input.riesgo_abastecimiento,
        demanda_proyectada:      input.demanda_proyectada ?? null,
        notas_ops:               input.notas_ops ?? null,
        veredicto:               input.veredicto,
        condiciones_aprobacion:  input.condiciones_aprobacion ?? null,
      })
    if (insertError) return { error: insertError.message }
  }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { error: null }
}

// ─── CONDICIONES COMERCIALES ──────────────────────────────────────────────────

export interface CondicionesInput {
  proveedor_id?:             string
  moq_proveedor?:            number
  moq_unidad?:               string
  moq_producto?:             number
  multiplo_orden?:           number
  leadtime_produccion_dias?: number
  leadtime_envio_dias?:      number
  leadtime_total_dias?:      number
  incoterm?:                 string
  puerto_origen?:            string
  moneda?:                   'USD' | 'COP' | 'EUR'
  precio_referencia?:        number
  condiciones_pago?:         string
  empaque_minimo?:           string
  tallas_disponibles?:       string[]
  colores_disponibles?:      string[]
  notas?:                    string
  vigencia_precio?:          string
}

export async function guardarCondiciones(
  desarrolloId: string,
  versionId: string,
  input: CondicionesInput
) {
  const supabase = db(await createClient())

  // Verificar si ya existe una condición para este desarrollo
  const { data: existing } = await supabase
    .from('desarrollo_condiciones')
    .select('id')
    .eq('desarrollo_id', desarrolloId)
    .limit(1)

  const payload = {
    desarrollo_id:             desarrolloId,
    version_id:                versionId,
    proveedor_id:              input.proveedor_id ?? null,
    moq_proveedor:             input.moq_proveedor ?? null,
    moq_unidad:                input.moq_unidad ?? null,
    moq_producto:              input.moq_producto ?? null,
    multiplo_orden:            input.multiplo_orden ?? null,
    leadtime_produccion_dias:  input.leadtime_produccion_dias ?? null,
    leadtime_envio_dias:       input.leadtime_envio_dias ?? null,
    leadtime_total_dias:       input.leadtime_total_dias ?? null,
    incoterm:                  input.incoterm ?? null,
    puerto_origen:             input.puerto_origen ?? null,
    moneda:                    input.moneda ?? 'COP',
    precio_referencia:         input.precio_referencia ?? null,
    condiciones_pago:          input.condiciones_pago ?? null,
    empaque_minimo:            input.empaque_minimo ?? null,
    tallas_disponibles:        input.tallas_disponibles ?? null,
    colores_disponibles:       input.colores_disponibles ?? null,
    notas:                     input.notas ?? null,
    vigencia_precio:           input.vigencia_precio ?? null,
    updated_at:                new Date().toISOString(),
  }

  if (existing?.length) {
    await supabase.from('desarrollo_condiciones').update(payload).eq('desarrollo_id', desarrolloId)
  } else {
    await supabase.from('desarrollo_condiciones').insert(payload)
  }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { error: null }
}

// ─── GET TALLERES Y PROVEEDORES ───────────────────────────────────────────────

export async function getTalleresParaMuestra() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('terceros')
    .select('id, nombre')
    .overlaps('tipos', ['taller', 'satelite'])
    .order('nombre')
  return { data: (data ?? []) as { id: string; nombre: string }[] }
}

export async function getProveedoresParaMuestra() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('terceros')
    .select('id, nombre')
    .contains('tipos', ['proveedor'])
    .order('nombre')
  return { data: (data ?? []) as { id: string; nombre: string }[] }
}

export async function getAllTerceros() {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('terceros')
    .select('id, nombre, tipos')
    .order('nombre')
  return { data: (data ?? []) as { id: string; nombre: string; tipos: string[] }[] }
}

// ─── RESTRICCIONES POR MATERIAL (MOQs) ───────────────────────────────────────

export interface MaterialCondicionInput {
  material_id:            string
  material_nombre?:       string
  proveedor_id?:          string
  moq_material:           number
  moq_unidad:             string
  consumo_por_unidad:     number
  leadtime_material_dias: number
  notas?:                 string
}

export async function guardarCondicionesMaterial(
  desarrolloId: string,
  input: MaterialCondicionInput[]
) {
  const supabase = db(await createClient())

  // Eliminar existentes para este desarrollo
  await supabase.from('desarrollo_condiciones_material').delete().eq('desarrollo_id', desarrolloId)

  if (input.length === 0) return { error: null }

  // Insertar nuevos
  const { error } = await supabase.from('desarrollo_condiciones_material').insert(
    input.map(item => ({
      desarrollo_id:          desarrolloId,
      material_id:            item.material_id,
      proveedor_id:           item.proveedor_id ?? null,
      moq_material:           item.moq_material,
      moq_unidad:             item.moq_unidad,
      consumo_por_unidad:     item.consumo_por_unidad,
      moq_implicito_producto: item.consumo_por_unidad > 0 ? Math.ceil(item.moq_material / item.consumo_por_unidad) : 0,
      leadtime_material_dias: item.leadtime_material_dias,
      notas:                  item.notas ?? null,
    }))
  )

  if (error) return { error: error.message }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { error: null }
}

export async function getCondicionesMaterial(desarrolloId: string) {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('desarrollo_condiciones_material')
    .select('*, materiales(nombre)')
    .eq('desarrollo_id', desarrolloId)
  
  return { data: (data ?? []) }
}

export async function getCondicionesGenerales(desarrolloId: string) {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('desarrollo_condiciones')
    .select('*')
    .eq('desarrollo_id', desarrolloId)
    .maybeSingle()
  
  return { data }
}

// ─── MATERIALES BORRADOR ──────────────────────────────────────────────────────

export async function createDraftMaterial(input: {
  nombre: string
  unidad: string
  costo_unit: number
  proveedor_id: string
  moq: number
  multiplo: number
  desarrollo_id: string
}) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Generar código temporal
  const { data: dev } = await supabase.from('desarrollo').select('temp_id').eq('id', input.desarrollo_id).single()
  const tempCode = `PROP-${dev?.temp_id || 'DEV'}-${Math.floor(Math.random() * 1000)}`

  // 1. Crear material inactivo
  const { data: material, error: matError } = await supabase
    .from('materiales')
    .insert({
      codigo:     tempCode,
      nombre:     input.nombre.trim(),
      unidad:     input.unidad,
      costo_unit: input.costo_unit,
      activo:     false, // Inactivo hasta que se gradué el producto
    })
    .select('id, nombre, unidad, costo_unit, codigo')
    .single()

  if (matError || !material) return { error: matError?.message ?? 'Error al crear material borrador' }

  // 2. Registrar condiciones iniciales en el panel de desarrollo para este material
  await supabase.from('desarrollo_condiciones_material').insert({
    desarrollo_id:          input.desarrollo_id,
    material_id:            material.id,
    proveedor_id:           input.proveedor_id,
    moq_material:           input.moq,
    moq_unidad:             input.unidad,
    consumo_por_unidad:     0, // Se definirá en el panel de condiciones
    leadtime_material_dias: 0,
    notas:                  'Material propuesto desde desarrollo',
  })

  return { data: material, error: null }
}

export async function getMaterialInheritedConditions(materialId: string) {
  const supabase = db(await createClient())

  // Intentar obtener de la última OC de este material
  const { data: lastOc } = await supabase
    .from('oc_detalle_mp')
    .select(`
      precio_unitario,
      ordenes_compra ( proveedor_id )
    `)
    .eq('material_id', materialId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastOc) {
    return {
      data: {
        costo_unit: lastOc.precio_unitario,
        proveedor_id: lastOc.ordenes_compra?.proveedor_id,
      },
      error: null
    }
  }

  // Si no hay compras, obtener el costo_unit del maestro
  const { data: material } = await supabase
    .from('materiales')
    .select('costo_unit')
    .eq('id', materialId)
    .maybeSingle()

  return {
    data: {
      costo_unit: material?.costo_unit || 0,
      proveedor_id: null,
    },
    error: null
  }
}
