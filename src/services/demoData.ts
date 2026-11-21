import type { Faena, Reporte } from '../types'
import { repository } from './repository'

const nombresFaenas = [
  'A13 - Raleo',
  'A13 - Cosecha',
  'A13 - Vialidad',
  'A13 - Plantación',
  'A13 - Patio',
  'A13 - Silvicultura',
]

const empresas = [
  'Andalién',
  'Bosques del Sur',
  'Camino Seguro',
  'Forestal Norte',
  'Pino y Tierra',
  'Servicios Verdes',
  'Talca Forestal',
  'Troncos Chile',
]

export async function cargarDatosDemo() {
  const faenas: Faena[] = nombresFaenas.map((nombre, index) => ({
    id: `faena-${index + 1}`,
    nombre,
    empresaContratista: empresas[index % empresas.length],
    activa: true,
  }))

  await Promise.all(faenas.map((faena) => repository.guardarFaena(faena)))

  const ahora = Date.now()
  const queOpciones: Reporte['queHabriaPasado'][] = [
    'Golpe o caída',
    'Atrapamiento',
    'Incendio',
    'Vehículo o camión',
    'Electricidad',
    'Otro',
  ]
  const severidades: Reporte['gravedadSugerida'][] = ['Baja', 'Media', 'Alta', 'Crítica']

  for (let index = 0; index < 40; index += 1) {
    const faena = faenas[index % faenas.length]
    const gravedad = severidades[index % severidades.length]
    const reporte: Reporte = {
      id: `demo-reporte-${index + 1}`,
      codigoSeguimiento: `DEMO-${String(index + 1).padStart(4, '0')}`,
      faenaId: faena.id,
      que: `Situación demostrativa ${index + 1}`,
      cuando: 'Hoy',
      queHabriaPasado: queOpciones[index % queOpciones.length],
      gravedadSugerida: gravedad,
      gravedadFinal: index % 3 === 0 ? gravedad : undefined,
      explicacionIA: 'Ejemplo generado para una demostración.',
      estado: index % 5 === 0 ? 'Medida definida' : 'Recibido',
      creadoEn: new Date(ahora - index * 86400000).toISOString(),
      marcadoRevision: index >= 36,
      esDemo: true,
    }
    await repository.guardarReporte(reporte)
  }
}
