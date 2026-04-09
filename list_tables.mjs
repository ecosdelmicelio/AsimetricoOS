import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('productos')
    .select('count', { count: 'exact', head: true });
    
  if (error) {
    console.log("Table 'productos' check:", error.message);
  } else {
    console.log("Table 'productos' exists.");
  }

  const { data: tables, error: tablesErr } = await supabase
    .rpc('get_tables'); // This might not exist

  if (tablesErr) {
    // Try a standard query to information_schema via a trick or just checking known names
    const names = ['productos', 'maestro_padres_pt', 'bom', 'materiales'];
    for (const name of names) {
        const { error } = await supabase.from(name).select('*').limit(0);
        console.log(`Checking '${name}':`, error ? `FAIL (${error.message})` : "OK");
    }
  }
}

run();
