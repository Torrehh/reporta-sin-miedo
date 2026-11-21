import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Faena, Reporte, Severidad } from '../types'
import { repository } from '../services/repository'

const BASELINE = 140
const TARGET = 600
const LAST_30_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const SEVERIDADES: Severidad[] = ['Baja', 'Media', 'Alta', 'Crítica']
const ESTADOS: Reporte['estado'][] = [
  'Recibido',
  'En revisión',
  'Medida definida',
  'Cerrado',
  'Descartado',
]

interface CountDatum {
  nombre: string
  cantidad: number
}

interface SeverityDatum {
  nombre: Severidad
  sugerida: number
  confirmada: number
}

export interface RiskDashboardData {
  reportes30Dias: number
  porFaena: CountDatum[]
  porEmpresa: CountDatum[]
  porGravedad: SeverityDatum[]
  porEstado: Array<{ nombre: Reporte['estado']; cantidad: number }>
}

function compareAlphabetically(left: string, right: string) {
  return left.localeCompare(right, 'es', { sensitivity: 'base' })
}

function calculateRiskDashboardData(
  reportes: Reporte[],
  faenas: Faena[],
  now = Date.now(),
): RiskDashboardData {
  const faenaById = new Map(faenas.map((faena) => [faena.id, faena]))
  const last30Days = reportes.filter((reporte) => {
    const date = new Date(reporte.fechaRecepcion ?? reporte.creadoEn).getTime()
    return date >= now - LAST_30_DAYS_MS && date <= now
  })
  const faenaCounts = new Map<string, number>()
  const companyCounts = new Map<string, number>()
  const severityCounts = new Map<Severidad, { sugerida: number; confirmada: number }>(
    SEVERIDADES.map((severity) => [severity, { sugerida: 0, confirmada: 0 }]),
  )
  const statusCounts = new Map<Reporte['estado'], number>(
    ESTADOS.map((status) => [status, 0]),
  )

  for (const reporte of last30Days) {
    const faena = faenaById.get(reporte.faenaId)
    const siteName = faena?.nombre ?? 'Faena no disponible'
    const companyName = faena?.empresaContratista ?? 'Empresa no disponible'
    faenaCounts.set(siteName, (faenaCounts.get(siteName) ?? 0) + 1)
    companyCounts.set(companyName, (companyCounts.get(companyName) ?? 0) + 1)
    const suggestedCount = severityCounts.get(reporte.gravedadSugerida)
    if (suggestedCount) suggestedCount.sugerida += 1
    if (reporte.gravedadFinal) {
      const finalCount = severityCounts.get(reporte.gravedadFinal)
      if (finalCount) finalCount.confirmada += 1
    }
    statusCounts.set(reporte.estado, (statusCounts.get(reporte.estado) ?? 0) + 1)
  }

  const toSortedCounts = (counts: Map<string, number>) =>
    Array.from(counts, ([nombre, cantidad]) => ({ nombre, cantidad })).sort(
      (left, right) => compareAlphabetically(left.nombre, right.nombre),
    )

  return {
    reportes30Dias: last30Days.length,
    porFaena: toSortedCounts(faenaCounts),
    porEmpresa: toSortedCounts(companyCounts),
    porGravedad: SEVERIDADES.map((nombre) => ({
      nombre,
      ...severityCounts.get(nombre)!,
    })),
    porEstado: ESTADOS.map((nombre) => ({
      nombre,
      cantidad: statusCounts.get(nombre) ?? 0,
    })),
  }
}

function AccessibleCountTable({ label, data }: { label: string; data: CountDatum[] }) {
  return (
    <details className="chart-data">
      <summary>Ver datos de {label}</summary>
      <div className="chart-table-scroll">
        <table>
          <caption>{label}</caption>
          <thead><tr><th scope="col">Nombre</th><th scope="col">Reportes</th></tr></thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.nombre}><th scope="row">{item.nombre}</th><td>{item.cantidad}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function CountChart({ title, data }: { title: string; data: CountDatum[] }) {
  const height = Math.max(220, data.length * 42)
  return (
    <section className="dashboard-chart" aria-label={title}>
      <h2>{title}</h2>
      <div className="dashboard-chart-canvas" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="nombre" width={112} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="cantidad" name="Reportes" fill="#1e5d91" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <AccessibleCountTable label={title} data={data} />
    </section>
  )
}

function SeverityChart({ data }: { data: SeverityDatum[] }) {
  return (
    <section className="dashboard-chart" aria-label="Gravedad sugerida y confirmada">
      <h2>Gravedad sugerida vs. confirmada</h2>
      <div className="dashboard-chart-canvas dashboard-severity-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="sugerida" name="Sugerida" fill="#1e5d91" />
            <Bar dataKey="confirmada" name="Confirmada" fill="#7294b5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>Ver datos de gravedad</summary>
        <div className="chart-table-scroll">
          <table>
            <caption>Gravedad sugerida y confirmada</caption>
            <thead>
              <tr>
                <th scope="col">Gravedad</th>
                <th scope="col">Sugerida</th>
                <th scope="col">Confirmada</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.nombre}>
                  <th scope="row">{item.nombre}</th>
                  <td>{item.sugerida}</td>
                  <td>{item.confirmada}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

export function RiskDashboardPage() {
  const [data, setData] = useState<RiskDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [reportes, faenas] = await Promise.all([
          repository.listarReportes(),
          repository.listarFaenas(),
        ])
        if (active) setData(calculateRiskDashboardData(reportes, faenas))
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'No se pudo cargar el tablero.')
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

  // TODO: En producción: Power BI conectado al Data Lake (ETL diario desde SharePoint).
  return (
    <main className="card staff-card risk-dashboard">
      <header className="worker-heading">
        <p className="eyebrow">Prevención · Datos agregados</p>
        <h1>Tablero de riesgos</h1>
      </header>
      <div className="risk-principle" role="note">
        Este tablero sirve para priorizar acciones de prevención. No se usa para evaluar ni
        clasificar a personas ni a empresas. Más reportes significa mejor cultura de seguridad.
      </div>
      {loading && <p role="status">Cargando datos del tablero…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {!loading && !error && data?.reportes30Dias === 0 && (
        <p className="empty-state">Aún no hay reportes. Usa Cargar datos demo para ver un ejemplo</p>
      )}
      {!loading && !error && data && data.reportes30Dias > 0 && (
        <>
          <section className="dashboard-summary" aria-label="Resumen mensual">
            <article className="dashboard-metric">
              <span>Reportes últimos 30 días</span>
              <strong>{data.reportes30Dias}</strong>
            </article>
            <article className="dashboard-metric">
              <span>Línea base</span>
              <strong>{BASELINE}<small> reportes al mes</small></strong>
            </article>
            <article className="dashboard-metric">
              <span>Meta</span>
              <strong>{TARGET}<small> reportes al mes</small></strong>
            </article>
            <article className="dashboard-metric dashboard-progress">
              <span>Avance respecto de la meta</span>
              <strong>{Math.round((data.reportes30Dias / TARGET) * 100)}%</strong>
              <progress
                max={TARGET}
                value={Math.min(data.reportes30Dias, TARGET)}
                aria-label="Avance de reportes respecto de la meta"
              />
              <span>{data.reportes30Dias} de {TARGET} reportes</span>
            </article>
          </section>
          <p className="dashboard-demo-note">
            Los datos demo son de ejemplo y no representan hechos reales.
          </p>
          <div className="dashboard-chart-grid">
            <CountChart title="Reportes por faena" data={data.porFaena} />
            <CountChart title="Reportes por empresa contratista" data={data.porEmpresa} />
            <SeverityChart data={data.porGravedad} />
            <section className="dashboard-chart dashboard-status">
              <h2>Reportes por estado</h2>
              <ul>
                {data.porEstado.map((item) => (
                  <li key={item.nombre}><span>{item.nombre}</span><strong>{item.cantidad}</strong></li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </main>
  )
}
