import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DemoBar } from '../components/DemoBar'
import { ReportWorkerPage } from './ReportWorkerPage'
import { repository } from '../services/repository'
import { setSimulatedOffline, submitReport } from '../services/queue'
import { processPhoto } from '../utils/processPhoto'
import type { Faena, Reporte } from '../types'

const originalGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
)
const originalToBlob = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'toBlob')

const faena: Faena = {
  id: 'faena-prueba',
  nombre: 'Faena de prueba',
  empresaContratista: 'Contratista ficticio',
  activa: true,
}

function renderWorker(withDemoBar = false) {
  return render(
    <MemoryRouter initialEntries={[`/f/${faena.id}`]}>
      {withDemoBar && <DemoBar />}
      <Routes>
        <Route path="/f/:faenaId" element={<ReportWorkerPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function completeRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('¿Qué pasó?'), 'Una rama cayó cerca del camino')
  await user.click(screen.getByRole('button', { name: 'Hoy' }))
  await user.click(screen.getByRole('button', { name: 'Golpe o caída' }))
}

describe('flujo de reporte del trabajador', () => {
  beforeEach(async () => {
    await repository.reiniciarDemo()
    await repository.guardarFaena(faena)
    localStorage.clear()
    await setSimulatedOffline(false)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    if (originalGetContext) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', originalGetContext)
    } else {
      delete (HTMLCanvasElement.prototype as { getContext?: unknown }).getContext
    }
    if (originalToBlob) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', originalToBlob)
    } else {
      delete (HTMLCanvasElement.prototype as { toBlob?: unknown }).toBlob
    }
  })

  it('envía un reporte, separa identidad y crea aviso sin texto libre', async () => {
    const user = userEvent.setup()
    renderWorker()
    await screen.findByText('Faena de prueba')
    await completeRequiredFields(user)
    await user.type(screen.getByLabelText('Nombre (opcional)'), 'Nombre de prueba')
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    expect(await screen.findByText(/debes aceptar que se guarde por separado/)).toBeTruthy()
    expect(await repository.listarReportes()).toHaveLength(0)

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Acepto que mi nombre se guarde por separado y lo vea el equipo designado.',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('Reporte enviado')).toBeTruthy()
    expect(screen.getByText(/[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}/)).toBeTruthy()
    const [reporte] = await repository.listarReportes()
    const identidad = await repository.obtenerIdentidad(reporte.id)
    const [aviso] = await repository.listarAvisosSupervisor()
    expect(reporte).not.toHaveProperty('nombre')
    expect(identidad?.nombre).toBe('Nombre de prueba')
    expect(identidad?.reporteId).toBe(reporte.id)
    expect(aviso.resumen).toBe('Golpe o caída')
    expect(aviso.faenaNombre).toBe(faena.nombre)
    expect(aviso.fechaSoloDia).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('guarda sin señal y enseña el código solo cuando el envío se completa', async () => {
    const user = userEvent.setup()
    renderWorker(true)
    await screen.findByText('Faena de prueba')
    await user.click(screen.getByRole('checkbox', { name: 'Simular sin señal' }))
    await completeRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Enviar reporte' }))

    expect(await screen.findByText('Guardado en tu celular. Se enviará cuando haya conexión.')).toBeTruthy()
    expect(await repository.listarPendientes()).toHaveLength(1)
    expect(await repository.listarReportes()).toHaveLength(0)
    expect(screen.queryByText(/[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}/)).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: 'Simular sin señal' }))
    expect(await screen.findByText('Reporte enviado')).toBeTruthy()
    expect(await repository.listarPendientes()).toHaveLength(0)
    expect(await repository.listarReportes()).toHaveLength(1)
    expect(await repository.listarAvisosSupervisor()).toHaveLength(1)
  })

  it('detiene el formulario si se marca una lesión y rechaza QR inactivo', async () => {
    const user = userEvent.setup()
    renderWorker()
    await screen.findByText('Faena de prueba')
    await user.click(screen.getByRole('checkbox', { name: '¿Hubo una lesión?' }))
    expect(
      screen.getByText(/Los accidentes con lesión siguen el flujo formal/),
    ).toBeTruthy()
    expect(screen.queryByLabelText('¿Qué pasó?')).toBeNull()
    expect(await repository.listarReportes()).toHaveLength(0)

    cleanup()
    await repository.guardarFaena({ ...faena, activa: false })
    renderWorker()
    expect(await screen.findByText('Este código QR no está activo')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Enviar reporte' })).toBeNull()
  })

  it('re-codifica una foto a JPEG reducida mediante canvas', async () => {
    let imageOnLoad: (() => void) | null = null
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 2400
        naturalHeight = 1200
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(_value: string) {
          imageOnLoad = this.onload
          queueMicrotask(() => imageOnLoad?.())
        }
      },
    )
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:foto'),
      revokeObjectURL: vi.fn(),
    })
    const drawImage = vi.fn()
    const toBlob = vi.fn((callback: BlobCallback) =>
      callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
    )
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => ({ drawImage })),
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: toBlob,
    })

    const result = await processPhoto(new File(['image'], 'foto.jpg', { type: 'image/jpeg' }))
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1280, 640)
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.82)
  })

  it('limita a cinco reportes por hora y marca el número 21 de una faena', async () => {
    const base = {
      faena,
      que: 'Situación en faena',
      cuando: 'Hoy' as const,
      queHabriaPasado: 'Otro' as const,
    }
    for (let index = 0; index < 5; index += 1) {
      await submitReport(base)
    }
    await expect(submitReport(base)).rejects.toThrow('límite de 5 reportes por hora')

    await repository.reiniciarDemo()
    await repository.guardarFaena(faena)
    localStorage.clear()
    const crearReporte = (index: number): Reporte => ({
      id: `limite-qr-${index}`,
      codigoSeguimiento: `QR${String(index).padStart(10, '2')}`,
      faenaId: faena.id,
      que: 'Situación de prueba',
      cuando: 'Hoy',
      queHabriaPasado: 'Otro',
      gravedadSugerida: 'Media',
      explicacionIA: 'Revisión preventiva.',
      estado: 'Recibido',
      creadoEn: new Date().toISOString(),
      marcadoRevision: false,
      esDemo: false,
    })
    for (let index = 1; index <= 21; index += 1) {
      const saved = await repository.registrarReporteEnviado(crearReporte(index), faena)
      expect(saved.marcadoRevision).toBe(index > 20)
    }
  })
})
