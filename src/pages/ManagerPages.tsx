import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AuditoriaIdentidad, Reporte, Represalia } from '../types'
import { repository } from '../services/repository'

export function IdentityAuditPage() {
  const [auditorias, setAuditorias] = useState<AuditoriaIdentidad[]>([])
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [auditItems, reports] = await Promise.all([
          repository.listarAuditorias(),
          repository.listarReportes(),
        ])
        if (active) {
          setAuditorias(auditItems.sort((left, right) => right.fecha.localeCompare(left.fecha)))
          setReportes(reports)
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'No se pudo cargar la auditoría.')
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
        <p className="eyebrow">Gerencia A13</p>
        <h1>Auditoría de identidades</h1>
      </header>
      {loading && <p role="status">Cargando auditoría…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {!loading && !error && auditorias.length === 0 && (
        <p className="empty-state">No hay consultas de identidad registradas.</p>
      )}
      {!loading && !error && auditorias.length > 0 && (
        <ul className="staff-card-list">
          {auditorias.map((audit) => {
            const reporte = reportes.find((item) => item.id === audit.reporteId)
            return (
              <li className="staff-item" key={audit.id}>
                <article>
                  <strong>{audit.usuario}</strong>
                  <span>{new Date(audit.fecha).toLocaleString()}</span>
                  <p>Motivo: {audit.motivo}</p>
                  <span>
                    Reporte:{' '}
                    {reporte ? (
                      <Link to={`/staff/reportes/${reporte.id}`}>{reporte.codigoSeguimiento}</Link>
                    ) : audit.reporteId}
                  </span>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

interface RepresaliaConReporte extends Represalia {
  reporteId?: string
}

export function ManagerRetaliationsPage() {
  const [represalias, setRepresalias] = useState<RepresaliaConReporte[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [items, reports] = await Promise.all([
          repository.listRepresalias(),
          repository.listarReportes(),
        ])
        if (active) {
          const linked = items.map((item) => ({
            ...item,
            reporteId: reports.find(
              (report) => report.codigoSeguimiento === item.codigoSeguimiento,
            )?.id,
          }))
          setRepresalias(linked.sort((left, right) => right.fecha.localeCompare(left.fecha)))
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'No se pudieron cargar las represalias.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  async function updateState(item: RepresaliaConReporte, estado: Represalia['estado']) {
    const updated = { ...item, estado }
    setSavingId(item.id)
    setError(null)
    setMessage(null)
    try {
      await repository.actualizarRepresalia({
        id: item.id,
        codigoSeguimiento: item.codigoSeguimiento,
        fecha: item.fecha,
        estado,
      })
      setRepresalias((current) => current.map((entry) => entry.id === item.id ? updated : entry))
      setMessage('Estado de represalia actualizado.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo actualizar la represalia.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <main className="card staff-card">
      <header className="worker-heading">
        <p className="eyebrow">Gerencia A13</p>
        <h1>Represalias informadas</h1>
      </header>
      {message && <p className="confirmation" role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {loading && <p role="status">Cargando represalias…</p>}
      {!loading && !error && represalias.length === 0 && (
        <p className="empty-state">No hay represalias informadas.</p>
      )}
      {!loading && represalias.length > 0 && (
        <ul className="staff-card-list">
          {represalias.map((item) => (
            <li className="staff-item" key={item.id}>
              <article>
                <strong>{item.codigoSeguimiento}</strong>
                <span>Fecha: {new Date(item.fecha).toLocaleString()}</span>
                <div className="field">
                  <label htmlFor={`retaliation-status-${item.id}`}>Estado</label>
                  <select
                    id={`retaliation-status-${item.id}`}
                    value={item.estado}
                    disabled={savingId === item.id}
                    onChange={(event) =>
                      void updateState(item, event.target.value as Represalia['estado'])
                    }
                  >
                    <option>Nueva</option>
                    <option>En revisión</option>
                    <option>Resuelta</option>
                  </select>
                </div>
                {item.reporteId && (
                  <Link className="button button-secondary" to={`/staff/reportes/${item.reporteId}`}>
                    Ver reporte asociado
                  </Link>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export function ManagerDashboardPage() {
  return (
    <main className="card staff-card">
      <p className="eyebrow">Gerencia A13</p>
      <h1>Tablero</h1>
      <p>Próximamente</p>
    </main>
  )
}
