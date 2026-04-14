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
    cantidad_muestra?: number
    notas?:          string
  }
) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

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

  // Crear OP sin ov_id (nullable)
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
      notas:          input.notas ?? `OP de muestra — Desarrollo ${desarrolloId}`,
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
  })

  revalidatePath(`/desarrollo/${desarrolloId}`)
  revalidatePath('/ordenes-produccion')
  return { data: op, error: null }
}

// ─── GENERAR OC DE MUESTRA (comercializados) ─────────────────────────────────

export async function generarOcMuestra(
  desarrolloId: string,
  versionId: string,
  input: {
    proveedor_id:      string
    fecha_entrega_est: string
    notas?:            string
  }
) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

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
      notas:             input.notas ?? `OC de muestra — Desarrollo ${desarrolloId}`,
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
    .contains('tipos', ['taller'])
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
