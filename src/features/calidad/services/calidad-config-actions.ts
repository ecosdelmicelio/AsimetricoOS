'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/shared/lib/supabase/server'
import { db } from '@/shared/lib/supabase/db'
import type { CalidadConfig } from '@/features/calidad/types'


const DEFAULTS: Omit<CalidadConfig, 'id' | 'updated_at'> = {
  dupro_pct:        30,
  fri_metodo:       'sqrt',
  fri_pct:          10,
  aql_nivel:        '2.5',
  inspeccion_nivel: 'II',
  porcentaje_merma_tolerada: 2.0,
}

export async function getCalidadConfig(): Promise<CalidadConfig> {
  const supabase = db(await createClient())
  const { data } = await supabase
    .from('calidad_config')
    .select('*')
    .single() as { data: CalidadConfig | null }

  return data ?? { id: '', updated_at: '', ...DEFAULTS }
}

export async function updateCalidadConfig(
  input: Partial<Omit<CalidadConfig, 'id' | 'updated_at'>>,
): Promise<{ error?: string }> {
  const supabase = db(await createClient())

  const { error } = await supabase
    .from('calidad_config')
    .update({ ...input, updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000') as { error: { message: string } | null }

  if (error) return { error: error.message }
  revalidatePath('/configuracion')
  return {}
}
