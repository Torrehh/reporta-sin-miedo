import { useEffect, useState, type FormEvent } from 'react'
import QRCode from 'qrcode'
import type { Faena } from '../types'
import { repository } from '../services/repository'
import { createId } from '../utils/identifiers'
import { buildFaenaReportUrl, safeFaenaQrFilename } from '../utils/qr'

const QR_OPTIONS = {
  errorCorrectionLevel: 'H' as const,
  margin: 2,
  width: 220,
  color: { dark: '#123b68', light: '#ffffff' },
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

async function loadImage(source: string) {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('No se pudo preparar la imagen del QR.'))
    image.src = source
  })
  return image
}

export function QRPage() {
  const [faenas, setFaenas] = useState<Faena[]>([])
  const [qrImages, setQrImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [empresa, setEmpresa] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await repository.listarFaenas()
        if (active) setFaenas(items.sort((left, right) => left.nombre.localeCompare(right.nombre, 'es')))
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'No se pudieron cargar las faenas.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    if (faenas.length === 0) return
    Promise.all(
      faenas.map(async (faena) => [
        faena.id,
        await QRCode.toDataURL(buildFaenaReportUrl(faena.id), QR_OPTIONS),
      ] as const),
    )
      .then((entries) => {
        if (active) setQrImages(Object.fromEntries(entries))
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'No se pudieron generar los códigos QR.')
        }
      })
    return () => {
      active = false
    }
  }, [faenas])

  function resetForm() {
    setEditingId(null)
    setNombre('')
    setEmpresa('')
  }

  async function saveFaena(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const nombreLimpio = nombre.trim()
    const empresaLimpia = empresa.trim()
    if (!nombreLimpio || !empresaLimpia) {
      setError('Ingresa el nombre de la faena y la empresa contratista.')
      return
    }

    setSaving(true)
    try {
      const current = editingId ? faenas.find((item) => item.id === editingId) : undefined
      let id = editingId
      if (!id) {
        const existingIds = new Set((await repository.listarFaenas()).map((item) => item.id))
        do {
          id = createId()
        } while (existingIds.has(id))
      }
      const faena: Faena = {
        id,
        nombre: nombreLimpio,
        empresaContratista: empresaLimpia,
        activa: current?.activa ?? true,
      }
      await repository.guardarFaena(faena)
      setFaenas((items) =>
        items.some((item) => item.id === faena.id)
          ? items.map((item) => item.id === faena.id ? faena : item)
          : [...items, faena],
      )
      setMessage(editingId ? 'Faena actualizada.' : 'Faena creada.')
      resetForm()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la faena.')
    } finally {
      setSaving(false)
    }
  }

  function editFaena(faena: Faena) {
    setEditingId(faena.id)
    setNombre(faena.nombre)
    setEmpresa(faena.empresaContratista)
    setError(null)
    setMessage(null)
  }

  async function toggleActive(faena: Faena) {
    if (faena.activa && !window.confirm(`¿Desactivar "${faena.nombre}"? Su QR dejará de aceptar reportes.`)) {
      return
    }
    setError(null)
    setMessage(null)
    try {
      const updated = { ...faena, activa: !faena.activa }
      await repository.guardarFaena(updated)
      setFaenas((items) => items.map((item) => item.id === updated.id ? updated : item))
      setMessage(updated.activa ? 'Faena activada.' : 'Faena desactivada.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo actualizar la faena.')
    }
  }

  async function copyUrl(faena: Faena) {
    setError(null)
    try {
      await navigator.clipboard.writeText(buildFaenaReportUrl(faena.id))
      setMessage('Enlace copiado.')
    } catch {
      setError('No se pudo copiar el enlace. Puedes seleccionarlo y copiarlo manualmente.')
    }
  }

  async function downloadQr(faena: Faena) {
    setError(null)
    try {
      const url = buildFaenaReportUrl(faena.id)
      const qrDataUrl = await QRCode.toDataURL(url, { ...QR_OPTIONS, width: 680 })
      const image = await loadImage(qrDataUrl)
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) throw new Error('No se pudo crear el archivo PNG en este navegador.')

      canvas.width = 1000
      canvas.height = 1250
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 160, 40, 680, 680)
      context.textAlign = 'center'
      context.fillStyle = '#123b68'
      context.font = 'bold 46px system-ui, sans-serif'
      const titleLines = wrapCanvasText(context, faena.nombre, 920)
      let textY = 790
      for (const line of titleLines) {
        context.fillText(line, canvas.width / 2, textY, 920)
        textY += 56
      }
      context.font = '30px system-ui, sans-serif'
      const legend = 'Escanea para reportar un casi-accidente. Puedes reportar sin nombre.'
      const legendLines = wrapCanvasText(context, legend, 920)
      textY += 12
      for (const line of legendLines) {
        context.fillText(line, canvas.width / 2, textY, 920)
        textY += 42
      }
      const link = document.createElement('a')
      link.download = safeFaenaQrFilename(faena.nombre)
      link.href = canvas.toDataURL('image/png')
      document.body.append(link)
      link.click()
      link.remove()
      setMessage(`QR descargado: ${link.download}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo descargar el QR.')
    }
  }

  return (
    <main className="card staff-card qr-admin">
      <header className="worker-heading">
        <p className="eyebrow">Administración</p>
        <h1>Códigos QR por faena</h1>
      </header>
      <p className="qr-published-note">
        Genera e imprime los QR desde la dirección publicada (github.io), no desde el entorno de
        desarrollo.
      </p>
      {message && <p className="confirmation" role="status">{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}

      <form className="report-form qr-form" onSubmit={(event) => void saveFaena(event)}>
        <h2>{editingId ? 'Editar faena' : 'Crear faena nueva'}</h2>
        <div className="field">
          <label htmlFor="faena-name">Nombre de la faena</label>
          <input
            id="faena-name"
            type="text"
            required
            maxLength={120}
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="faena-company">Empresa contratista</label>
          <input
            id="faena-company"
            type="text"
            required
            maxLength={120}
            value={empresa}
            onChange={(event) => setEmpresa(event.target.value)}
          />
        </div>
        <div className="qr-form-actions">
          <button className="submit-button" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear faena'}
          </button>
          {editingId && (
            <button className="button-secondary" type="button" onClick={resetForm}>
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      {loading && <p role="status">Cargando faenas…</p>}
      {!loading && faenas.length === 0 && (
        <p className="empty-state">Aún no hay faenas. Crea una para generar su código QR.</p>
      )}
      {!loading && faenas.length > 0 && (
        <ul className="staff-card-list">
          {faenas.map((faena) => {
            const url = buildFaenaReportUrl(faena.id)
            return (
              <li className="staff-item qr-faena-card" key={faena.id}>
                <article>
                  <header className="qr-faena-header">
                    <div>
                      <h2>{faena.nombre}</h2>
                      <p>Empresa contratista: {faena.empresaContratista}</p>
                      <p className={faena.activa ? 'faena-active' : 'faena-inactive'}>
                        Estado: {faena.activa ? 'Activa' : 'Desactivada'}
                      </p>
                    </div>
                    {qrImages[faena.id] ? (
                      <img className="qr-preview" src={qrImages[faena.id]} alt={`Código QR de ${faena.nombre}`} />
                    ) : (
                      <span role="status">Generando QR…</span>
                    )}
                  </header>
                  <label className="qr-url-label" htmlFor={`faena-url-${faena.id}`}>Enlace del QR</label>
                  <input id={`faena-url-${faena.id}`} className="qr-url" type="text" readOnly value={url} />
                  <div className="qr-actions">
                    <button className="button-secondary" type="button" onClick={() => void copyUrl(faena)}>
                      Copiar enlace
                    </button>
                    <button className="button-primary" type="button" onClick={() => void downloadQr(faena)}>
                      Descargar QR (PNG)
                    </button>
                    <button className="button-secondary" type="button" onClick={() => editFaena(faena)}>
                      Editar
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => void toggleActive(faena)}
                    >
                      {faena.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
