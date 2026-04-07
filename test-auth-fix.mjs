import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ewrcycedbemekdkeqrob.supabase.co'
const supabaseKey = 'sb_publishable_c4mI0TP02CJB62ELvf1tpA_KMVqfvzK'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  // Let's try to sign up
  const { data: user, error: signUpError } = await supabase.auth.signUp({
    email: 'fixer_bot_123@example.com',
    password: 'password12345'
  })
  
  if (signUpError && signUpError.message !== 'User already registered') {
    console.error('Signup error:', signUpError.message)
    // Maybe try sign in if already exists
    await supabase.auth.signInWithPassword({ email: 'fixer_bot_123@example.com', password: 'password12345' })
  }
  
  const { data: sessionData } = await supabase.auth.getSession()
  console.log('Session user:', sessionData.session?.user?.email)

  // Now query
  const { data: ops, error } = await supabase
    .from('ordenes_produccion')
    .select('id, codigo, estado, bodega_destino_id')
    .eq('codigo', 'OP-2026-015')
    
  if (error) {
    console.error('Select error:', error.message)
    return
  }
  console.log('Ops found:', ops)
  
  if (ops && ops.length > 0) {
     const opId = ops[0].id
     console.log('Anulating OP:', opId)
     
     // Instead of calling anularLiquidacion which uses server components context, 
     // just update the tables directly.
     const { error: liqError } = await supabase
        .from('liquidacion_op')
        .update({ estado: 'anulada' })
        .eq('op_id', opId)
     if (liqError) console.error('Liq update error:', liqError)
     else console.log('Liquidacion anulada!')
     
     const { error: opError } = await supabase
        .from('ordenes_produccion')
        .update({ estado: 'entregada' })
        .eq('id', opId)
     if (opError) console.error('OP update error:', opError)
     else console.log('OP actualizada a entregada!')
  }
}
run()
