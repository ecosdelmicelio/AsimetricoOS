import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database'

/**
 * Helper to ensure a typed Supabase client.
 * In this project, it's often used as an identity function to cast to 'any'
 * or to wrap the client for easier use in certain contexts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(supabase: SupabaseClient<Database> | any): any {
  return supabase
}
