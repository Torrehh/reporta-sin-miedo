import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaStatus() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.error('No se pudo registrar la aplicación para uso sin conexión.', error)
    },
  })

  if (needRefresh) {
    return (
      <aside className="pwa-notice" role="status">
        <span>Nueva versión disponible, actualiza</span>
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          Actualizar
        </button>
      </aside>
    )
  }

  if (offlineReady) {
    return (
      <aside className="pwa-notice" role="status">
        <span>Lista para usar sin conexión</span>
        <button type="button" onClick={() => setOfflineReady(false)} aria-label="Cerrar aviso">
          Cerrar
        </button>
      </aside>
    )
  }

  return null
}
