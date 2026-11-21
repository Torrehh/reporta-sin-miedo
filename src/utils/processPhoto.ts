const MAX_IMAGE_SIDE = 1280

export function processPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('El archivo seleccionado no es una fotografía.'))
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('No se pudo preparar la fotografía en este dispositivo.'))
        return
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('No se pudo preparar la fotografía. Inténtalo nuevamente.'))
            return
          }
          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result !== 'string') {
              reject(new Error('No se pudo leer la fotografía preparada.'))
              return
            }
            resolve(reader.result)
          }
          reader.onerror = () => reject(new Error('No se pudo leer la fotografía preparada.'))
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        0.82,
      )
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo abrir la fotografía seleccionada.'))
    }
    image.src = objectUrl
  })
}
