import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  getStaffSession,
  STAFF_USERS,
  startStaffSession,
  staffHomePath,
  type StaffRole,
} from '../services/staffSession'

export function StaffPage() {
  const navigate = useNavigate()
  const session = getStaffSession()
  const [selectedRole, setSelectedRole] = useState<StaffRole>(STAFF_USERS[0].role)
  const [error, setError] = useState<string | null>(null)

  if (session) return <Navigate to={staffHomePath(session.role)} replace />

  function signIn() {
    setError(null)
    try {
      startStaffSession(selectedRole)
      navigate(staffHomePath(selectedRole), { replace: true })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo iniciar la sesión de demostración.',
      )
    }
  }

  // Simulación local; reemplazar por Microsoft Entra ID con MFA y cuentas nominativas.
  return (
    <main className="card staff-login">
      <p className="eyebrow">Acceso del personal · Demostración</p>
      <h1>Iniciar sesión</h1>
      <div className="banner">
        Simulación local: en producción se usaría Microsoft Entra ID, doble factor
        y cuentas nominativas.
      </div>
      <div className="field">
        <label htmlFor="staff-role">Usuario de demostración</label>
        <select
          id="staff-role"
          value={selectedRole}
          onChange={(event) => {
            const user = STAFF_USERS.find((item) => item.role === event.target.value)
            if (user) setSelectedRole(user.role)
          }}
        >
          {STAFF_USERS.map((user) => (
            <option key={user.role} value={user.role}>
              {user.nombre}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <button className="submit-button" type="button" onClick={signIn}>
        Ingresar
      </button>
    </main>
  )
}
