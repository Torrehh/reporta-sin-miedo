import { useEffect, useState } from 'react'
import type { AvisoSupervisor } from '../types'
import { repository } from '../services/repository'

export function SupervisorNoticesPage() {
  const [avisos, setAvisos] = useState<AvisoSupervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await repository.listarAvisosSupervisor()
        if (active) {
          setAvisos(items.sort((left, right) => right.fechaSoloDia.localeCompare(left.fechaSoloDia)))
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los avisos.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="card staff-card">
      <header className="worker-heading">
        <p className="eyebrow">Supervisor de faena</p>
        <h1>Avisos de reportes</h1>
      </header>
      <p className="field-hint">Simulación de avisos de Teams y correo.</p>
      <p className="field-hint">Este aviso no incluye quién reportó.</p>
      {loading && <p role="status">Cargando avisos…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {!loading && !error && avisos.length === 0 && (
        <p className="empty-state">No hay avisos disponibles.</p>
      )}
      {!loading && !error && avisos.length > 0 && (
        <ul className="staff-card-list">
          {avisos.map((aviso) => (
            <li className="staff-item" key={aviso.id}>
              <article>
                <strong>Qué pasó</strong>
                <p>{aviso.resumen}</p>
                <span>Faena: {aviso.faenaNombre}</span>
                <span>Fecha: {aviso.fechaSoloDia}</span>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
