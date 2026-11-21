export const STAFF_USERS = [
  {
    id: 'prevencionista-designado',
    role: 'prevencionista-designado',
    nombre: 'Prevencionista designado',
  },
  {
    id: 'prevencionista-sin-identidades',
    role: 'prevencionista-sin-identidades',
    nombre: 'Prevencionista (sin acceso a identidades)',
  },
  {
    id: 'supervisor-faena',
    role: 'supervisor-faena',
    nombre: 'Supervisor de faena',
  },
  { id: 'gerente-a13', role: 'gerente-a13', nombre: 'Gerente A13' },
] as const

export type StaffRole = (typeof STAFF_USERS)[number]['role']

export interface StaffSession {
  role: StaffRole
  usuario: string
}

const SESSION_KEY = 'reporta-sin-miedo:sesion-personal'

export function isStaffRole(value: unknown): value is StaffRole {
  return STAFF_USERS.some((user) => user.role === value)
}

export function getStaffSession(): StaffSession | null {
  const saved = sessionStorage.getItem(SESSION_KEY)
  if (!saved) return null

  let session: unknown
  try {
    session = JSON.parse(saved)
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }

  if (
    typeof session !== 'object' ||
    session === null ||
    !('role' in session) ||
    !isStaffRole(session.role)
  ) {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }

  const user = STAFF_USERS.find((item) => item.role === session.role)
  return user ? { role: user.role, usuario: user.nombre } : null
}

export function startStaffSession(role: StaffRole) {
  const user = STAFF_USERS.find((item) => item.role === role)
  if (!user) throw new Error('El usuario de demostración no es válido.')
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ role: user.role, usuario: user.nombre }),
  )
}

export function endStaffSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function staffHomePath(role: StaffRole) {
  return role === 'supervisor-faena' ? '/staff/avisos' : '/staff/reportes'
}

export const PREVENTION_ROLES: StaffRole[] = [
  'prevencionista-designado',
  'prevencionista-sin-identidades',
  'gerente-a13',
]

export const MANAGER_ROLES: StaffRole[] = ['gerente-a13']
