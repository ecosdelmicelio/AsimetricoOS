export interface ReporteCorte {
  id: string
  op_id: string
  fecha: string
  reportado_por: string | null
  notas: string | null
  created_at: string
}

export interface ReporteCorteTendido {
  id: string
  reporte_id: string
  color: string
  metros_usados: number
  peso_desperdicio_kg: number
  created_at: string
}

export interface ReporteCorteLinea {
  id: string
  tendido_id: string
  producto_id: string
  color?: string | null
  material_id?: string | null
  talla: string
  cantidad_cortada: number
  metros_usados?: number
  desperdicio_kg?: number
  material_devuelto_kg?: number
  created_at: string
}

export interface TendidoConLineas extends ReporteCorteTendido {
  reporte_corte_linea: (ReporteCorteLinea & {
    productos: { nombre: string; referencia: string; color: string | null } | null
  })[]
}

export interface ReporteCorteCompleto extends ReporteCorte {
  reporte_corte_tendido: TendidoConLineas[]
  profiles: { full_name: string } | null
}

export interface CreateTendidoInput {
  color: string
  metros_usados: number
  peso_desperdicio_kg: number
  lineas: {
    producto_id: string
    color?: string | null
    material_id?: string | null
    talla: string
    cantidad_cortada: number
    metros_usados?: number
    desperdicio_kg?: number
    material_devuelto_kg?: number
  }[]
}

export interface CreateReporteCorteInput {
  op_id: string
  fecha: string
  notas?: string
  bodega_id: string // Bodega taller donde se consume el material
  tendidos?: CreateTendidoInput[]
  // Nuevo flujo: registrar consumo de materiales
  referencias_seleccionadas?: Array<{ referencia: string; color: string | null }>
  consumo_materiales?: Array<{
    material_id: string
    metros_usados: number
    desperdicio_kg: number
    material_devuelto_kg: number
    referencias_cortadas: Array<{ referencia: string; color: string | null; bomMetros: number }>
  }>
}
