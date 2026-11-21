import { useParams, Link } from 'react-router-dom'

export function ReportWorkerPage() {
  const { faenaId } = useParams()

  return (
    <main className="card">
      <div className="banner" role="alert">
        Si hay peligro inmediato, detén la faena y avisa por radio o en persona.
      </div>
      <h1>Reportar casi-accidente</h1>
      <p>Faena identificada: <strong>{faenaId}</strong></p>
      <p>La pantalla completa del reporte se construirá en la siguiente fase.</p>
      <Link className="button button-secondary" to="/seguimiento">
        Seguir un reporte
      </Link>
    </main>
  )
}
