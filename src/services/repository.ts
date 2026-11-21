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
import { normalizarCodigoSeguimiento } from '../utils/tracking'

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
  obtenerFaena(faenaId: string): Promise<Faena | undefined>
  guardarFaena(faena: Faena): Promise<void>
  listarReportes(): Promise<Reporte[]>
  getReporteByCodigo(codigo: string): Promise<Reporte | undefined>
  obtenerReportePorCodigo(codigo: string): Promise<Reporte | undefined>
  guardarReporte(reporte: Reporte): Promise<void>
  obtenerIdentidad(reporteId: string): Promise<Identidad | undefined>
  guardarIdentidad(identidad: Identidad): Promise<void>
  registrarAuditoria(auditoria: AuditoriaIdentidad): Promise<void>
  listarAuditorias(): Promise<AuditoriaIdentidad[]>
  saveRepresalia(represalia: Represalia): Promise<void>
  listRepresalias(): Promise<Represalia[]>
  guardarRepresalia(represalia: Represalia): Promise<void>
  listarRepresalias(): Promise<Represalia[]>
  guardarAvisoSupervisor(aviso: AvisoSupervisor): Promise<void>
  listarAvisosSupervisor(): Promise<AvisoSupervisor[]>
  agregarPendiente(item: ColaPendiente, identidad?: Identidad): Promise<void>
  listarPendientes(): Promise<ColaPendiente[]>
  eliminarPendiente(id: string): Promise<void>
  registrarReporteEnviado(
    reporte: Reporte,
    faena: Faena,
    identidad?: Identidad,
  ): Promise<Reporte>
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

  async obtenerFaena(faenaId: string) {
    return (await this.dbPromise).get('faenas', faenaId)
  }

  async guardarFaena(faena: Faena) {
    await (await this.dbPromise).put('faenas', faena)
  }

  async listarReportes() {
    return (await this.dbPromise).getAll('reportes')
  }

  async getReporteByCodigo(codigo: string) {
    // TODO: En producción, consultar el reporte mediante una Azure Function.
    const codigoNormalizado = normalizarCodigoSeguimiento(codigo)
    if (!codigoNormalizado) return undefined
    const reportes = await this.listarReportes()
    return reportes.find(
      (reporte) =>
        normalizarCodigoSeguimiento(reporte.codigoSeguimiento) === codigoNormalizado,
    )
  }

  async obtenerReportePorCodigo(codigo: string) {
    return this.getReporteByCodigo(codigo)
  }

  async guardarReporte(reporte: Reporte) {
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
    return this.saveRepresalia(represalia)
  }

  async saveRepresalia(represalia: Represalia) {
    // TODO: En producción, registrar el aviso mediante una Azure Function.
    await (await this.dbPromise).put('represalias', represalia)
  }

  async listarRepresalias() {
    return this.listRepresalias()
  }

  async listRepresalias() {
    return (await this.dbPromise).getAll('represalias')
  }

  async guardarAvisoSupervisor(aviso: AvisoSupervisor) {
    await (await this.dbPromise).put('avisosSupervisores', aviso)
  }

  async listarAvisosSupervisor() {
    return (await this.dbPromise).getAll('avisosSupervisores')
  }

  async agregarPendiente(item: ColaPendiente, identidad?: Identidad) {
    const db = await this.dbPromise
    const tx = db.transaction(['colaPendiente', 'identidades'], 'readwrite')
    const writes = [tx.objectStore('colaPendiente').put(item)]
    if (identidad) writes.push(tx.objectStore('identidades').put(identidad))
    await Promise.all([...writes, tx.done])
  }

  async listarPendientes() {
    return (await this.dbPromise).getAll('colaPendiente')
  }

  async eliminarPendiente(id: string) {
    await (await this.dbPromise).delete('colaPendiente', id)
  }

  async registrarReporteEnviado(
    reporte: Reporte,
    faena: Faena,
    identidad?: Identidad,
  ) {
    // TODO: En producción, Azure Functions enviaría el reporte y el aviso a SharePoint por Microsoft Graph.
    const db = await this.dbPromise
    const tx = db.transaction(
      ['reportes', 'avisosSupervisores', 'identidades'],
      'readwrite',
    )
    const reportes = await tx.objectStore('reportes').getAll()
    const existente = reportes.find((item) => item.id === reporte.id)
    if (existente) {
      if (identidad) await tx.objectStore('identidades').put(identidad)
      await tx.done
      return existente
    }

    const ahora = Date.now()
    const reportesDeLaHora = reportes.filter(
      (item) => {
        const recibido = new Date(item.fechaRecepcion ?? item.creadoEn).getTime()
        return (
          !item.esDemo &&
          item.faenaId === reporte.faenaId &&
          ahora - recibido < 60 * 60 * 1000 &&
          ahora >= recibido
        )
      },
    ).length
    const reporteGuardado = {
      ...reporte,
      fechaRecepcion: new Date(ahora).toISOString(),
      marcadoRevision: reporte.marcadoRevision || reportesDeLaHora >= 20,
    }
    const aviso: AvisoSupervisor = {
      id: `aviso-${reporte.id}`,
      reporteId: reporte.id,
      faenaNombre: faena.nombre,
      resumen: reporte.queHabriaPasado,
      fechaSoloDia: new Date(reporte.creadoEn).toLocaleDateString('sv-SE'),
    }
    const writes: Promise<unknown>[] = [
      tx.objectStore('reportes').put(reporteGuardado),
      tx.objectStore('avisosSupervisores').put(aviso),
    ]
    if (identidad) writes.push(tx.objectStore('identidades').put(identidad))
    await Promise.all([...writes, tx.done])
    return reporteGuardado
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
