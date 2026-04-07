import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://ewrcycedbemekdkeqrob.supabase.co'
const supabaseKey = 'sb_publishable_c4mI0TP02CJB62ELvf1tpA_KMVqfvzK'
const supabase = createClient(supabaseUrl, supabaseKey)
async function go() {
  const { data: ops } = await supabase.from('ordenes_produccion').select('id, codigo, estado').like('codigo', '%015%')
  console.log('ops', ops)
}
go()
