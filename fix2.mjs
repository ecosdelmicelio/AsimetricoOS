import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ewrcycedbemekdkeqrob.supabase.co'
const supabaseKey = 'sb_publishable_c4mI0TP02CJB62ELvf1tpA_KMVqfvzK'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: tipos } = await supabase.from('kardex_tipos_movimiento').select('codigo')
  console.log('Tipos:', tipos)
}
run()
