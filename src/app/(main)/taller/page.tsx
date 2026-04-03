import { redirect } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/server'
import { getTallerDashboard } from '@/features/taller/services/taller-actions'
import { TallerDashboard } from '@/features/taller/components/taller-dashboard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export default async function TallerPage() {
  const supabase = db(await createClient())

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, taller_id')
    .eq('id', user.id)
    .single() as { data: { role: string; taller_id: string | null } | null }

  if (!profile || profile.role !== 'taller') redirect('/torre-control')
  if (!profile.taller_id) redirect('/')

  const data = await getTallerDashboard(profile.taller_id)
  if (!data) redirect('/')

  return <TallerDashboard data={data} />
}
