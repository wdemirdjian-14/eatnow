import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/** Panneau glissant depuis le bas sur mobile, fenêtre centrée à partir de 640 px. */
export function Sheet({
  title, onClose, children, tone,
}: { title: ReactNode; onClose: () => void; children: ReactNode; tone?: 'paper' }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  /* Même garde que le sélecteur de langue : sur iOS le clic de compatibilité
     qui suit une tape retombe sur le fond du panneau qui vient de s'ouvrir et
     le referme aussitôt. On exige que l'appui et le clic aient eu lieu tous
     les deux sur le fond. */
  const downOnBackdrop = useRef(false)

  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      onPointerDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget }}
      onClick={(e) => {
        const legitimate = e.target === e.currentTarget && downOnBackdrop.current
        downOnBackdrop.current = false
        if (legitimate) onClose()
      }}
    >
      <div className={`sheet ${tone === 'paper' ? 'order-sheet' : ''}`}>
        <div className="sheet__head">
          <h3 style={{ flex: 1, minWidth: 0 }}>{title}</h3>
          <button className="sheet__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
