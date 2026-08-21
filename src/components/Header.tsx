import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { useStore } from '../store/store'
import { t } from '../i18n/ui'
import { LanguagePicker } from './LanguagePicker'
import { SyncStatus } from './SyncStatus'

export function Header() {
  const { session, logout, lang, isImpersonating } = useStore()
  const nav = useNavigate()

  return (
    <header className="site-header">
      <div className="wrap inner">
        <Link to="/" className="brand">
          <Logo size={38} id="hdr" className="mark" />
          <span>Eat<em>now</em></span>
        </Link>

        <nav className="nav-links">
          <SyncStatus />
          <LanguagePicker compact />
          {session.role === 'guest' && (
            <>
              <NavLink to="/pro" className="btn ghost sm" title={t('nav.pro', lang)}>
                <span aria-hidden>👤</span>
                <span className="hide-mobile">{t('nav.pro', lang)}</span>
              </NavLink>
              <NavLink to="/admin/login" className="btn outline sm hide-mobile">
                {t('nav.admin', lang)}
              </NavLink>
            </>
          )}
          {session.role === 'owner' && (
            <>
              <NavLink to="/pro/carte" className="btn ghost sm" title="Ma carte">
                <span aria-hidden>📖</span>
                <span className="hide-mobile">Ma carte</span>
              </NavLink>
              <button className="btn outline sm" onClick={() => { void logout().finally(() => nav('/')) }} title={t('nav.logout', lang)}>
                <span aria-hidden>⏻</span>
                <span className="hide-mobile">{t('nav.logout', lang)}</span>
              </button>
            </>
          )}
          {session.role === 'admin' && isImpersonating && (
            <NavLink to="/pro/carte" className="btn ghost sm" title="Carte du restaurant">
              <span aria-hidden>📖</span>
              <span className="hide-mobile">Sa carte</span>
            </NavLink>
          )}
          {session.role === 'admin' && (
            <>
              <NavLink to="/admin" className="btn ghost sm" title="Console">
                <span aria-hidden>📊</span>
                <span className="hide-mobile">Console</span>
              </NavLink>
              <button className="btn outline sm" onClick={() => { void logout().finally(() => nav('/')) }} title={t('nav.logout', lang)}>
                <span aria-hidden>⏻</span>
                <span className="hide-mobile">{t('nav.logout', lang)}</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
