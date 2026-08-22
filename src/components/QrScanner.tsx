import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import {
  cameraErrorMessage, decodeImageFile, isScanSupported, parseScan, startScan,
  type ScanController, type ScanTarget,
} from '../lib/qrscan'

/**
 * Lecteur de QR code plein écran.
 *
 * Le geste attendu est celui de tout le monde : on ouvre, on vise le code
 * collé sur la table, la carte s'ouvre. Rien à valider tant que le code est
 * une carte Eatnow ; tout autre contenu est affiché et attend une décision,
 * pour qu'un autocollant malveillant ne puisse pas emmener le client ailleurs
 * sans qu'il l'ait voulu.
 */
export function QrScanner({ onClose }: { onClose: () => void }) {
  const { state } = useStore()
  const navigate = useNavigate()

  const videoRef = useRef<HTMLVideoElement>(null)
  const controller = useRef<ScanController | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)
  const [torch, setTorch] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [found, setFound] = useState<ScanTarget | null>(null)

  const knownSlugs = useMemo(
    () => new Set(state.restaurants.map((r) => r.slug)),
    [state.restaurants],
  )

  /** Ferme la caméra avant toute navigation : la diode doit s'éteindre. */
  const release = useCallback(() => {
    controller.current?.stop()
    controller.current = null
  }, [])

  const handle = useCallback((raw: string) => {
    const target = parseScan(raw, knownSlugs)
    navigator.vibrate?.(60)
    release()
    if (target.kind === 'restaurant') {
      onClose()
      navigate(`/r/${target.slug}`)
      return
    }
    setFound(target)
  }, [knownSlugs, navigate, onClose, release])

  /* La caméra n'est ouverte qu'une fois ; le décodage passe par cette
     référence pour toujours utiliser l'annuaire à jour. */
  const handleRef = useRef(handle)
  useEffect(() => { handleRef.current = handle }, [handle])

  useEffect(() => {
    let cancelled = false
    const video = videoRef.current
    if (!video) return

    if (!isScanSupported()) {
      setStarting(false)
      setError("Ce navigateur ne permet pas d’ouvrir la caméra. Vous pouvez importer une photo du QR code.")
      return
    }

    startScan(video, (raw) => handleRef.current(raw))
      .then((c) => {
        if (cancelled) { c.stop(); return }
        controller.current = c
        setHasTorch(c.hasTorch)
        setStarting(false)
      })
      .catch((e) => {
        if (cancelled) return
        setStarting(false)
        setError(cameraErrorMessage(e))
      })

    return () => { cancelled = true; release() }
  }, [release])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { release(); onClose() } }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, release])

  async function toggleTorch() {
    const next = !torch
    await controller.current?.setTorch(next)
    setTorch(next)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const raw = await decodeImageFile(file)
      if (raw) handleRef.current(raw)
      else setError("Aucun QR code n’a été reconnu sur cette image.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cette image n’a pas pu être lue.")
    }
  }

  function close() { release(); onClose() }

  return (
    <div className="scanner" role="dialog" aria-modal="true" aria-label="Scanner un QR code">
      <video ref={videoRef} className="scanner__video" playsInline muted />
      <div className="scanner__shade" aria-hidden />

      <div className="scanner__bar">
        <strong>Scanner un QR code</strong>
        <span className="spacer" />
        {hasTorch && (
          <button
            className="scanner__icon" onClick={() => void toggleTorch()}
            aria-pressed={torch} aria-label="Éclairage"
          >
            {torch ? '🔦' : '💡'}
          </button>
        )}
        <button className="scanner__icon" onClick={close} aria-label="Fermer">✕</button>
      </div>

      <div className="scanner__frame" aria-hidden>
        <span /><span /><span /><span />
      </div>

      <div className="scanner__foot">
        {starting && !error && <p className="scanner__hint">Ouverture de la caméra…</p>}
        {!starting && !error && !found && (
          <p className="scanner__hint">Visez le QR code posé sur la table.</p>
        )}
        {error && <p className="scanner__error">⚠️ {error}</p>}

        {found && found.kind === 'link' && (
          <div className="scanner__result">
            <p className="small">Ce code mène à une adresse extérieure à Eatnow :</p>
            <code className="scanner__url">{found.url}</code>
            <div className="row gap-s">
              <a className="btn sun" href={found.url} target="_blank" rel="noopener noreferrer">
                Ouvrir le lien
              </a>
              <button className="btn ghost" onClick={close}>Annuler</button>
            </div>
          </div>
        )}
        {found && found.kind === 'text' && (
          <div className="scanner__result">
            <p className="small">Contenu du code :</p>
            <code className="scanner__url">{found.text}</code>
            <button className="btn ghost" onClick={close}>Fermer</button>
          </div>
        )}

        {!found && (
          <>
            <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>
              🖼️ Importer une photo du code
            </button>
            <input
              ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e)}
            />
          </>
        )}
      </div>
    </div>
  )
}
