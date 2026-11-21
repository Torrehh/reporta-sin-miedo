import { Link, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  endStaffSession,
  getStaffSession,
  MANAGER_ROLES,
  type StaffRole,
} from '../services/staffSession'

interface StaffGuardProps {
  allowedRoles: readonly StaffRole[]
  children: ReactNode
}

export function StaffGuard({ allowedRoles, children }: StaffGuardProps) {
  const session = getStaffSession()
  if (!session || !allowedRoles.includes(session.role)) {
    return (
      <main className="card">
        <h1>No tienes acceso a esta sección</h1>
      </main>
    )
  }
  return children
}

export function StaffLayout({ children }: { children: ReactNode }) {
  const session = getStaffSession()
  const navigate = useNavigate()
  if (!session) {
    return (
      <main className="card">
        <h1>No tienes acceso a esta sección</h1>
      </main>
    )
  }

  const links =
    session.role === 'supervisor-faena'
      ? [{ to: '/staff/avisos', label: 'Avisos' }]
      : [
          { to: '/staff/reportes', label: 'Reportes' },
          { to: '/staff/qr', label: 'Códigos QR' },
          ...(MANAGER_ROLES.includes(session.role)
            ? [
                { to: '/staff/auditoria', label: 'Auditoría' },
                { to: '/staff/represalias', label: 'Represalias' },
                { to: '/staff/tablero', label: 'Tablero' },
              ]
            : []),
        ]

  return (
    <>
      <header className="staff-header">
        <div>
          <strong>{session.usuario}</strong>
          <nav aria-label="Secciones del personal" className="staff-nav">
            {links.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          className="button-secondary"
          type="button"
          onClick={() => {
            endStaffSession()
            navigate('/staff', { replace: true })
          }}
        >
          Cerrar sesión
        </button>
      </header>
      {children}
    </>
  )
}

export function StaffSection({ allowedRoles, children }: StaffGuardProps) {
  return (
    <StaffGuard allowedRoles={allowedRoles}>
      <StaffLayout>{children}</StaffLayout>
    </StaffGuard>
  )
}
