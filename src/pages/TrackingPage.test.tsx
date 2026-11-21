import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TrackingPage } from './TrackingPage'
import { repository } from '../services/repository'
import type { Reporte } from '../types'
import {
  getTrackingAttemptState,
  normalizarCodigoSeguimiento,
  registerFailedTrackingAttempt,
  TRACKING_LOCK_MS,
} from '../utils/tracking'

const codigo = 'ABCD-EFGH-JKLM'

function crearReporte(overrides: Partial<Reporte> = {}): Reporte {
  return {
    id: 'reporte-seguimiento',
    codigoSeguimiento: codigo,
    faenaId: 'faena-secreta',
    que: 'CONTENIDO PRIVADO DEL REPORTE',
    cuando: 'Hoy',
    queHabriaPasado: 'Otro',
    fotoDataUrl: 'data:image/png;base64,FOTO_PRIVADA',
    gravedadSugerida: 'Crítica',
    gravedadFinal: 'Crítica',
    explicacionIA: 'EXPLICACION PRIVADA',
    estado: 'En revisión',
    medidaCorrectiva: 'Se instalará una barrera de protección.',
    creadoEn: new Date().toISOString(),
    marcadoRevision: true,
    esDemo: false,
    ...overrides,
  }
}

describe('seguimiento confidencial', () => {
  beforeEach(async () => {
    await repository.reiniciarDemo()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('normaliza mayúsculas, espacios y guiones extra, además de conservar códigos DEMO', () => {
    expect(normalizarCodigoSeguimiento(' abcd - efgh - jklm ')).toBe(codigo)
    expect(normalizarCodigoSeguimiento('demo - 0001')).toBe('DEMO-0001')
    expect(normalizarCodigoSeguimiento('código incompleto')).toBeNull()
  })

  it('bloquea después de cinco consultas fallidas durante diez minutos', () => {
    const now = 1_800_000_000_000
    let state = { failedAttempts: 0, blockedUntil: 0 }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      state = registerFailedTrackingAttempt(now)
    }

    expect(state).toEqual({ failedAttempts: 5, blockedUntil: now + TRACKING_LOCK_MS })
    expect(getTrackingAttemptState(now + 1000)).toEqual(state)
    expect(getTrackingAttemptState(now + TRACKING_LOCK_MS)).toEqual({
      failedAttempts: 0,
      blockedUntil: 0,
    })
  })

  it('muestra solo estado y medida, nunca contenido, faena, foto, gravedad o identidad', async () => {
    const user = userEvent.setup()
    const reporte = crearReporte()
    registerFailedTrackingAttempt()
    registerFailedTrackingAttempt()
    await repository.guardarReporte(reporte)
    await repository.guardarFaena({
      id: reporte.faenaId,
      nombre: 'FAENA PRIVADA',
      empresaContratista: 'Contratista privado',
      activa: true,
    })
    await repository.guardarIdentidad({
      reporteId: reporte.id,
      nombre: 'IDENTIDAD PRIVADA',
      consentimiento: true,
    })
    render(<TrackingPage />)

    expect(screen.queryByRole('button', { name: 'Informar una represalia' })).toBeNull()
    await user.type(screen.getByLabelText('Código de seguimiento'), ' abcd - efgh - jklm ')
    await user.click(screen.getByRole('button', { name: 'Consultar estado' }))

    expect(await screen.findByText('En revisión')).toBeTruthy()
    expect(screen.getByText('Se instalará una barrera de protección.')).toBeTruthy()
    for (const privateValue of [
      'CONTENIDO PRIVADO DEL REPORTE',
      'FAENA PRIVADA',
      'FOTO_PRIVADA',
      'Crítica',
      'EXPLICACION PRIVADA',
      'IDENTIDAD PRIVADA',
    ]) {
      expect(screen.queryByText(new RegExp(privateValue))).toBeNull()
    }
    expect(screen.getByRole('button', { name: 'Informar una represalia' })).toBeTruthy()
    expect(screen.getByLabelText('Código de seguimiento')).toHaveProperty('value', codigo)
    expect(getTrackingAttemptState().failedAttempts).toBe(0)
  })

  it('muestra códigos DEMO y pendientes offline sin revelar detalles del reporte', async () => {
    const user = userEvent.setup()
    const demo = crearReporte({
      id: 'demo-reporte',
      codigoSeguimiento: 'DEMO-0001',
      que: 'DETALLE DEMO PRIVADO',
      esDemo: true,
    })
    await repository.guardarReporte(demo)
    render(<TrackingPage />)
    await user.type(screen.getByLabelText('Código de seguimiento'), 'demo - 0001')
    await user.click(screen.getByRole('button', { name: 'Consultar estado' }))
    expect(await screen.findByText('En revisión')).toBeTruthy()
    expect(screen.queryByText('DETALLE DEMO PRIVADO')).toBeNull()

    cleanup()
    await repository.reiniciarDemo()
    await repository.agregarPendiente(
      {
        id: 'pendiente-offline',
        reporteBorrador: crearReporte({ id: 'pendiente-offline' }),
        creadoEn: new Date().toISOString(),
        estado: 'Pendiente de envío',
      },
    )
    render(<TrackingPage />)
    await user.type(screen.getByLabelText('Código de seguimiento'), codigo)
    await user.click(screen.getByRole('button', { name: 'Consultar estado' }))
    expect(
      await screen.findByText('Aún no se ha enviado. Se enviará cuando haya conexión.'),
    ).toBeTruthy()
    expect(screen.queryByText('CONTENIDO PRIVADO DEL REPORTE')).toBeNull()
    expect(screen.queryByText('En revisión')).toBeNull()
  })

  it('registra una represalia con el mismo código sin solicitar identidad', async () => {
    const user = userEvent.setup()
    await repository.guardarReporte(crearReporte())
    render(<TrackingPage />)
    await user.type(screen.getByLabelText('Código de seguimiento'), codigo)
    await user.click(screen.getByRole('button', { name: 'Consultar estado' }))
    await user.click(await screen.findByRole('button', { name: 'Informar una represalia' }))

    expect(screen.getByText(/llega al gerente de A13/)).toBeTruthy()
    expect(screen.getByText(/No pedimos tu nombre/)).toBeTruthy()
    expect(screen.queryByLabelText(/nombre/i)).toBeNull()
    await user.click(
      screen.getByRole('button', { name: 'Confirmar aviso de represalia' }),
    )

    expect((await screen.findByRole('status')).textContent).toContain(
      'El aviso de represalia fue registrado.',
    )
    const avisos = await repository.listRepresalias()
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toMatchObject({
      codigoSeguimiento: codigo,
      estado: 'Nueva',
      fecha: expect.any(String),
    })
    expect(avisos[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(Object.keys(avisos[0]).sort()).toEqual(
      ['codigoSeguimiento', 'estado', 'fecha', 'id'].sort(),
    )
  })

  it('presenta el bloqueo y desactiva nuevas consultas al llegar al límite', async () => {
    const user = userEvent.setup()
    render(<TrackingPage />)
    await user.type(screen.getByLabelText('Código de seguimiento'), 'ZZZZ-ZZZZ-ZZZZ')
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await user.click(screen.getByRole('button', { name: 'Consultar estado' }))
      await waitFor(() =>
        expect(getTrackingAttemptState().failedAttempts).toBe(attempt),
      )
    }
    expect(await screen.findByText(/Has alcanzado 5 intentos fallidos/)).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Consultar estado' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })
})
