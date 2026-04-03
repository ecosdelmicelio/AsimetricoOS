'use server'

import { createClient } from '@/shared/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export async function checkDuplicate(input: {
  table: string
  field: string
  value: string
  excludeId?: string
}): Promise<boolean> {
  if (!input.value.trim()) return false
  const supabase = db(await createClient())

  let query = supabase
    .from(input.table)
    .select('id')
    .ilike(input.field, input.value.trim())
    .limit(1)

  if (input.excludeId) {
    query = query.neq('id', input.excludeId)
  }

  const { data } = await query
  return Array.isArray(data) && data.length > 0
}
