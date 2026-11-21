import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { EstadoReporte, Faena, Reporte, Severidad } from '../types'
import { createId } from '../utils/identifiers'
import { repository } from '../services/repository'
import { getStaffSession } from '../services/staffSession'

const ESTADOS: EstadoReporte[] = [
  'Recibido',
  'En revisión',
  'Medida definida',
  'Cerrado',
  'Descartado',
]
const SEVERIDADES: Severidad[] = ['Baja', 'Media', 'Alta', 'Crítica']

function fechaReporte(reporte: Reporte) {
  return (reporte.fechaRecepcion ?? reporte.creadoEn).slice(0, 10)
}

export function StaffReportsPage() {
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [faenas, setFaenas] = useState<Faena[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [faenaFilter, setFaenaFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [severitySource, setSeveritySource] = useState<'cualquiera' | 'sugerida' | 'final'>('cualquiera')
  const [dateFilter, setDateFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [loadedReports, loadedFaenas] = await Promise.all([
          repository.listarReportes(),
          repository.listarFaenas(),
        ])
        if (active) {
          setReportes(loadedReports)
          setFaenas(loadedFaenas)
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los reportes.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const visibleReports = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return reportes.filter((reporte) => {
      const matchesSeverity =
        !severityFilter ||
        (severitySource !== 'final' && reporte.gravedadSugerida === severityFilter) ||
        (severitySource !== 'sugerida' && reporte.gravedadFinal === severityFilter)
      const searchableText = [
        reporte.que,
        reporte.queHabriaPasado,
        reporte.investigacion ?? '',
        reporte.medidaCorrectiva ?? '',
        reporte.codigoSeguimiento,
      ]
        .join(' ')
        .toLocaleLowerCase()
      return (
        (!faenaFilter || reporte.faenaId === faenaFilter) &&
        (!estadoFilter || reporte.estado === estadoFilter) &&
        matchesSeverity &&
        (!dateFilter || fechaReporte(reporte) === dateFilter) &&
        (!query || searchableText.includes(query))
      )
    })
  }, [reportes, faenaFilter, estadoFilter, severityFilter, severitySource, dateFilter, search])

  return (
    <main className="card staff-card">
      <header className="worker-heading">
        <p className="eyebrow">Prevención</p>
        <h1>Bandeja de reportes</h1>
      </header>
      <section className="staff-filters" aria-label="Filtros de reportes">
        <div className="field">
          <label htmlFor="filter-faena">Faena</label>
          <select id="filter-faena" value={faenaFilter} onChange={(event) => setFaenaFilter(event.target.value)}>
            <option value="">Todas las faenas</option>
            {faenas.map((faena) => (
              <option key={faena.id} value={faena.id}>{faena.nombre}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-status">Estado</label>
          <select id="filter-status" value={estadoFilter} onChange={(event) => setEstadoFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-severity-source">Gravedad basada en</label>
          <select
            id="filter-severity-source"
            value={severitySource}
            onChange={(event) =>
              setSeveritySource(event.target.value as typeof severitySource)
            }
          >
            <option value="cualquiera">Sugerida o final</option>
            <option value="sugerida">Sugerida</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-severity">Gravedad</label>
          <select id="filter-severity" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
            <option value="">Todas las gravedades</option>
            {SEVERIDADES.map((severidad) => <option key={severidad}>{severidad}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-date">Fecha de recepción</label>
          <input id="filter-date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="filter-search">Buscar en reportes</label>
          <input
            id="filter-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Texto del reporte o código"
          />
        </div>
      </section>

      {loading && <p role="status">Cargando reportes…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {!loading && !error && visibleReports.length === 0 && (
        <p className="empty-state">No hay reportes que coincidan con los filtros.</p>
      )}
      {!loading && !error && visibleReports.length > 0 && (
        <ul className="staff-card-list">
          {visibleReports.map((reporte) => (
            <li
              className={`staff-item${reporte.marcadoRevision ? ' staff-item-review' : ''}`}
              key={reporte.id}
            >
              <Link to={`/staff/reportes/${reporte.id}`}>
                <strong>{reporte.queHabriaPasado}</strong>
                <span>{faenas.find((faena) => faena.id === reporte.faenaId)?.nombre ?? 'Faena no disponible'}</span>
                <span>{reporte.estado} · {fechaReporte(reporte)}</span>
                <span>Gravedad: {reporte.gravedadFinal ?? reporte.gravedadSugerida}</span>
                {reporte.marcadoRevision && <span className="review-badge">Requiere revisión</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

interface ReportDraft {
  gravedadFinal: Severidad
  investigacion: string
  medidaCorrectiva: string
  estado: EstadoReporte
}

export function StaffReportDetailPage() {
  const { reporteId } = useParams()
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [faena, setFaena] = useState<Faena | null>(null)
  const [draft, setDraft] = useState<ReportDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showIdentityDialog, setShowIdentityDialog] = useState(false)
  const [identityReason, setIdentityReason] = useState('')
  const [identityName, setIdentityName] = useState<string | null>(null)
  const [identityRead, setIdentityRead] = useState(false)
  const [identityError, setIdentityError] = useState<string | null>(null)
  const [identityLoading, setIdentityLoading] = useState(false)
  const session = getStaffSession()
  const mayReadIdentity =
    session?.role === 'prevencionista-designado' || session?.role === 'gerente-a13'

  useEffect(() => {
    let active = true
    async function load() {
      if (!reporteId) {
        setError('No se indicó el reporte.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const [foundReport, allFaenas] = await Promise.all([
          repository.listarReportes().then((items) => items.find((item) => item.id === reporteId)),
          repository.listarFaenas(),
        ])
        if (!foundReport) throw new Error('No se encontró el reporte solicitado.')
        if (active) {
          setReporte(foundReport)
          setFaena(allFaenas.find((item) => item.id === foundReport.faenaId) ?? null)
          setDraft({
            gravedadFinal: foundReport.gravedadFinal ?? foundReport.gravedadSugerida,
            investigacion: foundReport.investigacion ?? '',
            medidaCorrectiva: foundReport.medidaCorrectiva ?? '',
            estado: foundReport.estado,
          })
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'No se pudo cargar el reporte.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [reporteId])

  async function saveReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reporte || !draft) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const updated: Reporte = {
        ...reporte,
        gravedadFinal: draft.gravedadFinal,
        investigacion: draft.investigacion.trim() || undefined,
        medidaCorrectiva: draft.medidaCorrectiva.trim() || undefined,
        estado: draft.estado,
      }
      await repository.actualizarReporte(updated)
      setReporte(updated)
      setMessage('Cambios guardados.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudieron guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reporte || !session) return
    const motivo = identityReason.trim()
    if (Array.from(motivo).length < 10) {
      setIdentityError('Escribe un motivo de al menos 10 caracteres.')
      return
    }

    setIdentityLoading(true)
    setIdentityError(null)
    try {
      await repository.registrarAuditoria({
        id: createId(),
        reporteId: reporte.id,
        usuario: session.usuario,
        motivo,
        fecha: new Date().toISOString(),
      })
      const identidad = await repository.obtenerIdentidad(reporte.id)
      setIdentityName(
        identidad?.consentimiento && identidad.nombre.trim()
          ? identidad.nombre
          : null,
      )
      setIdentityRead(true)
      setShowIdentityDialog(false)
      setIdentityReason('')
    } catch (caught) {
      setIdentityError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo registrar la consulta de identidad.',
      )
    } finally {
      setIdentityLoading(false)
    }
  }

  if (loading) return <main className="card"><p role="status">Cargando reporte…</p></main>
  if (error && !reporte) return <main className="card"><p className="error-message" role="alert">{error}</p></main>
  if (!reporte || !draft) return <main className="card"><p className="empty-state">No se encontró el reporte solicitado.</p></main>

  return (
    <main className="card staff-card">
      <Link to="/staff/reportes" className="staff-back-link">← Volver a reportes</Link>
      <header className="worker-heading">
        <p className="eyebrow">Ficha de reporte</p>
        <h1>{reporte.queHabriaPasado}</h1>
        {reporte.marcadoRevision && <p className="review-badge">Requiere revisión prioritaria</p>}
      </header>
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="confirmation" role="status">{message}</p>}
      <dl className="report-facts">
        <div><dt>Qué pasó</dt><dd>{reporte.que}</dd></div>
        <div><dt>Cuándo</dt><dd>{reporte.cuando}</dd></div>
        <div><dt>Qué pudo haber pasado</dt><dd>{reporte.queHabriaPasado}</dd></div>
        <div><dt>Faena</dt><dd>{faena?.nombre ?? 'Faena no disponible'}</dd></div>
        <div><dt>Gravedad sugerida</dt><dd>{reporte.gravedadSugerida}</dd></div>
        <div><dt>Explicación de la sugerencia</dt><dd>{reporte.explicacionIA}</dd></div>
        {reporte.fotoDataUrl && (
          <div className="report-photo">
            <dt>Foto</dt>
            <dd><img src={reporte.fotoDataUrl} alt="Foto adjunta al reporte" /></dd>
          </div>
        )}
      </dl>

      <form className="report-form staff-edit-form" onSubmit={(event) => void saveReport(event)}>
        <div className="banner">La gravedad final la decide el prevencionista.</div>
        <div className="field">
          <label htmlFor="final-severity">Gravedad final</label>
          <select
            id="final-severity"
            value={draft.gravedadFinal}
            onChange={(event) => setDraft({ ...draft, gravedadFinal: event.target.value as Severidad })}
          >
            {SEVERIDADES.map((severity) => <option key={severity}>{severity}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="investigation">Investigación de la causa</label>
          <textarea
            id="investigation"
            value={draft.investigacion}
            onChange={(event) => setDraft({ ...draft, investigacion: event.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="corrective-action">Medida correctiva</label>
          <textarea
            id="corrective-action"
            value={draft.medidaCorrectiva}
            onChange={(event) => setDraft({ ...draft, medidaCorrectiva: event.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="report-status">Estado</label>
          <select
            id="report-status"
            value={draft.estado}
            onChange={(event) => setDraft({ ...draft, estado: event.target.value as EstadoReporte })}
          >
            {ESTADOS.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        {draft.estado === 'Descartado' && (
          <p className="field-hint">Descartar el reporte no implica sanción para nadie.</p>
        )}
        <button className="submit-button" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>

      {mayReadIdentity && (
        <section className="identity-section">
          {!identityRead && (
            <button
              type="button"
              className="button-secondary identity-button"
              onClick={() => {
                setIdentityError(null)
                setShowIdentityDialog(true)
              }}
            >
              Ver identidad
            </button>
          )}
          {identityError && !showIdentityDialog && (
            <p className="error-message" role="alert">{identityError}</p>
          )}
          {identityRead && (
            <div className="identity-reveal" role="status">
              <strong>Identidad:</strong> {identityName ?? 'Este reporte es anónimo'}
            </div>
          )}
        </section>
      )}

      {showIdentityDialog && (
        <section className="modal-backdrop">
          <form
            className="identity-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="identity-dialog-title"
            onSubmit={(event) => void confirmIdentity(event)}
          >
            <h2 id="identity-dialog-title">Confirmar consulta de identidad</h2>
            <p>La consulta quedará registrada en la auditoría.</p>
            <div className="field">
              <label htmlFor="identity-reason">Motivo (mínimo 10 caracteres)</label>
              <textarea
                id="identity-reason"
                aria-required="true"
                value={identityReason}
                onChange={(event) => setIdentityReason(event.target.value)}
              />
            </div>
            {identityError && <p className="error-message" role="alert">{identityError}</p>}
            <div className="dialog-actions">
              <button
                type="button"
                className="button-secondary"
                disabled={identityLoading}
                onClick={() => setShowIdentityDialog(false)}
              >
                Cancelar
              </button>
              <button className="button-primary" type="submit" disabled={identityLoading}>
                {identityLoading ? 'Registrando…' : 'Confirmar y consultar'}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}
