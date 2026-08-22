import jsQR from 'jsqr'

/**
 * Lecture de QR codes par la caméra.
 *
 * Deux moteurs de décodage :
 *  1. `BarcodeDetector`, natif sur Chrome Android — rapide, sans copie d'image ;
 *  2. jsQR en repli, pour iOS Safari et les navigateurs de bureau.
 *
 * Le décodage tourne dans un `requestAnimationFrame` bridé : viser dix images
 * par seconde suffit largement pour un code posé sur une table, et ménage la
 * batterie du téléphone du client.
 */

/** Intervalle minimal entre deux tentatives de décodage, en millisecondes. */
const FRAME_INTERVAL = 100

/** Côté maximal de l'image analysée par jsQR : au-delà, on paie sans gagner. */
const MAX_ANALYSIS_SIDE = 640

export interface ScanController {
  /** Coupe le flux vidéo et la boucle de décodage. Idempotent. */
  stop(): void
  /** Allume ou éteint le flash, si l'appareil le permet. */
  setTorch(on: boolean): Promise<void>
  /** `true` si la caméra retenue expose un flash. */
  hasTorch: boolean
}

interface DetectedCode { rawValue: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedCode[]> }
interface BarcodeDetectorCtor {
  new (options: { formats: string[] }): BarcodeDetectorLike
  getSupportedFormats?(): Promise<string[]>
}

/** Le navigateur peut-il ouvrir la caméra ? */
export function isScanSupported(): boolean {
  if (typeof navigator === 'undefined') return false
  return !!navigator.mediaDevices?.getUserMedia
}

/**
 * Message d'erreur en français à partir de l'exception levée par
 * `getUserMedia`, dont les noms sont normalisés mais peu parlants.
 */
export function cameraErrorMessage(e: unknown): string {
  const name = e instanceof DOMException ? e.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return "L’accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur, puis réessayez."
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return "Aucune caméra n’a été trouvée sur cet appareil."
    case 'NotReadableError':
    case 'TrackStartError':
      return "La caméra est déjà utilisée par une autre application."
    case 'OverconstrainedError':
      return "Aucune caméra ne correspond aux réglages demandés."
    case 'SecurityError':
      return "La caméra n’est accessible qu’en HTTPS."
    default:
      return e instanceof Error && e.message ? e.message : "La caméra n’a pas pu être ouverte."
  }
}

/** Instancie le décodeur natif s'il gère le format QR, sinon `null`. */
async function nativeDetector(): Promise<BarcodeDetectorLike | null> {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  if (!Ctor) return null
  try {
    const formats = (await Ctor.getSupportedFormats?.()) ?? ['qr_code']
    if (!formats.includes('qr_code')) return null
    return new Ctor({ formats: ['qr_code'] })
  } catch {
    return null
  }
}

/**
 * Ouvre la caméra arrière dans `video` et appelle `onFound` au premier code lu.
 *
 * L'appelant reste maître de l'arrêt : `onFound` peut se déclencher plusieurs
 * fois si le contrôleur n'est pas stoppé, ce qui permet d'ignorer un code
 * illisible et de continuer à filmer.
 */
export async function startScan(
  video: HTMLVideoElement,
  onFound: (text: string) => void,
): Promise<ScanController> {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new DOMException('HTTPS requis', 'SecurityError')
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    // `ideal` et non `exact` : sur un ordinateur portable il n'y a qu'une
    // webcam frontale, et un `exact` échouerait au lieu de s'en contenter.
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  })

  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.muted = true
  try {
    await video.play()
  } catch {
    /* Certains navigateurs refusent `play()` hors geste utilisateur : le flux
       est déjà branché, l'image finira par arriver. */
  }

  const track = stream.getVideoTracks()[0]
  const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
  const hasTorch = !!caps.torch

  const detector = await nativeDetector()
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  let stopped = false
  let raf = 0
  let last = 0

  async function tick(now: number) {
    if (stopped) return
    raf = requestAnimationFrame(tick)
    if (now - last < FRAME_INTERVAL) return
    last = now
    if (video.readyState < 2 || !video.videoWidth) return

    try {
      if (detector) {
        const codes = await detector.detect(video)
        if (!stopped && codes.length && codes[0].rawValue) onFound(codes[0].rawValue)
        return
      }
      if (!ctx) return
      const scale = Math.min(1, MAX_ANALYSIS_SIDE / Math.max(video.videoWidth, video.videoHeight))
      const w = Math.round(video.videoWidth * scale)
      const h = Math.round(video.videoHeight * scale)
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
      ctx.drawImage(video, 0, 0, w, h)
      const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' })
      if (!stopped && found?.data) onFound(found.data)
    } catch {
      /* Une image ratée n'interrompt pas le scan : on retente à la suivante. */
    }
  }

  raf = requestAnimationFrame(tick)

  return {
    hasTorch,
    stop() {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(raf)
      for (const t of stream.getTracks()) t.stop()
      video.srcObject = null
    },
    async setTorch(on: boolean) {
      if (!hasTorch || !track) return
      try {
        // `torch` ne figure pas encore dans les types du DOM, mais reste la
        // seule voie pour allumer le flash sur Android.
        await track.applyConstraints({ advanced: [{ torch: on }] } as unknown as MediaTrackConstraints)
      } catch {
        /* Le flash reste un confort : son échec ne casse pas la lecture. */
      }
    },
  }
}

/**
 * Décode un QR code depuis une image choisie dans la galerie.
 *
 * Filet de sécurité quand la caméra est refusée ou indisponible : le client
 * peut toujours photographier le code puis ouvrir la photo.
 */
export async function decodeImageFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Cette image n’a pas pu être lue."))
      el.src = url
    })
    const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)
    const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' })
    return found?.data ?? null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Ce qu'un code scanné s'avère être, une fois analysé. */
export type ScanTarget =
  /** Lien vers une carte Eatnow : `slug` du restaurant. */
  | { kind: 'restaurant'; slug: string }
  /** Adresse web quelconque : ouverte seulement sur action explicite. */
  | { kind: 'link'; url: string }
  /** Texte brut, simplement affiché. */
  | { kind: 'text'; text: string }

/** Extrait le `slug` d'une URL Eatnow (`…/#/r/mon-resto`). */
function slugFromUrl(u: URL): string | null {
  const m = /^#\/r\/([a-z0-9-]+)/i.exec(u.hash)
  return m ? m[1].toLowerCase() : null
}

/**
 * Analyse le texte lu.
 *
 * `knownSlugs` sert de garde-fou : un QR code peut venir de n'importe où, donc
 * seul un lien qui désigne une carte présente dans l'annuaire — ou une adresse
 * de ce même site — ouvre directement une page. Tout le reste est affiché tel
 * quel et attend un geste du client.
 */
export function parseScan(raw: string, knownSlugs: Set<string>): ScanTarget {
  const text = raw.trim()
  if (!text) return { kind: 'text', text: raw }

  // Un simple slug (« mon-resto ») ou un chemin interne collé dans le code.
  const bare = /^(?:#?\/?r\/)?([a-z0-9-]{2,})$/i.exec(text)
  if (bare && knownSlugs.has(bare[1].toLowerCase())) {
    return { kind: 'restaurant', slug: bare[1].toLowerCase() }
  }

  let url: URL
  try {
    url = new URL(text, typeof window === 'undefined' ? undefined : window.location.href)
  } catch {
    return { kind: 'text', text }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { kind: 'text', text }

  const slug = slugFromUrl(url)
  const sameOrigin = typeof window !== 'undefined' && url.origin === window.location.origin
  // Le slug est repris pour naviguer *à l'intérieur* de l'application : même
  // venu d'un autre domaine, il ne peut pas emmener le client ailleurs.
  if (slug && (sameOrigin || knownSlugs.has(slug))) return { kind: 'restaurant', slug }

  return { kind: 'link', url: url.href }
}
