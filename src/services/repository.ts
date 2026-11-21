import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  AuditoriaIdentidad,
  AvisoSupervisor,
  ColaPendiente,
  Faena,
  Identidad,
  Reporte,
  Represalia,
} from '../types'

interface ReportaDB extends DBSchema {
  faenas: { key: string; value: Faena }
  reportes: { key: string; value: Reporte }
  identidades: { key: string; value: Identidad }
  auditoriasIdentidad: { key: string; value: AuditoriaIdentidad }
  represalias: { key: string; value: Represalia }
  avisosSupervisores: { key: string; value: AvisoSupervisor }
  colaPendiente: { key: string; value: ColaPendiente }
}

export interface ReportRepository {
  listarFaenas(): Promise<Faena[]>
  guardarFaena(faena: Faena): Promise<void>
  listarReportes(): Promise<Reporte[]>
  obtenerReportePorCodigo(codigo: string): Promise<Reporte | undefined>
  guardarReporte(reporte: Reporte): Promise<void>
  obtenerIdentidad(reporteId: string): Promise<Identidad | undefined>
  guardarIdentidad(identidad: Identidad): Promise<void>
  registrarAuditoria(auditoria: AuditoriaIdentidad): Promise<void>
  listarAuditorias(): Promise<AuditoriaIdentidad[]>
  guardarRepresalia(represalia: Represalia): Promise<void>
  listarRepresalias(): Promise<Represalia[]>
  guardarAvisoSupervisor(aviso: AvisoSupervisor): Promise<void>
  listarAvisosSupervisor(): Promise<AvisoSupervisor[]>
  agregarPendiente(item: ColaPendiente): Promise<void>
  listarPendientes(): Promise<ColaPendiente[]>
  eliminarPendiente(id: string): Promise<void>
  reiniciarDemo(): Promise<void>
}

export class LocalRepository implements ReportRepository {
  private dbPromise: Promise<IDBPDatabase<ReportaDB>>

  constructor() {
    this.dbPromise = openDB<ReportaDB>('reporta-sin-miedo', 1, {
      upgrade(db) {
        db.createObjectStore('faenas', { keyPath: 'id' })
        db.createObjectStore('reportes', { keyPath: 'id' })
        db.createObjectStore('identidades', { keyPath: 'reporteId' })
        db.createObjectStore('auditoriasIdentidad', { keyPath: 'id' })
        db.createObjectStore('represalias', { keyPath: 'id' })
        db.createObjectStore('avisosSupervisores', { keyPath: 'id' })
        db.createObjectStore('colaPendiente', { keyPath: 'id' })
      },
    })
  }

  async listarFaenas() {
    return (await this.dbPromise).getAll('faenas')
  }

  async guardarFaena(faena: Faena) {
    await (await this.dbPromise).put('faenas', faena)
  }

  async listarReportes() {
    return (await this.dbPromise).getAll('reportes')
  }

  async obtenerReportePorCodigo(codigo: string) {
    const reportes = await this.listarReportes()
    return reportes.find((reporte) => reporte.codigoSeguimiento === codigo)
  }

  async guardarReporte(reporte: Reporte) {
    // TODO: En producción, Azure Functions enviaría este dato a SharePoint por Microsoft Graph.
    await (await this.dbPromise).put('reportes', reporte)
  }

  async obtenerIdentidad(reporteId: string) {
    return (await this.dbPromise).get('identidades', reporteId)
  }

  async guardarIdentidad(identidad: Identidad) {
    // TODO: En producción, este almacén separado tendría permisos restringidos.
    await (await this.dbPromise).put('identidades', identidad)
  }

  async registrarAuditoria(auditoria: AuditoriaIdentidad) {
    await (await this.dbPromise).put('auditoriasIdentidad', auditoria)
  }

  async listarAuditorias() {
    return (await this.dbPromise).getAll('auditoriasIdentidad')
  }

  async guardarRepresalia(represalia: Represalia) {
    await (await this.dbPromise).put('represalias', represalia)
  }

  async listarRepresalias() {
    return (await this.dbPromise).getAll('represalias')
  }

  async guardarAvisoSupervisor(aviso: AvisoSupervisor) {
    await (await this.dbPromise).put('avisosSupervisores', aviso)
  }

  async listarAvisosSupervisor() {
    return (await this.dbPromise).getAll('avisosSupervisores')
  }

  async agregarPendiente(item: ColaPendiente) {
    await (await this.dbPromise).put('colaPendiente', item)
  }

  async listarPendientes() {
    return (await this.dbPromise).getAll('colaPendiente')
  }

  async eliminarPendiente(id: string) {
    await (await this.dbPromise).delete('colaPendiente', id)
  }

  async reiniciarDemo() {
    const db = await this.dbPromise
    const tx = db.transaction(
      ['faenas', 'reportes', 'identidades', 'auditoriasIdentidad', 'represalias', 'avisosSupervisores', 'colaPendiente'],
      'readwrite',
    )
    await Promise.all([
      tx.objectStore('faenas').clear(),
      tx.objectStore('reportes').clear(),
      tx.objectStore('identidades').clear(),
      tx.objectStore('auditoriasIdentidad').clear(),
      tx.objectStore('represalias').clear(),
      tx.objectStore('avisosSupervisores').clear(),
      tx.objectStore('colaPendiente').clear(),
      tx.done,
    ])
  }
}

export const repository = new LocalRepository()
