import type { Faena, Identidad, Reporte } from '../types'
import { createId, createTrackingCode } from '../utils/identifiers'
import { adviseSeverity } from './severityAdvisor'
import { repository } from './repository'

const RATE_LIMIT_KEY = 'reporta-sin-miedo:envios-recientes'
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000

export interface QueueState {
  pendingCount: number
  simulatedOffline: boolean
  error: string | null
  sentReports: Array<{ id: string; codigoSeguimiento: string }>
}

export interface ReportSubmission {
  faena: Faena
  que: string
  cuando: Reporte['cuando']
  queHabriaPasado: Reporte['queHabriaPasado']
  fotoDataUrl?: string
  identidad?: Identidad
}

export type SubmissionResult =
  | { status: 'sent'; codigoSeguimiento: string }
  | { status: 'pending'; reporteId: string }

export class SubmissionLimitError extends Error {
  constructor() {
    super('Has alcanzado el límite de 5 reportes por hora en este dispositivo. Inténtalo más tarde.')
    this.name = 'SubmissionLimitError'
  }
}

let state: QueueState = {
  pendingCount: 0,
  simulatedOffline: false,
  error: null,
  sentReports: [],
}
const listeners = new Set<(value: QueueState) => void>()
let eventsStarted = false

function publish() {
  for (const listener of listeners) listener({ ...state })
}

async function updatePendingCount() {
  state = { ...state, pendingCount: (await repository.listarPendientes()).length }
  publish()
}

export async function refreshPendingCount() {
  await updatePendingCount()
}

export function getQueueState() {
  return { ...state }
}

export function subscribeQueue(listener: (value: QueueState) => void) {
  listeners.add(listener)
  void updatePendingCount().catch((error: unknown) => {
    state = {
      ...state,
      error: error instanceof Error ? error.message : 'No se pudo consultar la cola de reportes.',
    }
    publish()
  })
  return () => {
    listeners.delete(listener)
  }
}

export async function setSimulatedOffline(enabled: boolean) {
  state = { ...state, simulatedOffline: enabled, error: null }
  publish()
  if (!enabled) await flushQueue()
}

function maySendNow() {
  return !state.simulatedOffline && navigator.onLine
}

function reserveSubmission() {
  const now = Date.now()
  const recent = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) ?? '[]') as number[]
  const active = recent.filter((timestamp) => now - timestamp < RATE_WINDOW_MS && timestamp <= now)
  if (active.length >= RATE_LIMIT) throw new SubmissionLimitError()
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify([...active, now]))
}

function makeReport(submission: ReportSubmission): Reporte {
  const advice = adviseSeverity(`${submission.que} ${submission.queHabriaPasado}`)
  return {
    id: createId(),
    codigoSeguimiento: createTrackingCode(),
    faenaId: submission.faena.id,
    que: submission.que.trim(),
    cuando: submission.cuando,
    queHabriaPasado: submission.queHabriaPasado,
    ...(submission.fotoDataUrl ? { fotoDataUrl: submission.fotoDataUrl } : {}),
    gravedadSugerida: advice.gravedad,
    explicacionIA: advice.explicacion,
    estado: 'Recibido',
    creadoEn: new Date().toISOString(),
    marcadoRevision: false,
    esDemo: false,
  }
}

export async function submitReport(
  submission: ReportSubmission,
): Promise<SubmissionResult> {
  reserveSubmission()
  const reporte = makeReport(submission)
  const identidad = submission.identidad
    ? { ...submission.identidad, reporteId: reporte.id }
    : undefined

  if (!maySendNow()) {
    await repository.agregarPendiente(
      {
        id: reporte.id,
        reporteBorrador: reporte,
        creadoEn: new Date().toISOString(),
        estado: 'Pendiente de envío',
      },
      identidad,
    )
    await updatePendingCount()
    return { status: 'pending', reporteId: reporte.id }
  }

  await repository.registrarReporteEnviado(reporte, submission.faena, identidad)
  return { status: 'sent', codigoSeguimiento: reporte.codigoSeguimiento }
}

export async function flushQueue() {
  if (!maySendNow()) return
  state = { ...state, error: null }
  publish()

  try {
    const pendientes = await repository.listarPendientes()
    const faenas = await repository.listarFaenas()
    for (const pendiente of pendientes) {
      const reporte = pendiente.reporteBorrador
      const faena = faenas.find((item) => item.id === reporte.faenaId)
      if (!faena) {
        throw new Error('No se encontró la faena de un reporte pendiente. El reporte sigue guardado en este dispositivo.')
      }
      await repository.registrarReporteEnviado(reporte, faena)
      await repository.eliminarPendiente(pendiente.id)
      state = {
        ...state,
        sentReports: [
          ...state.sentReports.filter((item) => item.id !== reporte.id),
          { id: reporte.id, codigoSeguimiento: reporte.codigoSeguimiento },
        ],
      }
      publish()
    }
    await updatePendingCount()
  } catch (error) {
    state = {
      ...state,
      error: error instanceof Error ? error.message : 'No se pudieron enviar los reportes pendientes.',
    }
    await updatePendingCount()
    throw error
  }
}

async function flushFromEvent() {
  try {
    await flushQueue()
  } catch {
    // The error is exposed through queue state and announced by DemoBar.
  }
}

export function startQueueListeners() {
  if (eventsStarted) return
  eventsStarted = true
  window.addEventListener('online', flushFromEvent)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushFromEvent()
  })
  void flushFromEvent()
}
