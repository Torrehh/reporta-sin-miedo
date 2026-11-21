import { useEffect } from 'react'
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { DemoBar } from './components/DemoBar'
import { ReportWorkerPage } from './pages/ReportWorkerPage'
import { TrackingPage } from './pages/TrackingPage'
import { StaffPage } from './pages/StaffPage'
import { QRPage } from './pages/QRPage'
import { startQueueListeners } from './services/queue'

function NotFoundPage() {
  return (
    <main className="card">
      <h1>Página no encontrada</h1>
      <Link className="button button-secondary" to="/staff">
        Ir al acceso del personal
      </Link>
    </main>
  )
}

function App() {
  useEffect(() => startQueueListeners(), [])

  return (
    <HashRouter>
      <DemoBar />
      <Routes>
        <Route path="/" element={<Navigate to="/staff" replace />} />
        <Route path="/f/:faenaId" element={<ReportWorkerPage />} />
        <Route path="/seguimiento" element={<TrackingPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/staff/qr" element={<QRPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
