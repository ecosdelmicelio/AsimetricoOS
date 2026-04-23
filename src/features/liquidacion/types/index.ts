export interface InsumoParaReporte {
  material_id: string
  producto_id: string
  producto_nombre: string
  cantidad_producto: number   // unidades de este producto en la OP
  nombre: string
  unidad: string
  cantidad_bom: number        // cantidad BOM × cantidad_producto (teórico por producto)
  cantidad_usada: number      // lo reportado
  desperdicio: number
  notas: string | null
  ya_reportado: boolean
}

export interface LineaComparativo {
  tipo: 'tela' | 'insumo' | 'servicio'
  nombre: string
  unidad: string
  teorico: number             // del BOM × cantidad OP
  real: number                // reportado
  diferencia: number          // real - teorico
  porcentaje_desvio: number   // (real - teorico) / teorico * 100
  costo_unitario: number
  costo_total: number
}

export interface CppPorProducto {
  producto_id: string
  producto_nombre: string
  referencia: string
  unidades: number
  costo_tela: number          // prorrateado por proporción de unidades
  costo_insumos: number       // directo desde reporte_insumos filtrado por producto_id
  costo_servicios: number     // prorrateado por proporción de unidades
  costo_total: number
  cpp: number                 // costo_total / unidades
  costo_estandar: number      // costo_unit del catálogo de productos
}

export interface ServicioRef {
  id: string
  producto_id: string
  producto_nombre: string
  referencia: string
  nombre_servicio: string
  tarifa_unitaria: number
  cantidad: number
  costo_total: number
}

export interface ResumenLiquidacion {
  costo_tela: number
  costo_insumos: number
  costo_servicios: number
  costo_total: number
  cantidad_entregada: number
  cpp: number
  comparativo: LineaComparativo[]
  cpp_por_producto: CppPorProducto[]
  calidad?: {
    totalSegundas: number
    totalRechazadas: number
    mermaToleradaPct: number
    toleranciaUnidades: number
    excesoMermas: number
    impactoFinanciero: number
  }
}
