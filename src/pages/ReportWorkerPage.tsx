import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Faena, Reporte } from '../types'
import { repository } from '../services/repository'
import {
  getQueueState,
  flushQueue,
  submitReport,
  subscribeQueue,
  SubmissionLimitError,
  type QueueState,
} from '../services/queue'
import { processPhoto } from '../utils/processPhoto'

const MOMENTOS: Reporte['cuando'][] = ['Ahora mismo', 'Hoy', 'Ayer', 'Esta semana']
const RIESGOS: Reporte['queHabriaPasado'][] = [
  'Golpe o caída',
  'Atrapamiento',
  'Incendio',
  'Vehículo o camión',
  'Electricidad',
  'Otro',
]

export function ReportWorkerPage() {
  const { faenaId } = useParams()
  const [faena, setFaena] = useState<Faena | null>(null)
  const [loadedFaenaId, setLoadedFaenaId] = useState<string | null>(null)
  const [faenaError, setFaenaError] = useState<string | null>(null)
  const [lesion, setLesion] = useState(false)
  const [que, setQue] = useState('')
  const [cuando, setCuando] = useState<Reporte['cuando'] | null>(null)
  const [riesgo, setRiesgo] = useState<Reporte['queHabriaPasado'] | null>(null)
  const [fotoDataUrl, setFotoDataUrl] = useState<string | undefined>()
  const [fotoCargando, setFotoCargando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [consentimiento, setConsentimiento] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codigoConfirmado, setCodigoConfirmado] = useState<string | null>(null)
  const [reportePendienteId, setReportePendienteId] = useState<string | null>(null)
  const [guardadoPendiente, setGuardadoPendiente] = useState(false)
  const [queueState, setQueueState] = useState<QueueState>(getQueueState)

  useEffect(() => {
    let active = true
    repository
      .listarFaenas()
      .then((faenas) => {
        if (!active) return
        const found = faenas.find((item) => item.id === faenaId && item.activa)
        setFaena(found ?? null)
        setFaenaError(null)
      })
      .catch(() => {
        if (active) {
          setFaena(null)
          setFaenaError('No se pudo cargar la información de la faena. Inténtalo nuevamente.')
        }
      })
      .finally(() => {
        if (active) setLoadedFaenaId(faenaId ?? '')
      })
    return () => {
      active = false
    }
  }, [faenaId])

  const loadingFaena = loadedFaenaId !== (faenaId ?? '')

  useEffect(
    () =>
      subscribeQueue((nextState) => {
        setQueueState(nextState)
      }),
    [],
  )

  const codigoVisible =
    codigoConfirmado ??
    queueState.sentReports.find((item) => item.id === reportePendienteId)?.codigoSeguimiento

  function clearForm() {
    setQue('')
    setCuando(null)
    setRiesgo(null)
    setFotoDataUrl(undefined)
    setNombre('')
    setConsentimiento(false)
  }

  function onLesionChange(checked: boolean) {
    setLesion(checked)
    setError(null)
    if (checked) {
      clearForm()
      setCodigoConfirmado(null)
      setReportePendienteId(null)
      setGuardadoPendiente(false)
    }
  }

  async function onPhotoChange(file: File | undefined) {
    setError(null)
    if (!file) return
    setFotoCargando(true)
    try {
      setFotoDataUrl(await processPhoto(file))
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'No se pudo preparar la fotografía.')
    } finally {
      setFotoCargando(false)
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!faena || !cuando || !riesgo || enviando) return
    if (!que.trim()) {
      setError('Cuéntanos brevemente qué pasó.')
      return
    }
    if (nombre.trim() && !consentimiento) {
      setError('Para incluir tu nombre, debes aceptar que se guarde por separado.')
      return
    }

    setEnviando(true)
    setError(null)
    try {
      const faenaActual = await repository.obtenerFaena(faena.id)
      if (!faenaActual?.activa) {
        setFaena(null)
        return
      }
      const resultado = await submitReport({
        faena: faenaActual,
        que,
        cuando,
        queHabriaPasado: riesgo,
        fotoDataUrl,
        ...(nombre.trim() && consentimiento
          ? {
              identidad: {
                reporteId: '',
                nombre: nombre.trim(),
                consentimiento: true,
              },
            }
          : {}),
      })
      if (resultado.status === 'sent') {
        setCodigoConfirmado(resultado.codigoSeguimiento)
      } else {
        setReportePendienteId(resultado.reporteId)
        setGuardadoPendiente(true)
        clearForm()
      }
    } catch (submitError) {
      setError(
        submitError instanceof SubmissionLimitError
          ? submitError.message
          : submitError instanceof Error
            ? submitError.message
            : 'No se pudo guardar el reporte. Inténtalo nuevamente.',
      )
    } finally {
      setEnviando(false)
    }
  }

  async function copyCode() {
    if (!codigoVisible) return
    try {
      await navigator.clipboard.writeText(codigoVisible)
      setError(null)
    } catch {
      setError('No se pudo copiar el código. Anótalo para consultarlo después.')
    }
  }

  return (
    <main className="card worker-card">
      <div className="banner" role="note">
        Si hay peligro inmediato, detén la faena y avisa por radio o en persona.
      </div>

      {loadingFaena ? (
        <p role="status">Cargando la faena…</p>
      ) : faenaError ? (
        <p className="error-message" role="alert">{faenaError}</p>
      ) : !faena ? (
        <>
          <h1>Este código QR no está activo</h1>
          <p>Esta faena no está disponible para recibir reportes.</p>
        </>
      ) : (
        <>
          <header className="worker-heading">
            <p className="eyebrow">Reporte confidencial · Sin cuenta</p>
            <h1>Reportar casi-accidente</h1>
            <p>Faena: <strong>{faena.nombre}</strong></p>
          </header>

          {lesion ? (
            <section className="injury-message" role="alert">
              <h2>Este formulario no es para accidentes con lesión</h2>
              <p>
                Detén la faena y avisa por radio o en persona. Los accidentes con lesión
                siguen el flujo formal
              </p>
            </section>
          ) : codigoVisible ? (
            <section className="confirmation" aria-live="polite">
              <h2>Reporte enviado</h2>
              <p>Guarda este código para consultar el estado de tu reporte:</p>
              <p className="tracking-code" aria-label={`Código ${codigoVisible}`}>
                {codigoVisible}
              </p>
              <button className="button button-primary" type="button" onClick={() => void copyCode()}>
                Copiar código
              </button>
              <p><Link to="/seguimiento">Ir a seguimiento</Link></p>
            </section>
          ) : guardadoPendiente ? (
            <section className="pending-message" aria-live="polite">
              <h2>Reporte guardado</h2>
              <p>Guardado en tu celular. Se enviará cuando haya conexión.</p>
              <p>El envío requiere que la app esté abierta; en iPhone no se envía en segundo plano.</p>
              <p>El código de seguimiento aparecerá cuando el envío se complete.</p>
              <button
                className="button button-primary"
                type="button"
                disabled={queueState.simulatedOffline || !navigator.onLine}
                onClick={() =>
                  void flushQueue().catch((flushError: unknown) =>
                    setError(
                      flushError instanceof Error
                        ? flushError.message
                        : 'No se pudieron enviar los reportes pendientes.',
                    ),
                  )
                }
              >
                Enviar ahora
              </button>
              {queueState.pendingCount > 0 && (
                <p role="status">Tienes {queueState.pendingCount} reportes pendientes.</p>
              )}
            </section>
          ) : (
            <form className="report-form" onSubmit={(event) => void onSubmit(event)}>
              <div className="field injury-field">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={lesion}
                    onChange={(event) => onLesionChange(event.target.checked)}
                  />
                  ¿Hubo una lesión?
                </label>
              </div>

              <div className="field">
                <label htmlFor="que-paso">¿Qué pasó?</label>
                <textarea
                  id="que-paso"
                  value={que}
                  onChange={(event) => setQue(event.target.value)}
                  maxLength={280}
                  rows={3}
                  required
                  placeholder="Cuéntanos brevemente lo ocurrido"
                />
                <p className="field-hint">No escribas nombres de personas.</p>
              </div>

              <fieldset className="field choice-field">
                <legend>¿Cuándo fue?</legend>
                <div className="choice-grid time-grid">
                  {MOMENTOS.map((momento) => (
                    <button
                      className={`choice-button${cuando === momento ? ' selected' : ''}`}
                      type="button"
                      aria-pressed={cuando === momento}
                      key={momento}
                      onClick={() => setCuando(momento)}
                    >
                      {momento}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="field choice-field">
                <legend>¿Qué pudo haber pasado?</legend>
                <div className="choice-grid">
                  {RIESGOS.map((opcion) => (
                    <button
                      className={`choice-button${riesgo === opcion ? ' selected' : ''}`}
                      type="button"
                      aria-pressed={riesgo === opcion}
                      key={opcion}
                      onClick={() => setRiesgo(opcion)}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="field">
                <label htmlFor="foto">Fotografía (opcional)</label>
                <p className="field-hint">Fotografía el lugar o el equipo, no a personas.</p>
                <input
                  id="foto"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => void onPhotoChange(event.target.files?.[0])}
                  disabled={fotoCargando}
                />
                {fotoCargando && <p role="status">Preparando fotografía…</p>}
                {fotoDataUrl && (
                  <div className="photo-preview">
                    <img src={fotoDataUrl} alt="Vista previa de la fotografía preparada" />
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => setFotoDataUrl(undefined)}
                    >
                      Quitar fotografía
                    </button>
                  </div>
                )}
              </div>

              <div className="field">
                <label htmlFor="nombre">Nombre (opcional)</label>
                <p className="field-hint">
                  Si lo pones, solo lo verá el equipo de prevención designado. Puedes
                  reportar sin nombre.
                </p>
                <input
                  id="nombre"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                />
                <label className="check-label consent-label">
                  <input
                    type="checkbox"
                    checked={consentimiento}
                    onChange={(event) => setConsentimiento(event.target.checked)}
                  />
                  Acepto que mi nombre se guarde por separado y lo vea el equipo designado.
                </label>
              </div>

              {error && <p className="error-message" role="alert">{error}</p>}

              <button
                className="button button-primary submit-button"
                type="submit"
                disabled={enviando || fotoCargando || !cuando || !riesgo}
              >
                {enviando ? 'Guardando reporte…' : 'Enviar reporte'}
              </button>
            </form>
          )}
          {error && (codigoConfirmado || guardadoPendiente) && (
            <p className="error-message" role="alert">{error}</p>
          )}
        </>
      )}
    </main>
  )
}
