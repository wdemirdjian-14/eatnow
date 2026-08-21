import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { useStore } from '../store/store'
import { t } from '../i18n/ui'
import { LanguagePicker } from './LanguagePicker'

export function Header() {
  const { session, logout, lang } = useStore()
  const nav = useNavigate()

  return (
    <header className="site-header">
      <div className="wrap inner">
        <Link to="/" className="brand">
          <Logo size={38} id="hdr" className="mark" />
          <span>Eat<em>now</em></span>
        </Link>

        <nav className="nav-links">
          <LanguagePicker compact />
          {session.role === 'guest' && (
            <>
              <NavLink to="/pro" className="btn ghost">{t('nav.pro', lang)}</NavLink>
              <NavLink to="/admin/login" className="btn outline">{t('nav.admin', lang)}</NavLink>
            </>
          )}
          {session.role === 'owner' && (
            <>
              <NavLink to="/pro/carte" className="btn ghost">Ma carte</NavLink>
              <button className="btn outline" onClick={() => { logout(); nav('/') }}>
                {t('nav.logout', lang)}
              </button>
            </>
          )}
          {session.role === 'admin' && (
            <>
              <NavLink to="/admin" className="btn ghost">Console</NavLink>
              <button className="btn outline" onClick={() => { logout(); nav('/') }}>
                {t('nav.logout', lang)}
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
