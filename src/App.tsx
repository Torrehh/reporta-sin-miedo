import { useEffect } from 'react'
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { DemoBar } from './components/DemoBar'
import { ReportWorkerPage } from './pages/ReportWorkerPage'
import { TrackingPage } from './pages/TrackingPage'
import { StaffPage } from './pages/StaffPage'
import { QRPage } from './pages/QRPage'
import { startQueueListeners } from './services/queue'
import { StaffSection } from './components/StaffAccess'
import { ManagerDashboardPage, IdentityAuditPage, ManagerRetaliationsPage } from './pages/ManagerPages'
import { StaffReportDetailPage, StaffReportsPage } from './pages/StaffReportsPage'
import { SupervisorNoticesPage } from './pages/SupervisorNoticesPage'
import { MANAGER_ROLES, PREVENTION_ROLES, type StaffRole } from './services/staffSession'

const SUPERVISOR_ROLES: StaffRole[] = ['supervisor-faena']

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

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/staff" replace />} />
      <Route path="/f/:faenaId" element={<ReportWorkerPage />} />
      <Route path="/seguimiento" element={<TrackingPage />} />
      <Route path="/staff" element={<StaffPage />} />
      <Route
        path="/staff/reportes"
        element={<StaffSection allowedRoles={PREVENTION_ROLES}><StaffReportsPage /></StaffSection>}
      />
      <Route
        path="/staff/reportes/:reporteId"
        element={<StaffSection allowedRoles={PREVENTION_ROLES}><StaffReportDetailPage /></StaffSection>}
      />
      <Route
        path="/staff/qr"
        element={<StaffSection allowedRoles={PREVENTION_ROLES}><QRPage /></StaffSection>}
      />
      <Route
        path="/staff/avisos"
        element={<StaffSection allowedRoles={SUPERVISOR_ROLES}><SupervisorNoticesPage /></StaffSection>}
      />
      <Route
        path="/staff/auditoria"
        element={<StaffSection allowedRoles={MANAGER_ROLES}><IdentityAuditPage /></StaffSection>}
      />
      <Route
        path="/staff/represalias"
        element={<StaffSection allowedRoles={MANAGER_ROLES}><ManagerRetaliationsPage /></StaffSection>}
      />
      <Route
        path="/staff/tablero"
        element={<StaffSection allowedRoles={MANAGER_ROLES}><ManagerDashboardPage /></StaffSection>}
      />
      <Route path="/staff/*" element={<StaffSection allowedRoles={[]}><></></StaffSection>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function App() {
  useEffect(() => startQueueListeners(), [])

  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}

function AppContent() {
  const location = useLocation()
  return (
    <>
      {!location.pathname.startsWith('/staff') && <DemoBar />}
      <AppRoutes />
    </>
  )
}

export default App
