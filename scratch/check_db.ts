
import { createClient } from './src/shared/lib/supabase/server'

async function check() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('servicios_operativos').select('atributo3_id').limit(1)
  if (error) {
    console.error('Error selecting atributo3_id:', error.message)
  } else {
    console.log('Column atributo3_id EXISTS!')
  }
}

check()
