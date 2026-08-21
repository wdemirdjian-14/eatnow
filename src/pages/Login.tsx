import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { ADMIN } from '../data/seed'
import { Logo } from '../components/Logo'

export function Login({ mode }: { mode: 'owner' | 'admin' }) {
  const { session, loginOwner, loginAdmin, state } = useStore()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (session.role === 'owner' && mode === 'owner') return <Navigate to="/pro/tableau-de-bord" replace />
  if (session.role === 'admin' && mode === 'admin') return <Navigate to="/admin" replace />

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const err = mode === 'owner' ? loginOwner(email, password) : loginAdmin(email, password)
    if (err) { setError(err); return }
    nav(mode === 'owner' ? '/pro/tableau-de-bord' : '/admin')
  }

  const demo = mode === 'owner'
    ? state.owners.map((o) => ({ label: o.name, email: o.email }))
    : [{ label: 'Administrateur Eatnow', email: ADMIN.email }]

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
            <span>Adresse e-mail</span>
            <input
              className="input" type="email" required autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === 'owner' ? 'camille@lecomptoirbleu.fr' : ADMIN.email}
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
          <button className="btn block lg" type="submit">Se connecter</button>
        </form>

        <div className="stack gap-xs">
          <p className="tiny muted">Comptes de démonstration — mot de passe <b>eatnow</b> :</p>
          <div className="row gap-xs wrap-flex">
            {demo.map((d) => (
              <button
                key={d.email} className="chip sm" type="button"
                onClick={() => { setEmail(d.email); setPassword('eatnow'); setError(null) }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <p className="tiny muted">
          {mode === 'owner'
            ? <>Vous cherchez la console admin ? <Link to="/admin/login" style={{ color: 'var(--teal-700)', fontWeight: 600 }}>Par ici</Link>.</>
            : <>Vous êtes restaurateur ? <Link to="/pro" style={{ color: 'var(--teal-700)', fontWeight: 600 }}>Connexion restaurateur</Link>.</>}
        </p>
      </div>
    </main>
  )
}
