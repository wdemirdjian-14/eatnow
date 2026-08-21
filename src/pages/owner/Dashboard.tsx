import { Link } from 'react-router-dom'
import { activeLangs, useStore } from '../../store/store'
import { LANG_META } from '../../types'
import { money } from '../../lib/format'
import { originOf } from '../../lib/translate'

export function OwnerDashboard() {
  const { state, currentOwner, updateRestaurant, retranslate } = useStore()
  const me = currentOwner()!
  const r = me.restaurant

  const dishes = state.dishes.filter((d) => d.restaurantId === r.id)
  const cats = state.categories.filter((c) => c.restaurantId === r.id)
  const menus = state.menus.filter((m) => m.restaurantId === r.id)
  const langs = activeLangs(r)
  const targets = langs.filter((l) => l !== r.sourceLang)

  // Combien de textes n'ont pas encore de traduction exploitable ?
  const missing = dishes.reduce((n, d) => {
    return n + targets.filter((l) => originOf(d.name, l, r.sourceLang) === 'manquant').length
  }, 0)
  const forced = dishes.reduce((n, d) => n + targets.filter((l) => d.name.manual[l]).length, 0)

  const noAllergens = dishes.filter((d) => d.allergens.length === 0).length
  const invoices = state.purchases.filter((p) => p.restaurantId === r.id)

  const checks = [
    { ok: !!r.description.source, label: 'Description du restaurant renseignée', to: '/pro/fiche' },
    { ok: cats.length > 0, label: 'Au moins une catégorie de carte', to: '/pro/carte' },
    { ok: dishes.length >= 5, label: 'Au moins 5 plats en ligne', to: '/pro/carte' },
    { ok: dishes.every((d) => d.price > 0), label: 'Tous les plats ont un prix', to: '/pro/carte' },
    { ok: noAllergens === 0, label: 'Allergènes déclarés sur chaque plat', to: '/pro/carte' },
    { ok: missing === 0, label: 'Traductions générées dans toutes les langues', to: '/pro/traductions' },
  ]
  const done = checks.filter((c) => c.ok).length

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Tableau de bord</h2>
          <p>Vue d’ensemble de votre présence sur Eatnow.</p>
        </div>
        <span className="spacer" />
        <Link className="btn outline" to={`/r/${r.slug}`}>👁️ Voir ma page publique</Link>
      </div>

      <section className="card pad stack gap-m">
        <div className="row gap-m wrap-flex">
          <label className="switch">
            <input
              type="checkbox" checked={r.published}
              onChange={(e) => updateRestaurant(r.id, { published: e.target.checked })}
            />
            <span className="track" />
            <span className="stack">
              <b>Publier ma carte traduite sur Eatnow</b>
              <span className="small muted">
                Votre fiche apparaît dans le filtre « Menu traduit » de la recherche.
              </span>
            </span>
          </label>
          <span className="spacer" />
          <button className="btn outline" onClick={() => retranslate(r.id)}>♻️ Régénérer les traductions</button>
        </div>
        {!r.published && (
          <p className="notice warn">
            ⚠️ Votre carte n’est pas visible par les clients qui filtrent sur « menu traduit ».
          </p>
        )}
      </section>

      <section className="stat-grid">
        <div className="stat"><b>{dishes.length}</b><span>plats sur la carte</span></div>
        <div className="stat"><b>{cats.length}</b><span>catégories</span></div>
        <div className="stat"><b>{menus.length}</b><span>formules</span></div>
        <div className="stat"><b>{langs.length}</b><span>langues publiées</span></div>
        <div className="stat"><b>{dishes.filter((d) => d.dishOfDay).length}</b><span>plats du jour</span></div>
        <div className="stat"><b>{dishes.filter((d) => d.promoPrice !== undefined).length}</b><span>promotions actives</span></div>
      </section>

      <section className="card pad stack gap-s">
        <div className="row gap-s">
          <h3 style={{ flex: 1 }}>Qualité de la fiche</h3>
          <span className="badge">{done}/{checks.length}</span>
        </div>
        <div className="stack gap-xs">
          {checks.map((c) => (
            <Link key={c.label} to={c.to} className="row gap-s small" style={{ padding: '.35rem 0' }}>
              <span aria-hidden>{c.ok ? '✅' : '⬜️'}</span>
              <span style={{ color: c.ok ? 'var(--ink-2)' : 'var(--coral-dark)', fontWeight: c.ok ? 400 : 600 }}>
                {c.label}
              </span>
            </Link>
          ))}
        </div>
        {noAllergens > 0 && (
          <p className="notice danger">
            🚨 {noAllergens} plat{noAllergens > 1 ? 's' : ''} sans allergène déclaré. La déclaration des
            14 allergènes majeurs est obligatoire (règlement UE 1169/2011).
          </p>
        )}
      </section>

      <section className="card pad stack gap-s">
        <h3>Traductions</h3>
        <div className="row gap-s wrap-flex">
          {targets.map((l) => (
            <span key={l} className="badge">{LANG_META[l].flag} {LANG_META[l].native}</span>
          ))}
          {targets.length === 0 && <span className="small muted">Aucune langue cible activée.</span>}
        </div>
        <div className="row gap-l wrap-flex small">
          <span>✍️ <b>{forced}</b> traductions forcées manuellement</span>
          <span>⚠️ <b>{missing}</b> textes sans traduction</span>
        </div>
        <div className="row gap-s">
          <Link className="btn outline sm" to="/pro/traductions">Relire mes traductions</Link>
          <Link className="btn sm" to="/pro/langues">Ajouter une langue</Link>
        </div>
      </section>

      {invoices.length > 0 && (
        <section className="card pad stack gap-s">
          <h3>Mes achats de langues</h3>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Langue</th><th>Montant / mois</th></tr></thead>
              <tbody>
                {invoices.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.date}</td>
                    <td>{LANG_META[p.lang].flag} {LANG_META[p.lang].label}</td>
                    <td className="mono">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
