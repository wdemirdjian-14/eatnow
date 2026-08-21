import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { activeLangs, LANG_PRICE, useStore } from '../../store/store'
import { CUISINE_LABEL, LANG_META, type Lang } from '../../types'
import { money, priceRangeLabel } from '../../lib/format'
import { NewRestaurantForm } from './NewRestaurantForm'

const PLAN_PRICE = { essai: 0, starter: 29, pro: 59 } as const

export function Admin() {
  const { session, state, updateRestaurant, impersonate } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [onlyPublished, setOnlyPublished] = useState(false)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<string | null>(null)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return state.restaurants
      .map((r) => {
        const dishes = state.dishes.filter((d) => d.restaurantId === r.id)
        const langs = activeLangs(r)
        const paid = r.purchasedLangs.length
        return {
          r, langs,
          dishes: dishes.length,
          cats: state.categories.filter((c) => c.restaurantId === r.id).length,
          menus: state.menus.filter((m) => m.restaurantId === r.id).length,
          noAllergen: dishes.filter((d) => d.allergens.length === 0).length,
          noPrice: dishes.filter((d) => d.price <= 0).length,
          mrr: PLAN_PRICE[r.plan] + paid * LANG_PRICE[r.plan],
        }
      })
      .filter((x) => {
        if (onlyPublished && !x.r.published) return false
        if (!needle) return true
        return `${x.r.name} ${x.r.city} ${x.r.cuisines.join(' ')}`.toLowerCase().includes(needle)
      })
      .sort((a, b) => b.mrr - a.mrr)
  }, [state, q, onlyPublished])

  const totals = {
    restaurants: state.restaurants.length,
    published: state.restaurants.filter((r) => r.published).length,
    dishes: state.dishes.length,
    langsSold: state.restaurants.reduce((n, r) => n + r.purchasedLangs.length, 0),
    mrr: rows.reduce((n, x) => n + x.mrr, 0),
    risk: state.dishes.filter((d) => d.allergens.length === 0).length,
  }

  const langUsage = useMemo(() => {
    const m = new Map<Lang, number>()
    for (const r of state.restaurants) for (const l of r.purchasedLangs) m.set(l, (m.get(l) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [state.restaurants])

  // La redirection vient après tous les hooks : la session arrive du serveur,
  // donc ce composant est d'abord rendu sans session puis avec.
  if (session.role !== 'admin') return <Navigate to="/admin/login" replace />

  return (
    <div className="wrap stack gap-l" style={{ padding: '1.6rem 0 4rem' }}>
      <div className="page-head">
        <div>
          <h2>Console d’administration</h2>
          <p>Vue globale des restaurants inscrits, de leurs cartes et du chiffre d’affaires récurrent.</p>
        </div>
        <span className="spacer" />
        <button className="btn" onClick={() => setCreating(true)}>+ Nouveau restaurant</button>
      </div>

      {created && (
        <p className="notice">
          ✅ Restaurant créé, avec ses catégories de départ et son accès.
          <button
            className="btn sm" style={{ marginLeft: '.6rem' }}
            onClick={() => {
              const r = state.restaurants.find((x) => x.id === created)
              if (r) void impersonate(r.ownerId).then(() => nav('/pro/carte'))
            }}
          >
            Ouvrir sa carte
          </button>
        </p>
      )}

      <section className="stat-grid">
        <div className="stat"><b>{totals.restaurants}</b><span>restaurants référencés</span></div>
        <div className="stat"><b>{totals.published}</b><span>cartes publiées</span></div>
        <div className="stat"><b>{totals.dishes}</b><span>plats en base</span></div>
        <div className="stat"><b>{totals.langsSold}</b><span>langues vendues</span></div>
        <div className="stat"><b>{money(totals.mrr)}</b><span>revenu mensuel récurrent</span></div>
        <div className="stat"><b style={{ color: totals.risk ? 'var(--coral-dark)' : undefined }}>{totals.risk}</b><span>plats sans allergène</span></div>
      </section>

      <section className="card pad stack gap-s">
        <div className="row gap-s wrap-flex">
          <input
            className="input" style={{ flex: '1 1 240px' }} value={q}
            onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un restaurant, une ville, une cuisine…"
          />
          <label className="switch">
            <input type="checkbox" checked={onlyPublished} onChange={(e) => setOnlyPublished(e.target.checked)} />
            <span className="track" /><span className="small">Publiés uniquement</span>
          </label>
        </div>

        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Restaurant</th><th>Ville</th><th>Cuisine</th><th>Prix</th>
                <th>Carte</th><th>Langues</th><th>Conformité</th><th>Plan</th><th>MRR</th><th>En ligne</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.r.id}>
                  <td>
                    <b>{x.r.emoji} {x.r.name}</b>
                    <div className="tiny muted">inscrit le {x.r.createdAt}</div>
                  </td>
                  <td>{x.r.city}</td>
                  <td className="small">{x.r.cuisines.map((c) => CUISINE_LABEL[c]).join(', ')}</td>
                  <td className="mono">{priceRangeLabel(x.r.priceRange)}</td>
                  <td className="small mono">{x.dishes} plats · {x.cats} cat. · {x.menus} form.</td>
                  <td title={x.langs.map((l) => LANG_META[l].label).join(', ')}>
                    {x.langs.map((l) => LANG_META[l].flag).join('')}
                    <span className="tiny muted"> ({x.langs.length})</span>
                  </td>
                  <td>
                    {x.noAllergen === 0 && x.noPrice === 0
                      ? <span className="badge mint">OK</span>
                      : <span className="badge coral">
                          {x.noAllergen > 0 && `${x.noAllergen} sans allergène`}
                          {x.noAllergen > 0 && x.noPrice > 0 && ' · '}
                          {x.noPrice > 0 && `${x.noPrice} sans prix`}
                        </span>}
                  </td>
                  <td><span className="badge grey">{x.r.plan}</span></td>
                  <td className="mono">{money(x.mrr)}</td>
                  <td>
                    <label className="switch">
                      <input
                        type="checkbox" checked={x.r.published}
                        onChange={(e) => updateRestaurant(x.r.id, { published: e.target.checked })}
                      />
                      <span className="track" />
                      <span className="sr-only">Publier {x.r.name}</span>
                    </label>
                  </td>
                  <td>
                    <div className="row gap-xs">
                      <Link className="btn outline sm" to={`/admin/r/${x.r.id}`}>Inspecter</Link>
                      <button
                        className="btn sm"
                        title={`Ouvrir l’espace de ${x.r.name} en tant qu’administrateur`}
                        onClick={() => { void impersonate(x.r.ownerId).then(() => nav('/pro/tableau-de-bord')) }}
                      >
                        👁️ Ouvrir l’espace
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="empty">Aucun restaurant ne correspond.</p>}
      </section>

      <section className="card pad stack gap-s">
        <h3>Langues les plus achetées</h3>
        {langUsage.length === 0 && <p className="small muted">Aucune langue vendue pour l’instant.</p>}
        <div className="stack gap-xs">
          {langUsage.map(([l, n]) => (
            <div key={l} className="row gap-s small">
              <span style={{ minWidth: 150 }}>{LANG_META[l].flag} {LANG_META[l].label}</span>
              <div style={{ flex: 1, background: 'var(--line-2)', borderRadius: 999, height: 10 }}>
                <div style={{
                  width: `${(n / Math.max(...langUsage.map((x) => x[1]))) * 100}%`,
                  background: 'var(--teal-500)', height: '100%', borderRadius: 999,
                }} />
              </div>
              <b className="mono">{n}</b>
            </div>
          ))}
        </div>
      </section>
      {creating && (
        <NewRestaurantForm
          onClose={() => setCreating(false)}
          onCreated={(id) => { setCreating(false); setCreated(id) }}
        />
      )}
    </div>
  )
}
