import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { APP_VERSION } from '../version'

export function Footer() {
  const { resetDemo } = useStore()
  return (
    <footer className="site-footer">
      <div className="wrap stack gap-m">
        <div className="row wrap-flex gap-l">
          <div style={{ maxWidth: '34ch' }}>
            <strong style={{ color: '#fff', fontSize: '1.05rem' }}>Eatnow</strong>
            <p style={{ marginTop: '.4rem' }}>
              Les restaurants autour de vous, avec leur carte traduite — plats, prix et allergènes.
            </p>
          </div>
          <div className="spacer" />
          <div className="stack gap-xs">
            <Link to="/pro">Espace restaurateur</Link>
            <Link to="/admin/login">Administration</Link>
            <button className="btn ghost sm" style={{ color: 'inherit', paddingInline: 0 }} onClick={resetDemo}>
              Réinitialiser la démo
            </button>
          </div>
        </div>
        <div className="row gap-s tiny" style={{ opacity: .6 }}>
          <span>© {new Date().getFullYear()} Eatnow</span>
          <span>·</span>
          <span>MVP v{APP_VERSION}</span>
          <span>·</span>
          <span>Données de démonstration stockées dans votre navigateur</span>
        </div>
      </div>
    </footer>
  )
}
