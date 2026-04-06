import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const { data, error } = await supabase
    .from('ordenes_produccion')
    .update({ estado: 'entregada' })
    .eq('estado', 'en_entregas')
    .select()

  if (error) {
    console.error('Error updating records:', error)
  } else {
    console.log(`Updated ${data.length} records from 'en_entregas' to 'entregada'.`)
  }
}

main()
