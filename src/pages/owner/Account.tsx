import { useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useStore } from '../../store/store'

/** Longueur minimale, alignée sur ce qu'exige le serveur. */
const MIN = 8

/**
 * Mon compte : le restaurateur choisit lui-même son mot de passe.
 *
 * L'ancien est exigé — sans lui, un appareil laissé déverrouillé suffirait à
 * confisquer le compte. Le serveur ferme au passage les autres sessions, mais
 * garde celle-ci ouverte : changer son mot de passe ne doit pas déconnecter
 * celui qui le change.
 */
export function OwnerAccount() {
  const { currentOwner, isImpersonating } = useStore()
  const me = currentOwner()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const tooShort = next.length > 0 && next.length < MIN
  const mismatch = confirm.length > 0 && confirm !== next
  const ready = current.length > 0 && next.length >= MIN && confirm === next

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    setDone(false)
    try {
      await api.changePassword(current, next)
      setDone(true)
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Changement impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card pad stack gap-m" style={{ maxWidth: 560 }}>
      <div>
        <h2>Mon compte</h2>
        <p className="small muted">
          {me?.owner.name} — identifiant <b className="mono">{me?.owner.email}</b>
        </p>
      </div>

      {isImpersonating ? (
        <p className="notice warn">
          ⚠️ Vous consultez cet espace en tant qu’administrateur. Le mot de passe se
          change depuis la console d’administration, où l’acte est explicite.
        </p>
      ) : (
        <form className="stack gap-s" onSubmit={(e) => void submit(e)}>
          <label className="field">
            <span>Mot de passe actuel</span>
            <input
              className="input" type="password" value={current} autoComplete="current-password"
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Nouveau mot de passe</span>
            <input
              className="input" type="password" value={next} autoComplete="new-password"
              onChange={(e) => setNext(e.target.value)}
            />
            <span className={`tiny ${tooShort ? '' : 'muted'}`} style={tooShort ? { color: 'var(--coral-dark)' } : undefined}>
              {tooShort ? `Encore ${MIN - next.length} caractère(s).` : `${MIN} caractères au minimum.`}
            </span>
          </label>

          <label className="field">
            <span>Confirmer le nouveau mot de passe</span>
            <input
              className="input" type="password" value={confirm} autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
            {mismatch && (
              <span className="tiny" style={{ color: 'var(--coral-dark)' }}>
                Les deux saisies diffèrent.
              </span>
            )}
          </label>

          {error && <p className="notice warn">⚠️ {error}</p>}
          {done && (
            <p className="notice">
              ✅ Mot de passe changé. Vos autres appareils ont été déconnectés ; celui-ci
              reste connecté.
            </p>
          )}

          <div className="row gap-s">
            <button className="btn" type="submit" disabled={!ready || busy}>
              {busy ? 'Enregistrement…' : 'Changer mon mot de passe'}
            </button>
          </div>

          <p className="tiny muted">
            Si vous avez perdu votre mot de passe, demandez à Eatnow de le réinitialiser :
            personne, pas même nous, ne peut lire celui que vous avez choisi.
          </p>
        </form>
      )}
    </section>
  )
}
