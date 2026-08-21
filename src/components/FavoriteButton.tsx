import { useFavorites } from '../lib/favorites'

/** Étoile de mise en favori, superposée aux visuels. */
export function FavoriteButton({ id, label }: { id: string; label: string }) {
  const { isFavorite, toggle } = useFavorites()
  const on = isFavorite(id)
  return (
    <button
      className={`fav-btn ${on ? 'on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Retirer ${label} des favoris` : `Ajouter ${label} aux favoris`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id) }}
    >
      {on ? '★' : '☆'}
    </button>
  )
}
