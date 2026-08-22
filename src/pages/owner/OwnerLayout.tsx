import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { activeLangs, useStore } from '../../store/store'
import { LANG_META } from '../../types'

const LINKS = [
  { to: '/pro/tableau-de-bord', icon: '📊', label: 'Tableau de bord' },
  { to: '/pro/fiche', icon: '🏪', label: 'Ma fiche' },
  { to: '/pro/carte', icon: '📖', label: 'Ma carte' },
  { to: '/pro/formules', icon: '🍽️', label: 'Formules & menus' },
  { to: '/pro/traductions', icon: '🌍', label: 'Traductions' },
  { to: '/pro/qr-code', icon: '📱', label: 'Mon QR code' },
  { to: '/pro/langues', icon: '🛒', label: 'Acheter des langues' },
  { to: '/pro/compte', icon: '🔑', label: 'Mon compte' },
]

export function OwnerLayout() {
  const { session, currentOwner, isImpersonating, stopImpersonating } = useStore()
  const nav = useNavigate()

  // L'espace est accessible au restaurateur, et à l'admin qui a endossé son compte.
  const allowed = session.role === 'owner' || isImpersonating
  if (!allowed) return <Navigate to={session.role === 'admin' ? '/admin' : '/pro'} replace />
  const me = currentOwner()
  if (!me) return <Navigate to={session.role === 'admin' ? '/admin' : '/pro'} replace />

  const langs = activeLangs(me.restaurant)

  return (
    <>
      {isImpersonating && (
        <div className="impersonation-bar">
          <span aria-hidden>👁️</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            Vue administrateur — vous agissez au nom de <b>{me.owner.name}</b> ({me.restaurant.name}).
            Toute modification est enregistrée sur son compte.
          </span>
          <button
            className="btn sm outline"
            onClick={() => { void stopImpersonating().finally(() => nav('/admin')) }}
          >
            Quitter
          </button>
        </div>
      )}
    <div className="wrap bo">
      <aside className="bo-side">
        <div className="card pad stack gap-xs bo-ident" style={{ marginBottom: '.8rem' }}>
          <span className="tiny muted">Connecté en tant que</span>
          <b>{me.owner.name}</b>
          <span className="small">{me.restaurant.name}</span>
          <div className="row gap-xs wrap-flex" style={{ marginTop: '.3rem' }}>
            {me.restaurant.published
              ? <span className="badge solid">En ligne</span>
              : <span className="badge grey">Hors ligne</span>}
            <span className="badge">Plan {me.restaurant.plan}</span>
          </div>
          <span className="tiny muted" title={langs.map((l) => LANG_META[l].label).join(', ')}>
            {langs.map((l) => LANG_META[l].flag).join(' ')}
          </span>
        </div>

        <span className="grp">Mon restaurant</span>
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span aria-hidden>{l.icon}</span> {l.label}
          </NavLink>
        ))}
      </aside>

      <div className="stack gap-l" style={{ minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
    </>
  )
}
