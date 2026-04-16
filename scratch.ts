import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  const { data: ocs } = await supabase.from('ordenes_compra').select('id, codigo, estado_documental').eq('codigo', 'OC-2026-013').single()
  console.log("OC Status:", ocs)
  
  if (!ocs) return

  const { data: pt } = await supabase.from('oc_detalle').select('cantidad').eq('oc_id', ocs.id)
  const expectedPT = (pt || []).reduce((sum, row) => sum + Number(row.cantidad), 0)
  
  const { data: rec } = await supabase.from('recepcion_oc').select('cantidad_recibida, estado').eq('oc_id', ocs.id).neq('estado', 'revertida')
  const received = (rec || []).reduce((sum, row) => sum + Number(row.cantidad_recibida), 0)
  
  console.log("Expected PT:", expectedPT)
  console.log("Received Total:", received)
  console.log("Raw Received:", rec)
}
check()
