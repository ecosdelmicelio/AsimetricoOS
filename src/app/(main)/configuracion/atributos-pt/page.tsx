import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AtributosConfig } from '@/features/productos/components/atributos-config'
import { getAtributosPT } from '@/features/productos/services/atributo-actions'

export default async function AtributosPTPage() {
  const atributos = await getAtributosPT()

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
          <h1 className="text-display-xs font-heading font-bold text-foreground">Atributos PT</h1>
          <p className="text-muted-foreground text-body-sm mt-0.5">
            Gestiona los atributos de productos terminados (Tipo, Fit, Color, etc.)
          </p>
        </div>
      </div>

      <AtributosConfig atributos={atributos} />
    </div>
  )
}
