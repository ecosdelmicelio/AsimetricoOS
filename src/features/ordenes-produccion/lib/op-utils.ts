import type { EstadoOP } from '@/features/ordenes-produccion/types'

interface OPStatusPayload {
  estado: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reporte_corte?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entregas?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  liquidaciones?: any | null
}

/**
 * Derives a more accurate human-readable status label based on the OP's current state and its associated records.
 * For example, if it's in 'en_corte' but already has a cut report, it might be in transition.
 */
export function getOPStatusLabel(op: OPStatusPayload): string {
  const baseStatus = op.estado as EstadoOP

  switch (baseStatus) {
    case 'en_corte':
      if (op.reporte_corte && op.reporte_corte.length > 0) {
        return 'Corte Finalizado'
      }
      return 'En Corte'
    case 'programada':
      return 'Programada'
    case 'en_confeccion':
      return 'En Confección'
    case 'dupro_pendiente':
      return 'DUPRO'
    case 'en_terminado':
      return 'Terminado'
    case 'entregada':
      return 'Entregada'
    case 'liquidada':
      return 'Liquidada'
    case 'cancelada':
      return 'Cancelada'
    default:
      return 'Desconocido'
  }
}
