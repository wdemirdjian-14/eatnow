import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LANGS, LANG_META, type Lang } from '../types'
import { useStore } from '../store/store'

/**
 * Sélecteur de langue d'affichage du site public.
 *
 * En version compacte (bandeau du haut) ce n'est pas un `<select>` natif mais
 * un bouton qui ouvre un panneau. Le menu déroulant natif se révélait
 * capricieux dans l'application installée sur iPhone — une tape sur deux
 * n'ouvrait rien — et un panneau donne de toute façon des cibles bien plus
 * grandes que les lignes d'une liste système, drapeau à l'appui.
 */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useStore()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!compact) {
    return (
      <label className="field">
        <span>Langue</span>
        <select className="select" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {LANGS.map((l) => (
            <option key={l} value={l}>{LANG_META[l].flag} {LANG_META[l].native}</option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <>
      <button
        type="button"
        className="lang-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Langue : ${LANG_META[lang].native}. Changer de langue`}
      >
        <span aria-hidden>{LANG_META[lang].flag}</span>
        <span className="lang-btn__name">{LANG_META[lang].native}</span>
        <span className="lang-btn__caret" aria-hidden>▾</span>
      </button>

      {/* Rendu à la racine du document, et non dans l'en-tête : celui-ci ouvre
          un contexte d'empilement (z-index + backdrop-filter) qui enfermerait
          le panneau derrière la page, quel que soit son z-index. */}
      {open && createPortal(
        <div
          className="lang-sheet__backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Choisir la langue"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="lang-sheet">
            <div className="lang-sheet__head">
              <h3>Choisir la langue</h3>
              <button className="sheet__close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
            </div>
            <div className="lang-sheet__grid">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className="lang-opt"
                  aria-pressed={l === lang}
                  onClick={() => { setLang(l); setOpen(false) }}
                >
                  <span className="lang-opt__flag" aria-hidden>{LANG_META[l].flag}</span>
                  <span className="lang-opt__txt">
                    <b>{LANG_META[l].native}</b>
                    <span className="tiny muted">{LANG_META[l].label}</span>
                  </span>
                  {l === lang && <span className="lang-opt__check" aria-hidden>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
