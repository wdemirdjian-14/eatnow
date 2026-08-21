import { useState } from 'react'
import { activeLangs, LANG_PRICE, useStore } from '../../store/store'
import { INCLUDED_LANGS, LANGS, LANG_META, type Lang, type Plan } from '../../types'
import { money } from '../../lib/format'

const PLANS: { id: Plan; name: string; price: number; perks: string[] }[] = [
  { id: 'essai', name: 'Essai', price: 0, perks: ['Fiche restaurant', 'Carte en français + anglais', 'Non publiée dans le filtre « menu traduit »'] },
  { id: 'starter', name: 'Starter', price: 29, perks: ['Carte publiée sur Eatnow', 'Français + anglais inclus', 'Langue supplémentaire : 12 €/mois'] },
  { id: 'pro', name: 'Pro', price: 59, perks: ['Tout Starter', 'Plats du jour & promos illimités', 'Langue supplémentaire : 9 €/mois'] },
]

export function OwnerLanguages() {
  const { currentOwner, purchaseLang, updateRestaurant, state } = useStore()
  const r = currentOwner()!.restaurant
  const owned = activeLangs(r)
  const unit = LANG_PRICE[r.plan]
  const [pending, setPending] = useState<Lang | null>(null)
  const [done, setDone] = useState<Lang | null>(null)

  const invoices = state.purchases.filter((p) => p.restaurantId === r.id)
  const monthly = (PLANS.find((p) => p.id === r.plan)?.price ?? 0) + invoices.reduce((n, p) => n + p.amount, 0)

  function confirmBuy() {
    if (!pending) return
    purchaseLang(r.id, pending)
    setDone(pending)
    setPending(null)
    window.setTimeout(() => setDone(null), 2600)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Langues de ma carte</h2>
          <p>
            Le français et l’anglais sont inclus. Chaque langue supplémentaire traduit
            l’intégralité de votre carte et de vos formules.
          </p>
        </div>
      </div>

      <section className="card pad stack gap-s">
        <div className="row gap-m wrap-flex">
          <div className="stat" style={{ border: 'none', padding: 0 }}>
            <b>{owned.length}</b><span>langues actives</span>
          </div>
          <div className="stat" style={{ border: 'none', padding: 0 }}>
            <b>{money(monthly)}</b><span>facturation mensuelle</span>
          </div>
          <span className="spacer" />
          <div className="row gap-xs">
            {PLANS.map((p) => (
              <button
                key={p.id} className="chip sm" aria-pressed={r.plan === p.id}
                onClick={() => updateRestaurant(r.id, { plan: p.id })}
              >
                {p.name} · {p.price === 0 ? 'gratuit' : `${money(p.price)}/mois`}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2">
          {PLANS.map((p) => (
            <div key={p.id} className="lang-card" style={r.plan === p.id ? { borderColor: 'var(--teal-500)' } : undefined}>
              <div className="row gap-s">
                <b style={{ flex: 1 }}>{p.name}</b>
                {r.plan === p.id && <span className="badge solid">Votre plan</span>}
              </div>
              <span className="price-tag" style={{ fontSize: '1.2rem', color: 'var(--teal-700)', fontWeight: 800 }}>
                {p.price === 0 ? 'Gratuit' : `${money(p.price)} / mois`}
              </span>
              <ul className="small muted stack gap-xs" style={{ margin: 0, paddingInlineStart: '1.1rem' }}>
                {p.perks.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="stack gap-s">
        <h3>Ajouter une langue — {money(unit)} / mois / langue</h3>
        <div className="grid-restos">
          {LANGS.map((l) => {
            const isOwned = owned.includes(l)
            const isIncluded = INCLUDED_LANGS.includes(l) || l === r.sourceLang
            return (
              <div key={l} className={`lang-card ${isOwned ? 'owned' : ''}`}>
                <div className="row gap-s">
                  <span style={{ fontSize: '1.5rem' }} aria-hidden>{LANG_META[l].flag}</span>
                  <div className="stack" style={{ flex: 1 }}>
                    <b>{LANG_META[l].native}</b>
                    <span className="tiny muted">{LANG_META[l].label}</span>
                  </div>
                  {isIncluded && <span className="badge">Incluse</span>}
                </div>
                {isOwned ? (
                  <span className="small" style={{ color: 'var(--teal-700)', fontWeight: 700 }}>
                    ✅ Carte traduite et publiée
                  </span>
                ) : (
                  <button className="btn sm block" onClick={() => setPending(l)}>
                    Ajouter · {money(unit)}/mois
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {pending && (
        <section className="card pad stack gap-s" style={{ borderColor: 'var(--teal-400)' }}>
          <h3>Confirmer l’ajout de {LANG_META[pending].native} {LANG_META[pending].flag}</h3>
          <p className="small muted">
            Votre carte ({state.dishes.filter((d) => d.restaurantId === r.id).length} plats) sera traduite
            immédiatement. Facturation : {money(unit)} / mois, résiliable à tout moment.
          </p>
          <div className="row gap-s">
            <button className="btn" onClick={confirmBuy}>💳 Payer {money(unit)} / mois</button>
            <button className="btn outline" onClick={() => setPending(null)}>Annuler</button>
          </div>
          <p className="tiny muted">
            Démo : aucun paiement réel n’est effectué. Le module de paiement se branche ici.
          </p>
        </section>
      )}

      {done && <div className="toast">🌍 {LANG_META[done].native} activé — carte traduite</div>}
    </>
  )
}
