/**
 * Tabla militar ISO 2859-1 (AQL) para cálculo de muestras en FRI.
 * Fuente: ANSI/ASQ Z1.4-2003 / ISO 2859-1:1999
 */

import type { TipoInspeccion, CalidadConfig } from '@/features/calidad/types'

// [lote_min, letra_nivel_I, letra_nivel_II, letra_nivel_III]
const LOT_CODE_TABLE: [number, string, string, string][] = [
  [2,      'A', 'A', 'B'],
  [9,      'A', 'B', 'C'],
  [16,     'B', 'C', 'D'],
  [26,     'C', 'D', 'E'],
  [51,     'C', 'E', 'F'],
  [91,     'D', 'F', 'G'],
  [151,    'E', 'G', 'H'],
  [281,    'F', 'H', 'J'],
  [501,    'G', 'J', 'K'],
  [1201,   'H', 'K', 'L'],
  [3201,   'J', 'L', 'M'],
  [10001,  'K', 'M', 'N'],
  [35001,  'L', 'N', 'P'],
  [150001, 'M', 'P', 'Q'],
  [500001, 'N', 'Q', 'R'],
]

const SAMPLE_SIZE: Record<string, number> = {
  A: 2,
  B: 3,
  C: 5,
  D: 8,
  E: 13,
  F: 20,
  G: 32,
  H: 50,
  J: 80,
  K: 125,
  L: 200,
  M: 315,
  N: 500,
  P: 800,
  Q: 1250,
  R: 2000,
}

function getLotCode(n: number, nivel: 'I' | 'II' | 'III'): string {
  const idx = nivel === 'I' ? 1 : nivel === 'II' ? 2 : 3
  let code = 'A'
  for (const row of LOT_CODE_TABLE) {
    if (n >= row[0]) code = row[idx] as string
    else break
  }
  return code
}

export function calcMuestraSugerida(
  total: number,
  tipo: TipoInspeccion,
  config: CalidadConfig,
): number {
  if (total <= 0) return 1

  if (tipo === 'dupro') {
    return Math.max(1, Math.ceil(total * config.dupro_pct / 100))
  }

  // FRI
  switch (config.fri_metodo) {
    case 'pct':
      return Math.max(1, Math.ceil(total * config.fri_pct / 100))
    case 'aql': {
      const code = getLotCode(total, config.inspeccion_nivel)
      return Math.max(1, SAMPLE_SIZE[code] ?? Math.ceil(Math.sqrt(total)))
    }
    case 'sqrt':
    default:
      return Math.max(1, Math.ceil(Math.sqrt(total)))
  }
}

export const AQL_NIVELES = [
  { value: '0.065', label: '0.065', recommended: false },
  { value: '0.1',   label: '0.1',   recommended: false },
  { value: '0.15',  label: '0.15',  recommended: false },
  { value: '0.25',  label: '0.25',  recommended: false },
  { value: '0.4',   label: '0.4',   recommended: false },
  { value: '0.65',  label: '0.65',  recommended: false },
  { value: '1.0',   label: '1.0',   recommended: true  },
  { value: '1.5',   label: '1.5',   recommended: true  },
  { value: '2.5',   label: '2.5',   recommended: true  },
  { value: '4.0',   label: '4.0',   recommended: true  },
  { value: '6.5',   label: '6.5',   recommended: false },
] as const
