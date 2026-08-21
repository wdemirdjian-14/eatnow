import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { activeLangs, useStore } from '../../store/store'
import { ALLERGEN_LABEL, LANG_META, type Lang } from '../../types'
import { money } from '../../lib/format'
import { originOf, resolve } from '../../lib/translate'

/** Inspection en lecture seule de la carte d'un restaurant, langue par langue. */
export function AdminRestaurant() {
  const { id } = useParams()
  const { session, state } = useStore()
  const r = state.restaurants.find((x) => x.id === id)
  const [view, setView] = useState<Lang | null>(null)

  if (session.role !== 'admin') return <Navigate to="/admin/login" replace />
  if (!r) {
    return (
      <div className="wrap empty stack gap-m">
        <h2>Restaurant introuvable</h2>
        <Link className="btn" to="/admin">Retour à la console</Link>
      </div>
    )
  }

  const owner = state.owners.find((o) => o.id === r.ownerId)
  const langs = activeLangs(r)
  const targets = langs.filter((l) => l !== r.sourceLang)
  const cats = state.categories.filter((c) => c.restaurantId === r.id).sort((a, b) => a.order - b.order)
  const dishes = state.dishes.filter((d) => d.restaurantId === r.id)
  const menus = state.menus.filter((m) => m.restaurantId === r.id)
  const shown = view ?? r.sourceLang

  const coverage = targets.map((l) => {
    const total = dishes.length
    const manual = dishes.filter((d) => originOf(d.name, l, r.sourceLang) === 'manuel').length
    const missing = dishes.filter((d) => originOf(d.name, l, r.sourceLang) === 'manquant').length
    return { l, total, manual, missing }
  })

  return (
    <div className="wrap stack gap-l" style={{ padding: '1.6rem 0 4rem' }}>
      <div className="page-head">
        <div>
          <Link to="/admin" className="small muted">← Console</Link>
          <h2>{r.emoji} {r.name}</h2>
          <p>
            {r.address}, {r.postalCode} {r.city} · {r.phone}
            {owner && <> · Contact : {owner.name} ({owner.email})</>}
          </p>
        </div>
        <span className="spacer" />
        <Link className="btn outline" to={`/r/${r.slug}`}>Page publique</Link>
      </div>

      <section className="stat-grid">
        <div className="stat"><b>{dishes.length}</b><span>plats</span></div>
        <div className="stat"><b>{cats.length}</b><span>catégories</span></div>
        <div className="stat"><b>{menus.length}</b><span>formules</span></div>
        <div className="stat"><b>{langs.length}</b><span>langues</span></div>
        <div className="stat"><b>{dishes.filter((d) => d.promoPrice !== undefined).length}</b><span>promos</span></div>
        <div className="stat">
          <b style={{ color: dishes.some((d) => !d.allergens.length) ? 'var(--coral-dark)' : undefined }}>
            {dishes.filter((d) => !d.allergens.length).length}
          </b>
          <span>plats sans allergène</span>
        </div>
      </section>

      {targets.length > 0 && (
        <section className="card pad stack gap-s">
          <h3>Couverture des traductions</h3>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr><th>Langue</th><th>Plats traduits</th><th>Forçages manuels</th><th>Manquants</th></tr></thead>
              <tbody>
                {coverage.map((c) => (
                  <tr key={c.l}>
                    <td>{LANG_META[c.l].flag} {LANG_META[c.l].label}</td>
                    <td className="mono">{c.total - c.missing} / {c.total}</td>
                    <td className="mono">{c.manual}</td>
                    <td>
                      {c.missing === 0
                        ? <span className="badge mint">complet</span>
                        : <span className="badge coral">{c.missing}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card pad stack gap-s">
        <div className="row gap-xs wrap-flex">
          <h3 style={{ flex: '1 1 auto' }}>Contenu de la carte</h3>
          {langs.map((l) => (
            <button key={l} className="chip sm" aria-pressed={shown === l} onClick={() => setView(l)}>
              {LANG_META[l].flag} {LANG_META[l].native}
            </button>
          ))}
        </div>

        {cats.map((c) => {
          const list = dishes.filter((d) => d.categoryId === c.id).sort((a, b) => a.order - b.order)
          if (!list.length) return null
          return (
            <div key={c.id} className="stack gap-xs">
              <h4 style={{ color: 'var(--teal-700)', marginTop: '.6rem' }}>
                {resolve(c.name, shown, r.sourceLang)}
              </h4>
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr><th>Plat</th><th>Prix</th><th>Allergènes</th><th>Origine du texte</th></tr>
                  </thead>
                  <tbody>
                    {list.map((d) => {
                      const o = originOf(d.name, shown, r.sourceLang)
                      return (
                        <tr key={d.id}>
                          <td dir={LANG_META[shown].rtl ? 'rtl' : undefined}>
                            <b>{resolve(d.name, shown, r.sourceLang)}</b>
                            <div className="tiny muted">{resolve(d.description, shown, r.sourceLang)}</div>
                          </td>
                          <td className="mono">
                            {d.promoPrice !== undefined
                              ? <><s className="muted">{money(d.price)}</s> {money(d.promoPrice)}</>
                              : money(d.price)}
                          </td>
                          <td className="tiny">
                            {d.allergens.length
                              ? d.allergens.map((a) => ALLERGEN_LABEL[a].fr).join(', ')
                              : <span className="badge coral">non déclaré</span>}
                          </td>
                          <td>
                            <span className={`badge ${o === 'manuel' ? 'mint' : o === 'manquant' ? 'coral' : o === 'source' ? 'grey' : ''}`}>
                              {o}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
