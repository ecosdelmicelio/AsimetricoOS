import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AtributosConfigMP } from '@/features/materiales/components/atributos-config'
import { getAtributosMP } from '@/features/materiales/services/atributo-actions'

export default async function AtributosMPPage() {
  const atributos = await getAtributosMP()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/configuracion"
          className="w-9 h-9 rounded-xl bg-neu-base shadow-neu flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:shadow-neu-inset"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-display-xs font-heading font-bold text-foreground">Atributos MP</h1>
          <p className="text-muted-foreground text-body-sm mt-0.5">
            Gestiona los atributos de materias primas (Tipo, Subtipo, Color, etc.)
          </p>
        </div>
      </div>

      <AtributosConfigMP atributos={atributos} />
    </div>
  )
}
