import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function getTallerData(tallerId: string) {
  const supabase = db(await createClient())
  
  // 1. Datos del taller
  const { data: taller } = await supabase
    .from('terceros')
    .select('*')
    .eq('id', tallerId)
    .single()

  // 2. Resumen de Calidad (Últimos 30 días)
  const { data: insp } = await supabase
    .from('inspecciones')
    .select(`
      id,
      resultado,
      cantidad_inspeccionada,
      cantidad_segundas,
      cantidad_rechazadas,
      created_at,
      op:ordenes_produccion!inner(codigo, taller_id)
    `)
    .eq('op.taller_id', tallerId)
    .order('created_at', { ascending: false })

  // 3. OPs en curso
  const { data: ops } = await supabase
    .from('ordenes_produccion')
    .select('*, productos(nombre, referencia)')
    .eq('taller_id', tallerId)
    .in('estado', ['en_confeccion', 'programada'])

  return {
    taller,
    inspecciones: insp || [],
    ops: ops || []
  }
}
