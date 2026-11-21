export type Severidad = 'Baja' | 'Media' | 'Alta' | 'Crítica'

export type EstadoReporte =
  | 'Recibido'
  | 'En revisión'
  | 'Medida definida'
  | 'Cerrado'
  | 'Descartado'

export interface Faena {
  id: string
  nombre: string
  empresaContratista: string
  activa: boolean
}

export interface Reporte {
  id: string
  codigoSeguimiento: string
  faenaId: string
  que: string
  cuando: 'Ahora mismo' | 'Hoy' | 'Ayer' | 'Esta semana'
  queHabriaPasado:
    | 'Golpe o caída'
    | 'Atrapamiento'
    | 'Incendio'
    | 'Vehículo o camión'
    | 'Electricidad'
    | 'Otro'
  fotoDataUrl?: string
  gravedadSugerida: Severidad
  gravedadFinal?: Severidad
  explicacionIA: string
  estado: EstadoReporte
  investigacion?: string
  medidaCorrectiva?: string
  creadoEn: string
  marcadoRevision: boolean
  esDemo: boolean
}

export interface Identidad {
  reporteId: string
  nombre: string
  consentimiento: boolean
}

export interface AuditoriaIdentidad {
  id: string
  reporteId: string
  usuario: string
  motivo: string
  fecha: string
}

export interface Represalia {
  id: string
  codigoSeguimiento: string
  fecha: string
  estado: 'Recibida'
}

export interface AvisoSupervisor {
  id: string
  reporteId: string
  faenaNombre: string
  resumen: string
  fechaSoloDia: string
}

export interface ColaPendiente {
  id: string
  reporteBorrador: Reporte
  creadoEn: string
}
