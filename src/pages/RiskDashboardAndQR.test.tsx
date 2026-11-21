import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../App'
import { repository } from '../services/repository'
import { startStaffSession } from '../services/staffSession'
import type { Faena, Reporte } from '../types'
import { buildFaenaReportUrl, safeFaenaQrFilename } from '../utils/qr'

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr-demo'),
  },
}))

const now = Date.now()
const faenaZeta: Faena = {
  id: 'faena-zeta',
  nombre: 'Zeta',
  empresaContratista: 'Zeta Contratistas',
  activa: true,
}
const faenaAlfa: Faena = {
  id: 'faena-alfa',
  nombre: 'Alfa',
  empresaContratista: 'Alfa Contratistas',
  activa: true,
}

function makeReport(
  id: string,
  faenaId: string,
  overrides: Partial<Reporte> = {},
): Reporte {
  return {
    id,
    codigoSeguimiento: `${id.slice(0, 4).toUpperCase()}-EFGH-JKLM`,
    faenaId,
    que: 'Un objeto cayó cerca del camino',
    cuando: 'Hoy',
    queHabriaPasado: 'Golpe o caída',
    fotoDataUrl: 'data:image/png;base64,FOTO_PRIVADA',
    gravedadSugerida: 'Alta',
    explicacionIA: 'Sugerencia demostrativa.',
    estado: 'Recibido',
    creadoEn: new Date(now - 2 * 86400000).toISOString(),
    marcadoRevision: false,
    esDemo: false,
    ...overrides,
  }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('tablero de riesgos y administración QR', () => {
  beforeEach(async () => {
    sessionStorage.clear()
    await repository.reiniciarDemo()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('ordena alfabéticamente gráficos y tablas, y no incluye identidades ni fotos', async () => {
    const user = userEvent.setup()
    await repository.guardarFaena(faenaZeta)
    await repository.guardarFaena(faenaAlfa)
    const reportes = [
      makeReport('reporte-zeta', faenaZeta.id, {
        gravedadSugerida: 'Crítica',
        gravedadFinal: 'Alta',
        estado: 'Cerrado',
      }),
      makeReport('reporte-alfa', faenaAlfa.id, {
        gravedadSugerida: 'Baja',
        gravedadFinal: 'Baja',
        estado: 'En revisión',
      }),
    ]
    await Promise.all(reportes.map((reporte) => repository.guardarReporte(reporte)))
    await repository.guardarIdentidad({
      reporteId: reportes[0].id,
      nombre: 'NOMBRE PRIVADO DEL TABLERO',
      consentimiento: true,
    })
    startStaffSession('prevencionista-sin-identidades')
    renderAt('/staff/tablero')

    expect(await screen.findByRole('heading', { name: 'Tablero de riesgos' })).toBeTruthy()
    expect(screen.getByText(/Más reportes significa mejor cultura de seguridad/)).toBeTruthy()
    const reportMetric = await screen.findByText('Reportes últimos 30 días')
    expect(reportMetric.parentElement?.querySelector('strong')?.textContent).toBe('2')
    await user.click(screen.getByText('Ver datos de Reportes por faena'))
    const siteTable = screen.getByRole('table', { name: 'Reportes por faena' })
    expect(within(siteTable).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
      'Alfa',
      'Zeta',
    ])
    await user.click(screen.getByText('Ver datos de Reportes por empresa contratista'))
    const companyTable = screen.getByRole('table', {
      name: 'Reportes por empresa contratista',
    })
    expect(within(companyTable).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
      'Alfa Contratistas',
      'Zeta Contratistas',
    ])
    await user.click(screen.getByText('Ver datos de gravedad'))
    const severityTable = screen.getByRole('table', { name: 'Gravedad sugerida y confirmada' })
    expect(within(severityTable).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
      'Baja',
      'Media',
      'Alta',
      'Crítica',
    ])
    expect(screen.queryByText('NOMBRE PRIVADO DEL TABLERO')).toBeNull()
    expect(screen.queryByAltText('Foto adjunta al reporte')).toBeNull()
    expect(screen.queryByText('FOTO_PRIVADA')).toBeNull()
  })

  it('muestra el estado vacío y protege tablero y QR según el rol', async () => {
    startStaffSession('gerente-a13')
    renderAt('/staff/tablero')
    expect(await screen.findByText('Aún no hay reportes. Usa Cargar datos demo para ver un ejemplo')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Tablero' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Códigos QR' })).toBeTruthy()

    cleanup()
    startStaffSession('gerente-a13')
    renderAt('/staff/qr')
    expect(await screen.findByRole('heading', { name: 'Códigos QR por faena' })).toBeTruthy()
    expect(
      screen.getByText(
        'Genera e imprime los QR desde la dirección publicada (github.io), no desde el entorno de desarrollo.',
      ),
    ).toBeTruthy()

    cleanup()
    startStaffSession('prevencionista-designado')
    renderAt('/staff/qr')
    expect(await screen.findByRole('heading', { name: 'Códigos QR por faena' })).toBeTruthy()

    cleanup()
    startStaffSession('prevencionista-sin-identidades')
    renderAt('/staff/qr')
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeTruthy()

    cleanup()
    startStaffSession('supervisor-faena')
    renderAt('/staff/tablero')
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeTruthy()
  })

  it('crea, edita y desactiva faenas sin afectar las demás y bloquea reportes inactivos', async () => {
    const user = userEvent.setup()
    await repository.guardarFaena(faenaZeta)
    startStaffSession('prevencionista-designado')
    renderAt('/staff/qr')

    await user.type(await screen.findByLabelText('Nombre de la faena'), 'Santa Juana')
    await user.type(screen.getByLabelText('Empresa contratista'), 'Forestal Sur')
    await user.click(screen.getByRole('button', { name: 'Crear faena' }))
    expect(await screen.findByText('Faena creada.')).toBeTruthy()
    const createdFaena = (await repository.listarFaenas()).find(
      (faena) => faena.nombre === 'Santa Juana',
    )
    expect(createdFaena).toBeTruthy()
    expect(createdFaena?.id).not.toBe(faenaZeta.id)

    const card = screen.getByText('Santa Juana').closest('li')
    expect(card).toBeTruthy()
    await user.click(within(card as HTMLElement).getByRole('button', { name: 'Editar' }))
    const nameInput = screen.getByLabelText('Nombre de la faena')
    await user.clear(nameInput)
    await user.type(nameInput, 'Santa Juana Norte')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Faena actualizada.')).toBeTruthy()
    expect((await repository.obtenerFaena(createdFaena!.id))?.nombre).toBe('Santa Juana Norte')

    const updatedCard = screen.getByText('Santa Juana Norte').closest('li')
    expect(updatedCard).toBeTruthy()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(within(updatedCard as HTMLElement).getByRole('button', { name: 'Desactivar' }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(await screen.findByText('Estado: Desactivada')).toBeTruthy()
    expect((await repository.obtenerFaena(createdFaena!.id))?.activa).toBe(false)
    expect((await repository.obtenerFaena(faenaZeta.id))?.activa).toBe(true)

    cleanup()
    renderAt(`/f/${createdFaena!.id}`)
    expect(await screen.findByText('Este código QR no está activo')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Enviar reporte' })).toBeNull()
  })

  it('construye el enlace completo de HashRouter para publicar bajo un subpath', () => {
    expect(
      buildFaenaReportUrl('faena-123', 'https://ejemplo.cl', '/reporta-sin-miedo/'),
    ).toBe('https://ejemplo.cl/reporta-sin-miedo/#/f/faena-123')
    expect(safeFaenaQrFilename('Santa Juana / Norte')).toBe('qr-santa-juana-norte.png')
  })
})
