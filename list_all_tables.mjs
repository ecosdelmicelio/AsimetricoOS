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
  const { data, error } = await supabase.rpc('get_tables'); // likely fails
  if (error) {
      // Try to query common tables to see which ones respond with data
      const common = ['productos', 'maestro_padres_pt', 'ordenes_venta', 'materiales', 'maestro_padres_mp'];
      for (const t of common) {
          const { count, error } = await supabase.from(t).select('*', { head: true, count: 'exact' });
          console.log(`Table '${t}':`, error ? `ERROR (${error.message})` : `EXISTS (${count} rows)`);
      }
  } else {
      console.log("Tables:", data);
  }
}

run();
