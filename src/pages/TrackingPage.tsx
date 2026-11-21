import { useEffect, useState, type FormEvent } from 'react'
import type { EstadoReporte, Represalia } from '../types'
import { createId } from '../utils/identifiers'
import {
  getTrackingAttemptState,
  normalizarCodigoSeguimiento,
  registerFailedTrackingAttempt,
  resetTrackingAttempts,
} from '../utils/tracking'
import { repository } from '../services/repository'

const MENSAJE_NO_ENCONTRADO =
  'No encontramos ese código. Revisa que esté bien escrito.'

interface ResultadoConsulta {
  estado: EstadoReporte
  medidaCorrectiva?: string
}

function remainingSeconds(blockedUntil: number, now = Date.now()) {
  return Math.max(0, Math.ceil((blockedUntil - now) / 1000))
}

function getInitialLockState() {
  const now = Date.now()
  try {
    return { blockedUntil: getTrackingAttemptState(now).blockedUntil, error: null, now }
  } catch (caught) {
    return {
      blockedUntil: 0,
      now,
      error:
        caught instanceof Error
          ? caught.message
          : 'No se pudo cargar el límite de consultas.',
    }
  }
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

export function TrackingPage() {
  const [codigo, setCodigo] = useState('')
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null)
  const [consultaValida, setConsultaValida] = useState(false)
  const [pendiente, setPendiente] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lockState, setLockState] = useState(getInitialLockState)
  const [showRetaliationForm, setShowRetaliationForm] = useState(false)
  const [retaliationSaved, setRetaliationSaved] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = Date.now()
      try {
        const state = getTrackingAttemptState(currentTime)
        setLockState({ blockedUntil: state.blockedUntil, error: null, now: currentTime })
      } catch (caught) {
        setLockState((current) => ({
          ...current,
          now: currentTime,
          error:
            caught instanceof Error
              ? caught.message
              : 'No se pudo actualizar el límite de consultas.',
        }))
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  async function consultar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setResultado(null)
    setPendiente(false)
    setConsultaValida(false)
    setShowRetaliationForm(false)
    setRetaliationSaved(false)

    try {
      const attemptState = getTrackingAttemptState()
      if (attemptState.blockedUntil > Date.now()) {
        setLockState({
          blockedUntil: attemptState.blockedUntil,
          error: null,
          now: Date.now(),
        })
        return
      }

      const normalizedCode = normalizarCodigoSeguimiento(codigo)
      if (normalizedCode) setCodigo(normalizedCode)

      setLoading(true)
      const reporte = normalizedCode
        ? await repository.getReporteByCodigo(normalizedCode)
        : undefined
      const pendingItems = reporte || !normalizedCode
        ? []
        : await repository.listarPendientes()
      const pendingMatch = normalizedCode
        ? pendingItems.find(
            (item) =>
              normalizarCodigoSeguimiento(item.reporteBorrador.codigoSeguimiento) ===
              normalizedCode,
          )
        : undefined

      if (reporte || pendingMatch) {
        resetTrackingAttempts()
        setLockState({ blockedUntil: 0, error: null, now: Date.now() })
        setConsultaValida(true)
        if (pendingMatch) {
          setPendiente(true)
        } else if (reporte) {
          setResultado({
            estado: reporte.estado,
            ...(reporte.medidaCorrectiva
              ? { medidaCorrectiva: reporte.medidaCorrectiva }
              : {}),
          })
        }
        return
      }

      const nextState = registerFailedTrackingAttempt()
      setError(MENSAJE_NO_ENCONTRADO)
      setLockState({
        blockedUntil: nextState.blockedUntil,
        error: null,
        now: Date.now(),
      })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo consultar el código. Inténtalo nuevamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function informarRepresalia() {
    setLoading(true)
    setError(null)
    try {
      const represalia: Represalia = {
        id: createId(),
        codigoSeguimiento: normalizarCodigoSeguimiento(codigo) ?? codigo,
        fecha: new Date().toISOString(),
        estado: 'Nueva',
      }
      await repository.saveRepresalia(represalia)
      setRetaliationSaved(true)
      setShowRetaliationForm(false)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo guardar el aviso. Inténtalo nuevamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  const secondsLeft = remainingSeconds(lockState.blockedUntil, lockState.now)
  const isLocked = lockState.blockedUntil > lockState.now

  return (
    <main className="card tracking-card">
      <header className="worker-heading">
        <p className="eyebrow">Seguimiento confidencial</p>
        <h1>Seguimiento</h1>
        <p>Ingresa el código que recibiste al reportar.</p>
      </header>

      <form className="report-form" onSubmit={(event) => void consultar(event)}>
        <div className="field">
          <label htmlFor="tracking-code">Código de seguimiento</label>
          <input
            id="tracking-code"
            type="text"
            autoComplete="off"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value)}
            placeholder="XXXX-XXXX-XXXX"
            aria-describedby="tracking-code-hint"
          />
          <p id="tracking-code-hint" className="field-hint">
            Puedes escribirlo con minúsculas, espacios o guiones.
          </p>
        </div>
        <button className="submit-button" type="submit" disabled={loading || isLocked}>
          {loading ? 'Consultando…' : 'Consultar estado'}
        </button>
      </form>

      {lockState.error && (
        <p className="error-message" role="alert">
          {lockState.error}
        </p>
      )}
      {isLocked && (
        <p className="error-message tracking-lock" role="alert">
          Has alcanzado 5 intentos fallidos. Vuelve a intentarlo en {formatCountdown(secondsLeft)}.
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {pendiente && (
        <section className="pending-message" aria-live="polite">
          <p>Aún no se ha enviado. Se enviará cuando haya conexión.</p>
        </section>
      )}
      {resultado && (
        <section className="tracking-result" aria-live="polite">
          <h2>Estado del reporte</h2>
          <p>{resultado.estado}</p>
          {resultado.medidaCorrectiva && (
            <p>
              <strong>Medida correctiva:</strong> {resultado.medidaCorrectiva}
            </p>
          )}
        </section>
      )}
      {consultaValida && !retaliationSaved && (
        <section className="retaliation-section">
          {!showRetaliationForm ? (
            <button
              className="button-secondary retaliation-button"
              type="button"
              onClick={() => setShowRetaliationForm(true)}
            >
              Informar una represalia
            </button>
          ) : (
            <div className="retaliation-confirmation">
              <p>
                El aviso llega al gerente de A13. No pedimos tu nombre y te responderemos
                por el mismo código.
              </p>
              <button
                className="submit-button"
                type="button"
                disabled={loading}
                onClick={() => void informarRepresalia()}
              >
                {loading ? 'Guardando…' : 'Confirmar aviso de represalia'}
              </button>
            </div>
          )}
        </section>
      )}
      {retaliationSaved && (
        <p className="confirmation" role="status">
          El aviso de represalia fue registrado. Te responderemos por el mismo código.
        </p>
      )}
    </main>
  )
}
