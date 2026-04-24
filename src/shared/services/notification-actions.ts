'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export interface CreateNotificacionInput {
  user_id?: string
  profile_role?: string
  titulo: string
  mensaje: string
  data?: Record<string, any>
}

export async function crearNotificacion(input: CreateNotificacionInput) {
  const supabase = db(await createClient())
  
  const { error } = await supabase
    .from('notificaciones')
    .insert({
      user_id:      input.user_id ?? null,
      profile_role: input.profile_role ?? null,
      titulo:       input.titulo,
      mensaje:      input.mensaje,
      data:         input.data ?? {},
    })

  if (error) {
    console.error('Error creando notificación:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function getMisNotificaciones() {
  const supabase = db(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'No autenticado' }

  // Obtener perfil para el rol
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('notificaciones')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (profile?.role) {
    query = query.or(`user_id.eq.${user.id},profile_role.eq.${profile.role}`)
  } else {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query

  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

export async function marcarComoLeida(id: string) {
  const supabase = db(await createClient())
  
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/')
  return { success: true }
}
