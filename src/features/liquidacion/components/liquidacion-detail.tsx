// Detalle de liquidación individual - flujo movido al detalle de OP
interface Props { id: string }

export function LiquidacionDetail({ id: _id }: Props) {
  return (
    <div className="rounded-2xl bg-neu-base shadow-neu p-8 text-center">
      <p className="text-muted-foreground text-body-sm">
        Las liquidaciones se gestionan desde el detalle de cada Orden de Producción.
      </p>
    </div>
  )
}
