import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Logo } from '../components/Logo'

export function Login({ mode }: { mode: 'owner' | 'admin' }) {
  const { session, loginOwner, loginAdmin } = useStore()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Les redirections viennent après tous les hooks : un retour anticipé placé
  // au-dessus casserait l'ordre des hooks entre deux rendus.
  if (session.role === 'owner' && mode === 'owner') return <Navigate to="/pro/tableau-de-bord" replace />
  if (session.role === 'admin' && mode === 'admin') return <Navigate to="/admin" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const err = mode === 'owner' ? await loginOwner(email, password) : await loginAdmin(email, password)
      if (err) { setError(err); return }
      nav(mode === 'owner' ? '/pro/tableau-de-bord' : '/admin')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="wrap auth-shell">
      <div className="card pad auth-card stack gap-m">
        <div className="row gap-s">
          <Logo size={44} id="login" />
          <div>
            <h2 style={{ fontSize: '1.4rem' }}>
              {mode === 'owner' ? 'Espace restaurateur' : 'Console d’administration'}
            </h2>
            <p className="small muted">
              {mode === 'owner'
                ? 'Gérez votre fiche, votre carte et vos traductions.'
                : 'Vue globale des restaurants inscrits et de leurs cartes.'}
            </p>
          </div>
        </div>

        <form className="stack gap-s" onSubmit={submit}>
          <label className="field">
            <span>{mode === 'owner' ? 'Adresse e-mail' : 'Identifiant'}</span>
            <input
              className="input" type={mode === 'owner' ? 'email' : 'text'} required
              autoComplete="username" autoCapitalize="none" spellCheck={false}
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === 'owner' ? 'camille@lecomptoirbleu.fr' : 'warren'}
            />
          </label>
          <label className="field">
            <span>Mot de passe</span>
            <input
              className="input" type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="eatnow"
            />
          </label>
          {error && <p className="notice danger">{error}</p>}
          <button className="btn block lg" type="submit" disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="tiny muted">
          🔒 Vos identifiants sont vérifiés par le serveur. L’application ne conserve
          aucun mot de passe.
        </p>

        <p className="tiny muted">
          {mode === 'owner'
            ? <>Vous cherchez la console admin ? <Link to="/admin/login" style={{ color: 'var(--brand-700)', fontWeight: 600 }}>Par ici</Link>.</>
            : <>Vous êtes restaurateur ? <Link to="/pro" style={{ color: 'var(--brand-700)', fontWeight: 600 }}>Connexion restaurateur</Link>.</>}
        </p>
      </div>
    </main>
  )
}
