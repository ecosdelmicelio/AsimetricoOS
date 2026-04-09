const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Use the secret key so we bypass RLS!
// Wait! We don't have SUPABASE_SERVICE_ROLE_KEY.
// The .env.local only has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
// Without RLS bypass, we can't fetch unless we login.
