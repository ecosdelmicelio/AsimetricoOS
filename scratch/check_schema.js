const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'traslados' });
  if (error) {
    // Fallback if RPC doesn't exist: try a query that naturally fails but shows columns in error
    const { error: err2 } = await supabase.from('traslados').select('non_existent_column_abc_123').limit(1);
    console.log('Columns error hint:', err2?.message);
  } else {
    console.log('Columns:', data);
  }
}

checkSchema();
