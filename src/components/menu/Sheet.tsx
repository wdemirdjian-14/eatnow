import { useEffect } from 'react'
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

  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
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
