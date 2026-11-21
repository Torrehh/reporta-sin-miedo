export function buildFaenaReportUrl(
  faenaId: string,
  origin = window.location.origin,
  pathname = window.location.pathname,
) {
  return `${origin}${pathname}#/f/${faenaId}`
}

export function safeFaenaQrFilename(faenaName: string) {
  const slug = faenaName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `qr-${slug || 'faena'}.png`
}
