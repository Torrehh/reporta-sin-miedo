const TRACKING_ATTEMPTS_KEY = 'reporta-sin-miedo:consultas-seguimiento'
const MAX_FAILED_ATTEMPTS = 5
export const TRACKING_LOCK_MS = 10 * 60 * 1000

interface TrackingAttemptState {
  failedAttempts: number
  blockedUntil: number
}

function readTrackingAttemptState(now = Date.now()): TrackingAttemptState {
  const saved = localStorage.getItem(TRACKING_ATTEMPTS_KEY)
  if (!saved) return { failedAttempts: 0, blockedUntil: 0 }

  let state: unknown
  try {
    state = JSON.parse(saved)
  } catch {
    throw new Error('No se pudo leer el límite de consultas de este dispositivo.')
  }

  if (
    typeof state !== 'object' ||
    state === null ||
    !('failedAttempts' in state) ||
    !('blockedUntil' in state) ||
    typeof state.failedAttempts !== 'number' ||
    typeof state.blockedUntil !== 'number'
  ) {
    throw new Error('El límite de consultas guardado no es válido.')
  }

  if (state.blockedUntil > 0 && state.blockedUntil <= now) {
    const freshState = { failedAttempts: 0, blockedUntil: 0 }
    localStorage.setItem(TRACKING_ATTEMPTS_KEY, JSON.stringify(freshState))
    return freshState
  }

  return { failedAttempts: state.failedAttempts, blockedUntil: state.blockedUntil }
}

export function getTrackingAttemptState(now = Date.now()) {
  return readTrackingAttemptState(now)
}

export function registerFailedTrackingAttempt(now = Date.now()) {
  const { failedAttempts } = readTrackingAttemptState(now)
  const nextAttempts = failedAttempts + 1
  const state = {
    failedAttempts: nextAttempts,
    blockedUntil: nextAttempts >= MAX_FAILED_ATTEMPTS ? now + TRACKING_LOCK_MS : 0,
  }
  localStorage.setItem(TRACKING_ATTEMPTS_KEY, JSON.stringify(state))
  return state
}

export function resetTrackingAttempts() {
  localStorage.setItem(
    TRACKING_ATTEMPTS_KEY,
    JSON.stringify({ failedAttempts: 0, blockedUntil: 0 }),
  )
}

export function normalizarCodigoSeguimiento(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, '')
  if (/^DEMO\d{4}$/.test(compact)) {
    return `DEMO-${compact.slice(4)}`
  }
  if (!/^[A-Z0-9]{12}$/.test(compact)) return null
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`
}
