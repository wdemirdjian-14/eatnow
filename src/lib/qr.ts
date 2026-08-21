import qrcode from 'qrcode-generator'

/**
 * Génération de QR codes en SVG.
 *
 * Le niveau de correction « H » (30 % de redondance) est retenu pour que le
 * code reste lisible malgré la pastille posée au centre, et malgré une
 * impression médiocre ou un autocollant abîmé sur une table.
 */
export interface QrOptions {
  /** Côté du SVG en pixels. */
  size?: number
  /** Marge silencieuse, en nombre de modules (4 minimum selon la norme). */
  margin?: number
  dark?: string
  light?: string
  /** Pastille centrale (logo). `null` pour un code nu. */
  center?: { svg: string; ratio: number } | null
}

/** Matrice du QR code : `true` = module sombre. */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, 'H')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => qr.isDark(r, c)),
  )
}

/**
 * Rend le QR code en SVG autonome. Les modules sombres sont réunis dans un
 * seul `path` : le fichier reste léger et s'imprime sans artefacts de bord.
 */
export function qrSvg(text: string, options: QrOptions = {}): string {
  const { size = 512, margin = 4, dark = '#03282e', light = '#ffffff', center = null } = options

  const m = qrMatrix(text)
  const n = m.length
  const total = n + margin * 2

  let d = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (m[r][c]) d += `M${c + margin} ${r + margin}h1v1h-1z`
    }
  }

  let overlay = ''
  if (center) {
    const side = Math.round(total * center.ratio)
    const pos = (total - side) / 2
    const pad = side * 0.1
    overlay =
      `<rect x="${pos - pad}" y="${pos - pad}" width="${side + pad * 2}" height="${side + pad * 2}" rx="${side * 0.18}" fill="${light}"/>` +
      `<g transform="translate(${pos} ${pos}) scale(${side / 200})">${center.svg}</g>`
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" ` +
    `aria-label="QR code vers la carte">` +
    `<rect width="${total}" height="${total}" fill="${light}"/>` +
    `<path d="${d}" fill="${dark}"/>` +
    overlay +
    `</svg>`
  )
}

/** Marque Eatnow simplifiée, dessinée dans un carré de 200 × 200. */
export const QR_CENTER_MARK =
  '<circle cx="100" cy="100" r="96" fill="#0E7C86"/>' +
  '<circle cx="100" cy="100" r="78" fill="none" stroke="#F4C95D" stroke-width="7"/>' +
  '<path d="M100 46a54 54 0 1 1-54 54 40 40 0 1 0 40-40 26 26 0 0 0-26 26" ' +
  'fill="none" stroke="#F6FBFB" stroke-width="12" stroke-linecap="round"/>'

/** Convertit un SVG en PNG via un canvas, pour les usages hors web. */
export function svgToPngBlob(svg: string, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas indisponible.')); return }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export PNG impossible.'))), 'image/png')
    }
    img.onerror = () => reject(new Error('Rendu du QR code impossible.'))
    img.src = url
  })
}

/** Déclenche le téléchargement d'un contenu généré côté navigateur. */
export function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Laisse au navigateur le temps de lancer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
