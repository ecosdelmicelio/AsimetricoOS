const { createClient } = require('@supabase/supabase-js')

async function testDelete() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  const binCodigo = '2026411001'
  
  // 1. Encontrar ID
  const { data: bin } = await supabase.from('bines').select('id').eq('codigo', binCodigo).single()
  
  if (!bin) {
    console.log('Bin no encontrado')
    return
  }
  
  console.log('Intentando borrar bin:', bin.id)
  
  // 2. Intentar borrar
  const { error } = await supabase.from('bines').delete().eq('id', bin.id)
  
  if (error) {
    console.error('Error al borrar:', error)
  } else {
    console.log('Borrado exitoso (en DB)')
  }
}

testDelete()
