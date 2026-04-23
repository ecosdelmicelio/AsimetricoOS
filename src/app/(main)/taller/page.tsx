import { createClient } from '@/shared/lib/supabase/server'
import { getTallerData } from '@/features/talleres/services/taller-actions'
import { WorkshopPortal } from '@/features/talleres/components/workshop-portal'
import { PageHeader } from '@/shared/components/page-header'
import { Factory, ShieldAlert } from 'lucide-react'
import { redirect } from 'next/navigation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: unknown): any { return supabase }

export default async function TallerPage() {
  const supabase = db(await createClient())
  
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('taller_id')
    .eq('id', user.id)
    .single()

  if (!profile?.taller_id) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
        <div className="w-20 h-20 rounded-[30px] bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Acceso Restringido</h2>
          <p className="text-slate-400 font-medium max-w-xs mt-2">
            Tu perfil no está vinculado a ningún taller. Por favor contacta al administrador de Asimetrico.
          </p>
        </div>
      </div>
    )
  }

  const data = await getTallerData(profile.taller_id)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Portal de Proveedor"
        subtitle="Monitoreo de calidad y cumplimiento"
        icon={Factory}
      />

      <WorkshopPortal data={data} />
    </div>
  )
}
