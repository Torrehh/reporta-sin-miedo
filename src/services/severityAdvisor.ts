import type { Severidad } from '../types'

export interface SeverityAdvice {
  gravedad: Severidad
  explicacion: string
}

export function adviseSeverity(texto: string): SeverityAdvice {
  const normalizado = texto.toLowerCase()
  const palabrasCriticas = ['altura', 'camión', 'motosierra', 'energía']
  const palabrasAltas = ['árbol', 'caída']

  if (palabrasCriticas.some((palabra) => normalizado.includes(palabra))) {
    return {
      gravedad: 'Crítica',
      explicacion: 'La descripción menciona una situación con riesgo crítico.',
    }
  }
  if (palabrasAltas.some((palabra) => normalizado.includes(palabra))) {
    return {
      gravedad: 'Alta',
      explicacion: 'La descripción menciona caída o riesgo asociado a árboles.',
    }
  }
  // TODO: Azure OpenAI se llamaría desde Azure Functions, nunca desde el navegador.
  return {
    gravedad: 'Media',
    explicacion: 'La descripción necesita revisión preventiva.',
  }
}
