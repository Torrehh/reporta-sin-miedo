import { useState } from 'react'
import { cargarDatosDemo } from '../services/demoData'
import { repository } from '../services/repository'

export function DemoBar() {
  const [sinSenal, setSinSenal] = useState(false)

  async function reiniciar() {
    await repository.reiniciarDemo()
  }

  return (
    <aside className="demo-bar" aria-label="Controles de demostración">
      <label>
        <input
          type="checkbox"
          checked={sinSenal}
          onChange={(event) => setSinSenal(event.target.checked)}
        />
        Simular sin señal
      </label>
      <button type="button" onClick={cargarDatosDemo}>
        Cargar datos demo
      </button>
      <button type="button" onClick={reiniciar}>
        Reiniciar demo
      </button>
    </aside>
  )
}
