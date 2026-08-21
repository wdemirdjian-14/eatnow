import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { useFavorites } from '../lib/favorites'
import { RestaurantCard } from '../components/RestaurantCard'

/** Les restaurants mis de côté, conservés sur l'appareil du client. */
export function Favorites() {
  const { state, lang } = useStore()
  const { ids } = useFavorites()

  const dishCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of state.dishes) m.set(d.restaurantId, (m.get(d.restaurantId) ?? 0) + 1)
    return m
  }, [state.dishes])

  const list = state.restaurants.filter((r) => ids.includes(r.id))

  return (
    <main className="wrap stack gap-m" style={{ padding: '1.4rem 0 2rem' }}>
      <div className="page-head">
        <div>
          <h2>⭐ Mes favoris</h2>
          <p>Enregistrés sur cet appareil — ils restent accessibles hors connexion.</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty stack gap-m">
          <p>Aucun favori pour l’instant.</p>
          <p className="small">Touchez l’étoile sur un restaurant pour le retrouver ici.</p>
          <Link className="btn" to="/">Découvrir les restaurants</Link>
        </div>
      ) : (
        <div className="grid-restos">
          {list.map((r) => (
            <RestaurantCard key={r.id} r={r} lang={lang} dishCount={dishCount.get(r.id) ?? 0} />
          ))}
        </div>
      )}
    </main>
  )
}
