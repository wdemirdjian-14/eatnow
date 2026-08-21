/** Taille maximale du plus grand côté, en pixels, pour une photo de plat. */
const MAX_SIDE = 900
const QUALITY = 0.72
/** Au-delà, on refuse : le stockage navigateur de la démo est limité. */
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024

/**
 * Redimensionne et recompresse une photo choisie par le restaurateur,
 * puis la renvoie en data URL. Le MVP stocke l'image dans le navigateur ;
 * en production cette fonction poste le fichier sur un service de médias.
 */
export async function fileToPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Ce fichier n’est pas une image.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Image trop lourde (8 Mo maximum).')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Impossible de préparer l’image.')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', QUALITY)
}
