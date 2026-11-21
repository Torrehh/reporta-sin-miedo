import { useEffect, useState } from 'react'
import {
  flushQueue,
  getQueueState,
  refreshPendingCount,
  setSimulatedOffline,
  subscribeQueue,
  type QueueState,
} from '../services/queue'
import { cargarDatosDemo } from '../services/demoData'
import { repository } from '../services/repository'

export function DemoBar() {
  const [queueState, setQueueState] = useState<QueueState>(getQueueState)
  const [busy, setBusy] = useState(false)

  useEffect(() => subscribeQueue(setQueueState), [])

  async function runAction(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      setQueueState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'No se pudo completar la acción.',
      }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="demo-bar" aria-label="Controles de demostración">
      <label>
        <input
          type="checkbox"
          checked={queueState.simulatedOffline}
          disabled={busy}
          onChange={(event) =>
            void runAction(() => setSimulatedOffline(event.target.checked))
          }
        />
        Simular sin señal
      </label>
      <button type="button" disabled={busy} onClick={() => void runAction(cargarDatosDemo)}>
        Cargar datos demo
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void runAction(async () => {
            await repository.reiniciarDemo()
            await refreshPendingCount()
          })
        }
      >
        Reiniciar demo
      </button>
      {queueState.pendingCount > 0 && (
        <span role="status">Tienes {queueState.pendingCount} reportes pendientes.</span>
      )}
      {queueState.pendingCount > 0 && (
        <button
          type="button"
          disabled={busy || queueState.simulatedOffline || !navigator.onLine}
          title={
            queueState.simulatedOffline || !navigator.onLine
              ? 'Disponible cuando haya conexión y no esté activada la simulación sin señal.'
              : undefined
          }
          onClick={() => void runAction(flushQueue)}
        >
          Enviar ahora
        </button>
      )}
      {queueState.error && (
        <span className="error-message" role="alert">
          {queueState.error}
        </span>
      )}
    </aside>
  )
}
