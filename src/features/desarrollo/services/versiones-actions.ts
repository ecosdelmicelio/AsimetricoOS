'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import type { DesarrolloVersion, DesarrolloHallazgo, DesarrolloCosto } from '@/features/desarrollo/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

// ─── VERSIONES ────────────────────────────────────────────────────────────────

export async function crearNuevaVersion(
  desarrolloId: string,
  input: {
    notas_version: string
    bom_data?: Record<string, any>
    cuadro_medidas?: Record<string, unknown>
    comportamiento_tela?: string
  }
) {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener el último número de versión
  const { data: versiones } = await supabase
    .from('desarrollo_versiones')
    .select('version_n')
    .eq('desarrollo_id', desarrolloId)
    .order('version_n', { ascending: false })
    .limit(1)

  const siguienteVersion = versiones?.[0]?.version_n ? versiones[0].version_n + 1 : 1

  const { data, error } = await supabase
    .from('desarrollo_versiones')
    .insert({
      desarrollo_id:       desarrolloId,
      version_n:           siguienteVersion,
      notas_version:       input.notas_version,
      bom_data:            input.bom_data ?? null,
      cuadro_medidas:      input.cuadro_medidas ?? null,
      comportamiento_tela: input.comportamiento_tela ?? null,
    })
    .select('id, version_n')
    .single() as { data: Pick<DesarrolloVersion, 'id' | 'version_n'> | null; error: { message: string } | null }

  if (error || !data) return { error: error?.message ?? 'Error creando versión' }

  // Actualizar updated_at del desarrollo
  await supabase
    .from('desarrollo')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', desarrolloId)

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { data, error: null }
}

export async function actualizarVersion(
  versionId: string,
  desarrolloId: string,
  updates: Partial<{
    bom_data: Record<string, any>
    cuadro_medidas: Record<string, unknown>
    comportamiento_tela: string
    notas_version: string
  }>
) {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('desarrollo_versiones')
    .update(updates)
    .eq('id', versionId)

  if (error) return { error: error.message }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { error: null }
}

// ─── HALLAZGOS ────────────────────────────────────────────────────────────────

export interface CreateHallazgoInput {
  version_id:    string
  categoria:     string
  severidad:     string
  descripcion:   string
  zona_prenda?:  string
  foto_url?:     string
}

export async function crearHallazgo(desarrolloId: string, input: CreateHallazgoInput) {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('desarrollo_hallazgos')
    .insert({
      version_id:  input.version_id,
      categoria:   input.categoria,
      severidad:   input.severidad,
      descripcion: input.descripcion,
      zona_prenda: input.zona_prenda ?? null,
      foto_url:    input.foto_url ?? null,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error || !data) return { error: error?.message ?? 'Error creando hallazgo' }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { data, error: null }
}

export async function resolverHallazgo(
  hallazgoId: string,
  desarrolloId: string,
  versionActual: number
) {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('desarrollo_hallazgos')
    .update({ resuelto: true, resuelto_en_version: versionActual })
    .eq('id', hallazgoId)

  if (error) return { error: error.message }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { error: null }
}

// ─── COSTOS ───────────────────────────────────────────────────────────────────

export interface CreateCostoInput {
  version_id:  string
  concepto:    string
  descripcion?: string
  monto:       number
}

export async function crearCosto(desarrolloId: string, input: CreateCostoInput) {
  const supabase = db(await createClient())

  const { data, error } = await supabase
    .from('desarrollo_costos')
    .insert({
      version_id:  input.version_id,
      concepto:    input.concepto,
      descripcion: input.descripcion ?? null,
      monto:       input.monto,
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }

  if (error || !data) return { error: error?.message ?? 'Error creando costo' }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { data, error: null }
}

export async function eliminarCosto(costoId: string, desarrolloId: string) {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('desarrollo_costos')
    .delete()
    .eq('id', costoId)

  if (error) return { error: error.message }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { error: null }
}

// ─── ASSETS / FOTOS ───────────────────────────────────────────────────────────

export async function uploadDesarrolloAsset(
  versionId: string,
  desarrolloId: string,
  file: File,
  tipo: string,
  descripcion?: string
) {
  const supabase = db(await createClient())

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${desarrolloId}/${versionId}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('desarrollo-assets')
    .upload(path, buffer, { contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage
    .from('desarrollo-assets')
    .getPublicUrl(path)

  const { data, error } = await supabase
    .from('desarrollo_assets')
    .insert({
      version_id:  versionId,
      tipo,
      url:         urlData.publicUrl,
      descripcion: descripcion ?? null,
    })
    .select('id, url')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { data, error: null }
}

export async function eliminarAsset(assetId: string, desarrolloId: string) {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('desarrollo_assets')
    .delete()
    .eq('id', assetId)

  if (error) return { error: error.message }

  revalidatePath(`/desarrollo/${desarrolloId}`)
  return { error: null }
}
