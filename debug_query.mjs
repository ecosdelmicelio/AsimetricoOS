import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ewrcycedbemekdkeqrob.supabase.co'
const supabaseKey = 'sb_publishable_c4mI0TP02CJB62ELvf1tpA_KMVqfvzK'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('--- TEST 1: check other tables ---')
  const { data: ov } = await supabase.from('ordenes_venta').select('id').limit(1)
  console.log('OV found:', ov?.length || 0)
  
  const { data: prod } = await supabase.from('productos').select('id').limit(1)
  console.log('Products found:', prod?.length || 0)

  console.log('\n--- TEST 2: Corrected OP Query ---')
  // Using 'terceros' instead of 'talleres' and 'clientes' as per hint
  const { data: d2, error: e2 } = await supabase
    .from('ordenes_produccion')
    .select(`
      *,
      terceros!taller_id ( nombre ),
      ordenes_venta!ov_id (
        id,
        terceros!cliente_id ( nombre )
      ),
      op_detalle (
        cantidad_asignada,
        productos!producto_id (
          id,
          nombre,
          referencia,
          precio_base
        )
      ),
      liquidaciones (
        costo_total_real
      ),
      entregas ( 
        id, 
        estado, 
        fecha_entrega,
        entrega_detalle ( cantidad_entregada ) 
      )
    `)
  
  if (e2) {
    console.error('E2:', e2.message)
  } else {
    console.log('D2 Success:', d2.length, 'records')
    if (d2.length > 0) {
      console.log('Sample record:', JSON.stringify(d2[0], null, 2))
    }
  }
}

debug()
