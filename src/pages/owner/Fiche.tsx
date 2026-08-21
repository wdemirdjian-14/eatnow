import { useState } from 'react'
import { useStore } from '../../store/store'
import { CUISINES, CUISINE_LABEL, type Cuisine } from '../../types'
import { priceRangeLabel } from '../../lib/format'

export function OwnerFiche() {
  const { currentOwner, updateRestaurant, setRestaurantField } = useStore()
  const r = currentOwner()!.restaurant
  const [saved, setSaved] = useState(false)

  const flash = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1600) }

  const toggleCuisine = (c: Cuisine) => {
    const next = r.cuisines.includes(c) ? r.cuisines.filter((x) => x !== c) : [...r.cuisines, c]
    updateRestaurant(r.id, { cuisines: next.length ? next : r.cuisines })
    flash()
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Ma fiche restaurant</h2>
          <p>Ces informations alimentent votre page publique et les filtres de recherche.</p>
        </div>
      </div>

      <section className="card pad stack gap-m">
        <div className="grid-2">
          <label className="field">
            <span>Nom du restaurant</span>
            <input className="input" value={r.name}
              onChange={(e) => { updateRestaurant(r.id, { name: e.target.value }); flash() }} />
          </label>
          <label className="field">
            <span>Téléphone</span>
            <input className="input" value={r.phone}
              onChange={(e) => { updateRestaurant(r.id, { phone: e.target.value }); flash() }} />
          </label>
          <label className="field">
            <span>Site web</span>
            <input className="input" value={r.website ?? ''} placeholder="exemple.fr"
              onChange={(e) => { updateRestaurant(r.id, { website: e.target.value }); flash() }} />
          </label>
          <label className="field">
            <span>Horaires</span>
            <input className="input" value={r.hours}
              onChange={(e) => { updateRestaurant(r.id, { hours: e.target.value }); flash() }} />
          </label>
        </div>

        <label className="field">
          <span>Description (langue source : {r.sourceLang.toUpperCase()})</span>
          <textarea className="textarea" value={r.description.source}
            onChange={(e) => { setRestaurantField(r.id, 'description', e.target.value); flash() }} />
          <span className="tiny muted">
            Modifier ce texte relance automatiquement sa traduction dans vos langues activées.
          </span>
        </label>

        <div className="grid-2">
          <label className="field">
            <span>Adresse</span>
            <input className="input" value={r.address}
              onChange={(e) => { updateRestaurant(r.id, { address: e.target.value }); flash() }} />
          </label>
          <label className="field">
            <span>Code postal</span>
            <input className="input" value={r.postalCode}
              onChange={(e) => { updateRestaurant(r.id, { postalCode: e.target.value }); flash() }} />
          </label>
          <label className="field">
            <span>Ville</span>
            <input className="input" value={r.city}
              onChange={(e) => { updateRestaurant(r.id, { city: e.target.value }); flash() }} />
          </label>
          <label className="field">
            <span>Emoji de couverture</span>
            <input className="input" maxLength={4} value={r.emoji}
              onChange={(e) => { updateRestaurant(r.id, { emoji: e.target.value }); flash() }} />
          </label>
          <label className="field">
            <span>Latitude</span>
            <input className="input mono" type="number" step="0.0001" value={r.lat}
              onChange={(e) => { updateRestaurant(r.id, { lat: Number(e.target.value) }); flash() }} />
          </label>
          <label className="field">
            <span>Longitude</span>
            <input className="input mono" type="number" step="0.0001" value={r.lng}
              onChange={(e) => { updateRestaurant(r.id, { lng: Number(e.target.value) }); flash() }} />
          </label>
        </div>

        <div className="field">
          <span>Types de cuisine</span>
          <div className="row gap-xs wrap-flex">
            {CUISINES.map((c) => (
              <button key={c} className="chip sm" aria-pressed={r.cuisines.includes(c)}
                onClick={() => toggleCuisine(c)}>
                {CUISINE_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Tranche de prix</span>
          <div className="row gap-xs">
            {([1, 2, 3, 4] as const).map((p) => (
              <button key={p} className="chip mono" aria-pressed={r.priceRange === p}
                onClick={() => { updateRestaurant(r.id, { priceRange: p }); flash() }}>
                {priceRangeLabel(p)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {saved && <div className="toast">✅ Modifications enregistrées</div>}
    </>
  )
}
