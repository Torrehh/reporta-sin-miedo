import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../App'
import { repository } from '../services/repository'
import { startStaffSession } from '../services/staffSession'
import type { Faena, Reporte } from '../types'

const faena: Faena = {
  id: 'faena-fase-cuatro',
  nombre: 'Faena de prueba',
  empresaContratista: 'Empresa de prueba',
  activa: true,
}

function makeReport(): Reporte {
  return {
    id: 'reporte-fase-cuatro',
    codigoSeguimiento: 'ABCD-EFGH-JKLM',
    faenaId: faena.id,
    que: 'Una rama cayó cerca del camino',
    cuando: 'Hoy',
    queHabriaPasado: 'Golpe o caída',
    fotoDataUrl: 'data:image/png;base64,PRIVATE_PHOTO',
    gravedadSugerida: 'Crítica',
    explicacionIA: 'La sugerencia se basa en los detalles del reporte.',
    estado: 'Recibido',
    creadoEn: '2026-11-20T13:50:00.000Z',
    marcadoRevision: true,
    esDemo: false,
  }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('acceso y bandejas del personal', () => {
  beforeEach(async () => {
    sessionStorage.clear()
    await repository.reiniciarDemo()
    await repository.guardarFaena(faena)
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('limita al supervisor a avisos y nunca muestra identidad, foto ni gravedad', async () => {
    const reporte = makeReport()
    await repository.guardarReporte(reporte)
    await repository.guardarIdentidad({
      reporteId: reporte.id,
      nombre: 'NOMBRE QUE NO DEBE APARECER',
      consentimiento: true,
    })
    await repository.guardarAvisoSupervisor({
      id: `aviso-${reporte.id}`,
      reporteId: reporte.id,
      faenaNombre: faena.nombre,
      resumen: reporte.que,
      fechaSoloDia: '2026-11-20',
    })
    startStaffSession('supervisor-faena')
    renderAt('/staff/avisos')

    expect(await screen.findByText(reporte.que)).toBeTruthy()
    expect(screen.getByText('Faena: Faena de prueba')).toBeTruthy()
    expect(screen.getByText('Fecha: 2026-11-20')).toBeTruthy()
    expect(screen.getByText('Este aviso no incluye quién reportó.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Avisos' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Reportes' })).toBeNull()
    expect(screen.queryByText('NOMBRE QUE NO DEBE APARECER')).toBeNull()
    expect(screen.queryByText('Crítica')).toBeNull()
    expect(screen.queryByAltText('Foto adjunta al reporte')).toBeNull()
  })

  it('requiere motivo y registra la auditoría antes de leer o mostrar identidad', async () => {
    const user = userEvent.setup()
    const reporte = makeReport()
    await repository.guardarReporte(reporte)
    await repository.guardarIdentidad({
      reporteId: reporte.id,
      nombre: 'Nombre consentido',
      consentimiento: true,
    })
    startStaffSession('prevencionista-designado')
    const orden: string[] = []
    const guardarAuditoria = repository.registrarAuditoria.bind(repository)
    const obtenerIdentidad = repository.obtenerIdentidad.bind(repository)
    vi.spyOn(repository, 'registrarAuditoria').mockImplementation(async (audit) => {
      orden.push('auditoria')
      await guardarAuditoria(audit)
    })
    vi.spyOn(repository, 'obtenerIdentidad').mockImplementation(async (id) => {
      orden.push('identidad')
      return obtenerIdentidad(id)
    })
    renderAt(`/staff/reportes/${reporte.id}`)

    await user.click(await screen.findByRole('button', { name: 'Ver identidad' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(repository.obtenerIdentidad).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText(/Motivo/), 'revisar')
    await user.click(screen.getByRole('button', { name: 'Confirmar y consultar' }))
    expect(await screen.findByText('Escribe un motivo de al menos 10 caracteres.')).toBeTruthy()
    expect(repository.registrarAuditoria).not.toHaveBeenCalled()
    expect(repository.obtenerIdentidad).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText(/Motivo/))
    await user.type(screen.getByLabelText(/Motivo/), 'Revisar el riesgo del turno')
    await user.click(screen.getByRole('button', { name: 'Confirmar y consultar' }))
    expect(await screen.findByText('Nombre consentido')).toBeTruthy()
    expect(orden).toEqual(['auditoria', 'identidad'])
    const [audit] = await repository.listarAuditorias()
    expect(audit).toMatchObject({
      reporteId: reporte.id,
      usuario: 'Prevencionista designado',
      motivo: 'Revisar el riesgo del turno',
    })
  })

  it('oculta el acceso a identidades para el prevencionista sin permiso', async () => {
    const reporte = makeReport()
    await repository.guardarReporte(reporte)
    await repository.guardarIdentidad({
      reporteId: reporte.id,
      nombre: 'Nombre no visible',
      consentimiento: true,
    })
    startStaffSession('prevencionista-sin-identidades')
    vi.spyOn(repository, 'obtenerIdentidad')
    renderAt(`/staff/reportes/${reporte.id}`)

    await screen.findByText('Ficha de reporte')
    expect(screen.queryByRole('button', { name: 'Ver identidad' })).toBeNull()
    expect(screen.queryByText('Nombre no visible')).toBeNull()
    expect(repository.obtenerIdentidad).not.toHaveBeenCalled()
  })

  it('no muestra la identidad si falla el registro de auditoría', async () => {
    const user = userEvent.setup()
    const reporte = makeReport()
    await repository.guardarReporte(reporte)
    await repository.guardarIdentidad({
      reporteId: reporte.id,
      nombre: 'Nombre protegido',
      consentimiento: true,
    })
    startStaffSession('gerente-a13')
    vi.spyOn(repository, 'registrarAuditoria').mockRejectedValue(
      new Error('No se pudo guardar la auditoría.'),
    )
    vi.spyOn(repository, 'obtenerIdentidad')
    renderAt(`/staff/reportes/${reporte.id}`)

    await user.click(await screen.findByRole('button', { name: 'Ver identidad' }))
    await user.type(screen.getByLabelText(/Motivo/), 'Investigación preventiva formal')
    await user.click(screen.getByRole('button', { name: 'Confirmar y consultar' }))

    expect(await screen.findByText('No se pudo guardar la auditoría.')).toBeTruthy()
    expect(repository.obtenerIdentidad).not.toHaveBeenCalled()
    expect(screen.queryByText('Nombre protegido')).toBeNull()
  })

  it('protege las rutas por rol y persiste la sesión de demostración por pestaña', async () => {
    const user = userEvent.setup()
    renderAt('/staff')
    expect(screen.getByText(/Simulación local/)).toBeTruthy()
    expect(screen.getAllByRole('option')).toHaveLength(4)
    await user.selectOptions(screen.getByLabelText('Usuario de demostración'), 'supervisor-faena')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('heading', { name: 'Avisos de reportes' })).toBeTruthy()
    expect(JSON.parse(sessionStorage.getItem('reporta-sin-miedo:sesion-personal') ?? '{}')).toMatchObject({
      role: 'supervisor-faena',
    })

    cleanup()
    renderAt('/staff/reportes')
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Bandeja de reportes' })).toBeNull()
  })

  it('refleja en seguimiento el estado y la medida guardados en la ficha', async () => {
    const user = userEvent.setup()
    const reporte = makeReport()
    await repository.guardarReporte(reporte)
    startStaffSession('prevencionista-designado')
    renderAt(`/staff/reportes/${reporte.id}`)

    await user.selectOptions(await screen.findByLabelText('Estado'), 'Medida definida')
    await user.type(screen.getByLabelText('Medida correctiva'), 'Instalar una barrera de seguridad.')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Cambios guardados.')).toBeTruthy()
    expect((await repository.listarReportes())[0].estado).toBe('Medida definida')

    cleanup()
    renderAt('/seguimiento')
    await user.type(screen.getByLabelText('Código de seguimiento'), reporte.codigoSeguimiento)
    await user.click(screen.getByRole('button', { name: 'Consultar estado' }))
    expect(await screen.findByText('Medida definida')).toBeTruthy()
    expect(screen.getByText('Instalar una barrera de seguridad.')).toBeTruthy()
  })

  it('permite al gerente actualizar una represalia y muestra solo su estado en seguimiento', async () => {
    const user = userEvent.setup()
    const reporte = makeReport()
    await repository.guardarReporte(reporte)
    await repository.saveRepresalia({
      id: 'represalia-test',
      codigoSeguimiento: reporte.codigoSeguimiento,
      fecha: '2026-11-20T14:00:00.000Z',
      estado: 'Nueva',
    })
    startStaffSession('gerente-a13')
    renderAt('/staff/represalias')

    await user.selectOptions(
      await screen.findByLabelText('Estado'),
      'Resuelta',
    )
    expect(await screen.findByText('Estado de represalia actualizado.')).toBeTruthy()
    expect((await repository.listRepresalias())[0].estado).toBe('Resuelta')

    cleanup()
    renderAt('/seguimiento')
    await user.type(screen.getByLabelText('Código de seguimiento'), reporte.codigoSeguimiento)
    await user.click(screen.getByRole('button', { name: 'Consultar estado' }))
    expect(await screen.findByText('Aviso de represalia: Resuelta')).toBeTruthy()
    expect(screen.queryByText('2026-11-20T14:00:00.000Z')).toBeNull()
  })
})
