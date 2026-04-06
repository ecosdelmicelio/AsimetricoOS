import { createClient } from './src/shared/lib/supabase/server'

async function check() {
  const supabase = await createClient()
  const { data: ov } = await supabase
    .from('ordenes_venta')
    .select('codigo, estado')
    .eq('id', '133c218c-c8f5-418b-800a-fea934b86bb4')
    .single()
  
  console.log('--- OV STATUS ---')
  console.log(JSON.stringify(ov, null, 2))
}

check()
