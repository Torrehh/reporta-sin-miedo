import type { Severidad } from '../types'

export interface SeverityAdvice {
  gravedad: Severidad
  explicacion: string
}

export function adviseSeverity(texto: string): SeverityAdvice {
  const normalizado = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const contiene = (palabras: string[]) =>
    palabras.some((palabra) => normalizado.includes(palabra))

  if (contiene(['altura', 'camion', 'motosierra', 'energia'])) {
    return {
      gravedad: 'Crítica',
      explicacion: 'La descripción menciona una situación con riesgo crítico.',
    }
  }
  if (contiene(['arbol', 'caida'])) {
    return {
      gravedad: 'Alta',
      explicacion: 'La descripción menciona caída o riesgo asociado a árboles.',
    }
  }
  if (contiene(['atrapamiento', 'incendio', 'electricidad', 'golpe'])) {
    return {
      gravedad: 'Media',
      explicacion: 'La descripción menciona un riesgo que requiere revisión preventiva.',
    }
  }
  if (contiene(['menor', 'leve', 'sin riesgo'])) {
    return {
      gravedad: 'Baja',
      explicacion: 'La descripción menciona una situación de menor riesgo.',
    }
  }
  // TODO: Azure OpenAI se llamaría desde Azure Functions, nunca desde el navegador.
  return {
    gravedad: 'Media',
    explicacion: 'La descripción necesita revisión preventiva.',
  }
}
