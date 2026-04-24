
import { getTorreData, getCapacidadData } from './src/features/torre-control/services/torre-actions'
import { getParetoDefectos } from './src/features/calidad/services/calidad-actions'

async function test() {
  try {
    console.log('Testing getCapacidadData...')
    const cap = await getCapacidadData()
    console.log('Capacidad results count:', cap.length)

    console.log('Testing getParetoDefectos...')
    const pareto = await getParetoDefectos()
    console.log('Pareto results count:', pareto.length)

    console.log('SUCCESS')
  } catch (err) {
    console.error('CRASH DETECTED:', err)
  }
}

test()
