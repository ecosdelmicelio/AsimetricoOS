export interface TallerMesStats {
  unidades:        number
  valor_cop:       number
  ops_completadas: number
}

export interface TallerCalidadKPIs {
  ftt:              number   // First Time Through %
  tasa_rechazo:     number   // % inspecciones rechazadas
  total_cerradas:   number
  prendas_segundas: number
  top_defectos:     { codigo: string; descripcion: string; veces: number }[]
}

export interface TallerOPActiva {
  id:            string
  codigo:        string
  estado:        string
  cliente:       string
  fecha_promesa: string
  unidades:      number
}

export interface TallerDashboardData {
  taller: {
    id:               string
    nombre:           string
    estado:           string
    capacidad_diaria: number | null
    lead_time_dias:   number | null
  }
  mes_actual:  TallerMesStats
  mes_anterior: TallerMesStats
  calidad:     TallerCalidadKPIs
  puntualidad: number   // % OPs completadas antes de fecha_promesa (90 días)
  ops_activas: TallerOPActiva[]
}
