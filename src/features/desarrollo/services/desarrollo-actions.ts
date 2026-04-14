'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  Desarrollo,
  DesarrolloConRelaciones,
  CreateDesarrolloInput,
  StatusDesarrollo,
} from '@/features/desarrollo/types'

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
      profiles ( full_name )
    `)
    .eq('id', id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createDesarrollo(input: CreateDesarrolloInput) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('desarrollo')
    .insert({
      nombre_proyecto:    input.nombre_proyecto,
      categoria_producto: input.categoria_producto,
      complejidad:        input.complejidad,
      tipo_producto:      input.tipo_producto,
      prioridad:          input.prioridad,
      fecha_compromiso:   input.fecha_compromiso ?? null,
      cliente_id:         input.cliente_id ?? null,
      notas:              input.notas ?? null,
      creado_por:         user.id,
      status:             'draft',
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

// ─── CANCELAR ────────────────────────────────────────────────────────────────

export async function cancelarDesarrollo(id: string, motivo: string) {
  if (!motivo.trim()) return { error: 'El motivo de cancelación es obligatorio' }
  return cambiarStatusDesarrollo(id, 'cancelled', motivo)
}

// ─── CLIENTES (para selector) ─────────────────────────────────────────────────

export async function getClientesParaDesarrollo() {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('terceros')
    .select('id, nombre')
    .eq('tipo', 'cliente')
    .order('nombre')

  if (error) return { data: [], error: error.message }
  return { data: data as { id: string; nombre: string }[], error: null }
}
