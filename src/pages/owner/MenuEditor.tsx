import { useState } from 'react'
import { useStore } from '../../store/store'
import { ALLERGENS, ALLERGEN_LABEL, DIET_TAGS, DIET_LABEL, type Allergen, type DietTag } from '../../types'
import { money } from '../../lib/format'

export function OwnerMenuEditor() {
  const {
    state, currentOwner, addCategory, updateCategory, removeCategory, moveCategory,
    addDish, updateDish, removeDish,
  } = useStore()
  const r = currentOwner()!.restaurant

  const [newCat, setNewCat] = useState('')
  const [openDish, setOpenDish] = useState<string | null>(null)

  const cats = state.categories.filter((c) => c.restaurantId === r.id).sort((a, b) => a.order - b.order)
  const dishes = state.dishes.filter((d) => d.restaurantId === r.id)

  const toggleIn = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v]

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Ma carte</h2>
          <p>
            Vous êtes seul maître de vos plats et de vos prix. Chaque modification du texte source
            relance la traduction automatique dans vos langues activées.
          </p>
        </div>
      </div>

      <section className="card pad row gap-s wrap-flex">
        <input
          className="input" style={{ flex: '1 1 220px' }} value={newCat}
          placeholder="Nouvelle catégorie (Entrées, Plats, Desserts…)"
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newCat.trim()) { addCategory(r.id, newCat.trim()); setNewCat('') }
          }}
        />
        <button
          className="btn" disabled={!newCat.trim()}
          onClick={() => { addCategory(r.id, newCat.trim()); setNewCat('') }}
        >
          + Ajouter la catégorie
        </button>
      </section>

      {cats.length === 0 && (
        <p className="empty">Commencez par créer une catégorie, puis ajoutez-y vos plats.</p>
      )}

      {cats.map((c, i) => {
        const list = dishes.filter((d) => d.categoryId === c.id).sort((a, b) => a.order - b.order)
        return (
          <section key={c.id} className="card pad stack gap-s">
            <div className="row gap-s wrap-flex">
              <input
                className="input" style={{ flex: '1 1 200px', fontWeight: 700 }}
                value={c.name.source}
                onChange={(e) => updateCategory(c.id, { source: e.target.value })}
                aria-label="Nom de la catégorie"
              />
              <button className="btn ghost sm" disabled={i === 0} onClick={() => moveCategory(c.id, -1)} title="Monter">↑</button>
              <button className="btn ghost sm" disabled={i === cats.length - 1} onClick={() => moveCategory(c.id, 1)} title="Descendre">↓</button>
              <button className="btn outline sm" onClick={() => setOpenDish(addDish(r.id, c.id))}>+ Plat</button>
              <button
                className="btn danger sm"
                onClick={() => {
                  if (confirm(`Supprimer « ${c.name.source} » et ses ${list.length} plat(s) ?`)) removeCategory(c.id)
                }}
              >
                Supprimer
              </button>
            </div>

            {list.length === 0 && <p className="small muted">Aucun plat dans cette catégorie.</p>}

            {list.map((d) => {
              const open = openDish === d.id
              return (
                <article key={d.id} className={`editor-row ${open ? 'open' : ''}`}>
                  <div className="row gap-s wrap-flex">
                    <button
                      className="btn ghost sm" style={{ paddingInline: '.3rem' }}
                      onClick={() => setOpenDish(open ? null : d.id)}
                      aria-expanded={open}
                    >
                      {open ? '▾' : '▸'}
                    </button>
                    <input
                      className="input" style={{ flex: '1 1 200px' }} value={d.name.source}
                      onChange={(e) => updateDish(d.id, { nameSource: e.target.value })}
                      aria-label="Nom du plat"
                    />
                    <label className="row gap-xs small">
                      Prix
                      <input
                        className="input mono" style={{ width: 92 }} type="number" min={0} step="0.5"
                        value={d.price}
                        onChange={(e) => updateDish(d.id, { price: Number(e.target.value) })}
                      />
                    </label>
                    {d.dishOfDay && <span className="badge sun">Plat du jour</span>}
                    {d.promoPrice !== undefined && <span className="badge coral">Promo {money(d.promoPrice)}</span>}
                    {!d.available && <span className="badge grey">Indisponible</span>}
                    {d.allergens.length === 0 && <span className="badge coral" title="Déclaration obligatoire">⚠️ allergènes</span>}
                  </div>

                  {open && (
                    <div className="stack gap-s">
                      <label className="field">
                        <span>Description</span>
                        <textarea
                          className="textarea" value={d.description.source}
                          onChange={(e) => updateDish(d.id, { descSource: e.target.value })}
                        />
                      </label>

                      <div className="grid-2">
                        <label className="field">
                          <span>Prix promotionnel (optionnel)</span>
                          <input
                            className="input mono" type="number" min={0} step="0.5"
                            value={d.promoPrice ?? ''} placeholder="—"
                            onChange={(e) => updateDish(d.id, {
                              promoPrice: e.target.value === '' ? undefined : Number(e.target.value),
                            })}
                          />
                        </label>
                        <div className="field">
                          <span>Mise en avant</span>
                          <div className="row gap-m wrap-flex" style={{ paddingTop: '.3rem' }}>
                            <label className="switch">
                              <input type="checkbox" checked={d.dishOfDay}
                                onChange={(e) => updateDish(d.id, { dishOfDay: e.target.checked })} />
                              <span className="track" /><span className="small">Plat du jour</span>
                            </label>
                            <label className="switch">
                              <input type="checkbox" checked={d.available}
                                onChange={(e) => updateDish(d.id, { available: e.target.checked })} />
                              <span className="track" /><span className="small">Disponible</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="field">
                        <span>Allergènes (obligatoire — règlement UE 1169/2011)</span>
                        <div className="row gap-xs wrap-flex">
                          {ALLERGENS.map((a: Allergen) => (
                            <button
                              key={a} className="chip sm" aria-pressed={d.allergens.includes(a)}
                              onClick={() => updateDish(d.id, { allergens: toggleIn(d.allergens, a) })}
                            >
                              {ALLERGEN_LABEL[a].icon} {ALLERGEN_LABEL[a].fr}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="field">
                        <span>Régimes & mentions</span>
                        <div className="row gap-xs wrap-flex">
                          {DIET_TAGS.map((tg: DietTag) => (
                            <button
                              key={tg} className="chip sm" aria-pressed={d.tags.includes(tg)}
                              onClick={() => updateDish(d.id, { tags: toggleIn(d.tags, tg) })}
                            >
                              {DIET_LABEL[tg].icon} {DIET_LABEL[tg].fr}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="row gap-s">
                        <select
                          className="select" style={{ width: 'auto' }} value={d.categoryId}
                          onChange={(e) => updateDish(d.id, { categoryId: e.target.value })}
                          aria-label="Catégorie du plat"
                        >
                          {cats.map((x) => <option key={x.id} value={x.id}>{x.name.source}</option>)}
                        </select>
                        <span className="spacer" />
                        <button
                          className="btn danger sm"
                          onClick={() => { if (confirm(`Supprimer « ${d.name.source} » ?`)) removeDish(d.id) }}
                        >
                          Supprimer le plat
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        )
      })}
    </>
  )
}
