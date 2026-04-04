'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any {
  return supabase
}

export async function getConfiguracion(clave: string): Promise<string | null> {
  const supabase = db(await createClient())

  const { data } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', clave)
    .single() as { data: { valor: string } | null }

  return data?.valor ?? null
}

export async function getPorcentajeMaximoCorte(): Promise<number> {
  const valor = await getConfiguracion('corte_porcentaje_maximo')
  const porcentaje = parseInt(valor ?? '103', 10)
  return isNaN(porcentaje) ? 103 : porcentaje
}
