const TRACKING_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function randomHex(bytes: number) {
  const values = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')
}

export function createId() {
  return randomHex(16)
}

export function createTrackingCode() {
  const parts: string[] = []
  while (parts.length < 12) {
    const values = crypto.getRandomValues(new Uint8Array(16))
    for (const value of values) {
      if (value >= 248) continue
      parts.push(TRACKING_ALPHABET[value % TRACKING_ALPHABET.length])
      if (parts.length === 12) break
    }
  }
  return `${parts.slice(0, 4).join('')}-${parts.slice(4, 8).join('')}-${parts.slice(8).join('')}`
}
