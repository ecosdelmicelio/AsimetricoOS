/**
 * Utilidades matemáticas para el módulo financiero.
 * NO incluyen 'use server' para poder ser usadas síncronamente en ambos lados.
 */

export interface CuotaAmortizacion {
  mes: number
  fecha: string
  saldo_inicial: number
  cuota: number
  interes: number
  capital: number
  saldo_final: number
}

/**
 * Calcula la cuota mensual fija usando el sistema francés de amortización.
 */
export function calcularCuotaFrances(
  monto: number,
  tasa_mes_pct: number,
  plazo: number
): number {
  const i = tasa_mes_pct / 100
  if (i === 0) return monto / (plazo || 1)
  return monto * (i * Math.pow(1 + i, plazo)) / (Math.pow(1 + i, plazo) - 1)
}

/**
 * Genera el plan de pagos completo de un préstamo.
 */
export function generarTablaAmortizacion(
  saldo_inicial: number,
  tasa_mes_pct: number,
  plazo_meses: number,
  fecha_inicio: string
): CuotaAmortizacion[] {
  const cuota = calcularCuotaFrances(saldo_inicial, tasa_mes_pct, plazo_meses)
  const i = tasa_mes_pct / 100
  const tabla: CuotaAmortizacion[] = []

  let saldo = saldo_inicial
  const fechaBase = new Date(fecha_inicio)

  for (let mes = 1; mes <= plazo_meses; mes++) {
    const fecha = new Date(fechaBase)
    // Se asume pago mes a mes
    fecha.setMonth(fecha.getMonth() + mes)

    const interes = saldo * i
    const capital = cuota - interes
    const saldo_final = Math.max(0, saldo - capital)

    tabla.push({
      mes,
      fecha: fecha.toISOString().split('T')[0],
      saldo_inicial: saldo,
      cuota: Math.round(cuota * 100) / 100,
      interes: Math.round(interes * 100) / 100,
      capital: Math.round(capital * 100) / 100,
      saldo_final: Math.round(saldo_final * 100) / 100,
    })
    saldo = saldo_final
  }
  return tabla
}
