import { NavLink, useLocation } from 'react-router-dom'
import { useStore } from '../store/store'
import { useFavorites } from '../lib/favorites'
import { HomeIcon, MapIcon, StarIcon, UserIcon } from './icons'

/**
 * Navigation principale sur mobile, en bas de l'écran.
 *
 * C'est là que le pouce tombe naturellement. Masquée à partir de 860 px, où
 * l'en-tête suffit, et absente des espaces restaurateur et administrateur qui
 * ont leur propre navigation.
 */
export function TabBar() {
  const { session } = useStore()
  const { ids } = useFavorites()
  const { pathname } = useLocation()

  // Les back-offices ont leur propre navigation : deux barres se gêneraient.
  if (pathname.startsWith('/pro/') || pathname.startsWith('/admin')) return null

  const compte =
    session.role === 'owner' ? '/pro/tableau-de-bord'
    : session.role === 'admin' ? '/admin'
    : '/pro'

  return (
    <nav className="tabbar" aria-label="Navigation principale">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        <HomeIcon /><span>Accueil</span>
      </NavLink>
      <NavLink to="/carte" className={({ isActive }) => (isActive ? 'active' : '')}>
        <MapIcon /><span>Carte</span>
      </NavLink>
      <NavLink to="/favoris" className={({ isActive }) => (isActive ? 'active' : '')}>
        <StarIcon />
        <span>Favoris{ids.length > 0 && <b className="tabbar__count">{ids.length}</b>}</span>
      </NavLink>
      <NavLink to={compte} className={({ isActive }) => (isActive ? 'active' : '')}>
        <UserIcon /><span>Compte</span>
      </NavLink>
    </nav>
  )
}
