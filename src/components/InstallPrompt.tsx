import { useState } from 'react'
import { useInstallPrompt } from '../lib/pwa'
import { Logo } from './Logo'

/**
 * Invite à installer Eatnow sur l'écran d'accueil.
 * Masquée si l'application est déjà installée ou si l'invite a été écartée.
 */
export function InstallPrompt() {
  const { canPrompt, needsManualSteps, installed, dismissed, install, dismiss } = useInstallPrompt()
  const [showSteps, setShowSteps] = useState(false)

  if (installed || dismissed || (!canPrompt && !needsManualSteps)) return null

  return (
    <section className="install-card">
      <Logo size={36} id="install" />
      <div className="stack gap-xs" style={{ flex: 1, minWidth: 0 }}>
        <b>Installer Eatnow sur votre téléphone</b>
        <span className="tiny muted">
          Accès en un geste, plein écran, et les cartes déjà ouvertes restent
          lisibles sans connexion.
        </span>
        {showSteps && (
          <ol className="small stack gap-xs" style={{ margin: '.4rem 0 0', paddingInlineStart: '1.2rem' }}>
            <li>Touchez le bouton <b>Partager</b> dans la barre de Safari.</li>
            <li>Choisissez <b>Sur l’écran d’accueil</b>.</li>
            <li>Confirmez avec <b>Ajouter</b>.</li>
          </ol>
        )}
      </div>
      <div className="row gap-xs">
        {canPrompt ? (
          <button className="btn sm" onClick={() => void install()}>Installer</button>
        ) : (
          <button className="btn sm" onClick={() => setShowSteps((v) => !v)}>
            {showSteps ? 'Masquer' : 'Comment faire'}
          </button>
        )}
        <button className="btn ghost sm" onClick={dismiss}>Plus tard</button>
      </div>
    </section>
  )
}
